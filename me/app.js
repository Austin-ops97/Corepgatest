import { supabase } from '/js/supabase-client.js';
import { DEFAULT_ACCENT, LOGO_DARK, LOGO_LIGHT } from '/js/config.js';
import {
  copyText,
  displayLogo,
  downloadVCard,
  normalizeCard,
  parsePathToken,
  publicCardUrl,
  renderQr,
  shareUrl
} from '/js/card-utils.js';

const token = parsePathToken('me');
const status = document.getElementById('status');
const app = document.getElementById('app');
const hint = document.getElementById('install-hint');

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

function installManifest(card, startUrl) {
  const manifest = {
    name: `${card.full_name || 'CorePGA'} · Card`,
    short_name: (card.full_name || 'Card').split(' ')[0].slice(0, 12),
    start_url: startUrl,
    scope: '/me/',
    display: 'standalone',
    background_color: '#f3f7fc',
    theme_color: card.theme?.accent || DEFAULT_ACCENT,
    icons: [
      {
        src: card.photo_url || displayLogo(card) || LOGO_DARK,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      }
    ]
  };
  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
  const url = URL.createObjectURL(blob);
  document.getElementById('manifest-link').setAttribute('href', url);
}

if (!token) {
  status.textContent = 'This employee link is missing its private key. Ask your admin for a new link.';
} else {
  const { data, error } = await supabase.rpc('get_card_by_token', { p_token: token });
  if (error || !data) {
    status.textContent = 'This card link is invalid or has been reset. Ask your admin for a new one.';
  } else {
    const card = normalizeCard(data);
    const pub = publicCardUrl(card.slug);
    const keepTokenUrl = `/me/?k=${encodeURIComponent(token)}`;
    installManifest(card, keepTokenUrl);
    document.title = `${card.full_name} · My card`;
    document.querySelector('meta[name="theme-color"]').setAttribute('content', card.theme.accent || DEFAULT_ACCENT);
    document.querySelector('meta[name="apple-mobile-web-app-title"]').setAttribute('content', (card.full_name || 'Card').split(' ')[0]);
    document.getElementById('apple-icon').href = card.photo_url || displayLogo(card);

    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.getElementById('logo').src = dark ? LOGO_LIGHT : displayLogo(card);
    if (card.photo_url) {
      const photo = document.getElementById('photo');
      photo.src = card.photo_url;
      photo.alt = card.full_name;
      photo.hidden = false;
    } else {
      const fb = document.getElementById('photo-fallback');
      fb.textContent = (card.full_name || 'C').slice(0, 1);
      fb.hidden = false;
    }
    document.getElementById('name').textContent = card.full_name;
    document.getElementById('title').textContent = card.title || card.company;
    renderQr(document.getElementById('qr'), pub);
    status.hidden = true;
    app.hidden = false;

    const hintKey = `corepga-a2hs-${token}`;
    if (!isStandalone() && !localStorage.getItem(hintKey)) {
      hint.hidden = false;
    }
    document.getElementById('dismiss-hint').addEventListener('click', () => {
      hint.hidden = true;
      localStorage.setItem(hintKey, '1');
    });

    document.getElementById('share').addEventListener('click', async () => {
      const result = await shareUrl({
        title: card.full_name,
        text: `${card.full_name} · ${card.title || card.company}`,
        url: pub
      });
      if (result === 'copied') {
        status.hidden = false;
        status.textContent = 'Public card link copied.';
      }
    });
    document.getElementById('copy').addEventListener('click', async () => {
      const ok = await copyText(pub);
      status.hidden = false;
      status.textContent = ok ? 'Public card link copied.' : pub;
    });
    document.getElementById('save').addEventListener('click', () => downloadVCard(card));
  }
}
