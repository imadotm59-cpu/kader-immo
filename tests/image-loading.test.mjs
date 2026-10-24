import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/cms.js';
const id='11111111-1111-4111-8111-111111111111',other='33333333-3333-4333-8333-333333333333';
const paths=Array.from({length:20},(_,i)=>`22222222-2222-4222-8222-222222222222/${id.slice(0,-2)}${String(i).padStart(2,'0')}.webp`);
async function run(action,parameters={}){
 let code,data;
 await handler({query:{action,...parameters},method:'GET',headers:{cookie:'kader_access=admin-token'},body:{}},{setHeader(){},status(value){code=value;return this;},json(value){data=value;}});
 return {code,data};
}
function fixture(name){
 process.env.SUPABASE_URL=`https://${name}.test`;process.env.SUPABASE_ANON_KEY='sb_publishable_test';
 const original=global.fetch,signs=[],queries=[];
 let active=0,peak=0,fail=false;
 const row={id,images:paths,data:{units:[{name:'A1',imagePaths:paths.slice(1,3)}],category:'prestige',transaction:'Rent',rentalPeriod:'month'},price:80000,updated_at:'2026-10-24T00:00:00Z'};
 global.fetch=async(url,options)=>{
  assert.equal(options.headers.Authorization,undefined,'public reads must never use admin cookies');
  if(url.includes('/rest/v1/properties?')){
   queries.push(url);assert.match(url,/published=eq.true&archived=eq.false/);
   const value=new URL(url).searchParams.get('id');
   return Response.json(value&&value.includes(other)?[]:[row]);
  }
  assert.match(url,/\/storage\/v1\/object\/sign\/property-images\//);
  active++;peak=Math.max(peak,active);signs.push(url);await new Promise(setImmediate);active--;
  return fail?Response.json({}, {status:502}):Response.json({signedURL:'/object/sign/property-images/'+url.split('/property-images/')[1]+'?token='+signs.length});
 };
 return {row,signs,queries,get peak(){return peak;},set fail(value){fail=value;},restore(){global.fetch=original;}};
}
test('catalogue polls expose only cover paths and never sign galleries',async()=>{
 const f=fixture('metadata');
 try{
  for(let i=0;i<3;i++){
   const result=await run('public');assert.equal(result.code,200);
   const p=result.data.properties[0];assert.deepEqual(p.imagePaths,[paths[0]]);assert.deepEqual(p.images,[]);assert.equal(p.image,'');
   assert.deepEqual(p.units[0].imagePaths,[]);assert.deepEqual(p.units[0].images,[]);assert.equal(p.category,'prestige');assert.equal(p.transaction,'Rent');
  }
  assert.equal(f.signs.length,0);
 }finally{f.restore();}
});
test('visible card requests sign just the designated cover and reuse it',async()=>{
 const f=fixture('cover');
 try{
  const first=await run('covers',{ids:id});assert.equal(first.code,200);assert.equal(first.data.covers[0].path,paths[0]);
  assert.equal(f.signs.length,1);
  const next=await run('covers',{ids:id});assert.equal(next.data.covers[0].url,first.data.covers[0].url);assert.equal(f.signs.length,1);
  assert.equal((await run('covers',{ids:other})).data.covers.length,0);
  for(const ids of ['', 'invalid',Array(51).fill(id).join(',')])assert.equal((await run('covers',{ids})).code,400);
  assert.equal((await run('property',{id:other})).code,404);
  assert.equal((await run('property',{id:'invalid'})).code,400);
 }finally{f.restore();}
});
test('detail signs only the selected gallery, retains unit photos, bounds concurrency and caches requests',async()=>{
 const f=fixture('detail');
 try{
  await run('covers',{ids:id});
  const [first,next]=await Promise.all([run('property',{id}),run('property',{id})]);
  assert.equal(first.code,200);assert.equal(next.code,200);assert.equal(f.signs.length,20);assert.ok(f.peak<=6);
  assert.deepEqual(first.data.property.imagePaths,paths);assert.equal(first.data.property.images.length,20);assert.ok(first.data.property.images.every(Boolean));
  assert.deepEqual(first.data.property.units[0].images,first.data.property.images.slice(1,3));
  assert.ok(f.queries.slice(1).every(url=>url.includes('id=eq.'+id)));
  await run('property',{id});await run('public');assert.equal(f.signs.length,20);
  const realNow=Date.now;Date.now=()=>realNow()+3500000;
  try{await run('property',{id});assert.equal(f.signs.length,40);}finally{Date.now=realNow;}
 }finally{f.restore();}
});
test('failed signing is not cached and never substitutes a non-cover gallery photo',async()=>{
 const f=fixture('failed-cover'),originalError=console.error;console.error=()=>{};
 try{
  f.fail=true;assert.equal((await run('covers',{ids:id})).data.covers[0].url,'');assert.equal(f.signs.length,1);
  f.fail=false;assert.ok((await run('covers',{ids:id})).data.covers[0].url);assert.equal(f.signs.length,2);
 }finally{console.error=originalError;f.restore();}
});
test('single-photo and photo-free listings remain valid',async()=>{
 const f=fixture('single');
 try{
  f.row.images=[paths[0]];f.row.data.units=[];
  assert.equal((await run('property',{id})).data.property.images.length,1);
  f.row.images=[];
  const detail=(await run('property',{id})).data.property;
  assert.deepEqual(detail.images,[]);assert.equal(detail.image,'');
  assert.equal((await run('covers',{ids:id})).data.covers[0].url,'');
 }finally{f.restore();}
});
