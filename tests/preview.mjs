// Local-only integration fixture. It exercises the real API/client with a fake
// Supabase service. NOT a production mode, and never included in dist/.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
const uid='22222222-2222-4222-8222-222222222222';
const id='11111111-1111-4111-8111-111111111111';
const idNoPrice='33333333-3333-4333-8333-333333333333';
const stamp=()=>new Date().toISOString();
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aG7sAAAAASUVORK5CYII=','base64');
const files=new Set([uid+'/'+id+'.png']);
const rows=[
  {id,ref:'KIM-TEST-01',title:'Villa test à Canastel',price:65000000,status:'Available',published:true,archived:false,featured:true,images:[...files],data:{type:'Villa',category:'standard',transaction:'Sale',currency:'DA',location:'Canastel, Oran',area:480,beds:5,baths:4,description:'A local integration test listing.',features:['Pool','Custom test feature'],city:'Oran',neighborhood:'Canastel'},created_at:stamp(),updated_at:stamp()},
  {id:idNoPrice,ref:'KIM-TEST-02',title:'Résidence prestige sans prix',price:0,status:'Available',published:true,archived:false,featured:true,images:[...files],data:{type:'Apartment',category:'prestige',transaction:'Sale',currency:'DA',location:'Akid Lotfi, Oran',area:90,beds:3,baths:2,description:'A no-price integration test listing.',features:['Elevator'],city:'Oran',neighborhood:'Akid Lotfi',units:[{name:'A-01',area:75,price:null,beds:2,floor:1,status:'Available',imagePaths:[]},{name:'A-02',area:90,price:22000000,beds:3,floor:2,status:'Available',imagePaths:[]}]},created_at:stamp(),updated_at:stamp()}
];
process.env.SUPABASE_URL='http://127.0.0.1:4189';
process.env.SUPABASE_ANON_KEY='sb_publishable_local_fixture';
process.env.APP_ORIGIN='http://localhost:4188';
process.env.PORT='4188';
createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost'),parts=[];
  for await(const chunk of req)parts.push(chunk);
  let body;try{body=JSON.parse(Buffer.concat(parts).toString()||'{}');}catch{body={};}
  const admin=req.headers.authorization==='Bearer fixture-access',send=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  const session={access_token:'fixture-access',refresh_token:'fixture-refresh',expires_in:3600,user:{id:uid,email:'admin@example.test'}};
  if(url.pathname==='/auth/v1/token')return body.password==='fixture-only-password'||body.refresh_token==='fixture-refresh'?send(session):send({},401);
  if(url.pathname==='/auth/v1/user')return admin?send(session.user):send({},401);
  if(url.pathname==='/auth/v1/logout')return send({});
  if(url.pathname==='/rest/v1/admin_users')return send(admin?[{user_id:uid}]:[]);
  if(url.pathname==='/rest/v1/properties'){
    let found=rows.filter(row=>!url.searchParams.has('id')||row.id===url.searchParams.get('id').slice(3));
    if(!admin||url.searchParams.has('published'))found=found.filter(row=>row.published&&!row.archived);
    if(req.method==='GET')return send(found);
    if(!admin)return send({},403);
    if(req.method==='POST'){const row={...body,id:randomUUID(),created_at:stamp(),updated_at:stamp()};rows.unshift(row);return send([row],201);}
    if(req.method==='PATCH'){const row=found[0];if(!row)return send([]);Object.assign(row,body,{updated_at:stamp()});if(row.published)row.published_at=stamp();if(row.archived)row.published=false;return send([row]);}
    if(req.method==='DELETE'){found.forEach(row=>rows.splice(rows.indexOf(row),1));return send(found);}
  }
  const sign='/storage/v1/object/sign/property-images/';
  if(url.pathname.startsWith(sign)){
    if(req.method==='GET'){res.writeHead(200,{'Content-Type':'image/png'});res.end(png);return;}
    const path=url.pathname.slice(sign.length);return files.has(path)?send({signedURL:'/object/sign/property-images/'+path+'?token=fixture'}):send({},404);
  }
  if(url.pathname==='/storage/v1/object/list/property-images')return send([...files].map(path=>({id:path,name:path.split('/')[1]})));
  if(url.pathname.startsWith('/storage/v1/object/property-images/')){files.add(url.pathname.split('/property-images/')[1]);return send({});}
  if(url.pathname==='/storage/v1/object/property-images'){body.prefixes.forEach(path=>files.delete(path));return send({});}
  send({},404);
}).listen(4189,'127.0.0.1',async()=>{await import('../scripts/dev.mjs');console.log('LOCAL TEST FIXTURE ONLY — admin@example.test / fixture-only-password');});
