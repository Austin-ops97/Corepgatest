import { supabase } from '/js/supabase-client.js';
import { mountCard } from '/js/card-render.js';
import {
  downloadVCard,
  normalizeCard,
  parsePathToken,
  publicCardUrl,
  shareUrl
} from '/js/card-utils.js';

const slug = parsePathToken('c');
const status = document.getElementById('status');
const root = document.getElementById('card-root');

function setMeta(name, value, attr = 'content') {
  let el = document.querySelector(`meta[${name.startsWith('og:') ? 'property' : 'name'}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    if (name.startsWith('og:')) el.setAttribute('property', name);
    else el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

if (!slug) {
  status.textContent = 'This card link is incomplete.';
} else {
  const { data, error } = await supabase.rpc('get_public_card', { p_slug: slug });
  if (error || !data) {
    status.textContent = 'This card is unavailable.';
  } else {
    const card = normalizeCard(data);
    const url = publicCardUrl(card.slug);
    document.title = `${card.full_name} · ${card.company}`;
    setMeta('description', card.bio || `${card.title} — ${card.company}`);
    setMeta('og:title', `${card.full_name} · ${card.company}`);
    setMeta('og:description', card.bio || `${card.title || 'Digital business card'} — ${card.company}`);
    setMeta('og:url', url);
    if (card.photo_url) setMeta('og:image', card.photo_url);
    setMeta('theme-color', card.theme.accent);
    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = url;
    document.head.appendChild(canonical);

    mountCard(root, card, 'public');
    status.hidden = true;

    root.addEventListener('click', async (e) => {
      if (e.target.closest('[data-save-contact]')) {
        e.preventDefault();
        await downloadVCard(card);
      }
      if (e.target.closest('[data-share-card]')) {
        e.preventDefault();
        const result = await shareUrl({
          title: card.full_name,
          text: `${card.full_name} · ${card.title || card.company}`,
          url
        });
        if (result === 'copied') {
          status.hidden = false;
          status.textContent = 'Link copied.';
        }
      }
    });
  }
}
