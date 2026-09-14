// The browser never receives an Auth token. The API owns HttpOnly session cookies.
const cms = { items:[], user:null, generation:0, dirty:false, busy:false, search:'' };
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function safeProperty(item) {
  return Object.fromEntries(Object.entries(item).map(([key,value])=>[key,Array.isArray(value)?value.map(v=>typeof v==='string'?escapeHtml(v):v):typeof value==='string'?escapeHtml(value):value]));
}
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
  if (route === '/biens') return listings(true);
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
    catch { throw new Error('Connection failed. Your changes have not been confirmed. Please retry.'); }
    const result=await response.json().catch(()=>({error:'Unexpected server response.'}));
    if(!response.ok) { const error=new Error(result.error || 'Request failed.');error.status=response.status;throw error; }
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
  app.innerHTML=route.startsWith('/admin')?adminDashboard():route==='/biens'?listings():route.startsWith('/bien/')?detail(route.split('/')[2]):route==='/agence'?agency():route==='/services'?services():route==='/contact'?contact():home();
  bindGlobal();bindForms();bindListings();bindCMS();
  $('.rich-text')?.setAttribute('aria-label','Property description');
  $('#global-search')?.setAttribute('aria-label','Search all listings; press Enter');
  $('#listing-search')?.setAttribute('aria-label','Search listings');
  const gallery=$('.gallery');
  if(gallery){gallery.tabIndex=0;gallery.setAttribute('aria-label','Property image gallery; use left and right arrows');gallery.onkeydown=event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();gallery.scrollBy({left:gallery.clientWidth*(event.key==='ArrowRight'?1:-1),behavior:'smooth'});}};}
  // Existing form design uses adjacent labels. Associate them without changing layout.
  $$('.field',app).forEach((field,i)=>{const input=$('input,textarea',field),label=$('label',field);if(input&&label){input.id||='field-'+i;label.htmlFor=input.id;}});
  $$('button[title]',app).forEach(b=>b.setAttribute('aria-label',b.title));
  $$('img',app).forEach(img=>{if(!img.getAttribute('src')){img.removeAttribute('src');img.alt='No image';img.classList.add('cms-image-empty');}});
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
    app.innerHTML=`${admin?'':header()}<main class="cms-state"><h1>${admin?'CMS unavailable':'Les biens sont temporairement indisponibles'}</h1><p role="alert">${escapeHtml(error.message)}</p><button class="primary-button" id="cms-retry">Réessayer</button><p><a href="tel:0796265326">0796 26 53 26</a> · <a href="#/contact">Contact</a></p></main>`;
    $('#cms-retry').onclick=render;bindGlobal();revealContent();
  }
}
function modal(title,body) {
  const dialog=document.createElement('dialog');dialog.className='cms-dialog';
  dialog.innerHTML=`<div class="cms-dialog-head"><h2>${escapeHtml(title)}</h2><button type="button" aria-label="Close">×</button></div>${body}`;
  document.body.append(dialog);$('.cms-dialog-head button',dialog).onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();return dialog;
}
function confirmAction(text) {
  return new Promise(resolve=>{
    const dialog=modal('Confirm action',`<p>${escapeHtml(text)}</p><div class="cms-confirm"><button data-cancel>Cancel</button><button class="primary-button" data-confirm>Confirm</button></div>`);
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
  $('#login-form')?.addEventListener('submit',async event=>{
    event.preventDefault();const form=event.currentTarget,values=Object.fromEntries(new FormData(form));
    if(!values.email.trim() || !values.password){formError(form,'Enter your email and password.');return;}
    setBusy(form,true);
    try {cms.user=(await api('login','POST',values)).user;form.reset();await render();}
    catch(error){formError(form,error);}finally{setBusy(form,false);}
  });
  $('[data-logout]')?.addEventListener('click',async event=>{
    event.currentTarget.disabled=true;
    try {await api('logout','POST',{});cms.user=null;cms.items=[];await render();}
    catch(error){message(error.message);event.target.disabled=false;}
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
    try {await listingAction(b.dataset.action,item);}catch(error){message(error.message);}
  };
  bindManagement();bindEditor();
  if($('#media-library'))loadMedia();
}
async function listingAction(action,item) {
  if(action==='edit'){navigate('/admin/editor/'+item.id);return;}
  if(action==='preview'){navigate('/admin/preview/'+item.id);return;}
  if(action==='more'){
    const options=[['edit','Edit'],['preview','Preview'],['duplicate','Duplicate'],[item.published?'unpublish':'publish',item.published?'Unpublish':'Publish'],['status','Change status'],[item.archived?'restore':'archive',item.archived?'Restore':'Archive'],['delete','Delete permanently']];
    const d=modal(item.title,`<div class="cms-action-list">${options.map(([key,label])=>`<button data-command="${key}">${label}</button>`).join('')}</div>`);
    $$('[data-command]',d).forEach(b=>b.onclick=async()=>{d.close();try{await listingAction(b.dataset.command,item);}catch(e){message(e.message);}});return;
  }
  if(action==='status'){
    const d=modal('Availability','<label>Status<select id="status-choice">'+['Available','Sold','Rented','Draft'].map(s=>`<option ${s===item.status?'selected':''}>${s}</option>`).join('')+'</select></label><button class="primary-button" id="confirm-status">Save status</button>');
    $('#confirm-status',d).onclick=async event=>{event.target.disabled=true;try{const status=$('#status-choice',d).value;await api('properties','PUT',{...item,status,published:status==='Draft'?false:item.published});d.close();await render();message('Status saved.');}catch(e){formError(d,e);event.target.disabled=false;}};return;
  }
  if(action==='delete'&&!await confirmAction('Permanently delete this listing? This cannot be undone. Archive it instead if you may need it later.'))return;
  if(action==='publish'&&!await confirmAction('Publish this property on the public website?'))return;
  let result;
  if(action==='delete')result=await api('properties','DELETE',{id:item.id});
  else {
    const data={...item};
    if(action==='duplicate'){delete data.id;data.ref=item.ref.slice(0,60)+'-COPY-'+crypto.randomUUID().slice(0,6);data.title=item.title.slice(0,185)+' (copy)';data.status='Draft';data.published=false;data.archived=false;}
    if(action==='publish'){data.published=true;data.archived=false;}
    if(action==='unpublish')data.published=false;
    if(action==='archive'){data.archived=true;data.published=false;}
    if(action==='restore')data.archived=false;
    result=await api('properties',action==='duplicate'?'POST':'PUT',data);
  }
  await render();message(result.warning || 'Listing updated.');
}
function bindManagement() {
  const search=$('#listing-search');if(!search)return;
  const filters=$('.listing-filters');
  $$('[data-filter-menu]',filters).forEach(b=>b.remove());
  const choices={status:['All','Published','Unpublished','Available','Sold','Rented','Draft','Archived'],type:['All','Apartment','Villa','House','Maison','Duplex','Land','Commercial','Office','Other'],transaction:['All','Sale','Rent']};
  search.value=cms.search;
  Object.entries(choices).forEach(([name,values])=>{
    const label=document.createElement('label');label.className='cms-filter';label.textContent=name;
    const select=document.createElement('select');select.name=name;values.forEach(v=>select.add(new Option(v,v)));label.append(select);filters.append(label);
  });
  for(const [name,label,type] of [['location','Location','search'],['min','Min price','number'],['max','Max price','number'],['beds','Bedrooms (min)','number']])filters.insertAdjacentHTML('beforeend',`<label class="cms-filter">${label}<input name="${name}" type="${type}" min="0"></label>`);
  function draw(){
    const value=name=>$(`[name="${name}"]`,filters).value,term=search.value.toLowerCase();
    const result=cms.items.filter(p=>{
      const status=value('status'),match=status==='All'||status==='Published'&&p.published&&!p.archived||status==='Unpublished'&&!p.published||status==='Archived'&&p.archived||p.status===status;
      return match&&`${p.title} ${p.ref} ${p.location} ${p.type}`.toLowerCase().includes(term)&&(value('type')==='All'||p.type===value('type'))&&(value('transaction')==='All'||p.transaction===value('transaction'))&&(p.location||'').toLowerCase().includes(value('location').toLowerCase())&&(!value('min')||Number(p.price)>=Number(value('min')))&&(!value('max')||Number(p.price)<=Number(value('max')))&&(!value('beds')||Number(p.beds)>=Number(value('beds')));
    }).map(safeProperty);
    $('#management-list').innerHTML=listingsRows(result)||'<tr><td colspan="7">No matching properties. Add a listing or adjust your filters.</td></tr>';
    $('#listing-grid-view').innerHTML=result.map(p=>`<article class="admin-property-card">${p.image?`<img src="${p.image}" alt="${p.title}" loading="lazy">`:''}<div><h3>${p.title}</h3><small>${p.ref} · ${p.location}</small><p>${money(p)}</p><p>${p.type} · ${p.area} m² · ${p.beds ?? '—'} beds · ${p.baths ?? '—'} baths</p><span class="status ${statusClass(p.status)}">${p.status}</span><p>${p.archived?'Archived':p.published?'Published':'Unpublished'} · ${displayDate(p.updatedAt)}</p></div><button data-action="more" data-id="${p.id}">Manage listing →</button></article>`).join('')||'<p>No matching properties.</p>';
    $('.management-summary b').textContent=result.length+' listings';
  }
  filters.addEventListener('input',draw);filters.addEventListener('change',draw);
  $$('[data-view]').forEach(b=>{b.setAttribute('aria-label',b.dataset.view+' view');b.onclick=()=>{$('.table-view').classList.toggle('hidden',b.dataset.view==='grid');$('#listing-grid-view').classList.toggle('hidden',b.dataset.view==='table');$$('[data-view]').forEach(x=>x.classList.toggle('active',x===b));};});draw();
}
function collectEditor(form,mode='changes') {
  const values=Object.fromEntries(new FormData(form)),id=form.dataset.id,old=cms.items.find(p=>p.id===id)||{};
  return {...old,...values,id:id||undefined,price:values.price || '0',featured:form.elements.featured.checked,
    published:mode==='publish'?true:mode==='draft'?false:form.elements.published.checked,
    status:mode==='draft'?'Draft':values.status,archived:mode==='publish'?false:old.archived||false,
    location:[values.neighborhood,values.city].filter(Boolean).join(', '),
    features:$$('.feature-token.selected',form).map(b=>b.dataset.feature),imagePaths:$$('#media-grid figure',form).map(f=>f.dataset.path)};
}
function readImage(file) {
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2097152)throw new Error('Choose JPEG, PNG or WebP images up to 2 MB each.');
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(new Error('Could not read this image.'));reader.readAsDataURL(file);});
}
function mediaFigure(path,url) {
  const f=document.createElement('figure');f.draggable=true;f.dataset.path=path;
  f.innerHTML=`<img src="${escapeHtml(url)}" alt="Property photo"><figcaption></figcaption><div class="cms-image-actions"><button type="button" data-image="preview" aria-label="Preview image">↗</button><button type="button" data-image="left" aria-label="Move image earlier">←</button><button type="button" data-image="right" aria-label="Move image later">→</button><button type="button" data-image="cover">Cover</button><button type="button" data-image="replace">Replace</button><button type="button" data-image="remove" aria-label="Remove image">×</button></div>`;return f;
}
function bindEditor() {
  const form=$('#property-editor-v2');if(!form)return;
  const media=$('#media-grid'),uploader=$('#image-uploader');
  $('#image-uploader').accept='image/jpeg,image/png,image/webp';
  const renumber=()=>$$('figure',media).forEach((f,i)=>{$('figcaption',f).textContent=i===0?'Cover Image':'Image '+(i+1);});
  $$('figure',media).forEach(f=>f.replaceWith(mediaFigure(f.dataset.path,$('img',f).getAttribute('src'))));renumber();
  form.addEventListener('input',()=>cms.dirty=true);
  async function upload(files,replace){
    setBusy(form,true);
    try{
      if($$('figure',media).length+files.length-(replace?1:0)>20)throw new Error('Maximum 20 images per listing.');
      for(const file of files){const base64=await readImage(file),result=await api('upload','POST',{base64}),figure=mediaFigure(result.path,result.url);if(replace){replace.replaceWith(figure);replace=null;}else media.insertBefore(figure,$('.upload-tile',media));cms.dirty=true;renumber();}
    }catch(error){formError(form,error);}finally{setBusy(form,false);uploader.value='';}
  }
  uploader.onchange=()=>upload([...uploader.files]);
  media.onclick=event=>{
    const b=event.target.closest('[data-image]');if(!b||cms.busy)return;
    const f=b.closest('figure'),action=b.dataset.image;
    if(action==='preview'){modal('Property photo',`<img class="cms-full-image" src="${escapeHtml($('img',f).src)}" alt="Property photo">`);return;}
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
  for(const feature of old?.features||[])if(!$$('[data-feature]',form).some(b=>b.dataset.feature===feature))addFeature(feature);
  function addFeature(value){const b=document.createElement('button');b.type='button';b.className='feature-token selected';b.dataset.feature=value;b.textContent='✓ '+value;$('.custom-feature',form).before(b);}
  $('.feature-list',form).onclick=event=>{
    const b=event.target.closest('button');if(!b)return;
    if(b.classList.contains('custom-feature')){const value=prompt('Feature name (up to 80 characters)')?.trim();if(value&&value.length<=80&&!$$('[data-feature]',form).some(x=>x.dataset.feature===value))addFeature(value);}
    else {b.classList.toggle('selected');b.textContent=(b.classList.contains('selected')?'✓ ':'')+b.dataset.feature;}
    cms.dirty=true;
  };
  $('.location-map button',form).onclick=()=>{$('.location-map iframe',form).src='https://www.google.com/maps?q='+encodeURIComponent(form.elements.mapLocation.value||form.elements.neighborhood.value+', '+form.elements.city.value)+'&output=embed';cms.dirty=true;};
  const history=[],desc=form.elements.description;
  $$('.rich-toolbar button',form).forEach((b,i)=>{b.title=['Bold','Italic','Heading','List','Undo formatting'][i];b.onclick=()=>{if(i===4){if(history.length)desc.value=history.pop();}else{history.push(desc.value);const a=desc.selectionStart,z=desc.selectionEnd,selected=desc.value.slice(a,z)||'Text',wrapped=i===0?'**'+selected+'**':i===1?'*'+selected+'*':i===2?'\n## '+selected:'\n- '+selected;desc.setRangeText(wrapped,a,z,'select');}desc.focus();cms.dirty=true;};});
  $('[data-preview-editor]').onclick=()=>{
    const p=safeProperty(collectEditor(form));
    modal('Unsaved listing preview',`<div class="cms-preview">${$$('figure img',media).map(i=>`<img src="${escapeHtml(i.src)}" alt="Property photo">`).join('')}<h2>${p.title}</h2><p>${money(p)} · ${p.location}</p><p>${p.area} m² · ${p.beds} bedrooms · ${p.baths} bathrooms · ${p.type}</p>${descriptionHtml(p.description)}<p>${p.features.join(' · ')}</p><iframe title="Property location" src="https://www.google.com/maps?q=${encodeURIComponent(p.mapLocation||p.location)}&output=embed"></iframe><a href="tel:0796265326">Contact Kader: 0796 26 53 26</a></div>`);
  };
  form.onsubmit=async event=>{
    event.preventDefault();if(cms.busy)return;
    const mode=event.submitter?.dataset.save||'changes',data=collectEditor(form,mode);
    if(!data.title.trim()||!data.ref.trim()){formError(form,'Property title and reference are required.');return;}
    if(data.published&&!await confirmAction('Save and make this listing visible on the public website?'))return;
    setBusy(form,true);
    try{const result=await api('properties',data.id?'PUT':'POST',data);cms.dirty=false;message(result.warning||'Listing saved successfully.');navigate('/admin/listings');}
    catch(error){formError(form,error);}finally{setBusy(form,false);}
  };
}
async function loadMedia() {
  const target=$('#media-library');
  try{
    const result=await api('media');if(!target.isConnected)return;
    target.className='cms-media-library';target.innerHTML=result.files.map(f=>`<article><img src="${escapeHtml(f.url)}" alt="Property image" loading="lazy"><p>${f.used?'Used in a listing':'Unused upload'}</p><button data-path="${escapeHtml(f.path)}" ${f.used?'disabled':''}>Delete unused image</button></article>`).join('')||'<p>No uploaded images yet.</p>';
    $$('button',target).forEach(b=>b.onclick=async()=>{if(!await confirmAction('Permanently delete this unused image?'))return;b.disabled=true;try{await api('delete-image','POST',{path:b.dataset.path});loadMedia();}catch(e){message(e.message);b.disabled=false;}});
  }catch(error){target.textContent=error.message;const b=document.createElement('button');b.textContent='Retry';b.onclick=loadMedia;target.append(b);}
}
document.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'&&$('#global-search')){event.preventDefault();$('#global-search').focus();}if(event.key==='Escape')$('#dash-sidebar')?.classList.remove('open');});
document.addEventListener('click',async event=>{const a=event.target.closest('a[href]');if(cms.busy&&a){event.preventDefault();message('Please wait for the current operation.');return;}if(cms.dirty&&a&&a.hash!==location.hash){event.preventDefault();if(await confirmAction('Discard unsaved changes? Uploaded, unused images can be removed in the media library.')){cms.dirty=false;location.href=a.href;}}},true);
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
      if(changed&&(route==='/'||route==='/biens'||route.startsWith('/bien/'))){
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
