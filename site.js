/* PLASTIK multilingual engine — works with static GitHub/Vercel hosting; no external translation API. */
(()=>{
'use strict';
const DATA=window.PLASTIK_TRANSLATIONS;
if(!DATA)return;
const langs=Object.keys(DATA.locales);
let lang='en';
try{const saved=localStorage.getItem('plastik-lang');if(langs.includes(saved))lang=saved;}catch(e){}
const sourceKeys=Object.fromEntries(Object.entries(DATA.source).map(([key,value])=>[value,key]));
const textNodes=[];
const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
let node;
while((node=walker.nextNode())){
 const parent=node.parentElement;
 if(!parent || parent.closest('script,style,option,select,.lang-menu'))continue;
 const original=node.nodeValue, trimmed=original.trim(), key=sourceKeys[trimmed];
 if(key)textNodes.push({node,original,trimmed,key});
}
const t=(english)=>{
 const key=sourceKeys[english];
 return key ? (DATA.locales[lang]?.[key] || english) : english;
};
function translateNodes(){
 for(const {node,original,trimmed,key} of textNodes){
  const translated=DATA.locales[lang]?.[key]||trimmed;
  node.nodeValue=original.replace(trimmed,translated);
 }
}
function localizedDonation(){
 const el=document.getElementById('donateBtn');
 if(!el)return;
 const amt=document.querySelector('.amount.selected')?.dataset.amount || '1.00';
 el.textContent='♥ '+t('DONATE')+' $'+amt;
}
function refreshFinancialStages(){
 const grid=document.getElementById('stageGrid');if(!grid)return;
 const stageCap=250000,presaleTokens=350000000000000;
 const basePrice=stageCap*[0,1,2,3].reduce((s,i)=>s+1/1.2**i,0)/presaleTokens;
 const [stageName,tokenLabel,perToken]=DATA.stage[lang];
 grid.replaceChildren();
 for(let i=0;i<4;i++){
  const price=basePrice*1.2**i,allocation=stageCap/price;
  const el=document.createElement('article');el.className='stage';
  const head=document.createElement('b');head.textContent=stageName+' '+String(i+1).padStart(2,'0');
  const cap=document.createElement('div');cap.className='cap';cap.textContent='$250,000';
  const pr=document.createElement('div');pr.className='price';pr.textContent='$'+price.toFixed(14)+' / '+perToken;
  const qty=document.createElement('div');qty.className='supply';qty.textContent=(allocation/1e12).toFixed(4)+'T '+tokenLabel;
  el.append(head,cap,pr,qty);grid.appendChild(el);
 }
}
function countdown(){
 const diff=Math.max(0,Date.UTC(2027,0,6,4,59,0)-Date.now()),s=Math.floor(diff/1000);
 const vals=[Math.floor(s/86400),Math.floor(s%86400/3600),Math.floor(s%3600/60),s%60];
 ['cdDays','cdHours','cdMinutes','cdSeconds'].forEach((id,i)=>{const el=document.getElementById(id);if(el)el.textContent=String(vals[i]).padStart(2,'0')});
}
let chatFaq=null;
function normalize(s){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function addChat(role,value){const box=document.getElementById('chatMessages');if(!box)return;const el=document.createElement('div');el.className='bubble '+role;el.textContent=value;box.appendChild(el);box.scrollTop=box.scrollHeight;}
function chatAnswer(value){
 if(!chatFaq)return;
 addChat('user',value);
 const q=normalize(value);
 let key='unknown';
 if(/seed|phrase|private|password|wallet|carteira|billetera|senha|parol|安全|钱包|助记|秘密|ウォレット|秘密鍵|지갑|복구|محفظ|الاسترداد|кошел|cüzdan|dompet|चाबी|कुंजी/.test(q))key='wallet';
 else if(/donat|doa|donar|donacion|donner|paiement|payment|spend|don|contrib|تبرع|捐|寄付|기부|दान|пожертв|bağış|donasi/.test(q))key='donation';
 else if(/nobody|criador|creator|creador|createur|créat|gründ|مؤسس|创作者|制作者|제작자|निर्माता|создат|yaratıcı|kreator/.test(q))key='creator';
 else if(/ocean|river|rio|riviere|arvor|arbol|tree|forest|floresta|impact|environment|ambient|limpeza|clean|ökolog|umwelt|بيئ|محيط|نهر|海|川|環境|바다|환경|पर्यावरण|океан|эколог|çevre|lingkung/.test(q))key='impact';
 else if(/token|compr|buy|invest|preco|price|prix|solana|launch|lanc|lanz|sale|pre.?sale|покуп|продаж|買|代币|预售|価格|토큰|가격|टोकन|fiyat|satış|harga/.test(q))key='token';
 else if(/site|website|link|twitter|rede|social|x.com|sitio|сайт|サイト|网站|사이트|वेबसाइट/.test(q))key='site';
 else if(/plastik|mono|projet|project|projeto|qué|what is|qu.est.ce|是什么|とは|이란|क्या|что|nedir|apa itu|ما هو/.test(q))key='about';
 else if(/hi|hello|ola|hola|bonjour|salut|oi\b|hallo|مرحبا|اهلا|你好|こんにちは|안녕|नमस्ते|привет|merhaba|halo/.test(q))key='hello';
 addChat('bot',chatFaq[key]);
}
function refreshChat(){
 const box=document.getElementById('chatMessages');if(!box)return;
 chatFaq=DATA.faq[lang]||DATA.faq.en;
 box.replaceChildren();addChat('bot',chatFaq.welcome);
 const quick=document.getElementById('chatQuick');quick.replaceChildren();
 chatFaq.quick.forEach(value=>{const b=document.createElement('button');b.type='button';b.textContent=value;b.addEventListener('click',()=>chatAnswer(value));quick.appendChild(b)});
 const input=document.getElementById('chatInput');input.placeholder=chatFaq.placeholder;input.setAttribute('aria-label',chatFaq.placeholder);
 const sub=document.getElementById('chatSubtitle');if(sub)sub.textContent=chatFaq.subtitle;
 const note=document.getElementById('chatNote');if(note)note.textContent=chatFaq.note;
 const send=document.getElementById('chatSend');if(send)send.textContent=chatFaq.send;
 const launch=document.getElementById('chatLaunchLabel');if(launch)launch.textContent=chatFaq.launch;
}
function applyLanguage(next,save=true){
 lang=langs.includes(next)?next:'en';
 window.PLASTIK_CURRENT_LANG=lang;
 document.documentElement.lang=lang==='zh'?'zh-Hans':lang==='pt'?'pt-BR':lang==='en'?'en-US':lang;
 document.documentElement.dir=lang==='ar'?'rtl':'ltr';
 translateNodes();localizedDonation();refreshFinancialStages();refreshChat();
 document.querySelectorAll('[data-lang]').forEach(el=>el.setAttribute('aria-current',String(el.dataset.lang===lang)));
 const code=document.getElementById('langCode');if(code)code.textContent=lang.toUpperCase();
 const sel=document.getElementById('oxyLanguage');if(sel)sel.value=lang;
 const menu=document.getElementById('langMenu');if(menu)menu.classList.remove('open');
 const toggle=document.getElementById('langToggle');if(toggle)toggle.setAttribute('aria-expanded','false');
 if(document.body.classList.contains('clean-page'))document.title='The Clean Tribe | PLASTIK';
 else if(document.body.classList.contains('token-page'))document.title=lang==='en'?'Tokenomics & Presale | PLASTIK':t('PLASTIK TOKENOMICS')+' | PLASTIK';
 else if(document.getElementById('oxyLanguage'))document.title=lang==='en'?'OXY Impact Credits — PLASTIK':t('PLASTIK IMPACT PROGRAM · PREVIEW')+' — OXY';
 else document.title=lang==='en'?'PLASTIK — The Microplastic Monolith':'PLASTIK — '+t('THE MICROPLASTIC MONOLITH');
 const desc=document.querySelector('meta[name="description"]');if(desc && !document.body.classList.contains('clean-page'))desc.content=t('Meet MONO: a fictional, conscious microplastic with a big personality and a bigger mission. The internet\'s strangest movement for cleaner oceans, healthier rivers and a greener world.');
 if(save)try{localStorage.setItem('plastik-lang',lang)}catch(e){}
 window.dispatchEvent(new CustomEvent('plastik:languagechange',{detail:{language:lang}}));
}
const toggle=document.getElementById('langToggle'),menu=document.getElementById('langMenu');
if(toggle&&menu){
 toggle.addEventListener('click',()=>{const open=menu.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open))});
 document.querySelectorAll('[data-lang]').forEach(el=>el.addEventListener('click',()=>applyLanguage(el.dataset.lang)));
 document.addEventListener('click',e=>{if(!e.target.closest('.lang-wrap')){menu.classList.remove('open');toggle.setAttribute('aria-expanded','false')}});
}
const select=document.getElementById('oxyLanguage');if(select)select.addEventListener('change',()=>applyLanguage(select.value));
const chatLaunch=document.getElementById('chatLaunch');
if(chatLaunch){
 const panel=document.getElementById('chatPanel');
 chatLaunch.addEventListener('click',()=>{const open=panel.classList.toggle('open');chatLaunch.setAttribute('aria-expanded',String(open));if(open)document.getElementById('chatInput').focus()});
 const close=document.getElementById('chatClose');if(close)close.addEventListener('click',()=>{panel.classList.remove('open');chatLaunch.setAttribute('aria-expanded','false');chatLaunch.focus()});
 document.getElementById('chatForm').addEventListener('submit',e=>{e.preventDefault();const input=document.getElementById('chatInput');const value=input.value.trim();if(value){input.value='';chatAnswer(value)}});
}
const donationToast=document.getElementById('donateBtn');if(donationToast){
 document.querySelectorAll('.amount').forEach(el=>el.addEventListener('click',localizedDonation));
 
}
countdown();if(document.getElementById('stageGrid'))setInterval(countdown,1000);
applyLanguage(lang,false);
window.PLASTIK_SET_LANGUAGE=applyLanguage;
})();