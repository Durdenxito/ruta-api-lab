# Ruta · Cotizador de envíos y pruebas de API

Cotiza paquetes desde Lima hacia Lima Metropolitana, Arequipa o Cusco. La interfaz muestra tarifa base, peso facturable, recargo express, seguro y plazo estimado. Es una aplicación educativa: no contrata transportistas ni procesa pagos.

- Repositorio público: https://github.com/Durdenxito/ruta-api-lab
- Interfaz Pages: https://durdenxito.github.io/ruta-api-lab/
- API y aplicación en Sites: https://ruta-api-durdenxito.plumfable9.chatgpt.site
- [Artículo para Dev.to](docs/article.md).

## Ejecutar

Node.js 24. `npm ci`, después `npm run dev`. Servidor: http://127.0.0.1:4190. `npm test` ejecuta las pruebas contra el servidor local; no necesita instalar navegadores. Para verificar el servicio publicado, establecer `API_BASE_URL` y ejecutar el mismo comando.

El formulario usa la API pública configurada en `public/index.html`; para usarlo completamente en local, cambiar la constante `API` a `http://127.0.0.1:4190`. Las pruebas locales no dependen de esa constante.

## Contrato HTTP

| Método y ruta | Función |
| --- | --- |
| `GET /api/health` | Estado y versión del servicio |
| `GET /api/zones` | Destinos, tarifas en céntimos y plazos |
| `GET /api/services` | Servicios y recargo express |
| `POST /api/quotes` | Calcular una cotización sin crear una reserva |

```json
{"destination":"lima","service":"standard","grams":1500,"insurance":false,"valueCents":0}
```

Para ese cuerpo, el resultado es `totalCents: 1300`, moneda PEN y dos días hábiles. Peso de 100 a 30000 gramos, valor de 0 a 500000 céntimos. Cada kilo iniciado se factura completo; el seguro es el 1 % del valor declarado, redondeado al céntimo superior. Seguro activo requiere valor mayor que cero.

Errores: JSON inválido `400`, ruta inexistente `404`, método incorrecto `405`, cuerpo mayor que 8 KB `413`, tipo distinto de JSON `415`, campos inválidos o inesperados `422`. Las cotizaciones son operaciones sin estado: no hay usuarios, pagos ni datos personales almacenados.

## Automatizaciones y ubicación

La configuración del alojamiento está en [`deployment/hosting.json`](deployment/hosting.json). El build la incorpora al artefacto con la estructura que requiere el proveedor.

| Archivo | Activación | Qué hace |
| --- | --- | --- |
| [`.github/workflows/quality.yml`](.github/workflows/quality.yml) | Push, pull request o manual | Instala dependencias y ejecuta Playwright API Testing contra un servidor local. Conserva resultados JSON y reporte HTML. |
| [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) | Push a `main` o manual | Prueba la API local y la publicada; construye la interfaz y la despliega en GitHub Pages si ambas suites aprueban. |
| [`scripts/build.mjs`](scripts/build.mjs) | `npm run build` | Produce un Worker ESM con el HTML embebido y la configuración de Sites; también genera el HTML que usa Pages. |
| [`scripts/serve.mjs`](scripts/serve.mjs) | `npm run dev` | Sirve en Node el mismo manejador Fetch construido para el Worker. |

La API se publica mediante el flujo automatizado de Sites: preparación de fuente, build, empaquetado, guardado de versión y despliegue del Worker. Esa publicación utiliza las herramientas de Sites de esta sesión; no se presenta como un despliegue del backend desde GitHub Actions. Actions despliega la interfaz y comprueba el backend público antes de hacerlo. Las credenciales de Sites nunca se guardan en el repositorio.

## Pruebas

[`tests/api.spec.js`](tests/api.spec.js) utiliza la fixture `request` de Playwright, sin abrir un navegador: HTTP real, cuerpos JSON, importes exactos, límites de peso, entradas inválidas, métodos, rutas, tamaño y CORS. No usa Cypress, k6 ni Newman.

Los reportes están en los artefactos de Actions. Son pruebas funcionales de API; no representan ensayos de carga ni una auditoría completa de seguridad. CORS es público porque el servicio no contiene datos privados ni operaciones persistentes.
