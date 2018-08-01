# Telmex scraper
To download Telmex recipes

## Módulos

```
npm i mkdirp-promise
npm install mysql
```

## Configuración y funcionamiento
Para que funcione solo hay que editar el archivo `configuration.js` y agregar el teléfono a 10 dígitos de Mi Telmex y la contraseña.
El scraper crea el directorio indicado en la configuración y guarda los PDF de los 12 últimos meses en un directorio con el número de teléfono, que es el mismo que el nombre de usuario.
