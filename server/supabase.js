import { HttpError } from './validation.js';
export function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new HttpError(503, 'CMS configuration is missing. Follow the production setup guide.');
  let role;
  try {role=JSON.parse(Buffer.from(key.split('.')[1] || '', 'base64url')).role;} catch {}
  if(key.startsWith('sb_secret_') || role === 'service_role') throw new HttpError(503,'Use a publishable or anon key, never a service-role key.');
  return { url, key };
}
export async function supabase(path, { token, method = 'GET', body, headers = {} } = {}) {
  const { url, key } = config();
  const response = await fetch(url + path, { method, headers: { apikey: key,
    ...(token || key.startsWith('eyJ') ? { Authorization: `Bearer ${token || key}` } : {}),
    ...(body && !Buffer.isBuffer(body) ? { 'Content-Type':'application/json' } : {}), ...headers },
    body: body == null ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  const result = await response.text();
  let data; try { data = result ? JSON.parse(result) : null; } catch { data = null; }
  if (!response.ok) {
    if (data?.code === '23505') throw new HttpError(409, 'This reference already exists. Choose another reference.');
    throw new HttpError(response.status === 401 || response.status === 403 ? response.status : 502,
      response.status === 401 ? 'Your session expired. Please sign in again.' : response.status === 403 ? 'Access denied.' : 'Database or storage request failed. Please retry.');
  }
  return data;
}
export function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map(part => { const i=part.indexOf('='); return [part.slice(0,i).trim(), part.slice(i+1)]; }));
}
export function setSession(res, session) {
  const secure = process.env.VERCEL || process.env.APP_ORIGIN?.startsWith('https:') ? '; Secure' : '';
  const common = `; Path=/api; HttpOnly; SameSite=Strict${secure}`;
  res.setHeader('Set-Cookie', [
    `kader_access=${session?.access_token || ''}; Max-Age=${session ? session.expires_in || 3600 : 0}${common}`,
    `kader_refresh=${session?.refresh_token || ''}; Max-Age=${session ? 604800 : 0}${common}`
  ]);
}
export async function adminSession(req, res) {
  const saved = cookies(req);
  let token = saved.kader_access, user;
  if (token) {
    try { user = await supabase('/auth/v1/user', { token }); }
    catch (error) { if (error.status !== 401 && error.status !== 403) throw error; }
  }
  if (!user && saved.kader_refresh) {
    try {
      const session = await supabase('/auth/v1/token?grant_type=refresh_token', { method:'POST', body:{ refresh_token:saved.kader_refresh } });
      token = session.access_token;
      user = await supabase('/auth/v1/user', { token });
      setSession(res, session);
    } catch (error) { setSession(res,null); throw new HttpError(401, 'Please sign in again.'); }
  }
  if (!user) throw new HttpError(401, 'Please sign in.');
  const members = await supabase(`/rest/v1/admin_users?user_id=eq.${user.id}&select=user_id`, { token });
  if (!members?.length) { setSession(res,null); throw new HttpError(403, 'This account has no administrator access.'); }
  return { token, user };
}
export function checkOrigin(req) {
  if (['GET','HEAD'].includes(req.method)) return;
  const allowed = [process.env.APP_ORIGIN, process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`].filter(Boolean).map(x => x.replace(/\/$/, ''));
  if (!allowed.includes(req.headers.origin)) throw new HttpError(403, 'Request origin is not allowed.');
  if (!req.headers['content-type']?.startsWith('application/json')) throw new HttpError(415, 'JSON required.');
}
