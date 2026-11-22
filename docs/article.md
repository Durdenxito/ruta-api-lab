---
title: "Probar una API de cotización de envíos con Playwright"
published: false
description: "Pruebas HTTP de tarifas, límites y errores antes de publicar una aplicación con GitHub Actions."
tags: testing, api, playwright, githubactions
---

## Introducción de la aplicación

Ruta calcula tarifas de envío desde Lima hacia tres destinos de ejemplo: Lima Metropolitana, Arequipa y Cusco. El usuario indica peso, servicio y valor declarado. La pantalla presenta el total en soles y separa los cargos de tarifa base, peso, express y seguro. La cotización incluye un plazo estimado; no reserva un envío ni procesa pagos.

El [repositorio público de Ruta](https://github.com/Durdenxito/ruta-api-lab) contiene la interfaz, el manejador HTTP y las pruebas. La [interfaz se publica en GitHub Pages](https://durdenxito.github.io/ruta-api-lab/); consume una [API pública alojada mediante Sites](https://ruta-api-durdenxito.plumfable9.chatgpt.site/api/health), cuyo código se ejecuta como Worker. El servicio calcula cada respuesta a partir del cuerpo recibido y no necesita guardar usuarios ni cotizaciones.

## Propósito de la prueba y herramientas

La pregunta principal es si la API respeta sus reglas de tarifas y rechaza entradas que no puede interpretar. Una pantalla que muestra un precio no basta para comprobarlo: podría enviar un peso equivocado, omitir un cargo o esconder una respuesta de error.

Elegí Playwright API Testing como alternativa a Cypress, k6 y Newman. Su fixture `request` permite enviar peticiones HTTP directamente y verificar respuestas con el runner de Playwright. Estas pruebas no abren Chromium ni interactúan con botones. La [documentación oficial](https://playwright.dev/docs/api-testing) describe ese uso mediante `APIRequestContext`.

Node.js adapta el manejador Fetch a un servidor HTTP local. El build genera el Worker para el alojamiento y la interfaz estática para Pages. GitHub Actions ejecuta las mismas pruebas antes de publicar la interfaz, tanto contra el servidor local como contra la dirección pública del backend.

## Desarrollo

El contrato tiene cuatro rutas: salud del servicio, catálogo de destinos, catálogo de servicios y creación de una cotización. La última recibe un `POST /api/quotes` con `destination`, `service`, `grams`, `insurance` y `valueCents`. El peso y el valor se expresan en enteros. Así el cálculo trabaja con gramos y céntimos, sin encadenar operaciones con importes decimales.

Para un paquete de 1500 gramos hacia Lima con servicio estándar, el resultado esperado es S/ 13.00. Son S/ 9.00 de tarifa base y dos kilos facturables a S/ 2.00 cada uno. La prueba verifica el total, cada cargo, la moneda y el plazo de dos días. Si una modificación cambiara el redondeo de kilos iniciados, esta comparación fallaría.

```js
const response = await request.post('/api/quotes', {
  data: {
    destination: 'lima', service: 'standard', grams: 1500,
    insurance: false, valueCents: 0
  }
});
expect(response.status()).toBe(200);
expect((await response.json()).totalCents).toBe(1300);
```

El seguro añade otro límite de redondeo. Su tarifa es el 1 % del valor declarado y cualquier fracción de céntimo se redondea hacia arriba. Sobre un valor de 10001 céntimos, el cargo es 101. La suite combina ese caso con un envío express a Cusco y comprueba un total de 3901 céntimos.

También se prueban los pesos de 100, 1000, 1001 y 30000 gramos. Los valores 99 y 30001 se rechazan con `422`. Ese mismo estado se espera para pesos fraccionarios, números enviados como texto, destinos desconocidos, campos adicionales o seguro activo sin valor declarado. Cada petición inválida debe incluir un código de error consistente.

La revisión del cuerpo HTTP distingue errores que conviene diagnosticar por separado. Un JSON malformado recibe `400`; un documento JSON válido que no cumple el esquema recibe `422`. El tipo de contenido incorrecto produce `415`, y un cuerpo superior a 8 KB produce `413`. Para comprobar JSON roto se envían bytes mediante `Buffer`, porque un cliente que serialice automáticamente una cadena podría convertir el supuesto documento inválido en una cadena JSON válida.

Las pruebas de rutas y métodos comprueban `404`, `405` y la cabecera `Allow`. Una petición `OPTIONS` verifica CORS: la interfaz y el backend viven en orígenes distintos. El acceso es público porque el servicio solo calcula tarifas de demostración y no contiene datos privados.

La ejecución local empieza con `npm ci` y `npm test`. Playwright inicia el servidor, envía las peticiones y genera reportes JSON y HTML. Para repetir la suite contra el alojamiento se establece `API_BASE_URL` con la dirección pública. No se sustituyen respuestas por mocks: ambas ejecuciones atraviesan HTTP.

El despliegue está dividido por responsabilidad. Sites automatiza el build, el empaquetado y la publicación del Worker. En GitHub, `deploy.yml` comprueba el servicio local y después el backend publicado. Solo entonces sube el HTML como artefacto y ejecuta el job de GitHub Pages. Las credenciales del proveedor no forman parte del código público. El README indica la ubicación de cada automatización y permite distinguir el despliegue de la interfaz de la publicación del backend.

## Conclusiones

La suite permite detectar diferencias pequeñas que cambian una tarifa: el kilo iniciado, el céntimo adicional del seguro y los límites de peso. Las peticiones negativas comprueban que el servidor comunique el tipo de error mediante estados HTTP específicos, en lugar de responder siempre con éxito y un mensaje de texto.

Probar el backend público antes de desplegar la interfaz también verifica conectividad y compatibilidad del contrato. Eso no mide capacidad bajo carga ni demuestra ausencia de vulnerabilidades; para esas preguntas harían falta otras pruebas. En Ruta, el resultado que interesa conservar es una comprobación repetible de cálculos y respuestas, vinculada al código y al flujo que publica la aplicación.
