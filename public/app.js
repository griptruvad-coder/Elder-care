/* =========================================================
   ApnaSa — single-page site (hash routes)
   ========================================================= */

/* ---------- 1. Settings the founder can change ---------- */
const CONFIG = {
  // Put the care team's WhatsApp number here with country code, digits only (e.g. '919812345678').
  // While it is empty, every "WhatsApp" button opens the enquiry form instead.
  whatsappNumber: '',
  whatsappText: 'Namaste ApnaSa! I would like to know more about care for my parents.'
};
const hasWA = CONFIG.whatsappNumber.trim() !== '';
const waLink = hasWA ? `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(CONFIG.whatsappText)}` : '#contact';
const waAttrs = hasWA ? `href="${waLink}" target="_blank" rel="noopener"` : `href="#contact"`;

/* ---------- 2. Photos ----------
   All photos live in images/. To swap one, replace the file (keep the name) or change "f" below.
   "pos" sets which part of the photo stays visible when it is cropped (x% y%). */
const PH = {
  walk:        { f: 'companion-walk-society',  pos: '47% 40%', alt: 'A young companion walking arm in arm with an elderly man with a walking stick in a city housing society' },
  medicine:    { f: 'companion-medicine-help', pos: '50% 35%', alt: 'A young companion helping an elderly woman with her weekly medicine box at home' },
  videoCall:   { f: 'video-call-couple',       pos: '55% 40%', alt: 'An elderly couple in their city flat smiling and waving at their son on a video call' },
  chai:        { f: 'chai-couple-city-flat',   pos: '50% 35%', alt: 'An elderly couple sharing chai on the sofa of their city apartment' },
  anniversary: { f: 'anniversary-couple',      pos: '50% 28%', alt: 'An elderly couple in garlands and festive clothes cutting a cake together' },
  laughing:    { f: 'grandparents-laughing',   pos: '50% 40%', alt: 'Grandparents laughing and playing with a baby in their garden' },
  beads:       { f: 'dadi-beads',              pos: '55% 30%', alt: 'A smiling elderly woman with glasses stringing a bead necklace' },
  // Small round photos: crop tightly on one face.
  dadiFace:    { f: 'companion-medicine-help', pos: '74% 22%', alt: 'A smiling elderly woman at home' },
  dadajiFace:  { f: 'video-call-couple',       pos: '24% 22%', alt: 'A smiling elderly man at home' }
};
const img = (p, { cls = '', lazy = true } = {}) =>
  `<img class="${cls}" src="images/${p.f}.jpg" alt="${p.alt}" style="object-position:${p.pos}" ${lazy ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async">`;

const app = document.querySelector('#app');

/* ---------- 3. Shared content ---------- */
const plans = [
  { name: 'Basic', price: '5,999', desc: 'Daily company and a little helping hand.',
    items: ['Daily 1-hour companion visit', 'Conversation, reading & games', 'Medicine & appointment reminders', 'Doctor, lab & pharmacy visit support', 'One weekly senior activity', 'Monthly family update', 'Dedicated care coordinator'] },
  { name: 'Premium', price: '7,999', desc: 'More walks, more company, more happy moments.',
    items: ['Everything in Basic', 'Morning or evening walk on alternate days', 'Nearby park, temple & café outings', 'One weekly senior activity', 'Doctor follow-up support', 'Family update every two weeks', 'Priority scheduling'] },
  { name: 'Super Premium', price: '11,999', desc: 'Extra support for a fuller, happier everyday life.',
    items: ['Everything in Premium', 'Daily walk, at your parent’s pace', 'Weekend activities & hobby sessions', 'Special outings & community events', 'Weekly family update', 'Priority support', 'Flexible visit timing'] }
];
const planKey = name => name.toLowerCase().replace(/ /g, '_');
const planTags = ['A LITTLE EVERYDAY CARE', 'MORE HAPPY MOMENTS', 'A LITTLE EXTRA SUPPORT'];

const disclaimer = `<div class="disclaimer reveal"><span class="di-icon" aria-hidden="true">i</span><div><b>A little clarity, because care matters.</b><br>We provide companionship and daily-life support, not nursing, medical treatment, injections, or emergency medical services. Companions can give medicine reminders and accompany parents to medical visits. In an emergency, call local emergency services or go to the nearest hospital.</div></div>`;

const planCards = () => `<div class="plans">${plans.map((p, i) => `
  <article class="plan reveal ${i === 1 ? 'featured' : ''}" style="--d:${i * 110}ms">
    ${i === 1 ? '<span class="ribbon">COMPANY + REGULAR WALKS</span>' : ''}
    <span class="eyebrow">${planTags[i]}</span>
    <h3>${p.name}</h3>
    <p>${p.desc}</p>
    <div class="price"><span class="rupee">₹</span>${p.price}<small>/ month</small></div>
    <small class="sub">Subscription plan</small>
    <ul class="check">${p.items.map(x => `<li>${x}</li>`).join('')}</ul>
    <a class="button ${i === 1 ? '' : 'outline'}" href="#dashboard?plan=${planKey(p.name)}">Choose ${p.name} →</a>
  </article>`).join('')}</div>
  ${disclaimer}
  <p class="center tiny">Walks depend on your parent’s health, comfort and choice. Ask our team about visit duration, travel costs and local activity availability before joining.</p>`;

const questions = [
  ['Is this only for NRI families?', 'No. We support working families, families living far away, and parents who live alone or would enjoy regular company in India.'],
  ['Does the companion provide nursing care?', 'No. Companions help with company, reminders, walks, activities and doctor visits. They do not give medical treatment or nursing care.'],
  ['Will the same companion visit every day?', 'We try to keep the same companion whenever possible. If they are away, we arrange a trained backup companion.'],
  ['Can my parent choose morning or evening walks?', 'Yes. We plan walks around their choice, health, ability to move, weather and safety.'],
  ['How often will my family receive updates?', 'Basic includes a monthly update, Premium includes an update every two weeks, and Super Premium includes a weekly update. Important concerns are shared with the family when they arise.'],
  ['What happens in a medical emergency?', 'Our companion contacts the family or local emergency contact and helps coordinate support. We are not an emergency service. For a serious emergency, call local emergency services or go to the nearest hospital.'],
  ['Can we pause or stop a plan?', 'Plans can be paused or stopped according to the cancellation policy. Ask the care team for the notice period, pause terms and refund details before you join.']
];
const faq = () => `<div class="faq">${questions.map((q, i) => `<details class="reveal" style="--d:${i * 60}ms"><summary>${q[0]}<span class="plus" aria-hidden="true"></span></summary><div class="ans"><p>${q[1]}</p></div></details>`).join('')}</div>`;

const stepData = [
  ['Tell us about them', 'Share their city, routine, language and the help they need.', '📝'],
  ['Choose your plan', 'Pick the support that feels right for your parent.', '🤝'],
  ['Meet their companion', 'Get to know the person who will visit and support them.', '🙏'],
  ['Care begins', 'Daily visits, reminders and activities start with your plan.', '🌼'],
  ['Stay connected', 'Receive family updates and share feedback with your coordinator.', '💌']
];
const steps = () => `<div class="steps"><div class="steps-line" aria-hidden="true"><span></span></div>${stepData.map((s, i) => `
  <div class="step reveal" style="--d:${i * 110}ms"><span class="stepnum"><i>${s[2]}</i><b>0${i + 1}</b></span><h3>${s[0]}</h3><p>${s[1]}</p></div>`).join('')}</div>`;

const cta = () => `<section class="section wrap"><div class="cta reveal">
  <div class="cta-glow" aria-hidden="true"></div>
  ${diya()}
  <span class="eyebrow light">LET’S START WITH A CONVERSATION</span>
  <h2>A little help for them.<br><em>A little peace of mind for you.</em></h2>
  <p>Tell us what your parent needs. We’ll help you find the right care.</p>
  <div class="actions center-actions">
    <a class="button gold" href="#contact">Talk to our care team →</a>
    ${hasWA ? `<a class="button ghost-light" ${waAttrs}>WhatsApp us</a>` : ''}
  </div>
</div></section>`;

const diya = () => `<svg class="diya" viewBox="0 0 120 90" aria-hidden="true">
  <path class="flame" d="M60 8c7 12 9 20 9 26a9 9 0 0 1-18 0c0-6 2-14 9-26z"/>
  <path class="flame-in" d="M60 22c3 6 4 10 4 13a4 4 0 0 1-8 0c0-3 1-7 4-13z"/>
  <path class="bowl" d="M14 50h92c-4 20-22 32-46 32S18 70 14 50z"/>
  <path class="rim" d="M10 48h100" />
</svg>`;

const toran = () => `<svg class="toran" viewBox="0 0 600 70" preserveAspectRatio="none" aria-hidden="true">
  <path d="M0 6 Q300 40 600 6" class="string"/>
  ${Array.from({ length: 13 }, (_, i) => {
    const x = 20 + i * 46.6, t = x / 600, y = 6 + 34 * 4 * t * (1 - t) * 0.5 + 3;
    return `<g class="bead" style="--i:${i}"><path class="leaf" d="M${x} ${y} q-9 14 0 26 q9 -12 0 -26z"/><circle class="marigold" cx="${x}" cy="${y + 4}" r="8"/><circle class="marigold-in" cx="${x}" cy="${y + 4}" r="4"/></g>`;
  }).join('')}
</svg>`;

const petals = () => `<div class="petals" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => `<span style="--x:${(i * 97) % 100}%;--t:${9 + (i % 4) * 2.5}s;--dl:${-i * 1.7}s;--s:${0.6 + (i % 3) * 0.25}"></span>`).join('')}</div>`;

const notes = [
  { i: '🌿', t: 'Subah ki sair', m: 'Walked to the park and back. Said hello to everyone at the gate!', w: '7:40 AM' },
  { i: '💊', t: 'Dawai reminder', m: 'Morning medicines taken on time.', w: '9:05 AM' },
  { i: '☕', t: 'Chai pe charcha', m: 'Maa told stories from her school days. Lots of laughter.', w: '11:20 AM' },
  { i: '🩺', t: 'Clinic visit', m: 'Went together for the BP check-up. Next date noted.', w: 'Tue' },
  { i: '🎶', t: 'Bhajan sandhya', m: 'Joined the weekly activity group today.', w: '5:30 PM' },
  { i: '📸', t: 'A little message', m: '“Beta ko bolna, main bilkul theek hoon!”', w: '6:10 PM' }
];

/* ---------- 4. Pages ---------- */
const splitWords = (html) => html.split('<br>').map(line =>
  line.replace(/(<em>.*?<\/em>)|([^\s<]+)/g, (m, em, w) => em ? `<span class="w"><span>${em}</span></span>` : `<span class="w"><span>${w}</span></span>`)
).join('<br>');

const pageTop = (ey, h, p, photo) => `<section class="pagetop wrap">
  <div class="pagetop-text">
    <span class="eyebrow">${ey}</span>
    <h1 class="words">${splitWords(h)}</h1>
    <p class="fade-up">${p}</p>
  </div>
  ${photo ? `<figure class="pagetop-photo fade-up">${img(photo, { lazy: false })}<span class="ring" aria-hidden="true"></span></figure>` : ''}
</section>`;

const tiles = (items) => `<div class="tiles">${items.map((x, i) => `<article class="tile reveal" style="--d:${(i % 3) * 100}ms"><span class="tile-icon" aria-hidden="true">${x[2] || '✿'}</span><h3>${x[0]}</h3><p>${x[1]}</p></article>`).join('')}</div>`;

const gallerySlides = [
  [PH.walk, 'A walk, at their own pace.', 'An arm to hold on the society path — and someone to chat with all the way.'],
  [PH.chai, 'Chai pe charcha, every day.', 'Stories, the newspaper, a little laughter. Company is the best part of the day.'],
  [PH.medicine, 'Dawai, on time. With a smile.', 'Gentle reminders and help with the weekly pill box, never a lecture.'],
  [PH.videoCall, 'Close, even from far away.', 'Help with video calls, so the family is just one tap away.'],
  [PH.laughing, 'More laughter in the house.', 'The kind of everyday joy that makes a home feel full again.'],
  [PH.anniversary, 'Every celebration, celebrated.', 'Birthdays, anniversaries and festivals never go unnoticed.']
];
const gallery = () => `<section class="section gallery-section"><div class="wrap">
  <div class="gallery-heading">
    <div class="reveal"><span class="eyebrow">LIFE IS BETTER WITH A LITTLE COMPANY</span><h2>Chhote pal.<br><em>Bahut saara pyaar.</em></h2></div>
    <p class="reveal" style="--d:120ms">A shared story. A walk in the park. A familiar smile.<br>Care lives in the everyday things.</p>
  </div>
  <div class="care-carousel reveal" role="region" aria-roledescription="carousel" aria-label="Moments of care" tabindex="0">
    <div class="slide-window"><div class="slide-track">${gallerySlides.map((s, i) => `
      <figure class="care-slide" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${gallerySlides.length}" aria-hidden="${i !== 0}">
        ${img(s[0])}
        <figcaption><span>0${i + 1} / 0${gallerySlides.length}</span><h3>${s[1]}</h3><p>${s[2]}</p></figcaption>
      </figure>`).join('')}</div></div>
    <div class="carousel-bar">
      <div class="slide-dots">${gallerySlides.map((s, i) => `<button class="slide-dot ${i === 0 ? 'selected' : ''}" aria-label="Show photo ${i + 1}: ${s[1]}" aria-pressed="${i === 0}" data-slide="${i}"><i></i></button>`).join('')}</div>
      <div class="slide-controls"><button data-carousel="prev" aria-label="Previous photo">←</button><button data-carousel="next" aria-label="Next photo">→</button></div>
    </div>
  </div>
</div></section>`;

const home = () => `
<section class="hero">
  ${petals()}
  <div class="blob b1" aria-hidden="true"></div><div class="blob b2" aria-hidden="true"></div>
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <span class="eyebrow fade-up">FOR THE ONES WHO RAISED YOU</span>
      <h1 class="words">${splitWords('You can’t always be there.<br>Par Maa-Papa <em>akele nahi</em><br>rahenge.')}</h1>
      <p class="lead fade-up">A warm, trained ApnaSa companion visits your parents every day — for <b>chai pe baatein</b>, a gentle walk, medicine reminders and doctor visits.</p>
      <p class="fade-up">They get company. You get peace of mind.</p>
      <div class="actions fade-up">
        <a class="button big" href="#plans">Choose a care plan <span class="arr">→</span></a>
        <a class="button outline big" ${waAttrs}>${hasWA ? 'WhatsApp us' : 'Talk to our care team'}</a>
      </div>
      <ul class="hero-trust fade-up">
        <li><span>✓</span>Background-checked companions</li>
        <li><span>✓</span>The same familiar face</li>
        <li><span>✓</span>Plans from ₹5,999/month</li>
      </ul>
    </div>

    <div class="hero-art">
      ${toran()}
      <figure class="arch">${img(PH.walk, { lazy: false })}</figure>
      <figure class="bubble bubble-1">${img(PH.dadiFace)}</figure>
      <figure class="bubble bubble-2">${img(PH.dadajiFace)}</figure>
      <p class="hand-note">Best part of their day?<br>Someone who shows up. <span>♡</span>
        <svg viewBox="0 0 80 50" aria-hidden="true"><path d="M5 5 C 30 10, 50 25, 70 42 M58 42 L72 44 L68 30"/></svg>
      </p>
      <div class="visit-card" aria-label="Illustration of moments from a companion visit">
        <div class="vc-head"><span class="vc-dot"></span><b>ApnaSa · a day of care</b><small>sample</small></div>
        <div class="vc-stack" id="noteStack"></div>
      </div>
    </div>
  </div>
</section>

<div class="marquee" aria-label="What a companion can help with">
  <div class="marquee-track">${Array(2).fill(['Chai pe charcha', 'Subah ki sair', 'Ludo & carrom', 'Bhajan sandhya', 'Mandir outings', 'Dawai reminders', 'Doctor visits', 'Akhbaar together', 'Purani yaadein', 'Festival celebrations'].map(x => `<span>${x}</span><i>✿</i>`).join('')).join('')}</div>
</div>

<section class="section wrap feel">
  <div class="sectionintro center reveal">
    <span class="eyebrow">DOES THIS SOUND FAMILIAR?</span>
    <h2>Every phone call ends<br>with <em>“main theek hoon, beta.”</em></h2>
  </div>
  <div class="feel-grid">
    <blockquote class="reveal" style="--d:0ms"><q>Haan beta, sab theek hai.</q><p>But you wonder who they actually talked to today.</p></blockquote>
    <blockquote class="reveal" style="--d:120ms"><q>Doctor ke paas akele chale gaye.</q><p>They didn’t want to trouble you. Again.</p></blockquote>
    <blockquote class="reveal" style="--d:240ms"><q>Ghar bahut shaant rehta hai ab.</q><p>A house that was once full of noise now waits for your evening call.</p></blockquote>
  </div>
  <p class="feel-answer reveal"><span class="hand">That quiet is exactly what ApnaSa fills</span> — with a familiar face, every single day.</p>
</section>

<section class="section cream-2">
  <div class="wrap">
    <div class="sectionintro center reveal">
      <span class="eyebrow">SMALL MOMENTS. MEANINGFUL CARE.</span>
      <h2>Someone to share<br><span class="rotator" data-words="a cup of chai|a morning walk|old stories|a game of carrom|their favourite bhajan">a cup of chai</span> with.</h2>
      <p>Growing older shouldn’t mean feeling alone. We bring company, gentle help and something to look forward to.</p>
    </div>
    <div class="services">${[
      ['☕', 'Someone to talk to', 'Stories, a cup of tea, a favourite game. Sometimes, company is the best part of the day.'],
      ['🤲', 'A little everyday help', 'Medicine reminders, small errands and support with doctor visits.'],
      ['🌳', 'More moments outside', 'A gentle walk, a visit to the park or a little time with new friends.'],
      ['📱', 'Stay close, from anywhere', 'Regular family updates and one care coordinator to keep things simple.']
    ].map((s, i) => `<article class="service reveal tilt" style="--d:${i * 100}ms"><div class="icon">${s[0]}</div><h3>${s[1]}</h3><p>${s[2]}</p></article>`).join('')}</div>
  </div>
</section>

<section class="section wrap visit">
  <div class="visit-grid">
    <div class="reveal visit-intro">
      <span class="eyebrow">WHAT A VISIT LOOKS LIKE</span>
      <h2>Ek ghanta.<br><em>Poore din ki muskaan.</em></h2>
      <p>Every plan includes a daily one-hour companion visit. Here’s how that hour usually feels — always at your parent’s pace.</p>
      <a class="button outline" href="#how">See how it works →</a>
    </div>
    <ol class="timeline">
      <li class="reveal"><b>“Namaste! Kaise hain aap?”</b><p>A warm hello and a check-in — how they slept, how they feel today.</p></li>
      <li class="reveal"><b>Chai, baatein — or a walk</b><p>Conversation over tea, or a gentle walk on plans that include one.</p></li>
      <li class="reveal"><b>Dawai &amp; appointments</b><p>Medicine reminders, and upcoming doctor or lab visits noted.</p></li>
      <li class="reveal"><b>Their favourite thing</b><p>Ludo, the newspaper, a bhajan, old photo albums — whatever they love.</p></li>
      <li class="reveal"><b>“Kal milte hain!”</b><p>A promise to return tomorrow, and notes for your family update.</p></li>
    </ol>
  </div>
</section>

<section class="section peach">
  <div class="wrap split">
    <figure class="story-photo reveal">${img(PH.medicine)}<figcaption class="hand">Saath. Har din.</figcaption></figure>
    <div class="reveal" style="--d:120ms">
      <span class="eyebrow">A LITTLE CLOSER, EVEN FROM FAR AWAY</span>
      <h2>We don’t replace your love.<br><em>We carry it to them.</em></h2>
      <p>Work, distance and daily life can make it hard to be there every day. Our companions give your parents time, attention and respectful support.</p>
      <p>You remain their family. We become a familiar part of their day.</p>
      <div class="actions"><a href="#nri" class="button outline">For families living abroad →</a><a href="#working" class="button ghost">For working families</a></div>
    </div>
  </div>
</section>

<section class="section wrap" id="plans-home">
  <div class="sectionintro center reveal">
    <span class="eyebrow">SIMPLE PLANS. THOUGHTFUL CARE.</span>
    <h2>The right care for your family.</h2>
    <p>One hour of daily company. A little more comfort.<br>Choose the monthly support your parent needs.</p>
  </div>
  ${planCards()}
</section>

${gallery()}

<section class="section sage">
  <div class="wrap">
    <div class="sectionintro center reveal"><span class="eyebrow">WE’LL TAKE IT ONE STEP AT A TIME</span><h2>Getting started is simple.</h2></div>
    ${steps()}
  </div>
</section>

<section class="section wrap">
  <div class="sectionintro center reveal"><span class="eyebrow">A FEW THINGS YOU MAY BE WONDERING</span><h2>Let’s put your mind at ease.</h2></div>
  ${faq()}
</section>
${cta()}`;

const fields = [['Parent’s name', 'text', true], ['Parent’s age', 'number', true], ['City and area', 'text', true], ['Living arrangement', ['Alone', 'With a spouse', 'With family']], ['Walking support', ['Walks independently', 'Uses a walker', 'Needs support']], ['Preferred visit time', ['Morning', 'Afternoon', 'Evening']], ['Preferred language', 'text'], ['You live in', ['India', 'Outside India']], ['Your name', 'text', true], ['Your relationship with the parent', 'text', true], ['Phone number', 'tel', true], ['Email address', 'email', true], ['Preferred plan', ['Not sure', 'Basic', 'Premium', 'Super Premium']]];

const contact = () => `${pageTop('WE’RE HERE TO LISTEN', 'Every parent has a story.<br><em>Tell us about yours.</em>', 'Start with a few details so the right care can be planned around your family.')}
<div class="wrap formlayout">
  <aside class="reveal">
    <h3>Care starts with understanding.</h3>
    <p>Share their routine, what makes them happy, and where a little help could make a difference.</p>
    <ul class="check"><li>No payment is taken here</li><li>Our care team calls you back</li><li>Share only details you are comfortable sharing</li></ul>
    ${hasWA ? `<a class="button whatsapp" ${waAttrs}>Prefer WhatsApp? Message us</a>` : ''}
    <div class="formnote"><b>Your details are safe</b><br>They go only to the ApnaSa care team, and are used only to plan care for your parent.</div>
  </aside>
  <form id="careform" class="reveal" style="--d:120ms">
    <div class="formgrid">${fields.map((f, i) => `<label>${f[0]}${f[2] ? ' *' : ''}${Array.isArray(f[1]) ? `<select name="${f[0]}" id="f${i}">${f[1].map(v => `<option>${v}</option>`).join('')}</select>` : `<input name="${f[0]}" id="f${i}" type="${f[1]}" ${f[2] ? 'required' : ''} ${f[1] === 'number' ? 'min="1" max="120"' : ''}>`}</label>`).join('')}
      <label class="full">Health condition or special need (optional)<textarea name="Health needs" placeholder="Only share what would help us understand their daily support needs."></textarea></label>
      <label class="full">Special request or message<textarea name="Message" placeholder="Their favourite hobbies, daily routine, or anything else you’d like to share."></textarea></label>
      <label class="consent full"><input type="checkbox" required>I have my parent’s permission to share these details with ApnaSa.</label>
      <button class="button full big" type="submit">Send to the care team →</button>
    </div>
    <div id="result" aria-live="polite"></div>
  </form>
</div>`;

const pages = {
  home,
  plans: () => `${pageTop('OUR MONTHLY CARE PLANS', 'A little care.<br><em>A lot of difference.</em>', 'Choose Basic, Premium or Super Premium based on the company, walks and daily support your parent needs.', PH.beads)}<section class="section wrap tight">${planCards()}</section>${cta()}`,
  how: () => `${pageTop('HOW IT WORKS', 'Good care starts<br><em>with getting to know you.</em>', 'From your first conversation to their first visit, we keep things simple.', PH.walk)}<section class="section wrap tight">${steps()}${disclaimer}</section>${cta()}`,
  faq: () => `${pageTop('COMMON QUESTIONS', 'A little clarity.<br><em>A little peace of mind.</em>', 'Honest answers to help your family choose.')}<section class="section wrap tight">${faq()}</section>${cta()}`,
  contact,
  about: () => `${pageTop('ABOUT APNASA', 'Care that feels<br><em>like family.</em>', 'ApnaSa is built around a simple thought: everyone deserves to feel seen, heard and cared for as they grow older.', PH.anniversary)}
    <section class="section peach"><div class="wrap split">
      <div class="reveal"><span class="eyebrow">WHY “APNA SA”</span><h2>The love stays yours.<br><em>The everyday help is ours.</em></h2>
      <p>We provide a caring companion for older parents who live alone or need regular support. Our role is to be there when work, distance or everyday life means you cannot.</p>
      <p>We respect your parent’s choice, routine and independence. Care should feel comfortable, never forced — like someone who is <i>apna sa</i>, almost family.</p></div>
      <div class="storyart reveal" style="--d:120ms">${diya()}<strong>A little time.<br>A listening ear.<br>A feeling of home.</strong><small class="hand">That’s the heart of ApnaSa.</small></div>
    </div></section>${cta()}`,
  nri: () => `${pageTop('FOR NRI FAMILIES', 'You may live far away.<br><em>Your love can still be close.</em>', 'When your parents are in India and you are abroad, a familiar person nearby can make daily life feel easier.', PH.videoCall)}<section class="section wrap tight">${tiles([['Someone nearby', 'A companion visits your parent, spends time with them and helps with everyday needs.', '🏡'], ['Help with appointments', 'Support with planning and attending doctor, lab and pharmacy visits.', '🩺'], ['A connection to home', 'Plan-based family updates and one care coordinator help you stay involved.', '💌']])}</section>${cta()}`,
  working: () => `${pageTop('FOR WORKING FAMILIES', 'You care deeply.<br><em>Your days are full.</em>', 'Work, children and daily responsibilities can make it hard to visit every day. A little extra support can help.', PH.medicine)}<section class="section wrap tight">${tiles([['Company during the day', 'A daily one-hour visit gives your parent time to talk, share stories and enjoy a favourite activity.', '☕'], ['Help with the little things', 'Reminders, small errands and doctor-visit support make everyday tasks easier.', '🤲'], ['Care around their routine', 'Choose a preferred visit time and tell us what works for your parent.', '⏰']])}</section>${cta()}`,
  club: () => `${pageTop('SENIOR ACTIVITY CLUB', 'More friends.<br><em>More reasons to smile.</em>', 'Time together can turn an ordinary week into something to look forward to. Activities are planned around comfort, interest and local availability.', PH.laughing)}<section class="section wrap tight">${tiles([['Stories & games', 'Share memories, enjoy board games and make new friends.', '🎲'], ['Music & bhajan', 'Sing along, listen to favourite songs and enjoy familiar tunes.', '🎶'], ['Gentle movement', 'Walks and suitable yoga activities, based on each parent’s comfort and health.', '🧘'], ['Hobbies & creativity', 'Reading, art and simple creative activities that bring people together.', '🎨'], ['Little outings', 'A nearby park, temple, café or community place for a change of scene.', '🛕'], ['Celebrate together', 'Festivals and weekend gatherings to share happy moments.', '🪔']])}<p class="tiny center">Basic and Premium include one weekly senior activity. Super Premium also includes weekend activities. Ask the care team about local schedules and any outing costs.</p></section>${gallery()}${cta()}`,
  safety: () => `${pageTop('SAFETY & TRUST', 'Kindness comes with<br><em>responsibility.</em>', 'Respect, familiar faces and clear communication are at the heart of our care.', PH.chai)}<section class="section wrap tight">${tiles([['Checked & trained', 'Companions are background-checked and trained before starting work.', '🛡️'], ['A familiar face', 'We aim to keep the same companion, with a trained backup when needed.', '🙂'], ['Your parent’s choice', 'We respect their routine, comfort, language and independence.', '🌼'], ['One care coordinator', 'A single person helps with schedules, feedback and special requests.', '📞'], ['Privacy matters', 'Share only the details needed to arrange care. This enquiry preview does not store or send your information.', '🔒'], ['Emergency support', 'Companions contact family or a local emergency contact and help coordinate support. This is not an emergency medical service.', '🚑']])}${disclaimer}</section>${cta()}`
};
const pageTitles = { plans: 'Care Plans', how: 'How It Works', nri: 'For NRI Families', working: 'For Working Families', club: 'Senior Activity Club', about: 'About Us', safety: 'Safety & Trust', faq: 'Common Questions', contact: 'Talk to Us' };

/* ---------- 5. Motion ---------- */
const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
let cleanups = [];
const onCleanup = fn => cleanups.push(fn);
const runCleanups = () => { cleanups.forEach(f => f()); cleanups = []; };

function setupReveal() {
  const targets = app.querySelectorAll('.reveal, .fade-up, .words, .timeline, .steps');
  if (reducedMQ.matches || !('IntersectionObserver' in window)) { targets.forEach(t => t.classList.add('in')); return; }
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.14, rootMargin: '0px 0px -40px 0px' });
  targets.forEach(t => io.observe(t));
  // words of split headings get a stagger
  app.querySelectorAll(".words").forEach(h => h.querySelectorAll('.w > span').forEach((s, i) => s.style.setProperty('--wi', i)));
  app.querySelectorAll('.timeline li').forEach((li, i) => li.style.setProperty('--d', `${i * 140}ms`));
  onCleanup(() => io.disconnect());
}

function setupNotes() {
  const stack = app.querySelector('#noteStack'); if (!stack) return;
  let i = 0;
  const card = n => `<div class="note"><span class="ni">${n.i}</span><div><b>${n.t}</b><p>${n.m}</p></div><small>${n.w}</small></div>`;
  const push = () => {
    stack.insertAdjacentHTML('afterbegin', card(notes[i % notes.length])); i++;
    const all = stack.querySelectorAll('.note');
    if (all.length > 3) { const last = all[all.length - 1]; last.classList.add('out'); setTimeout(() => last.remove(), 500); }
  };
  push(); push(); push();
  if (reducedMQ.matches) return;
  const t = setInterval(() => { if (!document.hidden) push(); }, 2800);
  onCleanup(() => clearInterval(t));
}

function setupRotator() {
  app.querySelectorAll('.rotator').forEach(el => {
    const words = el.dataset.words.split('|'); let i = 0;
    if (reducedMQ.matches) return;
    const t = setInterval(() => {
      el.classList.add('swap');
      setTimeout(() => { i = (i + 1) % words.length; el.textContent = words[i]; el.classList.remove('swap'); }, 380);
    }, 2400);
    onCleanup(() => clearInterval(t));
  });
}

function setupTilt() {
  if (reducedMQ.matches || !matchMedia('(hover:hover)').matches) return;
  app.querySelectorAll('.tilt, .plan').forEach(el => {
    const move = e => { const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; el.style.setProperty('--rx', `${(-y * 6).toFixed(2)}deg`); el.style.setProperty('--ry', `${(x * 6).toFixed(2)}deg`); };
    const leave = () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); };
    el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave);
  });
}

function setupParallax() {
  const art = app.querySelector('.hero-art'); if (!art || reducedMQ.matches || !matchMedia('(hover:hover)').matches) return;
  const hero = app.querySelector('.hero');
  const move = e => { const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5; art.style.setProperty('--px', x.toFixed(3)); art.style.setProperty('--py', y.toFixed(3)); };
  hero.addEventListener('pointermove', move);
}

function setupCarousel() {
  app.querySelectorAll('.care-carousel').forEach(carousel => {
    const track = carousel.querySelector('.slide-track');
    const slides = carousel.querySelectorAll('.care-slide');
    const dots = carousel.querySelectorAll('.slide-dot');
    let current = 0, startX = null, hovered = false;
    const show = n => {
      current = (n + slides.length) % slides.length;
      track.style.transform = `translateX(-${current * 100}%)`;
      slides.forEach((el, i) => { el.setAttribute('aria-hidden', i !== current); el.classList.toggle('active', i === current); });
      dots.forEach((d, i) => { d.classList.toggle('selected', i === current); d.setAttribute('aria-pressed', i === current); });
      restart();
    };
    let timer;
    const restart = () => { clearInterval(timer); if (!reducedMQ.matches) timer = setInterval(() => { const b = carousel.getBoundingClientRect(); if (!document.hidden && !hovered && b.top < innerHeight && b.bottom > 0) show(current + 1); }, 4200); };
    dots.forEach(b => b.addEventListener('click', () => show(Number(b.dataset.slide))));
    carousel.querySelector('[data-carousel="prev"]').addEventListener('click', () => show(current - 1));
    carousel.querySelector('[data-carousel="next"]').addEventListener('click', () => show(current + 1));
    carousel.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1); } });
    carousel.addEventListener('pointerenter', () => hovered = true); carousel.addEventListener('pointerleave', () => hovered = false);
    carousel.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    carousel.addEventListener('touchend', e => { if (startX !== null) { const dx = e.changedTouches[0].clientX - startX; if (Math.abs(dx) > 45) show(current + (dx < 0 ? 1 : -1)); startX = null; } }, { passive: true });
    slides[0].classList.add('active');
    restart();
    onCleanup(() => clearInterval(timer));
  });
}

function setupScrollBits() {
  const tl = app.querySelector('.timeline');
  const stepsEl = app.querySelector('.steps');
  const onScroll = () => {
    document.body.classList.toggle('scrolled', scrollY > 30);
    const max = document.documentElement.scrollHeight - innerHeight;
    document.documentElement.style.setProperty('--progress', max > 0 ? (scrollY / max).toFixed(4) : 0);
    [tl, stepsEl].forEach(el => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.75 - r.top) / r.height));
      el.style.setProperty('--fill', p.toFixed(3));
    });
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  onCleanup(() => removeEventListener('scroll', onScroll));
}

/* ---------- 6. Router ---------- */
function render() {
  runCleanups();
  const [route, query] = (location.hash.slice(1) || 'home').split('?');
  if (route === 'top') return;
  app.innerHTML = (pages[route] || home)();
  app.classList.remove('page-in'); void app.offsetWidth; app.classList.add('page-in');
  document.title = `${route === 'home' || !pages[route] ? 'Care that feels like family' : (pageTitles[route] || 'ApnaSa')} | ApnaSa`;
  document.querySelector('nav').classList.remove('open');
  document.body.classList.remove('menu-open');
  document.querySelector('#menu').setAttribute('aria-expanded', 'false');
  document.querySelectorAll('nav a').forEach(a => a.classList.toggle('active', a.hash === '#' + route));
  document.querySelector('#floatingHelp').classList.toggle('hidden', route === 'contact');
  window.scrollTo(0, 0);

  setupReveal(); setupNotes(); setupRotator(); setupTilt(); setupParallax(); setupCarousel(); setupScrollBits();
  if (window.afterRender) window.afterRender(route, query || '');

  if (route === 'contact') {
    const selected = new URLSearchParams(query).get('plan');
    if (plans.some(p => p.name === selected)) document.querySelector('#f12').value = selected;
    const form = document.querySelector('#careform');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = form.querySelector('button[type=submit]');
      const data = Object.fromEntries([...new FormData(form).entries()].map(([k, v]) => [k, String(v).trim()]).filter(([, v]) => v));
      btn.disabled = true; btn.classList.add('loading');
      const result = document.querySelector('#result');
      try {
        const res = await fetch('/api/enquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'Could not send. Please try again.');
        form.classList.add('sent');
        result.innerHTML = '<div class="result success-card"><div class="tick-anim" aria-hidden="true"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-15"/></svg></div><b>Shukriya! Your enquiry has reached us. ♡</b><p class="tiny">Our care team will call you within one working day. You can also create an account to track everything in one place.</p><a class="button" href="#login?mode=signup">Create my account →</a></div>';
        window.burstPetals && window.burstPetals();
      } catch (err) {
        result.innerHTML = `<div class="result error-card"><b>${err.message.replace(/</g, '&lt;')}</b></div>`;
      } finally { btn.disabled = false; btn.classList.remove('loading'); }
      result.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
}

if (hasWA) { const fh = document.querySelector('#floatingHelp'); fh.href = waLink; fh.target = '_blank'; fh.rel = 'noopener'; fh.setAttribute('aria-label', 'Message ApnaSa on WhatsApp'); }
else { document.querySelector('#floatingHelp .fh-icon').innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z"/></svg>'; }

window.addEventListener('hashchange', render);
document.querySelector('#menu').addEventListener('click', () => {
  const open = document.querySelector('nav').classList.toggle('open');
  document.body.classList.toggle('menu-open', open);
  document.querySelector('#menu').setAttribute('aria-expanded', String(open));
});
// account.js adds the login and dashboard pages, so wait until every script has loaded.
document.addEventListener('DOMContentLoaded', render);
