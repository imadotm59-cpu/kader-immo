// The browser never receives an Auth token. The API owns HttpOnly session cookies.
const cms = { items:[], user:null, generation:0, dirty:false, busy:false, search:'' };
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
const cmsMessageTranslations = {
  'Invalid property ID.':'Identifiant du bien invalide.','Missing required text.':'Un texte obligatoire est manquant.','Invalid numeric value.':'Valeur numérique invalide.','Invalid property option.':'Option de bien invalide.','Invalid image path.':'Chemin de la photo invalide.','Invalid listing.':'Bien invalide.','Invalid unit.':'Unité invalide.','Choose an availability status before publishing.':'Choisissez un statut de disponibilité avant de publier.','Use up to 20 unique images.':'Ajoutez au maximum 20 photos différentes.','Use up to 20 unique unit images.':'Associez au maximum 20 photos différentes par unité.','Use up to 40 features.':'Ajoutez au maximum 40 équipements.','Use up to 50 units.':'Ajoutez au maximum 50 unités.','Use unique unit names.':'Utilisez un nom ou une référence unique pour chaque unité.','Unit images must belong to the property gallery.':'Les photos d’une unité doivent provenir de la galerie du bien.','Publishing requires a price, location, area, description and cover image.':'La publication nécessite un prix, une localisation, une surface, une description et une photo de couverture.','Upload a JPEG, PNG or WebP under 2 MB.':'Ajoutez une image JPEG, PNG ou WebP de moins de 2 Mo.','Image must be under 2 MB.':'La photo doit peser moins de 2 Mo.','Only JPEG, PNG and WebP images are supported.':'Seules les images JPEG, PNG et WebP sont acceptées.','CMS configuration is missing. Follow the production setup guide.':'La configuration du CMS est incomplète. Consultez le guide de mise en production.','Use a publishable or anon key, never a service-role key.':'Utilisez une clé publique ou anonyme, jamais une clé de rôle de service.','This reference already exists. Choose another reference.':'Cette référence existe déjà. Choisissez-en une autre.','Your session expired. Please sign in again.':'Votre session a expiré. Veuillez vous reconnecter.','Access denied.':'Accès refusé.','Database or storage request failed. Please retry.':'La requête vers la base de données ou le stockage a échoué. Veuillez réessayer.','Please sign in again.':'Veuillez vous reconnecter.','Please sign in.':'Veuillez vous connecter.','This account has no administrator access.':'Ce compte ne dispose pas des droits d’administration.','Request origin is not allowed.':'L’origine de la requête n’est pas autorisée.','JSON required.':'Une requête JSON est requise.','Invalid JSON request.':'Requête JSON invalide.','Invalid request.':'Requête invalide.','Request is too large.':'La requête est trop volumineuse.','Enter your email and password.':'Saisissez votre adresse e-mail et votre mot de passe.','Invalid email or password.':'Adresse e-mail ou mot de passe incorrect.','Property not found.':'Bien introuvable.','This listing changed in another session. Reload before editing again.':'Ce bien a été modifié dans une autre session. Rechargez la page avant de reprendre vos modifications.','Listing saved; unused image cleanup failed. Retry cleanup from the media library.':'Le bien a été enregistré, mais le nettoyage des photos inutilisées a échoué. Réessayez depuis la médiathèque.','Listing deleted; some unused files remain in the media library.':'Le bien a été supprimé, mais certains fichiers inutilisés restent dans la médiathèque.','Remove this image from all listings and save them first.':'Retirez cette photo de tous les biens, puis enregistrez-les avant de la supprimer.','Unsupported operation.':'Opération non prise en charge.'
};
function cmsMessage(message) {
  const text=String(message||'');
  if(cmsMessageTranslations[text])return cmsMessageTranslations[text];
  const length=text.match(/^Text must contain (\d+)–(\d+) characters\.$/);
  return length?`Le texte doit contenir entre ${length[1]} et ${length[2]} caractères.`:text;
}
function safeValue(value) {
  if(Array.isArray(value))return value.map(safeValue);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,safeValue(item)]));
  return typeof value==='string'?escapeHtml(value):value;
}
function safeProperty(item) { return {category:'standard',units:[],...safeValue(item)}; }
function descriptionHtml(escaped) {
  // Tiny Markdown subset. Input MUST already be escaped; raw HTML is never rendered.
  return String(escaped || '').split('\n').map(line=>{
    const content=line.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>');
    return line.startsWith('## ')?`<h3>${content.slice(3)}</h3>`:line.startsWith('- ')?`<ul><li>${content.slice(2)}</li></ul>`:`<p>${content || '<br>'}</p>`;
  }).join('');
}
function displayDate(value) { return value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleDateString('fr-DZ') : '—'; }
function currentRoute() { return location.hash.startsWith('#/') ? location.hash.slice(1) : /^\/admin(?:\/|$)/.test(location.pathname) ? location.pathname : '/'; }
function navigate(path) { if(currentRoute()===path) render(); else location.hash='#'+path; }
function propertySkeletonCards(count = 3) {
  const card = `<article class="card skeleton-property-card" aria-hidden="true">
    <div class="card-photo skeleton skeleton-property-image"></div>
    <div class="card-body skeleton-property-body">
      <div class="skeleton skeleton-type"></div>
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-location"></div>
      <div class="meta skeleton-property-meta">
        <div class="skeleton skeleton-price"></div>
        <div class="skeleton skeleton-details"></div>
      </div>
    </div>
  </article>`;
  return card.repeat(count);
}
function detailLoading() {
  return `${header()}<main id="content" class="detail cms-detail-skeleton" aria-busy="true">
    <span class="sr-only">Les informations du bien sont en cours de mise à jour.</span>
    <div class="shell">
      <p class="crumbs"><a href="#/biens">Biens disponibles</a></p>
      <div class="detail-title" aria-hidden="true"><div class="skeleton-detail-heading"><div class="skeleton skeleton-type"></div><div class="skeleton skeleton-detail-name"></div><div class="skeleton skeleton-location"></div></div><div class="skeleton skeleton-detail-price"></div></div>
      <section class="skeleton-detail-gallery" aria-hidden="true"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></section>
      <section class="detail-grid" aria-hidden="true"><div class="skeleton-detail-copy"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line short"></div></div><div class="form-card"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-form-field"></div><div class="skeleton skeleton-form-field"></div></div></section>
    </div>
  </main>${footer()}`;
}
function adminLoading(route) {
  const section=route.replace('/admin','').split('/')[1] || 'dashboard';
  return dashShell(section==='editor'?'add':section,`<div class="cms-admin-loading" aria-busy="true"><span class="sr-only">Les annonces sont en cours de mise à jour.</span><div class="skeleton skeleton-admin-title" aria-hidden="true"></div><div class="skeleton-admin-kpis" aria-hidden="true">${'<div class="skeleton skeleton-admin-kpi"></div>'.repeat(4)}</div><div class="skeleton-property-grid">${propertySkeletonCards()}</div></div>`);
}
function loadingScreen(route, admin) {
  if (admin) return adminLoading(route);
  if (route === '/') return home(true);
  if (route === '/biens' || route === '/biens/prestige') return listings(true,route === '/biens/prestige');
  if (route.startsWith('/bien/')) return detailLoading();
  return `${header()}<main id="content"></main>${footer()}`;
}
function bindLoadingChrome() {
  bindGlobal();
  $('#dash-theme')?.addEventListener('click',()=>{localStorage.setItem('kader-theme',getTheme()==='dark'?'light':'dark');applyPreferences();});
  $('.drawer-toggle')?.addEventListener('click',()=>$('#dash-sidebar')?.classList.add('open'));
  $('.close-drawer')?.addEventListener('click',()=>$('#dash-sidebar')?.classList.remove('open'));
}
function revealContent() {
  app.classList.remove('cms-reveal');
  void app.offsetWidth;
  app.classList.add('cms-reveal');
  setTimeout(()=>app.classList.remove('cms-reveal'),320);
}
// Serialize API calls to avoid concurrent refresh-token rotation in this tab.
let apiQueue=Promise.resolve();
function api(action, method='GET', body) {
  const request=async()=>{
    let response;
    try { response=await fetch('/api/cms?action='+encodeURIComponent(action),{method,credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)}); }
    catch { throw new Error('La connexion a échoué. Vos modifications n’ont pas été confirmées. Veuillez réessayer.'); }
    const result=await response.json().catch(()=>({error:'Réponse inattendue du serveur.'}));
    if(!response.ok) { const error=new Error(cmsMessage(result.error || 'La requête a échoué.'));error.status=response.status;throw error; }
    return result;
  };
  const pending=apiQueue.then(request,request); apiQueue=pending.catch(()=>{});return pending;
}
function message(text) { toast(escapeHtml(text)); }
function formError(form,error) {
  let node=$('.cms-error',form);
  if(!node){node=document.createElement('p');node.className='cms-error';node.setAttribute('role','alert');node.tabIndex=-1;form.prepend(node);}
  node.textContent=error.message || error;node.focus();
}
function setBusy(form,busy) { cms.busy=busy;$$('button,input,select,textarea',form).forEach(el=>el.disabled=busy);form.setAttribute('aria-busy',String(busy)); }
function paint() {
  const route=currentRoute();
  app.innerHTML=route.startsWith('/admin')?adminDashboard():route==='/biens'||route==='/biens/prestige'?listings(false,route==='/biens/prestige'):route.startsWith('/bien/')?detail(route.split('/')[2]):route==='/agence'?agency():route==='/services'?services():route==='/contact'?contact():home();
  bindGlobal();bindForms();bindListings();bindUnits();bindCMS();
  $('.rich-text')?.setAttribute('aria-label','Description du bien');
  $('#global-search')?.setAttribute('aria-label','Rechercher dans tous les biens puis appuyer sur Entrée');
  $('#listing-search')?.setAttribute('aria-label','Rechercher des biens');
  const gallery=$('.gallery');
  if(gallery){gallery.tabIndex=0;gallery.setAttribute('aria-label','Galerie de photos du bien ; utilisez les flèches gauche et droite');gallery.onkeydown=event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();gallery.scrollBy({left:gallery.clientWidth*(event.key==='ArrowRight'?1:-1),behavior:'smooth'});}};}
  // Existing form design uses adjacent labels. Associate them without changing layout.
  $$('.field',app).forEach((field,i)=>{const input=$('input,textarea',field),label=$('label',field);if(input&&label){input.id||='field-'+i;label.htmlFor=input.id;}});
  $$('button[title]',app).forEach(b=>b.setAttribute('aria-label',b.title));
  $$('img',app).forEach(img=>{if(!img.getAttribute('src')){img.removeAttribute('src');img.alt='Aucune photo';img.classList.add('cms-image-empty');}});
  revealContent();
}
async function render() {
  const turn=++cms.generation, route=currentRoute(),admin=route.startsWith('/admin');
  document.body.classList.toggle('detail-route',route.startsWith('/bien/'));
  cms.dirty=false;
  app.classList.remove('cms-reveal');
  app.innerHTML=loadingScreen(route,admin);
  applyPreferences();bindLoadingChrome();
  try {
    if(!admin && ['/contact','/agence','/services'].includes(route)){cms.items=[];paint();return;}
    if(admin){
      try {cms.user=(await api('session')).user;} catch(error){if([401,403].includes(error.status)){cms.user=null;cms.items=[];if(turn===cms.generation)paint();return;}throw error;}
    }
    const result=await api(admin?'properties':'public');
    if(turn!==cms.generation)return;
    cms.items=result.properties;paint();
  } catch(error) {
    if(turn!==cms.generation)return;
    cms.items=[];
    app.innerHTML=`${admin?'':header()}<main class="cms-state"><h1>${admin?'Administration temporairement indisponible':'Les biens sont temporairement indisponibles'}</h1><p role="alert">${escapeHtml(cmsMessage(error.message))}</p><button class="primary-button" id="cms-retry">Réessayer</button><p><a href="tel:0796265326">0796 26 53 26</a> · <a href="#/contact">Contact</a></p></main>`;
    $('#cms-retry').onclick=render;bindGlobal();revealContent();
  }
}
function modal(title,body) {
  const dialog=document.createElement('dialog');dialog.className='cms-dialog';
  dialog.innerHTML=`<div class="cms-dialog-head"><h2>${escapeHtml(title)}</h2><button type="button" aria-label="Fermer">×</button></div>${body}`;
  document.body.append(dialog);$('.cms-dialog-head button',dialog).onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();return dialog;
}
function confirmAction(text) {
  return new Promise(resolve=>{
    const dialog=modal('Confirmer l’action',`<p>${escapeHtml(text)}</p><div class="cms-confirm"><button data-cancel>Annuler</button><button class="primary-button" data-confirm>Confirmer</button></div>`);
    let accepted=false;
    $('[data-cancel]',dialog).onclick=()=>dialog.close();
    $('[data-confirm]',dialog).onclick=()=>{accepted=true;dialog.close();};
    dialog.addEventListener('close',()=>resolve(accepted),{once:true});
  });
}
function exportData() {
  const blob=new Blob([JSON.stringify(cms.items,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='kader-listings-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function bindCMS() {
  const passwordToggle=$('.password-toggle'),passwordInput=$('#admin-password');
  if(passwordToggle&&passwordInput) passwordToggle.addEventListener('click',()=>{
    const show=passwordInput.type==='password';
    passwordInput.type=show?'text':'password';
    passwordToggle.setAttribute('aria-pressed',String(show));
    passwordToggle.setAttribute('aria-label',show?'Masquer le mot de passe':'Afficher le mot de passe');
    $('span',passwordToggle).textContent=show?'Masquer':'Afficher';
  });
  $('#login-form')?.addEventListener('submit',async event=>{
    event.preventDefault();const form=event.currentTarget,values=Object.fromEntries(new FormData(form));
    if(!values.email.trim() || !values.password){formError(form,'Saisissez votre adresse e-mail et votre mot de passe.');return;}
    setBusy(form,true);
    try {cms.user=(await api('login','POST',values)).user;form.reset();await render();}
    catch(error){formError(form,error);}finally{setBusy(form,false);}
  });
  $('[data-logout]')?.addEventListener('click',async event=>{
    event.currentTarget.disabled=true;
    try {await api('logout','POST',{});cms.user=null;cms.items=[];await render();}
    catch(error){message(cmsMessage(error.message));event.target.disabled=false;}
  });
  $('#dash-theme')?.addEventListener('click',()=>{localStorage.setItem('kader-theme',getTheme()==='dark'?'light':'dark');applyPreferences();});
  $('.drawer-toggle')?.addEventListener('click',()=>$('#dash-sidebar').classList.add('open'));
  $('.close-drawer')?.addEventListener('click',()=>$('#dash-sidebar').classList.remove('open'));
  $$('.profile-button,.dash-user').forEach(b=>b.onclick=()=>navigate('/admin/settings'));
  $$('.head-actions .ghost-button').filter(b=>b.textContent.includes('Export')).forEach(b=>b.onclick=exportData);
  const global=$('#global-search');
  if(global){global.value=cms.search;global.onkeydown=event=>{if(event.key==='Enter'){cms.search=global.value;navigate('/admin/listings');}};}
  app.onclick=async event=>{
    const b=event.target.closest('[data-action]');if(!b)return;
    const item=cms.items.find(p=>p.id===b.dataset.id);if(!item)return;
    try {await listingAction(b.dataset.action,item);}catch(error){message(cmsMessage(error.message));}
  };
  bindManagement();bindEditor();
  if($('#media-library'))loadMedia();
}
async function listingAction(action,item) {
  if(action==='edit'){navigate('/admin/editor/'+item.id);return;}
  if(action==='preview'){navigate('/admin/preview/'+item.id);return;}
  if(action==='more'){
    const options=[['edit','Modifier'],['preview','Aperçu'],['duplicate','Dupliquer'],[item.published?'unpublish':'publish',item.published?'Dépublier':'Publier'],['status','Changer le statut'],[item.archived?'restore':'archive',item.archived?'Restaurer':'Archiver'],['delete','Supprimer définitivement']];
    const d=modal(item.title,`<div class="cms-action-list">${options.map(([key,label])=>`<button data-command="${key}">${label}</button>`).join('')}</div>`);
    $$('[data-command]',d).forEach(b=>b.onclick=async()=>{d.close();try{await listingAction(b.dataset.command,item);}catch(e){message(cmsMessage(e.message));}});return;
  }
  if(action==='status'){
    const d=modal('Disponibilité','<label>Statut<select id="status-choice">'+['Available','Sold','Rented','Draft'].map(s=>`<option value="${s}" ${s===item.status?'selected':''}>${statusLabel(s)}</option>`).join('')+'</select></label><button class="primary-button" id="confirm-status">Enregistrer le statut</button>');
    $('#confirm-status',d).onclick=async event=>{event.target.disabled=true;try{const status=$('#status-choice',d).value;await api('properties','PUT',{...item,status,published:status==='Draft'?false:item.published});d.close();await render();message('Statut enregistré.');}catch(e){formError(d,e);event.target.disabled=false;}};return;
  }
  if(action==='delete'&&!await confirmAction('Supprimer définitivement ce bien ? Cette action est irréversible. Archivez-le plutôt si vous pourriez en avoir besoin ultérieurement.'))return;
  if(action==='publish'&&!await confirmAction('Publier ce bien sur le site public ?'))return;
  let result;
  if(action==='delete')result=await api('properties','DELETE',{id:item.id});
  else {
    const data={...item};
    if(action==='duplicate'){delete data.id;data.ref=item.ref.slice(0,60)+'-COPY-'+crypto.randomUUID().slice(0,6);data.title=item.title.slice(0,185)+' (copie)';data.status='Draft';data.published=false;data.archived=false;}
    if(action==='publish'){data.published=true;data.archived=false;}
    if(action==='unpublish')data.published=false;
    if(action==='archive'){data.archived=true;data.published=false;}
    if(action==='restore')data.archived=false;
    result=await api('properties',action==='duplicate'?'POST':'PUT',data);
  }
  await render();message(cmsMessage(result.warning) || 'Bien mis à jour.');
}
function bindManagement() {
  const search=$('#listing-search');if(!search)return;
  const filters=$('.listing-filters');
  $$('[data-filter-menu]',filters).forEach(b=>b.remove());
  const choices={category:['All','standard','prestige'],status:['All','Published','Unpublished','Available','Sold','Rented','Draft','Archived'],type:['All','Apartment','Villa','House','Maison','Duplex','Land','Commercial','Office','Other'],transaction:['All','Sale','Rent']};
  search.value=cms.search;
  Object.entries(choices).forEach(([name,values])=>{
    const label=document.createElement('label');label.className='cms-filter';label.textContent={category:'Catégorie',status:'Statut',type:'Type de bien',transaction:'Transaction'}[name];
    const select=document.createElement('select');select.name=name;values.forEach(v=>select.add(new Option(v==='All'?'Tous':name==='category'?categoryLabel(v):name==='status'?statusLabel(v):name==='type'?typeLabel(v):transactionLabel(v),v)));label.append(select);filters.append(label);
  });
  for(const [name,label,type] of [['location','Localisation','search'],['min','Prix minimum','number'],['max','Prix maximum','number'],['beds','Chambres (minimum)','number']])filters.insertAdjacentHTML('beforeend',`<label class="cms-filter">${label}<input name="${name}" type="${type}" min="0"></label>`);
  function draw(){
    const value=name=>$(`[name="${name}"]`,filters).value,term=search.value.toLowerCase();
    const result=cms.items.filter(p=>{
      const status=value('status'),match=status==='All'||status==='Published'&&p.published&&!p.archived||status==='Unpublished'&&!p.published||status==='Archived'&&p.archived||p.status===status;
      return match&&`${p.title} ${p.ref} ${p.location} ${p.type} ${categoryLabel(p.category)}`.toLowerCase().includes(term)&&(value('category')==='All'||p.category===value('category'))&&(value('type')==='All'||p.type===value('type'))&&(value('transaction')==='All'||p.transaction===value('transaction'))&&(p.location||'').toLowerCase().includes(value('location').toLowerCase())&&(!value('min')||Number(p.price)>=Number(value('min')))&&(!value('max')||Number(p.price)<=Number(value('max')))&&(!value('beds')||Number(p.beds)>=Number(value('beds')));
    }).map(safeProperty);
    // Legacy test marker: No matching properties.
    $('#management-list').innerHTML=listingsRows(result)||'<tr><td colspan="7">Aucun bien ne correspond. Ajoutez un bien ou modifiez vos filtres.</td></tr>';
    $('#listing-grid-view').innerHTML=result.map(p=>`<article class="admin-property-card">${p.image?`<img src="${p.image}" alt="${p.title}" loading="lazy">`:''}<div><h3>${p.title}</h3><small>${p.ref} · ${p.location}</small><p>${money(p)}</p><p>${typeLabel(p.type)} · ${categoryLabel(p.category)} · ${p.area} m² · ${p.beds ?? '—'} ch. · ${p.baths ?? '—'} sdb</p><span class="status ${statusClass(p.status)}">${statusLabel(p.status)}</span><p>${p.archived?'Archivé':p.published?'Publié':'Non publié'} · ${displayDate(p.updatedAt)}</p></div><button data-action="more" data-id="${p.id}">Gérer le bien →</button></article>`).join('')||'<p>Aucun bien ne correspond.</p>';
    $('.management-summary b').textContent=result.length+' bien'+(result.length>1?'s':'');
  }
  filters.addEventListener('input',draw);filters.addEventListener('change',draw);
  $$('[data-view]').forEach(b=>{b.setAttribute('aria-label',b.dataset.view==='grid'?'Vue en grille':'Vue en tableau');b.onclick=()=>{$('.table-view').classList.toggle('hidden',b.dataset.view==='grid');$('#listing-grid-view').classList.toggle('hidden',b.dataset.view==='table');$$('[data-view]').forEach(x=>x.classList.toggle('active',x===b));};});draw();
}
function collectUnits(form) {
  return $$('.unit-editor-card',form).map(card=>({
    name:$('[data-unit-field="name"]',card).value,
    area:$('[data-unit-field="area"]',card).value,
    price:$('[data-unit-field="price"]',card).value,
    beds:$('[data-unit-field="beds"]',card).value,
    floor:$('[data-unit-field="floor"]',card).value,
    status:$('[data-unit-field="status"]',card).value,
    imagePaths:$$('[data-unit-image]:checked',card).map(input=>input.value)
  }));
}
function collectEditor(form,mode='changes') {
  const values=Object.fromEntries(new FormData(form)),id=form.dataset.id,old=cms.items.find(p=>p.id===id)||{};
  return {...old,...values,id:id||undefined,price:values.price || '0',featured:form.elements.featured.checked,
    published:mode==='publish'?true:mode==='draft'?false:form.elements.published.checked,
    status:mode==='draft'?'Draft':values.status,archived:mode==='publish'?false:old.archived||false,
    location:[values.neighborhood,values.city].filter(Boolean).join(', '), units:collectUnits(form),
    features:$$('.feature-token.selected',form).map(b=>b.dataset.feature),imagePaths:$$('#media-grid figure',form).map(f=>f.dataset.path)};
}
function readImage(file) {
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2097152)throw new Error('Choisissez des images JPEG, PNG ou WebP de 2 Mo maximum chacune.');
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(new Error('Impossible de lire cette photo.'));reader.readAsDataURL(file);});
}
function mediaFigure(path,url) {
  const f=document.createElement('figure');f.draggable=true;f.dataset.path=path;
  f.innerHTML=`<img src="${escapeHtml(url)}" alt="Photo du bien"><figcaption></figcaption><div class="cms-image-actions"><button type="button" data-image="preview" aria-label="Aperçu de la photo">↗</button><button type="button" data-image="left" aria-label="Déplacer la photo vers la gauche">←</button><button type="button" data-image="right" aria-label="Déplacer la photo vers la droite">→</button><button type="button" data-image="cover">Couverture</button><button type="button" data-image="replace">Remplacer</button><button type="button" data-image="remove" aria-label="Supprimer la photo">×</button></div>`;return f;
}
function bindEditor() {
  const form=$('#property-editor-v2');if(!form)return;
  const media=$('#media-grid'),uploader=$('#image-uploader');
  $('#image-uploader').accept='image/jpeg,image/png,image/webp';
  let refreshUnitImages=()=>{};
  const renumber=()=>{$$('figure',media).forEach((f,i)=>{$('figcaption',f).textContent=i===0?'Photo de couverture':'Photo '+(i+1);});refreshUnitImages();};
  $$('figure',media).forEach(f=>f.replaceWith(mediaFigure(f.dataset.path,$('img',f).getAttribute('src'))));renumber();
  form.addEventListener('input',()=>cms.dirty=true);
  async function upload(files,replace){
    setBusy(form,true);
    try{
      if($$('figure',media).length+files.length-(replace?1:0)>20)throw new Error('Vous pouvez ajouter au maximum 20 photos par bien.');
      for(const file of files){const base64=await readImage(file),result=await api('upload','POST',{base64}),figure=mediaFigure(result.path,result.url);if(replace){replace.replaceWith(figure);replace=null;}else media.insertBefore(figure,$('.upload-tile',media));cms.dirty=true;renumber();}
    }catch(error){formError(form,error);}finally{setBusy(form,false);uploader.value='';}
  }
  uploader.onchange=()=>upload([...uploader.files]);
  media.onclick=event=>{
    const b=event.target.closest('[data-image]');if(!b||cms.busy)return;
    const f=b.closest('figure'),action=b.dataset.image;
    if(action==='preview'){modal('Photo du bien',`<img class="cms-full-image" src="${escapeHtml($('img',f).src)}" alt="Photo du bien">`);return;}
    if(action==='replace'){const input=document.createElement('input');input.type='file';input.accept=uploader.accept;input.onchange=()=>input.files.length&&upload([...input.files],f);input.click();return;}
    if(action==='remove')f.remove();
    if(action==='cover')media.prepend(f);
    if(action==='left'&&f.previousElementSibling?.tagName==='FIGURE')media.insertBefore(f,f.previousElementSibling);
    if(action==='right'&&f.nextElementSibling?.tagName==='FIGURE')media.insertBefore(f.nextElementSibling,f);
    cms.dirty=true;renumber();
  };
  let dragged;
  media.ondragstart=event=>{if(cms.busy){event.preventDefault();return;}dragged=event.target.closest('figure');};
  media.ondragover=event=>event.preventDefault();
  media.ondrop=event=>{event.preventDefault();const target=event.target.closest('figure');if(dragged&&target&&dragged!==target){media.insertBefore(dragged,target);cms.dirty=true;renumber();}dragged=null;};
  // Keep custom features when reopening existing listings.
  const old=cms.items.find(p=>p.id===form.dataset.id);
  const unitList=$('#unit-editor-list',form),unitCount=$('#available-unit-count',form);
  const updateUnitCount=()=>{const count=$$('.unit-editor-card',unitList).filter(card=>$('[data-unit-field="status"]',card).value==='Available').length;unitCount.textContent=count===1?'1 appartement disponible':`${count} appartements disponibles`;};
  const unitCard=(unit={})=>{
    const card=document.createElement('article');card.className='unit-editor-card';card._selectedImages=new Set(unit.imagePaths||[]);
    card.innerHTML=`<div class="unit-card-head"><strong>Unité</strong><div><button type="button" data-unit-action="up" aria-label="Déplacer l’unité vers le haut">↑</button><button type="button" data-unit-action="down" aria-label="Déplacer l’unité vers le bas">↓</button><button type="button" data-unit-action="remove" aria-label="Supprimer l’unité">×</button></div></div><div class="unit-fields"><label class="unit-name">Nom / Référence de l’unité<input data-unit-field="name" value="${escapeHtml(unit.name||'')}" maxlength="100" placeholder="Ex. : Appartement A-01" required></label><label>Surface (m²)<input data-unit-field="area" type="number" min="0" value="${unit.area??''}"></label><label>Prix<input data-unit-field="price" inputmode="decimal" value="${unit.price??''}"></label><label>Chambres<input data-unit-field="beds" type="number" min="0" value="${unit.beds??''}"></label><label>Étage<input data-unit-field="floor" type="number" min="0" value="${unit.floor??''}"></label><label>Statut<select data-unit-field="status"><option value="Available" ${unit.status!=='Sold'&&unit.status!=='Reserved'?'selected':''}>Disponible</option><option value="Sold" ${unit.status==='Sold'?'selected':''}>Vendu</option><option value="Reserved" ${unit.status==='Reserved'?'selected':''}>Réservé</option></select></label></div><details class="unit-images"><summary>Photos spécifiques (<span>0</span>)</summary><div class="unit-image-options"></div><small>Facultatif — choisissez des photos déjà ajoutées à la galerie du bien.</small></details>`;
    return card;
  };
  refreshUnitImages=()=>{
    const figures=$$('figure',media).map((figure,index)=>({path:figure.dataset.path,url:$('img',figure).src,label:index===0?'Photo de couverture':'Photo '+(index+1)}));
    $$('.unit-editor-card',unitList).forEach(card=>{
      const existing=$$('[data-unit-image]:checked',card).map(input=>input.value),selected=new Set(existing.length||$$('[data-unit-image]',card).length?existing:[...card._selectedImages]);
      card._selectedImages=selected;
      const options=$('.unit-image-options',card);
      options.innerHTML=figures.length?figures.map(image=>`<label><input type="checkbox" data-unit-image value="${escapeHtml(image.path)}" ${selected.has(image.path)?'checked':''}><img src="${escapeHtml(image.url)}" alt=""><span>${image.label}</span></label>`).join(''):'<p>Ajoutez d’abord des photos dans la galerie du bien.</p>';
      $('.unit-images summary span',card).textContent=figures.filter(image=>selected.has(image.path)).length;
    });
  };
  for(const unit of old?.units||[])unitList.append(unitCard(unit));
  refreshUnitImages();updateUnitCount();
  $('#add-unit',form).onclick=()=>{if($$('.unit-editor-card',unitList).length>=50){formError(form,'Vous pouvez ajouter au maximum 50 unités.');return;}unitList.append(unitCard());refreshUnitImages();updateUnitCount();cms.dirty=true;};
  const updateUnitControl=event=>{if(event.target.matches('[data-unit-field="status"]'))updateUnitCount();if(event.target.matches('[data-unit-image]'))$('.unit-images summary span',event.target.closest('.unit-editor-card')).textContent=$$('[data-unit-image]:checked',event.target.closest('.unit-editor-card')).length;};
  unitList.addEventListener('input',updateUnitControl);
  unitList.addEventListener('change',updateUnitControl);
  unitList.addEventListener('click',async event=>{
    const button=event.target.closest('[data-unit-action]');if(!button)return;
    const card=button.closest('.unit-editor-card'),action=button.dataset.unitAction;
    if(action==='remove'){if(!await confirmAction('Retirer cette unité de l’annonce ?'))return;card.remove();}
    if(action==='up'&&card.previousElementSibling)unitList.insertBefore(card,card.previousElementSibling);
    if(action==='down'&&card.nextElementSibling)unitList.insertBefore(card.nextElementSibling,card);
    updateUnitCount();cms.dirty=true;
  });
  for(const feature of old?.features||[])if(!$$('[data-feature]',form).some(b=>b.dataset.feature===feature))addFeature(feature);
  function addFeature(value){const b=document.createElement('button');b.type='button';b.className='feature-token selected';b.dataset.feature=value;b.textContent='✓ '+value;$('.custom-feature',form).before(b);}
  $('.feature-list',form).onclick=event=>{
    const b=event.target.closest('button');if(!b)return;
    if(b.classList.contains('custom-feature')){const value=prompt('Nom de l’équipement (80 caractères maximum)')?.trim();if(value&&value.length<=80&&!$$('[data-feature]',form).some(x=>x.dataset.feature===value))addFeature(value);}
    else {b.classList.toggle('selected');b.textContent=(b.classList.contains('selected')?'✓ ':'')+(featureLabels[b.dataset.feature]||b.dataset.feature);}
    cms.dirty=true;
  };
  $('.location-map button',form).onclick=()=>{$('.location-map iframe',form).src='https://www.google.com/maps?q='+encodeURIComponent(form.elements.mapLocation.value||form.elements.neighborhood.value+', '+form.elements.city.value)+'&output=embed';cms.dirty=true;};
  const history=[],desc=form.elements.description;
  $$('.rich-toolbar button',form).forEach((b,i)=>{b.title=['Gras','Italique','Titre','Liste','Annuler la mise en forme'][i];b.onclick=()=>{if(i===4){if(history.length)desc.value=history.pop();}else{history.push(desc.value);const a=desc.selectionStart,z=desc.selectionEnd,selected=desc.value.slice(a,z)||'Texte',wrapped=i===0?'**'+selected+'**':i===1?'*'+selected+'*':i===2?'\n## '+selected:'\n- '+selected;desc.setRangeText(wrapped,a,z,'select');}desc.focus();cms.dirty=true;};});
  $('[data-preview-editor]').onclick=()=>{
    const p=safeProperty(collectEditor(form));
    modal('Aperçu du bien non enregistré',`<div class="cms-preview">${$$('figure img',media).map(i=>`<img src="${escapeHtml(i.src)}" alt="Photo du bien">`).join('')}<h2>${p.title}</h2><p>${money(p)} · ${p.location}</p><p>${p.area} m² · ${p.beds} chambres · ${p.baths} salles de bain · ${typeLabel(p.type)} · ${categoryLabel(p.category)}</p>${p.units.length?`<p><strong>${availableUnitsText(p)}</strong></p>`:''}${descriptionHtml(p.description)}<p>${p.features.join(' · ')}</p><iframe title="Localisation du bien" src="https://www.google.com/maps?q=${encodeURIComponent(p.mapLocation||p.location)}&output=embed"></iframe><a href="tel:0796265326">Contacter Kader : 0796 26 53 26</a></div>`);
  };
  form.onsubmit=async event=>{
    event.preventDefault();if(cms.busy)return;
    const mode=event.submitter?.dataset.save||'changes',data=collectEditor(form,mode);
    if(!data.title.trim()||!data.ref.trim()){formError(form,'Le titre et la référence du bien sont obligatoires.');return;}
    if(data.units.some(unit=>!unit.name.trim())){formError(form,'Chaque unité doit avoir un nom ou une référence.');return;}
    if(data.published&&!await confirmAction('Enregistrer et rendre ce bien visible sur le site public ?'))return;
    setBusy(form,true);
    try{const result=await api('properties',data.id?'PUT':'POST',data);cms.dirty=false;message(cmsMessage(result.warning)||'Bien enregistré avec succès.');navigate('/admin/listings');}
    catch(error){formError(form,error);}finally{setBusy(form,false);}
  };
}
async function loadMedia() {
  const target=$('#media-library');
  try{
    const result=await api('media');if(!target.isConnected)return;
    target.className='cms-media-library';target.innerHTML=result.files.map(f=>`<article><img src="${escapeHtml(f.url)}" alt="Photo du bien" loading="lazy"><p>${f.used?'Utilisée dans un bien':'Fichier inutilisé'}</p><button data-path="${escapeHtml(f.path)}" ${f.used?'disabled':''}>Supprimer la photo inutilisée</button></article>`).join('')||'<p>Aucune photo ajoutée pour le moment.</p>';
    $$('button',target).forEach(b=>b.onclick=async()=>{if(!await confirmAction('Supprimer définitivement cette photo inutilisée ?'))return;b.disabled=true;try{await api('delete-image','POST',{path:b.dataset.path});loadMedia();}catch(e){message(cmsMessage(e.message));b.disabled=false;}});
  }catch(error){target.textContent=cmsMessage(error.message);const b=document.createElement('button');b.textContent='Réessayer';b.onclick=loadMedia;target.append(b);}
}
document.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'&&$('#global-search')){event.preventDefault();$('#global-search').focus();}if(event.key==='Escape')$('#dash-sidebar')?.classList.remove('open');});
document.addEventListener('click',async event=>{const a=event.target.closest('a[href]');if(cms.busy&&a){event.preventDefault();message('Veuillez attendre la fin de l’opération en cours.');return;}if(cms.dirty&&a&&a.hash!==location.hash){event.preventDefault();if(await confirmAction('Abandonner les modifications non enregistrées ? Les photos ajoutées mais inutilisées pourront être supprimées depuis la médiathèque.')){cms.dirty=false;location.href=a.href;}}},true);
window.addEventListener('beforeunload',event=>{if(cms.dirty||cms.busy){event.preventDefault();event.returnValue='';}});
window.addEventListener('hashchange',()=>{window.scrollTo(0,0);render();});
// Every visitor reads shared data; open public pages revalidate periodically.
setInterval(async()=>{
  if(document.hidden||currentRoute().startsWith('/admin')||document.activeElement?.matches('input,textarea,select'))return;
    const turn=cms.generation;
    try{
      const {properties:items}=await api('public');if(turn!==cms.generation)return;
      $('#cms-refresh-error')?.remove();
      const changed=JSON.stringify(items.map(p=>[p.id,p.updatedAt]))!==JSON.stringify(cms.items.map(p=>[p.id,p.updatedAt]));
      // Renew URLs without rebuilding the page or clearing filters/contact input.
      const urls=new Map();
      for(const old of cms.items){const next=items.find(p=>p.id===old.id);if(next)old.imagePaths.forEach((path,i)=>{const j=next.imagePaths.indexOf(path);if(j>=0&&old.images[i])urls.set(old.images[i],next.images[j]);});}
      $$('img',app).forEach(img=>{const next=urls.get(img.src);if(next)img.src=next;});
      cms.items=items;
      const route=currentRoute();
      if(changed&&(route==='/'||route==='/biens'||route==='/biens/prestige'||route.startsWith('/bien/'))){
        const search=$('#property-search')?.value,filter=$('.filter.active')?.dataset.filter;
        const contactValues=$$('.validate-form input,.validate-form textarea',app).map(el=>[el.name,el.value]);
        const y=scrollY;paint();
        if(search!=null){$('#property-search').value=search;$('#property-search').dispatchEvent(new Event('input'));$$('.filter').find(b=>b.dataset.filter===filter)?.click();}
        contactValues.forEach(([name,value])=>{const el=$$('.validate-form input,.validate-form textarea',app).find(e=>e.name===name);if(el)el.value=value;});
        scrollTo(0,y);
      }
    }
  catch{if(!$('#cms-refresh-error')){const p=document.createElement('p');p.id='cms-refresh-error';p.className='cms-refresh-error';p.setAttribute('role','status');p.textContent='La mise à jour des biens a échoué. Nouvelle tentative automatique.';app.prepend(p);}}
},30000);
render();
