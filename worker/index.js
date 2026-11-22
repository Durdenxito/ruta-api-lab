const zones = [{ id: 'lima', name: 'Lima Metropolitana', baseCents: 900, kiloCents: 200, days: 2 }, { id: 'arequipa', name: 'Arequipa', baseCents: 1600, kiloCents: 350, days: 4 }, { id: 'cusco', name: 'Cusco', baseCents: 1800, kiloCents: 400, days: 5 }];
const services = [{ id: 'standard', name: 'Estándar', surchargeCents: 0 }, { id: 'express', name: 'Express', surchargeCents: 1200 }];
export default { async fetch(request) {
  const path = new URL(request.url).pathname;
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
  const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { ...headers, ...extra } });
  const error = (code, message, status, extra) => json({ error: { code, message } }, status, extra);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (path === '/' && ['GET', 'HEAD'].includes(request.method)) return new Response(request.method === 'HEAD' ? null : HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self' https://ruta-api-durdenxito.plumfable9.chatgpt.site; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" } });
  const routes = { '/api/health': 'GET', '/api/zones': 'GET', '/api/services': 'GET', '/api/quotes': 'POST' };
  if (!routes[path]) return error('NOT_FOUND', 'La ruta no existe.', 404);
  if (request.method !== routes[path]) return error('METHOD_NOT_ALLOWED', 'Método no permitido.', 405, { Allow: routes[path] });
  if (path === '/api/health') return json({ status: 'ok', service: 'ruta-api', version: '1.0.0' });
  if (path === '/api/zones') return json({ data: zones });
  if (path === '/api/services') return json({ data: services });
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return error('UNSUPPORTED_MEDIA_TYPE', 'Envía un cuerpo application/json.', 415);
  const reader = request.body?.getReader(); let size = 0; const chunks = [];
  if (reader) { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 8192) { await reader.cancel(); return error('PAYLOAD_TOO_LARGE', 'El cuerpo supera 8 KB.', 413); } chunks.push(value); } }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let input; try { input = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { return error('INVALID_JSON', 'El cuerpo no es un JSON válido.', 400); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return error('VALIDATION_ERROR', 'La cotización debe ser un objeto.', 422);
  const zone = zones.find(z => z.id === input.destination), service = services.find(s => s.id === input.service);
  if (!zone || !service || !Number.isInteger(input.grams) || input.grams < 100 || input.grams > 30000 || typeof input.insurance !== 'boolean' || !Number.isInteger(input.valueCents) || input.valueCents < 0 || input.valueCents > 500000 || (input.insurance && input.valueCents === 0) || Object.keys(input).some(k => !['destination','service','grams','insurance','valueCents'].includes(k))) return error('VALIDATION_ERROR', 'Revisa destino, servicio, peso (100–30000 g), seguro y valor (0–500000 céntimos).', 422);
  const breakdown = { baseCents: zone.baseCents, weightCents: Math.ceil(input.grams / 1000) * zone.kiloCents, expressCents: service.surchargeCents, insuranceCents: input.insurance ? Math.ceil(input.valueCents / 100) : 0 };
  return json({ currency: 'PEN', destination: zone.id, service: service.id, grams: input.grams, breakdown, totalCents: Object.values(breakdown).reduce((a,b) => a+b,0), deliveryDays: service.id === 'express' ? Math.max(1, zone.days - 2) : zone.days });
} };
