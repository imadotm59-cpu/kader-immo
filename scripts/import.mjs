// Owner-run, one-time import. Never shipped to visitors. No service-role key needed.
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { validateProperty } from '../server/validation.js';
const filename=process.argv[2];
if(!filename){console.error('Usage: npm run import:listings -- /absolute/path/listings.json');process.exit(1);}
const origin=(process.env.IMPORT_ORIGIN || process.env.APP_ORIGIN || 'http://localhost:3000').replace(/\/$/,'');
if(!origin.startsWith('https://')&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))throw new Error('Use HTTPS except for local development.');
let muted=false;
const output=new Writable({write(chunk,encoding,done){if(!muted)process.stdout.write(chunk);done();}});
const rl=createInterface({input:process.stdin,output,terminal:true});
let cookie='';
async function call(action,method='GET',body){
  const response=await fetch(origin+'/api/cms?action='+action,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(90000)});
  const changed=response.headers.getSetCookie();if(changed.length)cookie=changed.map(s=>s.split(';')[0]).join('; ');
  const result=await response.json();if(!response.ok)throw new Error(result.error||'Import request failed.');return result;
}
async function imageBytes(source){
  if(source.startsWith('data:image/')&&source.includes(';base64,'))return source.split(';base64,')[1];
  const url=new URL(source);
  // Remote image imports are explicitly allowlisted to avoid arbitrary network access.
  const allowed=['images.unsplash.com',...(process.env.IMPORT_IMAGE_HOSTS||'').split(',').filter(Boolean)];
  if(url.protocol!=='https:'||!allowed.includes(url.hostname))throw new Error('Image host not allowed. Add the trusted hostname to IMPORT_IMAGE_HOSTS, or upload it manually.');
  const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error('Could not download an image.');
  let size=0;const chunks=[];
  for await(const chunk of response.body){size+=chunk.length;if(size>2097152)throw new Error('Image exceeds 2 MB. Resize it and retry.');chunks.push(chunk);}
  return Buffer.concat(chunks).toString('base64');
}
try{
  const data=JSON.parse(await readFile(filename,'utf8'));
  if(!Array.isArray(data))throw new Error('Expected a JSON array of listings.');
  console.log('Importing '+data.length+' records as PRIVATE DRAFTS. Existing references are skipped. Nothing is published automatically.');
  const email=await rl.question('Admin email: ');process.stdout.write('Admin password (hidden): ');muted=true;
  const password=await rl.question('');muted=false;process.stdout.write('\n');rl.close();
  await call('login','POST',{email,password});
  const existing=(await call('properties')).properties;
  const refs=new Set(existing.map(p=>p.ref));
  for(let i=0;i<data.length;i++){
    const old=data[i],ref=old.ref||'KIM-LEGACY-'+(old.id||i+1);
    if(refs.has(ref)){console.log('Skipped existing reference: '+ref);continue;}
    const listing={...old,id:undefined,ref,status:'Draft',published:false,archived:false,type:old.type||'Villa',transaction:old.transaction||'Sale',currency:old.currency||'DA',featured:old.featured===true,imagePaths:[]};
    validateProperty(listing);
    // Existing CMS exports already contain persistent paths from the same project.
    if(old.imagePaths?.length)listing.imagePaths=old.imagePaths;
    else for(const source of [...new Set(old.images?.length?old.images:[old.image].filter(Boolean))]){
      const result=await call('upload','POST',{base64:await imageBytes(source)});listing.imagePaths.push(result.path);
    }
    await call('properties','POST',listing);refs.add(ref);console.log('Imported draft: '+ref);
  }
  console.log('Done. Review the drafts in /admin before publishing.');
}catch(error){muted=false;console.error('\nImport stopped: '+error.message+' Completed records remain saved. Fix the issue and rerun; existing references are skipped.');process.exitCode=1;}
finally{rl.close();if(cookie)await call('logout','POST',{}).catch(()=>{});}
