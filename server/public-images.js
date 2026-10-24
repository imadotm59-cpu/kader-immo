import { supabase, config } from './supabase.js';

// Best-effort reuse within a function instance. Visibility is checked by each
// caller before using this cache; private/admin sessions never share it.
const urls=new Map(),pending=new Map(),MAX_URLS=1000;
export async function publicImage(path) {
  const key=config().url+'\n'+path,now=Date.now(),cached=urls.get(key);
  if(cached&&cached.expiresAt>now+120000)return cached;
  if(pending.has(key))return pending.get(key);
  const request=(async()=>{
    const result=await supabase('/storage/v1/object/sign/property-images/'+path,{method:'POST',body:{expiresIn:3600}});
    const value={url:config().url+'/storage/v1'+result.signedURL,expiresAt:now+3600000};
    urls.delete(key);urls.set(key,value);
    for(const [entry,item] of urls)if(item.expiresAt<=Date.now()+120000)urls.delete(entry);
    while(urls.size>MAX_URLS)urls.delete(urls.keys().next().value);
    return value;
  })();
  pending.set(key,request);
  try{return await request;}finally{pending.delete(key);}
}
