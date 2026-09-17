const TYPES = ['Apartment','Villa','House','Maison','Duplex','Land','Commercial','Office','Other'];
const STATUSES = ['Available','Sold','Rented','Draft'];
export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
export function uuid(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new HttpError(400, 'Invalid property ID.');
  return value;
}
function text(value, max, required = false) {
  if (typeof value !== 'string') { if (required) throw new HttpError(400, 'Missing required text.'); return ''; }
  const result = value.trim().replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  if (result.length > max || (required && !result)) throw new HttpError(400, `Text must contain ${required ? '1' : '0'}–${max} characters.`);
  return result; // Plain text, escaped at the rendering boundary. Never accepted as HTML.
}
function number(value, max, optional = false) {
  if (optional && (value === '' || value == null)) return null;
  const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(/\s/g, '').replace(/(?:DA|DZD|EUR|USD|m²)$/i, '').replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > max) throw new HttpError(400, 'Invalid numeric value.');
  return n;
}
function choice(value, choices) { if (!choices.includes(value)) throw new HttpError(400, 'Invalid property option.'); return value; }
export function imagePath(value) {
  if (typeof value !== 'string' || !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(value)) throw new HttpError(400, 'Invalid image path.');
  return value;
}
export function validateProperty(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new HttpError(400, 'Invalid listing.');
  const price = number(input.price, 1e13);
  const published = input.published === true;
  const status = choice(input.status || 'Draft', STATUSES);
  if (published && status === 'Draft') throw new HttpError(400, 'Choose an availability status before publishing.');
  const images = input.imagePaths || [];
  if (!Array.isArray(images) || images.length > 20 || new Set(images).size !== images.length) throw new HttpError(400, 'Use up to 20 unique images.');
  const features = input.features || [];
  if (!Array.isArray(features) || features.length > 40) throw new HttpError(400, 'Use up to 40 features.');
  const data = {
    type: choice(input.type || 'Villa', TYPES), transaction: choice(input.transaction || 'Sale', ['Sale','Rent']),
    category: choice(input.category || 'standard', ['standard','prestige']),
    currency: choice(input.currency || 'DA', ['DA','EUR','USD']), description: text(input.description, 20000),
    location: text(input.location || input.neighborhood || input.city, 300, published),
    features: features.map(f => text(f, 80, true))
  };
  for (const key of ['wilaya','city','neighborhood','address','mapLocation']) data[key] = text(input[key], 500);
  for (const key of ['area','beds','baths','floor','floors','parking','year']) data[key] = number(input[key], key === 'area' ? 1e8 : 10000, true);
  if (published && (!data.description || !images.length || !data.area || price <= 0)) throw new HttpError(400, 'Publishing requires a price, location, area, description and cover image.');
  return { ref: text(input.ref, 80, true), title: text(input.title, 200, true), price, status, published,
    archived: input.archived === true, featured: input.featured === true, images: images.map(imagePath), data };
}
export function validateUpload(body) {
  if (!body || typeof body.base64 !== 'string' || body.base64.length > 2800000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(body.base64)) throw new HttpError(400, 'Upload a JPEG, PNG or WebP under 2 MB.');
  const bytes = Buffer.from(body.base64, 'base64');
  if (bytes.length < 12 || bytes.length > 2 * 1024 * 1024) throw new HttpError(400, 'Image must be under 2 MB.');
  const ext = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'jpg' : bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'png' : bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP' ? 'webp' : null;
  if (!ext) throw new HttpError(400, 'Only JPEG, PNG and WebP images are supported.');
  return { bytes, ext, mime: ext === 'jpg' ? 'image/jpeg' : `image/${ext}` };
}
