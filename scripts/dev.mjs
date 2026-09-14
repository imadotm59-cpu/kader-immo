import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import handler from '../api/cms.js';
const port = Number(process.env.PORT || 3000);
process.env.APP_ORIGIN ||= `http://localhost:${port}`;
const assets = {'/':'index.html','/index.html':'index.html','/app.js':'app.js','/cms-client.js':'cms-client.js','/styles.css':'styles.css'};
createServer(async (req,res) => {
  const url = new URL(req.url, 'http://localhost');
  if(url.pathname === '/api/cms') {
    res.status = code => { res.statusCode=code; return res; };
    res.json = data => {res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};
    req.query = Object.fromEntries(url.searchParams);
    try {
      const chunks=[]; let size=0;
      for await(const chunk of req) {size+=chunk.length;if(size>2900000){res.status(413).json({error:'Request too large.'});return;} chunks.push(chunk);}
      const body=Buffer.concat(chunks).toString();
      req.body=body ? JSON.parse(body) : {};
      await handler(req,res);
    } catch { if(!res.writableEnded) res.status(400).json({error:'Invalid JSON request.'}); }
    return;
  }
  const file=assets[url.pathname] || (/^\/admin(?:\/|$)/.test(url.pathname) ? 'index.html' : null);
  if(!file || !['GET','HEAD'].includes(req.method)){res.writeHead(404);res.end('Not found');return;}
  try {
    res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');
    res.setHeader('Cache-Control','no-store');
    res.end(await readFile(new URL('../'+file,import.meta.url)));
  } catch {res.writeHead(500);res.end('Missing website asset.');}
}).listen(port,'127.0.0.1',()=>console.log(`Kader CMS: http://localhost:${port} — admin: http://localhost:${port}/admin`));
