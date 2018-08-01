const puppeteer = require('puppeteer');
const fs = require('fs');
const mkdirp = require('mkdirp-promise');

const CREDS = require('./configuration');

if (process.argv.length !== 2) {
    if (process.argv.length !== 4) {
        console.log('Utilice node telmexScraper.js [usuario contraseña]');
        return;
    } else {
        CREDS.username = process.argv[2];
        CREDS.password = process.argv[3];
        console.log(`Usando el usuario ${CREDS.username} y la contraseña ${CREDS.password} tomados como parámetros.`);
    }
} else {
    console.log(`Usando el usuario y la contraseña tomados del archivo de configuración.`);
}

const parseDataUrl = (dataUrl) => {
    const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (matches.length !== 3) {
        throw new Error('No podemos analizar la URL.');
    }
    return { mime: matches[1], buffer: Buffer.from(matches[2], 'base64') };
};

const getDataUrlThroughFetch = async (url) => {
    const response = await fetch(url, {
        headers: {
            "Content-Type": "application/pdf"
        }
    }, error => { throw error });
    if (!response.ok) {
        throw new Error(`No podemos traer al archivo. Status: ${response.status}.`);
    }
    const data = await response.blob();
    const reader = new FileReader();
    return new Promise((resolve) => {
        reader.addEventListener('loadend', () => resolve(reader.result));
        reader.readAsDataURL(data);
    });
};


(async () => {
    const START_URL = 'http://telmex.com/web/hogar/mi-telmex';
    const USERNAME_SELECTOR = '#USR';
    const PASSWORD_SELECTOR = '#CVEACC';
    const LOGIN_BUTTON_SELECTOR = '#formaRegistro > div > input.botonAmarillo';
    const LOGOUT_ANCHOR_SELECTOR = '#menuPerfil > li:nth-child(2) > a';
    const RECIPE_NUMBER_TO_DOWNLOAD = 12;

    const browser = await puppeteer.launch({ headless: false });

    try {
        const fileStoragePath = CREDS.fileStorage + '/' + CREDS.username;

        if (!fs.existsSync(fileStoragePath)) {
            mkdirp(fileStoragePath)
                .then((path) => console.log(`Creando ruta para almacenar archivos: ${fileStoragePath}`))
                .catch((error) => { throw error; });
        }

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 })

        const startURL = START_URL;
        console.log('Abriendo página inicial: ' + startURL);
        await page.goto(startURL).catch(error => { throw `No puedo abrir la página inicial ${startURL}` });

        console.log('Buscando el botón para ir a la pagina de acceso de usuarios.');
        // Hay dos enlaces con el texto y el id del elemento con id puede cambiar porque hace referencia a una instancia
        // Por eso buscamos con todo el selector menos el elemento con el id

        // Buscamos el botón para sacarle la referencia porque lo abre en otra ventana.
        // La referencia tiene un query string que no sabemos si usa para normatividad y pueda ser bloqueado
        const href = await page.evaluate(() => {
            return document.querySelector('div > div > div.journal-content-article > div > div > figure > figcaption > a').getAttribute('href');
        });

        console.log(`Abriendo página ${href}.`);

        // Abrimos la referencia sobre la página ya abierta.
        await page.goto(href).catch(error => { throw `No puedo abrir la página de acceso: ${href}` });

        console.log(`Esperando por el selector ${LOGIN_BUTTON_SELECTOR}.`);
        await page.waitForSelector(LOGIN_BUTTON_SELECTOR).catch(error => { throw 'Pasó demasiado tiempo para abrir la página de acceso.'; });

        console.log('Página de acceso abierta.');

        await page.click(USERNAME_SELECTOR).catch(error => { throw 'Entrada de nombre de usuario no encontrada.'; });
        console.log('Escribiendo el usuario en el elemento de entrada de usuario.');
        await page.keyboard.type(CREDS.username);

        await page.click(PASSWORD_SELECTOR).catch(error => { throw 'Entrada de contraaseña no encontrada.'; });
        await page.keyboard.type(CREDS.password);
        console.log('Escribiendo contraseña.');

        await page.click(LOGIN_BUTTON_SELECTOR).catch(error => { throw `No puedo encontrar el botón para acceder.`; });
        console.log('Botón de acceso encontrado');

        await page.waitForNavigation().catch(error => { throw 'Demasiado tiempo para acceder a la pagina de inicio de usuario.'; });

        const isBadLoggin = (await page.content()).match(/son.incorrectos/gi)
        if (isBadLoggin !== null) {
            throw 'Usuario y contraseña incorrectos.';
        }

        const isLogged = (await page.content()).match(/Existe.una/gi)
        if (isLogged !== null) {
            throw 'Hay otra sesión abierta. El sitio solo permite una a la vez.';
        }

        console.log('Acceso correcto.');
        try {
            let uri;
            let dataUrl;
            let result;

            let date = new Date();
            let year = date.getYear() + 1900;
            let month = date.getMonth();

            console.log(`Hoy es ${date}. usaremos, como punto de partida el mes ${month + 1} y el año ${year}.`);

            for (let i = 0; i < RECIPE_NUMBER_TO_DOWNLOAD; i++) {
                date = year + new String(month + 1).padStart(2, '0');
                console.log(`Bajando recibo para el ${date}`);
                uri = `https://www.online.telmex.com/mitelmex/descargaRecibo.jsp?T=${CREDS.username}&M=${date}`;
                dataUrl = await page.evaluate(getDataUrlThroughFetch, uri);
                result = parseDataUrl(dataUrl);
                await fs.writeFileSync(`${fileStoragePath}/${date}.pdf`, result.buffer, 'base64');
                month--;
                if (month < 0) {
                    month = 11;
                    year--;
                }
            }
        } catch (error) {
            console.log(error);
        } finally {
            console.log('Salir del sistema.');
            await page.click(LOGOUT_ANCHOR_SELECTOR).catch(error => { console.log('Logout button not found') });
        }
    } catch (error) {
        console.log(error);
    } finally {
        console.log('Cerrando el navegador.');
        //   browser.close();
    }
})();