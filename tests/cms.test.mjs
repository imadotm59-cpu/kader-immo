import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateProperty, validateUpload, imagePath, uuid } from '../server/validation.js';
import handler from '../api/cms.js';
import { config } from '../server/supabase.js';
const uid='22222222-2222-4222-8222-222222222222',id='11111111-1111-4111-8111-111111111111';
const image=uid+'/'+id+'.jpg';
const draft={title:'Villa Oran',ref:'KIM-TEST',price:'65 000 000 DA',status:'Draft',type:'Villa',imagePaths:[]};
function response(data,status=200){return new Response(data===null?'':JSON.stringify(data),{status});}
async function run(action,method='GET',body={},cookie='',origin='https://kader.test'){
  const headers={};let code,data;
  await handler({query:{action},method,body,headers:{origin,'content-type':'application/json',cookie}},{
    setHeader(k,v){headers[k]=v;},status(value){code=value;return this;},json(value){data=value;}
  });return {code,data,headers};
}
function environment(){process.env.SUPABASE_URL='https://database.test';process.env.SUPABASE_ANON_KEY='sb_publishable_test';process.env.APP_ORIGIN='https://kader.test';}
function mockAdmin(rest){
  global.fetch=async(url,options)=>{
    if(url.endsWith('/auth/v1/user'))return response({id:uid,email:'admin@example.test'});
    if(url.includes('/admin_users?'))return response([{user_id:uid}]);
    return rest(url,options);
  };
}
test('normalizes existing fields and preserves feature/image order',()=>{
  const result=validateProperty({...draft,area:'480 m²',features:['Pool','Sea view'],imagePaths:[image]});
  assert.equal(result.price,65000000);assert.equal(result.data.area,480);assert.deepEqual(result.images,[image]);assert.deepEqual(result.data.features,['Pool','Sea view']);
});
test('publishing enforces required details and Draft cannot be public',()=>{
  assert.throws(()=>validateProperty({...draft,published:true}),/availability/);
  assert.throws(()=>validateProperty({...draft,published:true,status:'Available',location:'Oran'}),/Publishing/);
  assert.equal(validateProperty({...draft,published:true,status:'Available',location:'Oran',area:120,description:'Description',imagePaths:[image]}).published,true);
});
test('rejects invalid IDs, unsafe paths, options, prices and oversized inputs',()=>{
  for(const value of ['../../image.jpg','https://example.test/a.jpg','javascript:alert(1)'])assert.throws(()=>imagePath(value));
  assert.throws(()=>uuid('1'));assert.throws(()=>validateProperty({...draft,price:-1}));
  assert.throws(()=>validateProperty({...draft,title:'x'.repeat(201)}));
  assert.throws(()=>validateProperty({...draft,type:'invalid'}));
  assert.throws(()=>validateProperty({...draft,imagePaths:[image,image]}));
});
test('allows raster uploads only and checks byte limit',()=>{
  const bytes=Buffer.from([255,216,255,...Array(20).fill(0)]);
  assert.equal(validateUpload({base64:bytes.toString('base64')}).mime,'image/jpeg');
  assert.throws(()=>validateUpload({base64:Buffer.from('<svg onload="alert(1)"></svg>').toString('base64')}));
  assert.throws(()=>validateUpload({base64:Buffer.alloc(2097153).toString('base64')}));
});
test('anonymous users cannot access protected operations',async()=>{
  environment();for(const action of ['session','properties','upload','media','delete-image']){
    const result=await run(action,action==='upload'||action==='delete-image'?'POST':'GET');assert.equal(result.code,401);
  }
});
test('CSRF writes and malformed input are rejected',async()=>{
  environment();assert.equal((await run('login','POST',{},'','https://attacker.test')).code,403);
  assert.equal((await run('login','POST','{')).code,400);
  assert.equal((await run('login','POST',null)).code,400);
});
test('public request never uses admin cookies and explicitly filters publication',async()=>{
  environment();const original=global.fetch;
  global.fetch=async(url,options)=>{assert.ok(url.includes('published=eq.true&archived=eq.false'));assert.equal(options.headers.Authorization,undefined);return response([]);};
  try{const result=await run('public','GET',{},'kader_access=admin-token');assert.equal(result.code,200);assert.deepEqual(result.data.properties,[]);assert.match(result.headers['Cache-Control'],/no-store/);}
  finally{global.fetch=original;}
});
test('secure login returns only email and uses HttpOnly secure cookies',async()=>{
  environment();const original=global.fetch;
  global.fetch=async url=>url.includes('/auth/v1/token')?response({user:{id:uid,email:'admin@example.test'},access_token:'test-access',refresh_token:'test-refresh',expires_in:3600}):response([{user_id:uid}]);
  try{const result=await run('login','POST',{email:'admin@example.test',password:'test-only'});assert.equal(result.code,200);assert.deepEqual(result.data,{user:{email:'admin@example.test'}});for(const c of result.headers['Set-Cookie'])assert.match(c,/Path=\/api; HttpOnly; SameSite=Strict; Secure/);}
  finally{global.fetch=original;}
});
test('authenticated non-admin is denied',async()=>{
  environment();const original=global.fetch;
  global.fetch=async url=>url.endsWith('/auth/v1/user')?response({id:uid}):response([]);
  try{assert.equal((await run('properties','GET',{},'kader_access=test')).code,403);}finally{global.fetch=original;}
});
test('editing updates the same ID instead of creating a duplicate',async()=>{
  environment();const original=global.fetch;let patched=false;
  const row={...validateProperty(draft),id,created_at:'2026-01-01',updated_at:'2026-01-02',images:[]};
  mockAdmin(async(url,options)=>{
    if(options.method==='PATCH'){assert.ok(url.includes('id=eq.'+id));patched=true;return response([{...row,...JSON.parse(options.body)}]);}
    if(url.includes('id=eq.'))return response([row]);
    return response([row]);
  });
  try{const result=await run('properties','PUT',{...draft,id,title:'Updated title',updatedAt:row.updated_at},'kader_access=test');assert.equal(result.code,200);assert.equal(result.data.property.id,id);assert.equal(result.data.property.title,'Updated title');assert.ok(patched);}
  finally{global.fetch=original;}
});
test('stale edits are rejected without overwriting newer changes',async()=>{
  environment();const original=global.fetch;mockAdmin(async()=>response([{id,updated_at:'2026-02-01'}]));
  try{assert.equal((await run('properties','PUT',{...draft,id,updatedAt:'2026-01-01'},'kader_access=test')).code,409);}finally{global.fetch=original;}
});
test('deletion retains shared image files used by another listing',async()=>{
  environment();const original=global.fetch;let storageDeletes=0;
  mockAdmin(async(url,options)=>{
    if(url.includes('/storage/')){storageDeletes++;return response({});}
    if(options.method==='DELETE')return response([{id,images:[image]}]);
    return response([{id:uid,images:[image]}]);
  });
  try{assert.equal((await run('properties','DELETE',{id},'kader_access=test')).code,200);assert.equal(storageDeletes,0);}finally{global.fetch=original;}
});
test('expired logout clears cookies and privileged config keys are refused',async()=>{
  environment();const result=await run('logout','POST');assert.equal(result.code,200);assert.ok(result.headers['Set-Cookie'].every(c=>c.includes('Max-Age=0')));
  process.env.SUPABASE_ANON_KEY='sb_secret_forbidden';assert.throws(config,/never a service-role/);environment();
});
test('frontend contains no demo password, token storage or listing localStorage writes',async()=>{
  const source=(await readFile(new URL('../app.js',import.meta.url),'utf8'))+(await readFile(new URL('../cms-client.js',import.meta.url),'utf8'));
  assert.doesNotMatch(source,/kader-properties-v2|sessionStorage|service_role|access_token|refresh_token/);
  assert.ok(source.includes("data.id?'PUT':'POST'"));assert.ok(source.includes('form.dataset.id'));
});
test('loading UI uses listing-card skeletons while error and empty states remain explicit',async()=>{
  const client=(await readFile(new URL('../cms-client.js',import.meta.url),'utf8'))+(await readFile(new URL('../app.js',import.meta.url),'utf8'));
  const css=await readFile(new URL('../styles.css',import.meta.url),'utf8');
  assert.doesNotMatch(client,/Chargement|cms-skeleton-screen/);
  for(const part of ['skeleton-property-image','skeleton-title','skeleton-price','skeleton-location','skeleton-details'])assert.match(client,new RegExp(part));
  assert.match(client,/route === '\/'\) return home\(true\)/);
  assert.match(client,/route === '\/biens'\) return listings\(true\)/);
  assert.match(client,/bindLoadingChrome\(\)/);
  assert.doesNotMatch(css,/cms-skeleton-screen|min-height:100svh[^}]*skeleton/);
  assert.match(css,/@keyframes cms-shimmer/);assert.match(css,/prefers-reduced-motion/);
  assert.match(client,/Les biens sont temporairement indisponibles/);
  assert.match(client,/No matching properties/);
  assert.match(client,/Aucun bien en vedette actuellement/);
});
test('SQL enables RLS and keeps admin provisioning owner-only',async()=>{
  const sql=await readFile(new URL('../supabase/migrations/001_cms.sql',import.meta.url),'utf8');
  assert.match(sql,/alter table public.properties enable row level security/);
  assert.match(sql,/alter table public.admin_users enable row level security/);
  assert.match(sql,/published and not archived/);assert.match(sql,/property-images','property-images',false/);
  assert.doesNotMatch(sql,/grant (insert|all).*admin_users to authenticated/i);
});
test('image upload creates a unique admin-owned path and signed URL',async()=>{
  environment();const original=global.fetch;let uploaded;
  mockAdmin(async(url,options)=>{
    if(url.includes('/object/sign/'))return response({signedURL:'/object/sign/property-images/test?token=short-lived'});
    uploaded=url;assert.ok(Buffer.isBuffer(options.body));assert.equal(options.headers['Content-Type'],'image/jpeg');return response({});
  });
  try{
    const result=await run('upload','POST',{base64:Buffer.from([255,216,255,...Array(20).fill(0)]).toString('base64')},'kader_access=test');
    assert.equal(result.code,201);assert.ok(result.data.path.startsWith(uid+'/'));assert.ok(uploaded.endsWith(result.data.path));assert.ok(result.data.url.startsWith('https://database.test/storage/v1/'));
  }finally{global.fetch=original;}
});
test('cannot delete an image still referenced by any listing',async()=>{
  environment();const original=global.fetch;
  mockAdmin(async(url,options)=>{assert.notEqual(options.method,'DELETE');return response([{images:[image]}]);});
  try{assert.equal((await run('delete-image','POST',{path:image},'kader_access=test')).code,409);}finally{global.fetch=original;}
});
test('refresh verifies the user and membership before returning a session',async()=>{
  environment();const original=global.fetch;let refreshed=false;
  global.fetch=async(url,options)=>{
    if(url.includes('grant_type=refresh_token')){refreshed=true;return response({access_token:'fresh-token',refresh_token:'fresh-refresh',expires_in:3600});}
    assert.equal(options.headers.Authorization,'Bearer fresh-token');
    if(url.endsWith('/auth/v1/user'))return response({id:uid,email:'admin@example.test'});
    return response([{user_id:uid}]);
  };
  try{const result=await run('session','GET',{},'kader_refresh=old-refresh');assert.equal(result.code,200);assert.ok(refreshed);assert.ok(result.headers['Set-Cookie'].some(c=>c.includes('fresh-token')));}finally{global.fetch=original;}
});
