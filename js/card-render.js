import { BRAND_LOGO_HEIGHT, BRAND_LOGO_WIDTH } from './config.js';
import { absoluteUrl, displayLogo, mailtoHref, smsHref, telHref } from './card-utils.js';

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function icon(name) {
  const icons = {
    call: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8c1.5 3 3.6 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.2 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8z"/></svg>',
    text: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>',
    email: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5L4 8V6l8 5 8-5v2z"/></svg>',
    web: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.5 9H4V20h2.5V9zM5.2 4C4.3 4 3.6 4.7 3.6 5.6s.7 1.6 1.6 1.6 1.6-.7 1.6-1.6S6.1 4 5.2 4zM20 20h-2.5v-5.4c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V20H11V9h2.4v1.5h.1c.3-.6 1.2-1.8 2.8-1.8 3 0 3.6 2 3.6 4.5V20z"/></svg>',
    save: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M15 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8l-6-5zm-1 2.5 5.5 5.5H14V5.5zM12 19c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"/></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18 16.1c-.8 0-1.4.3-1.9.8L8.9 13c.1-.3.1-.6.1-1s0-.7-.1-1l7.1-3.9c.5.5 1.2.8 1.9.8 1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3c0 .4 0 .7.1 1L8 10.8C7.5 10.3 6.8 10 6 10c-1.7 0-3 1.3-3 3s1.3 3 3 3c.8 0 1.5-.3 2-.8l7.1 3.9c-.1.3-.1.6-.1.9 0 1.7 1.3 3 3 3s3-1.3 3-3-1.3-3-3-3z"/></svg>'
  };
  return icons[name] || '';
}

function actionBtn(href, label, name, extraClass = '') {
  if (!href) return '';
  return `<a class="dc-btn ${extraClass}" href="${esc(href)}" ${href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${icon(name)}<span>${esc(label)}</span></a>`;
}

export function cardFaceHtml(card, mode = 'public') {
  const template = card.theme?.template || 'classic';
  const accent = card.theme?.accent || '#0071C2';
  const logo = displayLogo(card);
  const primaryPhone = (card.phones || []).find((p) => p.number)?.number || '';
  const actions = [];
  if (primaryPhone) {
    actions.push(actionBtn(telHref(primaryPhone), 'Call', 'call'));
    actions.push(actionBtn(smsHref(primaryPhone), 'Text', 'text'));
  }
  if (card.email) actions.push(actionBtn(mailtoHref(card.email), 'Email', 'email'));
  if (card.website) actions.push(actionBtn(absoluteUrl(card.website), 'Website', 'web'));
  if (card.linkedin) actions.push(actionBtn(absoluteUrl(card.linkedin), 'LinkedIn', 'linkedin'));

  for (const link of card.extra_links || []) {
    if (!link.url) continue;
    actions.push(actionBtn(absoluteUrl(link.url), link.label || 'Link', 'web'));
  }

  const morePhones = (card.phones || []).slice(1).filter((p) => p.number);
  const photo = card.photo_url
    ? `<img class="dc-photo" src="${esc(card.photo_url)}" alt="${esc(card.full_name || 'Headshot')}" />`
    : `<div class="dc-photo dc-photo-fallback" aria-hidden="true">${esc((card.full_name || 'C').slice(0, 1).toUpperCase())}</div>`;

  const saveRow = mode === 'public'
    ? `<div class="dc-primary-row">
        <button type="button" class="dc-primary" data-save-contact>${icon('save')}<span>Save contact</span></button>
        <button type="button" class="dc-ghost" data-share-card>${icon('share')}<span>Share</span></button>
      </div>`
    : '';

  const explore = mode === 'public'
    ? `<a class="dc-explore" href="https://www.corepga.com" target="_blank" rel="noopener">Explore CorePGA →</a>`
    : '';

  return `
    <article class="dc-face theme-${esc(template)}" style="--accent:${esc(accent)}">
      <div class="dc-brandbar">
        <img class="dc-logo" src="${esc(logo)}" width="${BRAND_LOGO_WIDTH}" height="${BRAND_LOGO_HEIGHT}" alt="Core Power Generation Advisors" decoding="async" />
      </div>
      <div class="dc-identity">
        ${photo}
        <h1 class="dc-name">${esc(card.full_name || 'Your name')}</h1>
        ${card.title ? `<p class="dc-title">${esc(card.title)}</p>` : ''}
        <p class="dc-company">${esc(card.company || '')}</p>
      </div>
      ${card.bio ? `<p class="dc-bio">${esc(card.bio)}</p>` : ''}
      ${morePhones.length ? `<ul class="dc-phones">${morePhones.map((p) => `<li><span>${esc(p.label)}</span> <a href="${esc(telHref(p.number))}">${esc(p.number)}</a></li>`).join('')}</ul>` : ''}
      ${saveRow}
      <div class="dc-actions">${actions.join('')}</div>
      ${explore}
    </article>
  `;
}

export function mountCard(root, card, mode = 'public') {
  if (!root) return;
  root.innerHTML = cardFaceHtml(card, mode);
}
