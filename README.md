# Telmex scraper
To download Telmex recipes

## Módulos

```
npm i mkdirp-promise
npm install mysql
npm install promise-mysql
```

## Configuración y funcionamiento
Para que funcione solo hay que editar el archivo `configuration.js` y agregar el teléfono a 10 dígitos de Mi Telmex, la contraseña y los datos de acceso a la base de datos.
El scraper crea el directorio indicado en la configuración y guarda los PDF de los 12 últimos meses en un directorio con el número de teléfono, que es el mismo que el nombre de usuario.
Si se desea sobrescribir los datos del archivo de configuración se puede colocar el usuario y la contraseña en la lína de comando:
```
node telmexScraper.js 55xxxxxxxx contraseña
```

### Para crear la base de datos y las tablas
```
DROP DATABASE telmex;
CREATE DATABASE telmex;
USE telmex;
CREATE TABLE files (
    `id` INT NOT NULL AUTO_INCREMENT, 
    `phoneNumber` BIGINT(10) NOT NULL, 
    `recipeDate` INT(6) NOT NULL,
    `fileName` VARCHAR(150) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `iPhoneNumberRecipeDate` (`phoneNumber`, `recipeDate`)
) CHARACTER SET = UTF8;
CREATE TABLE results (
    `fileId` INT NOT NULL, 
    `date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `result` VARCHAR(150) NOT NULL,
    PRIMARY KEY (`fileId`, `date`),
    FOREIGN KEY (`fileId`) REFERENCES files(`id`)
) CHARACTER SET = UTF8;
```

### Para consltar los resultados del scraping
```
SELECT phoneNumber, recipeDate, fileName, date, result FROM files AS f LEFT JOIN results AS r ON f.id = r.fileId;
```