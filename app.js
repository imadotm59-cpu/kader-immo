const app = document.querySelector('#app');
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const svg = {
  arrow: '<svg class="icon" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  phone: '<svg class="icon" viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.4 1.8.6 2.8.7a2 2 0 0 1 1.8 2.1Z"/></svg>',
  pin: '<svg class="icon" viewBox="0 0 24 24"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/></svg>',
  key: '<svg class="icon" viewBox="0 0 24 24"><circle cx="7.5" cy="15.5" r="4.5"/><path d="m21 2-9.4 9.4M15.5 7.5l1.7 1.7M18.5 4.5l1.7 1.7"/></svg>',
  menu: '<svg class="icon" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  close: '<svg class="icon" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  tick: '✓',
  whatsapp: '<svg class="icon" viewBox="0 0 24 24"><path d="M20.5 11.8a8.5 8.5 0 0 1-12.5 7.5L3 21l1.7-4.7a8.5 8.5 0 1 1 15.8-4.5Z"/><path d="M8.6 7.8c.2-.5.4-.5.7-.5h.4c.1 0 .3 0 .4.3l.8 1.9c.1.2.1.4 0 .5l-.5.7c-.1.1-.2.3-.1.5.3.6.8 1.3 1.5 1.9.8.7 1.5 1 2.1 1.3.2.1.4 0 .5-.1l.7-.8c.2-.2.3-.2.5-.1l1.8.9c.3.1.4.2.4.4 0 .4-.2 1.1-.5 1.4-.3.3-.7.5-1.2.5-.4 0-1.2-.2-2.2-.7a9 9 0 0 1-3.7-3.3c-.5-.8-1-1.8-1-2.8 0-.5.2-1 .3-1.4Z"/></svg>'
};

const logo = '<span class="logo"><b>⌂</b><span>AGENCE IMMOBILIÈRE KADER<small>ORAN · ALGÉRIE</small></span></span>';
const arabicText = {
  'Accueil':'الرئيسية','Biens disponibles':'العقارات المتاحة','L’agence':'الوكالة','Services':'الخدمات','Contact':'اتصل بنا',
  'Depuis Oran, avec exigence':'من وهران، بكل تميّز','Votre avenir mérite':'مستقبلك يستحق','une adresse d’exception.':'عنواناً استثنائياً.',
  'Découvrez une sélection de propriétés singulières à Oran. Notre expertise transforme chaque projet immobilier en une décision sereine.':'اكتشف مجموعة مختارة من العقارات المميزة في وهران. خبرتنا تجعل كل مشروع عقاري قراراً مطمئناً.',
  'Explorer nos biens':'استكشف عقاراتنا','Parler à un conseiller':'تحدث مع مستشار','52+ avis Google':'أكثر من 52 تقييم Google','projets accompagnés':'مشروعاً تمّت مرافقته',
  'L’agence Kader':'وكالة قادر','Un accompagnement qui inspire confiance.':'مرافقة تبعث على الثقة.','Une adresse de référence à Oran pour les projets immobiliers ambitieux. Nous mettons l’écoute, la transparence et une connaissance fine du marché au cœur de chaque collaboration.':'عنوان مرجعي في وهران للمشاريع العقارية الطموحة. نضع الإصغاء والشفافية والمعرفة الدقيقة بالسوق في قلب كل تعاون.',
  'Découvrir notre histoire':'اكتشف قصتنا','Intégrité':'النزاهة','Conseils honnêtes':'نصائح صادقة','Exigence':'التميّز','Biens sélectionnés':'عقارات مختارة','Proximité':'القرب','À vos côtés':'إلى جانبك',
  'Une sélection curatée':'اختيار منتقى','Propriétés en vedette':'عقارات مميزة','Des maisons, duplex et villas choisis pour leur emplacement, leur qualité et leur potentiel.':'منازل ودوبلكس وفيلات مختارة لموقعها وجودتها وإمكاناتها.','Voir tous les biens':'عرض كل العقارات','Trouvez le lieu qui vous ressemble.':'اعثر على المكان الذي يشبهك.','Notre équipe vous guide à chaque étape.':'فريقنا يرافقك في كل خطوة.','Nous contacter':'اتصل بنا',
  'Nos opportunités':'فرصنا','Une collection de lieux de vie choisis avec rigueur, dans les quartiers les plus convoités d’Oran.':'مجموعة من أماكن الحياة المختارة بعناية في أكثر أحياء وهران طلباً.','Type de bien :':'نوع العقار:','Tous':'الكل','Maisons':'منازل','Duplex':'دوبلكس','Villas':'فيلات','Rechercher par lieu':'ابحث حسب الموقع','À VENDRE':'للبيع',
  'Depuis Oran':'من وهران','L’humain au centre de l’immobilier.':'الإنسان في قلب العقار.','Notre équipe s’engage à rendre votre projet immobilier aussi clair qu’enthousiasmant.':'يلتزم فريقنا بجعل مشروعك العقاري واضحاً ومثيراً للحماس.','Notre philosophie':'فلسفتنا','Plus qu’une agence, un partenaire de confiance.':'أكثر من وكالة، شريك موثوق.','Parlons de votre projet':'لنتحدث عن مشروعك',
  'Notre expertise':'خبرتنا','Des conseils adaptés à chaque projet.':'نصائح تناسب كل مشروع.','Transaction':'البيع والشراء','Location':'الإيجار','Estimation':'التقييم','Votre projet commence ici.':'مشروعك يبدأ هنا.','Prendre rendez-vous':'احجز موعداً',
  'Restons en contact':'لنبق على تواصل','Parlons de votre prochaine adresse.':'لنتحدث عن عنوانك القادم.','Nous rendre visite':'زورونا','À Fernand Ville, au cœur d’Oran. Prenez rendez-vous ou passez nous voir.':'في فيرنان فيل، في قلب وهران. احجز موعداً أو تفضل بزيارتنا.','Adresse':'العنوان','Téléphone':'الهاتف','En ligne':'عبر الإنترنت','Envoyez-nous un message':'أرسل لنا رسالة','Comment pouvons-nous vous aider ?':'كيف يمكننا مساعدتك؟','Nom complet':'الاسم الكامل','E-mail':'البريد الإلكتروني','Sujet':'الموضوع','Votre message':'رسالتك','Envoyer le message':'إرسال الرسالة','Notre emplacement':'موقعنا','Agence immobilière Kader, Oran':'وكالة قادر العقارية، وهران',
  'Espace administration':'مساحة الإدارة','Se déconnecter':'تسجيل الخروج'
};

function getLanguage() { return localStorage.getItem('kader-language') || 'fr'; }
function getTheme() { return localStorage.getItem('kader-theme') || 'light'; }
function applyPreferences() {
  const language = getLanguage();
  const root = document.documentElement;
  root.lang = language;
  root.dir = language === 'ar' ? 'rtl' : 'ltr';
  root.dataset.theme = getTheme();
  if (language !== 'ar') return;
  const walker = document.createTreeWalker(app, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    const original = node.nodeValue.trim();
    if (arabicText[original]) node.nodeValue = node.nodeValue.replace(original, arabicText[original]);
  });
}
const initialProperties = [
  {id: 1, type: 'Villa', title: 'Villa Signature à Canastel', location: 'Canastel, Oran', price: '65 000 000 DA', beds: 5, baths: 4, area: '480 m²', image: 'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1100&q=85', images: ['https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1100&q=85','https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1100&q=85','https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1100&q=85'], description: 'Une résidence contemporaine remarquable à Canastel, pensée pour une vie familiale élégante. Espaces généreux, finitions choisies et jardin paysager avec piscine.'},
  {id: 2, type: 'Duplex', title: 'Duplex avec piscine privée', location: 'Bir El Djir, Oran', price: '42 000 000 DA', beds: 4, baths: 3, area: '260 m²', image: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1100&q=85', images: ['https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1100&q=85','https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1100&q=85','https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1100&q=85'], description: 'Un duplex lumineux aux lignes modernes, avec piscine, terrasses et prestations qui rendent chaque jour plus confortable.'},
  {id: 3, type: 'Maison', title: 'Maison d’architecte', location: 'Gambetta, Oran', price: '38 500 000 DA', beds: 4, baths: 3, area: '315 m²', image: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1100&q=85', images: ['https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1100&q=85'], description: 'Maison rénovée avec soin, dans un quartier recherché d’Oran. Elle équilibre volumes élégants et fonctionnalité.'},
  {id: 4, type: 'Villa', title: 'Villa Azur sur les hauteurs', location: 'Aïn El Turk, Oran', price: '78 000 000 DA', beds: 6, baths: 5, area: '620 m²', image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1100&q=85', images: ['https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1100&q=85'], description: 'Une villa rare qui domine la baie, avec espaces de réception et une qualité de construction irréprochable.'},
  {id: 5, type: 'Duplex', title: 'Duplex lumineux avec terrasse', location: 'Akid Lotfi, Oran', price: '31 000 000 DA', beds: 3, baths: 2, area: '195 m²', image: 'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?auto=format&fit=crop&w=1100&q=85', images: ['https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?auto=format&fit=crop&w=1100&q=85'], description: 'Un appartement duplex au caractère singulier, proche de toutes les commodités et baigné de lumière.'},
  {id: 6, type: 'Maison', title: 'Maison familiale avec jardin', location: 'Maraval, Oran', price: '29 500 000 DA', beds: 4, baths: 2, area: '280 m²', image: 'https://images.unsplash.com/photo-1605146769289-440113cc3d00?auto=format&fit=crop&w=1100&q=85', images: ['https://images.unsplash.com/photo-1605146769289-440113cc3d00?auto=format&fit=crop&w=1100&q=85'], description: 'Maison chaleureuse offrant un jardin généreux, parfaite pour les familles à la recherche d’un cadre serein.'}
];

const properties = () => JSON.parse(localStorage.getItem('kader-properties-v2') || 'null') || initialProperties;
const storeProperties = items => localStorage.setItem('kader-properties-v2', JSON.stringify(items));

function header() {
  return `<header class="topbar"><div class="shell nav"><a href="#/">${logo}</a><nav class="navlinks" aria-label="Navigation principale"><a href="#/">Accueil</a><a href="#/biens">Biens disponibles</a><a href="#/agence">L’agence</a><a href="#/services">Services</a><a href="#/contact">Contact</a></nav><a class="header-phone" href="tel:0796265326">${svg.phone} 0796 26 53 26</a><button class="hamburger" aria-label="Ouvrir le menu" aria-expanded="false">${svg.menu}</button></div><nav class="mobile-nav" aria-label="Navigation mobile"><a href="#/">Accueil</a><a href="#/biens">Biens disponibles</a><a href="#/agence">L’agence</a><a href="#/services">Services</a><a href="#/contact">Contact</a></nav></header>`;
}
function footer() {
  return `<footer><div class="shell footer-grid"><div>${logo}<p>Votre partenaire de confiance pour acheter, vendre et louer des biens d’exception à Oran.</p></div><div><h3 class="foot-title">Explorer</h3><ul class="foot-links"><li><a href="#/biens">Biens disponibles</a></li><li><a href="#/agence">Notre agence</a></li><li><a href="#/services">Nos services</a></li></ul></div><div><h3 class="foot-title">Nous joindre</h3><ul class="foot-links"><li><a href="tel:0796265326">0796 26 53 26</a></li><li><a href="tel:0551412303">0551 41 23 03</a></li><li><a href="mailto:contact@kaderimmobilier.dz">contact@kaderimmobilier.dz</a></li></ul></div><div><h3 class="foot-title">Suivez-nous</h3><ul class="foot-links"><li><a target="_blank" rel="noreferrer" href="https://instagram.com/agence_immobiliere_kader">@agence_immobiliere_kader</a></li><li>Oran 31000, Algérie</li></ul></div></div><div class="shell foot-bottom"><span>© 2026 Agence immobilière Kader. Tous droits réservés.</span><a href="#/admin">Espace administration</a></div></footer><a class="whatsapp" aria-label="Contacter sur WhatsApp" target="_blank" rel="noreferrer" href="https://wa.me/213796265326">${svg.whatsapp}</a>`;
}
function propertyCard(p) {
  return `<article class="card"><a href="#/bien/${p.id}" class="card-photo" aria-label="Découvrir ${p.title}"><img src="${p.image}" alt="${p.title}, ${p.location}" loading="lazy"><span class="badge">À VENDRE</span></a><div class="card-body"><span class="type">${p.type}</span><h3>${p.title}</h3><p class="place">${svg.pin} ${p.location}</p><div class="meta"><span class="price">${p.price}</span><span class="specs">${p.beds} ch. · ${p.baths} sdb<br>${p.area}</span></div></div></article>`;
}
function home() {
  return `${header()}<main id="content"><section class="hero"><div class="shell hero-inner"><p class="eyebrow">Depuis Oran, avec exigence</p><h1>Votre avenir mérite <em>une adresse d’exception.</em></h1><p>Découvrez une sélection de propriétés singulières à Oran. Notre expertise transforme chaque projet immobilier en une décision sereine.</p><div class="actions"><a class="btn btn-gold" href="#/biens">Explorer nos biens ${svg.arrow}</a><a class="btn btn-white" href="#/contact">Parler à un conseiller</a></div><div class="hero-stats"><span><b>4,8 / 5</b>52+ avis Google</span><span><b>246</b>projets accompagnés</span></div></div></section><section class="section intro"><div class="shell intro-grid"><div><p class="eyebrow">L’agence Kader</p><h2 class="display">Un accompagnement qui inspire confiance.</h2><p class="lede">Une adresse de référence à Oran pour les projets immobiliers ambitieux. Nous mettons l’écoute, la transparence et une connaissance fine du marché au cœur de chaque collaboration.</p><a class="btn btn-ink" style="margin-top:27px" href="#/agence">Découvrir notre histoire ${svg.arrow}</a><div class="trust"><div><strong>Intégrité</strong>Conseils honnêtes</div><div><strong>Exigence</strong>Biens sélectionnés</div><div><strong>Proximité</strong>À vos côtés</div></div></div><div class="photo-panel"><img src="https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=85" alt="Salon lumineux dans une propriété de prestige"><span class="photo-tag">Oran · Algérie</span></div></div></section><section class="section properties"><div class="shell"><div class="center"><p class="eyebrow">Une sélection curatée</p><h2 class="display">Propriétés en vedette</h2><p class="lede">Des maisons, duplex et villas choisis pour leur emplacement, leur qualité et leur potentiel.</p></div><div class="cards">${properties().slice(0,3).map(propertyCard).join('')}</div><p class="center" style="margin-top:30px"><a class="btn btn-ink" href="#/biens">Voir tous les biens ${svg.arrow}</a></p><div class="cta"><div><span class="round-icon">${svg.key}</span><span><h2>Trouvez le lieu qui vous ressemble.</h2><p>Notre équipe vous guide à chaque étape.</p></span></div><a class="btn btn-ink" href="#/contact">Nous contacter ${svg.arrow}</a></div></div></section></main>${footer()}`;
}
function pageHero(kicker, title, copy) {
  return `<section class="page-hero"><div class="shell"><p class="eyebrow">${kicker}</p><h1 class="display">${title}</h1><p class="lede">${copy}</p></div></section>`;
}
function listings() {
  return `${header()}<main id="content">${pageHero('Nos opportunités', 'Biens disponibles', 'Une collection de lieux de vie choisis avec rigueur, dans les quartiers les plus convoités d’Oran.')}<section class="listing"><div class="shell"><div class="filterbar"><span class="filter-label">Type de bien :</span><div class="filters"><button class="filter active" data-filter="Tous">Tous</button><button class="filter" data-filter="Maison">Maisons</button><button class="filter" data-filter="Duplex">Duplex</button><button class="filter" data-filter="Villa">Villas</button></div><input id="property-search" class="search" type="search" placeholder="Rechercher par lieu" aria-label="Rechercher un bien"></div><p id="property-count" class="count"></p><div id="property-grid" class="cards"></div></div></section></main>${footer()}`;
}
function detail(id) {
  const item = properties().find(p => p.id === Number(id)) || properties()[0];
  const gallery = [...item.images, item.image, item.image].slice(0, 3);
  const related = properties().filter(p => p.id !== item.id).slice(0, 3);
  return `${header()}<main id="content" class="detail"><div class="shell"><p class="crumbs"><a href="#/biens">Biens disponibles</a> / ${item.type}</p><div class="detail-title"><div><p class="eyebrow">${item.type} · À vendre</p><h1>${item.title}</h1><p>${svg.pin} ${item.location}, Oran</p></div><div class="detail-price">${item.price}<br><small style="font-size:.72rem;color:var(--copy);font-weight:400">Honoraires sur demande</small></div></div><section class="gallery">${gallery.map((image, index) => `<div><img src="${image}" alt="${item.title} — vue ${index + 1}"></div>`).join('')}</section><section class="detail-grid"><article><h2>Un lieu conçu pour bien vivre.</h2><p>${item.description}</p><div class="facts"><div><b>${item.beds}</b>Chambres</div><div><b>${item.baths}</b>Salles de bain</div><div><b>${item.area}</b>Surface</div><div><b>Oui</b>Parking</div></div><h3>Les points forts</h3><p>Espaces lumineux · Finitions soignées · Quartier résidentiel recherché · Proximité des services.</p></article>${inquiryForm(item.title)}</section></div><section class="map-block"><div class="shell map-grid"><div><p class="eyebrow">Localisation</p><h2 class="display">Découvrir le quartier</h2><p class="lede">Une adresse privilégiée dans l’aire urbaine d’Oran, sélectionnée pour son cadre de vie et son accessibilité.</p></div><iframe class="map" title="Carte de ${item.location}" loading="lazy" src="https://www.google.com/maps?q=${encodeURIComponent(item.location + ', Oran, Algeria')}&output=embed"></iframe></div></section><section class="section properties"><div class="shell"><div class="center"><p class="eyebrow">À découvrir aussi</p><h2 class="display">Biens similaires</h2></div><div class="cards">${related.map(propertyCard).join('')}</div></div></section></main>${footer()}`;
}
function inquiryForm(propertyName = '') {
  return `<aside class="form-card"><h3>Une question sur ce bien ?</h3><p>Demandez une visite ou recevez plus d’informations.</p><form class="validate-form" novalidate><div class="field"><label>Nom</label><input name="name" required></div><div class="field"><label>E-mail</label><input name="email" type="email" required></div><div class="field"><label>Message</label><textarea name="message" required>Je souhaite en savoir plus sur ${propertyName}.</textarea></div><button class="btn btn-ink" type="submit">Demander une visite ${svg.arrow}</button><div class="form-result" aria-live="polite"></div></form></aside>`;
}
function agency() {
  return `${header()}<main id="content">${pageHero('Depuis Oran', 'L’humain au centre de l’immobilier.', 'Notre équipe s’engage à rendre votre projet immobilier aussi clair qu’enthousiasmant.')}<section class="section story"><div class="shell story-grid"><img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=85" alt="Maison lumineuse au cœur d’un quartier résidentiel"><div><p class="eyebrow">Notre philosophie</p><h2 class="display">Plus qu’une agence, un partenaire de confiance.</h2><p class="lede">Agence immobilière Kader accompagne vendeurs, acquéreurs et locataires dans leurs projets à Oran. Notre approche repose sur un conseil attentif, une expertise locale et une communication simple.</p><ul class="values"><li><i>${svg.tick}</i><span><strong>Intégrité</strong>Des informations fiables, des avis sincères et des engagements tenus.</span></li><li><i>${svg.tick}</i><span><strong>Transparence</strong>Nous expliquons chaque étape pour décider avec sérénité.</span></li><li><i>${svg.tick}</i><span><strong>Satisfaction client</strong>Une disponibilité réelle, de la première visite à la remise des clés.</span></li></ul><a class="btn btn-ink" style="margin-top:25px" href="#/contact">Parlons de votre projet ${svg.arrow}</a></div></div></section></main>${footer()}`;
}
function services() {
  const items = [['01','Transaction','Achat et vente de biens résidentiels avec une stratégie sur mesure et une négociation maîtrisée.'],['02','Location','Trouver le locataire ou le logement adapté, avec un accompagnement clair à chaque étape.'],['03','Estimation','Une évaluation réaliste de votre bien, ancrée dans la connaissance du marché local d’Oran.']];
  return `${header()}<main id="content">${pageHero('Notre expertise', 'Des conseils adaptés à chaque projet.', 'Une offre complète et personnalisée pour concrétiser vos ambitions immobilières à Oran.')}<section class="section properties"><div class="shell"><div class="cards">${items.map(([number,title,copy]) => `<article class="card"><div class="card-body" style="min-height:210px;padding:28px"><span class="type">${number}</span><h2 style="font:600 1.7rem var(--serif);margin:10px 0">${title}</h2><p class="lede" style="font-size:.86rem;margin:0">${copy}</p></div></article>`).join('')}</div><div class="cta"><div><span class="round-icon">${svg.key}</span><span><h2>Votre projet commence ici.</h2><p>Rencontrez un conseiller de l’agence Kader.</p></span></div><a class="btn btn-ink" href="#/contact">Prendre rendez-vous ${svg.arrow}</a></div></div></section></main>${footer()}`;
}
function contact() {
  return `${header()}<main id="content">${pageHero('Restons en contact', 'Parlons de votre prochaine adresse.', 'Notre équipe vous répond avec attention et discrétion.')}<section class="section"><div class="shell contact-grid"><div><p class="eyebrow">L’agence Kader</p><h2 class="display">Nous rendre visite</h2><p class="lede">À Fernand Ville, au cœur d’Oran. Prenez rendez-vous ou passez nous voir.</p><div class="contact-item"><span class="round-icon">${svg.pin}</span><span><h3>Adresse</h3><p>Oran 31000, Algérie<br>Fernand Ville</p></span></div><div class="contact-item"><span class="round-icon">${svg.phone}</span><span><h3>Téléphone</h3><p><a href="tel:0796265326">0796 26 53 26</a><br><a href="tel:0551412303">0551 41 23 03</a></p></span></div><div class="contact-item"><span class="round-icon">${svg.arrow}</span><span><h3>En ligne</h3><p><a href="mailto:contact@kaderimmobilier.dz">contact@kaderimmobilier.dz</a><br><a target="_blank" rel="noreferrer" href="https://instagram.com/agence_immobiliere_kader">@agence_immobiliere_kader</a></p></span></div></div><form class="contact-form validate-form" novalidate><p class="eyebrow">Envoyez-nous un message</p><h2 class="display" style="font-size:2rem">Comment pouvons-nous vous aider ?</h2><div class="field"><label>Nom complet</label><input name="name" autocomplete="name" required></div><div class="field"><label>E-mail</label><input name="email" type="email" autocomplete="email" required></div><div class="field"><label>Sujet</label><select name="subject"><option>Je souhaite acheter un bien</option><option>Je souhaite vendre un bien</option><option>Je souhaite louer un bien</option><option>Autre demande</option></select></div><div class="field"><label>Votre message</label><textarea name="message" required></textarea></div><button class="btn btn-ink" type="submit">Envoyer le message ${svg.arrow}</button><div class="form-result" aria-live="polite"></div></form></div></section><section class="map-block"><div class="shell map-grid"><div><p class="eyebrow">Notre emplacement</p><h2 class="display">Agence immobilière Kader, Oran</h2><p class="lede">Retrouvez-nous à Fernand Ville, à quelques minutes des principaux quartiers résidentiels d’Oran.</p></div><iframe class="map" title="Localisation de l’Agence immobilière Kader à Oran" loading="lazy" src="https://www.google.com/maps?q=Agence+immobili%C3%A8re+Kader+Oran&output=embed"></iframe></div></section></main>${footer()}`;
}
function adminLogin() {
  return `<main class="admin-login"><form class="login" id="login-form" novalidate><a href="#/">${logo}</a><h1>Espace administration</h1><p>Connectez-vous pour gérer vos annonces immobilières.</p><div class="field"><label>Identifiant</label><input name="email" autocomplete="username" required></div><div class="field"><label>Mot de passe</label><input name="password" type="password" autocomplete="current-password" required></div><button class="btn btn-ink" style="width:100%" type="submit">Se connecter ${svg.arrow}</button><div id="login-result" aria-live="polite"></div><p class="hint">Démo : <b>admin@kader.dz</b> · <b>Kader2026!</b></p><p style="text-align:center;font-size:.8rem;margin-top:20px"><a href="#/">← Retour au site</a></p></form></main>`;
}
function admin() {
  return `<main class="admin"><header class="admin-head"><div class="shell"><a href="#/">${logo}</a><button class="btn btn-white" id="logout">Se déconnecter</button></div></header><div class="shell admin-body"><div class="admin-top"><div><p class="eyebrow">Tableau de bord</p><h1>Gérer les propriétés</h1></div><button class="btn btn-ink" id="add-property">Ajouter un bien ${svg.arrow}</button></div><section class="panel hidden" id="editor-panel"><h2 id="editor-heading" style="font:500 1.7rem var(--serif);margin-top:0">Nouvelle propriété</h2><form id="property-form" class="editor" novalidate><input type="hidden" name="id"><div class="field"><label>Titre</label><input name="title" required></div><div class="field"><label>Type</label><select name="type"><option>Villa</option><option>Duplex</option><option>Maison</option></select></div><div class="field"><label>Localisation</label><input name="location" required></div><div class="field"><label>Prix</label><input name="price" placeholder="ex. 45 000 000 DA" required></div><div class="field"><label>Chambres</label><input name="beds" type="number" min="0" required></div><div class="field"><label>Salles de bain</label><input name="baths" type="number" min="0" required></div><div class="field"><label>Surface</label><input name="area" placeholder="ex. 250 m²" required></div><div class="field"><label>URL image principale</label><input name="image" type="url" placeholder="https://…" required></div><div class="field wide"><label>Images supplémentaires <small>(une URL par ligne)</small></label><textarea name="images" placeholder="https://…"></textarea></div><div class="field wide"><label>Description</label><textarea name="description" required></textarea></div><div class="wide"><button class="btn btn-ink" type="submit">Enregistrer ${svg.arrow}</button> <button class="btn" type="button" id="cancel-editor">Annuler</button><div id="editor-result" aria-live="polite"></div></div></form></section><section class="panel"><table class="table"><thead><tr><th>Bien</th><th class="hide-mobile">Type</th><th>Prix</th><th></th></tr></thead><tbody>${properties().map(p => `<tr><td><span class="row-name"><img class="thumb" src="${p.image}" alt=""><span><b>${p.title}</b><br><small style="color:var(--copy)">${p.location}</small></span></span></td><td class="hide-mobile">${p.type}</td><td>${p.price}</td><td><button class="small-btn" data-edit="${p.id}">Modifier</button> <button class="small-btn danger" data-remove="${p.id}">Supprimer</button></td></tr>`).join('')}</tbody></table></section></div></main>`;
}

function bindGlobal() {
  applyPreferences();
  const navBar = $('.nav');
  if (navBar && !$('#site-controls')) {
    const language = getLanguage();
    const theme = getTheme();
    navBar.insertAdjacentHTML('beforeend', `<div id="site-controls" class="site-controls"><button class="language-toggle" type="button" aria-label="Changer la langue" title="Changer la langue">${language === 'fr' ? 'ع' : 'FR'}</button><button class="theme-toggle" type="button" aria-label="Activer le mode ${theme === 'dark' ? 'jour' : 'nuit'}" title="Mode jour / nuit"><span>${theme === 'dark' ? '☀' : '☾'}</span></button></div>`);
    $('.language-toggle').addEventListener('click', () => {
      localStorage.setItem('kader-language', getLanguage() === 'fr' ? 'ar' : 'fr');
      render();
    });
    $('.theme-toggle').addEventListener('click', () => {
      localStorage.setItem('kader-theme', getTheme() === 'light' ? 'dark' : 'light');
      applyPreferences();
      render();
    });
  }
  const agencyMap = $('.map[title="Localisation de l’Agence immobilière Kader à Oran"]');
  if (agencyMap) {
    agencyMap.src = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3238.787827517757!2d-0.5801798234376989!3d35.73143627257105!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd7e630036a4fce9%3A0x17d102017e08891f!2sAgence%20immobili%C3%A8re%20Kader!5e0!3m2!1sen!2sdz!4v1788969335248!5m2!1sen!2sdz';
    agencyMap.setAttribute('allowfullscreen', '');
    agencyMap.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  }
  const menu = $('.hamburger');
  if (menu) menu.addEventListener('click', () => {
    const nav = $('.mobile-nav');
    const open = nav.classList.toggle('show');
    menu.innerHTML = open ? svg.close : svg.menu;
    menu.setAttribute('aria-expanded', String(open));
  });
  const segment = location.hash.split('/')[1] || '';
  $$('.navlinks a').forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#/${segment}` || (!segment && link.getAttribute('href') === '#/')));
}
function bindForms() {
  $$('.validate-form').forEach(form => form.addEventListener('submit', event => {
    event.preventDefault();
    $$('.error', form).forEach(error => error.remove());
    let valid = true;
    $$('[required]', form).forEach(input => {
      const invalidEmail = input.type === 'email' && !/^\S+@\S+\.\S+$/.test(input.value);
      if (!input.value.trim() || invalidEmail) {
        valid = false;
        input.setAttribute('aria-invalid', 'true');
        input.insertAdjacentHTML('afterend', '<span class="error">Veuillez renseigner ce champ correctement.</span>');
      } else input.removeAttribute('aria-invalid');
    });
    if (valid) {
      form.reset();
      $('.form-result', form).innerHTML = '<span class="success">Merci, votre message a bien été envoyé. Nous vous répondrons rapidement.</span>';
    }
  }));
}
function bindListings() {
  const grid = $('#property-grid');
  if (!grid) return;
  let selected = 'Tous';
  let term = '';
  function draw() {
    const result = properties().filter(p => (selected === 'Tous' || p.type === selected) && `${p.title} ${p.location}`.toLowerCase().includes(term.toLowerCase()));
    grid.innerHTML = result.length ? result.map(propertyCard).join('') : '<p>Aucun bien ne correspond à votre recherche.</p>';
    $('#property-count').textContent = `${result.length} bien${result.length > 1 ? 's' : ''} disponible${result.length > 1 ? 's' : ''}`;
  }
  $$('.filter').forEach(button => button.addEventListener('click', () => {
    selected = button.dataset.filter;
    $$('.filter').forEach(item => item.classList.toggle('active', item === button));
    draw();
  }));
  $('#property-search').addEventListener('input', event => { term = event.target.value; draw(); });
  draw();
}
function toast(message) {
  document.body.insertAdjacentHTML('beforeend', `<div class="toast" role="status">${message}</div>`);
  setTimeout(() => $('.toast')?.remove(), 2600);
}
function bindAdmin() {
  const login = $('#login-form');
  if (login) {
    login.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(login);
      if (data.get('email') === 'admin@kader.dz' && data.get('password') === 'Kader2026!') {
        sessionStorage.setItem('kader-admin', 'true');
        location.hash = '#/admin';
      } else $('#login-result').innerHTML = '<span class="error">Identifiant ou mot de passe incorrect.</span>';
    });
    return;
  }
  const form = $('#property-form');
  if (!form) return;
  const panel = $('#editor-panel');
  const openEditor = item => {
    form.reset();
    if (item) {
      Object.entries(item).forEach(([key, value]) => {
        if (form.elements[key]) form.elements[key].value = key === 'images' ? value.slice(1).join('\n') : value;
      });
      $('#editor-heading').textContent = 'Modifier la propriété';
    } else {
      $('#editor-heading').textContent = 'Nouvelle propriété';
    }
    panel.classList.remove('hidden');
    panel.scrollIntoView({behavior: 'smooth'});
  };
  $('#logout').addEventListener('click', () => { sessionStorage.removeItem('kader-admin'); location.hash = '#/admin'; });
  $('#add-property').addEventListener('click', () => openEditor());
  $('#cancel-editor').addEventListener('click', () => panel.classList.add('hidden'));
  $$('[data-edit]').forEach(button => button.addEventListener('click', () => openEditor(properties().find(p => p.id === Number(button.dataset.edit)))));
  $$('[data-remove]').forEach(button => button.addEventListener('click', () => {
    const item = properties().find(p => p.id === Number(button.dataset.remove));
    if (confirm(`Supprimer « ${item.title} » ?`)) {
      storeProperties(properties().filter(p => p.id !== item.id));
      render();
      toast('Propriété supprimée.');
    }
  }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const required = ['title','location','price','beds','baths','area','image','description'];
    if (required.some(key => !String(data[key]).trim())) {
      $('#editor-result').innerHTML = '<span class="error">Veuillez compléter tous les champs obligatoires.</span>';
      return;
    }
    const all = properties();
    const id = Number(data.id) || Date.now();
    const extra = data.images.split('\n').map(url => url.trim()).filter(Boolean);
    const item = {...data, id, beds: Number(data.beds), baths: Number(data.baths), images: [data.image, ...extra]};
    const index = all.findIndex(p => p.id === id);
    if (index >= 0) all[index] = item; else all.unshift(item);
    storeProperties(all);
    render();
    toast(index >= 0 ? 'Propriété mise à jour.' : 'Nouvelle propriété ajoutée.');
  });
}
function render() {
  const route = location.hash.replace('#', '') || '/';
  let output = home();
  if (route === '/biens') output = listings();
  if (route.startsWith('/bien/')) output = detail(route.split('/').pop());
  if (route === '/agence') output = agency();
  if (route === '/services') output = services();
  if (route === '/contact') output = contact();
  if (route === '/admin') output = sessionStorage.getItem('kader-admin') ? admin() : adminLogin();
  app.innerHTML = output;
  window.scrollTo(0, 0);
  bindGlobal();
  bindForms();
  bindListings();
  bindAdmin();
}
window.addEventListener('hashchange', render);
render();
