import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import worker from '../dist/server/index.js';
createServer(async (req,res) => {
  try {
    const request = new Request(`http://127.0.0.1:4190${req.url}`, { method: req.method, headers: req.headers, ...(!['GET','HEAD'].includes(req.method) ? { body: Readable.toWeb(req), duplex: 'half' } : {}) });
    const response = await worker.fetch(request); res.writeHead(response.status,Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
  } catch { res.writeHead(500); res.end('Server error'); }
}).listen(4190,'127.0.0.1',()=>console.log('Ruta: http://127.0.0.1:4190'));
