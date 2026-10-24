// Local-only network fixture: two published properties, twenty unique photos each.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root=resolve(process.env.IMAGE_PREVIEW_ROOT||'.'),port=Number(process.env.IMAGE_PREVIEW_PORT||4192),storagePort=port+1;
process.env.SUPABASE_URL=`http://127.0.0.1:${storagePort}`;process.env.SUPABASE_ANON_KEY='sb_publishable_network_fixture';process.env.APP_ORIGIN=`http://localhost:${port}`;
const {default:handler}=await import(pathToFileURL(root+'/api/cms.js'));
const owner='22222222-2222-4222-8222-222222222222';
const ids=['11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444'];
const rows=ids.map((id,index)=>({id,ref:'NETWORK-'+index,title:['Villa Canastel','Appartement Akid Lotfi','Private draft'][index],price:65000000,status:'Available',published:index<2,archived:false,featured:true,images:Array.from({length:20},(_,i)=>`${owner}/${id.slice(0,24)}${String(index*20+i).padStart(12,'0')}.png`),data:{type:'Villa',category:'standard',transaction:'Sale',currency:'DA',location:'Oran',area:220,beds:4,baths:2,description:'Une propriété de qualité à Oran.',features:[],units:[]},updated_at:'2026-10-24T00:00:00Z'}));
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aG7sAAAAASUVORK5CYII=','base64');
let stats={signs:[],images:[],database:0},sequence=0;
createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost'),send=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 if(url.pathname==='/__stats')return send(stats);
 if(url.pathname==='/__reset'){stats={signs:[],images:[],database:0};return send({ok:true});}
 if(url.pathname==='/rest/v1/properties'){
  stats.database++;let found=rows.filter(row=>!url.searchParams.has('published')||row.published&&!row.archived);
  const id=url.searchParams.get('id');if(id?.startsWith('eq.'))found=found.filter(row=>row.id===id.slice(3));if(id?.startsWith('in.'))found=found.filter(row=>id.slice(4,-1).split(',').includes(row.id));
  return send(found);
 }
 const prefix='/storage/v1/object/sign/property-images/';
 if(url.pathname.startsWith(prefix)){
  const path=url.pathname.slice(prefix.length);if(!rows.some(row=>row.published&&!row.archived&&row.images.includes(path)))return send({},403);
  if(req.method==='POST'){stats.signs.push(path);return send({signedURL:'/object/sign/property-images/'+path+'?token='+ ++sequence});}
  stats.images.push(path);res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'public,max-age=3600'});res.end(png);return;
 }
 send({},404);
}).listen(storagePort,'127.0.0.1');
const assets={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/cms-client.js':'cms-client.js','/styles.css':'styles.css','/assets/kader-logo.png':'assets/kader-logo.png'};
createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/api/cms'){req.query=Object.fromEntries(url.searchParams);req.body={};res.status=code=>{res.statusCode=code;return res;};res.json=data=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};await handler(req,res);return;}
 const file=assets[url.pathname];if(!file){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(await readFile(root+'/'+file));
}).listen(port,'127.0.0.1',()=>console.log(`Image network fixture: http://localhost:${port} (API root: ${root})`));
