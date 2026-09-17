import { randomUUID } from 'node:crypto';
import { adminSession, checkOrigin, setSession, supabase, config } from '../server/supabase.js';
import { HttpError, uuid, imagePath, validateProperty, validateUpload } from '../server/validation.js';

async function rows(token, publicOnly = false) {
  const all = [];
  for (let offset=0; ; offset+=500) {
    const page = await supabase(`/rest/v1/properties?select=*&order=updated_at.desc,id&limit=500&offset=${offset}${publicOnly ? '&published=eq.true&archived=eq.false' : ''}`, { token });
    all.push(...page);
    if (page.length < 500) return all;
  }
}
async function signed(path, token) {
  const result = await supabase(`/storage/v1/object/sign/property-images/${path}`, { token, method:'POST', body:{ expiresIn:3600 } });
  return config().url + '/storage/v1' + result.signedURL;
}
async function present(items, token) {
  return Promise.all(items.map(async item => {
    const images = await Promise.all(item.images.map(async path => { try { return await signed(path, token); } catch { return ''; } }));
    return { ...item.data, ...item, data:undefined, category:item.data.category === 'prestige' ? 'prestige' : 'standard', imagePaths:item.images, images, image:images[0] || '',
      area:item.data.area == null ? '' : String(item.data.area), price:String(item.price),
      createdAt:item.created_at, updatedAt:item.updated_at, publishedAt:item.published_at };
  }));
}
async function removeUnused(paths, token) {
  const all = await rows(token);
  const unused = paths.filter(path => !all.some(p => p.images.includes(path)));
  if (unused.length) await supabase('/storage/v1/object/property-images', { token, method:'DELETE', body:{ prefixes:unused } });
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  try {
    checkOrigin(req);
    const action = req.query?.action || new URL(req.url,'https://local').searchParams.get('action');
    let body;
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}; }
    catch { throw new HttpError(400,'Invalid JSON request.'); }
    if(!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400,'Invalid request.');
    if (JSON.stringify(body).length > 2900000) throw new HttpError(413,'Request is too large.');
    if (action === 'login' && req.method === 'POST') {
      if (typeof body.email !== 'string' || typeof body.password !== 'string' || body.email.length > 254 || body.password.length > 256) throw new HttpError(400,'Enter your email and password.');
      let session;
      try { session = await supabase('/auth/v1/token?grant_type=password',{ method:'POST',body:{ email:body.email.trim(),password:body.password } }); }
      catch (error) { if(error.status === 503) throw error; throw new HttpError(401,'Invalid email or password.'); }
      const members = await supabase(`/rest/v1/admin_users?user_id=eq.${session.user.id}&select=user_id`,{ token:session.access_token });
      if(!members.length) throw new HttpError(403,'This account has no administrator access.');
      setSession(res,session);
      return res.status(200).json({ user:{ email:session.user.email } });
    }
    if (action === 'public' && req.method === 'GET') return res.status(200).json({ properties:await present(await rows(undefined,true)) });
    // Clear local credentials even if the provider session has already expired.
    if(action === 'logout' && req.method === 'POST') {
      try {const {token}=await adminSession(req,res);await supabase('/auth/v1/logout?scope=local',{token,method:'POST'});}
      catch(error){if(![401,403].includes(error.status)){setSession(res,null);throw error;}}
      setSession(res,null);return res.status(200).json({ok:true});
    }
    const { token, user } = await adminSession(req,res);
    if (action === 'session' && req.method === 'GET') return res.status(200).json({ user:{ email:user.email } });
    if(action === 'properties' && req.method === 'GET') return res.status(200).json({ properties:await present(await rows(token),token) });
    if(action === 'properties' && ['POST','PUT'].includes(req.method)) {
      const data = validateProperty(body);
      const old = req.method === 'PUT' ? (await supabase(`/rest/v1/properties?id=eq.${uuid(body.id)}&select=*`,{token}))[0] : null;
      if(req.method === 'PUT' && !old) throw new HttpError(404,'Property not found.');
      if(old && body.updatedAt && body.updatedAt !== old.updated_at) throw new HttpError(409,'This listing changed in another session. Reload before editing again.');
      // Verify every reference exists and is accessible before saving permanent image paths.
      await Promise.all(data.images.map(path=>signed(path,token)));
      const result = await supabase('/rest/v1/properties'+(old ? `?id=eq.${old.id}&updated_at=eq.${encodeURIComponent(old.updated_at)}` : ''), { token, method:old?'PATCH':'POST', body:data, headers:{ Prefer:'return=representation' } });
      if(!result.length)throw new HttpError(409,'This listing changed in another session. Reload before editing again.');
      let warning;
      try { if(old) await removeUnused(old.images.filter(path=>!data.images.includes(path)),token); }
      catch { warning='Listing saved; unused image cleanup failed. Retry cleanup from the media library.'; }
      return res.status(old?200:201).json({ property:(await present(result,token))[0], warning });
    }
    if(action === 'properties' && req.method === 'DELETE') {
      const removed = await supabase(`/rest/v1/properties?id=eq.${uuid(body.id)}`,{token,method:'DELETE',headers:{Prefer:'return=representation'}});
      if(!removed.length) throw new HttpError(404,'Property not found.');
      let warning;
      try { await removeUnused(removed[0].images,token); } catch { warning='Listing deleted; some unused files remain in the media library.'; }
      return res.status(200).json({ok:true,warning});
    }
    if(action === 'upload' && req.method === 'POST') {
      const {bytes,ext,mime}=validateUpload(body), path=`${user.id}/${randomUUID()}.${ext}`;
      await supabase(`/storage/v1/object/property-images/${path}`,{token,method:'POST',body:bytes,headers:{'Content-Type':mime,'x-upsert':'false'}});
      return res.status(201).json({path,url:await signed(path,token)});
    }
    if(action === 'media' && req.method === 'GET') {
      const files=[];
      for(let offset=0;;offset+=100) {
        const page=await supabase('/storage/v1/object/list/property-images',{token,method:'POST',body:{prefix:user.id,limit:100,offset}});
        files.push(...page.filter(f=>f.id).map(f=>({path:`${user.id}/${f.name}`,name:f.name})));
        if(page.length<100)break;
      }
      const all=await rows(token);
      return res.status(200).json({files:await Promise.all(files.map(async f=>({...f,used:all.some(p=>p.images.includes(f.path)),url:await signed(f.path,token)})))});
    }
    if(action === 'delete-image' && req.method === 'POST') {
      const path=imagePath(body.path), all=await rows(token);
      if(all.some(p=>p.images.includes(path))) throw new HttpError(409,'Remove this image from all listings and save them first.');
      await removeUnused([path],token);
      return res.status(200).json({ok:true});
    }
    throw new HttpError(405,'Unsupported operation.');
  } catch(error) {
    res.status(error.status || 500).json({error:error.status ? error.message : 'Request failed. Please retry.'});
  }
}
