import {
  BRAND_LOGO,
  BRAND_LOGO_ON_DARK,
  DEFAULT_ACCENT,
  DEFAULT_COMPANY,
  DEFAULT_TEMPLATE,
  DEFAULT_WEBSITE
} from './config.js';

export function origin() {
  return window.location.origin;
}

export function publicCardUrl(slug) {
  return `${origin()}/c/${encodeURIComponent(slug)}`;
}

export function employeeAppUrl(token) {
  return `${origin()}/me/?k=${encodeURIComponent(token)}`;
}

export function parsePathToken(kind) {
  const params = new URLSearchParams(window.location.search);
  if (kind === 'me') {
    const k = params.get('k');
    if (k) return k.trim();
  }
  const parts = window.location.pathname.split('/').filter(Boolean);
  if (parts[0] === kind && parts[1]) {
    return decodeURIComponent(parts[1]).trim();
  }
  return '';
}

export function slugify(name) {
  return String(name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function emptyCard() {
  return {
    id: null,
    slug: '',
    owner_token: null,
    full_name: '',
    title: '',
    company: DEFAULT_COMPANY,
    website: DEFAULT_WEBSITE,
    email: '',
    phones: [{ label: 'Mobile', number: '' }],
    address: '',
    linkedin: '',
    extra_links: [],
    bio: '',
    photo_url: '',
    logo_url: '',
    theme: { template: DEFAULT_TEMPLATE, accent: DEFAULT_ACCENT },
    is_active: true
  };
}

export function normalizeCard(raw) {
  const base = emptyCard();
  if (!raw || typeof raw !== 'object') return base;
  const phones = Array.isArray(raw.phones) && raw.phones.length
    ? raw.phones.map((p) => ({
        label: p.label || 'Phone',
        number: p.number || p.phone || ''
      }))
    : base.phones;
  const extra = Array.isArray(raw.extra_links)
    ? raw.extra_links.map((l) => ({ label: l.label || 'Link', url: l.url || '' }))
    : [];
  const theme = raw.theme && typeof raw.theme === 'object' ? raw.theme : {};
  return {
    ...base,
    ...raw,
    phones,
    extra_links: extra,
    theme: {
      template: theme.template || DEFAULT_TEMPLATE,
      accent: theme.accent || DEFAULT_ACCENT
    },
    is_active: raw.is_active !== false
  };
}

export function digitsPhone(value) {
  return String(value || '').replace(/[^\d+]/g, '');
}

export function telHref(value) {
  const d = digitsPhone(value);
  return d ? `tel:${d}` : '';
}

export function smsHref(value) {
  const d = digitsPhone(value);
  return d ? `sms:${d}` : '';
}

export function mailtoHref(email) {
  return email ? `mailto:${email}` : '';
}

export function absoluteUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return `https:${url}`;
  return `https://${url}`;
}

export function defaultLogoForTemplate(template) {
  return template === 'midnight' ? BRAND_LOGO_ON_DARK : BRAND_LOGO;
}

/** Always the CorePGA site mark. Per-card uploads are ignored. */
export function displayLogo(card) {
  return defaultLogoForTemplate(card?.theme?.template);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

export async function shareUrl({ title, text, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (err) {
      if (err && err.name === 'AbortError') return 'aborted';
    }
  }
  const ok = await copyText(url);
  return ok ? 'copied' : 'failed';
}

function vcardEscape(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function foldLine(line) {
  const max = 75;
  if (line.length <= max) return line;
  let out = line.slice(0, max);
  let rest = line.slice(max);
  while (rest.length) {
    out += `\r\n ${rest.slice(0, max - 1)}`;
    rest = rest.slice(max - 1);
  }
  return out;
}

function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts.slice(0, -1).join(' '), last: parts.at(-1) };
}

async function photoAsBase64(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    const type = (blob.type || 'image/jpeg').toLowerCase();
    const kind = type.includes('png') ? 'PNG' : type.includes('webp') ? 'WEBP' : 'JPEG';
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return { kind, data: btoa(bin) };
  } catch {
    return null;
  }
}

export async function buildVCard(card) {
  const { first, last } = splitName(card.full_name);
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${vcardEscape(last)};${vcardEscape(first)};;;`,
    `FN:${vcardEscape(card.full_name)}`
  ];
  if (card.title) lines.push(`TITLE:${vcardEscape(card.title)}`);
  if (card.company) lines.push(`ORG:${vcardEscape(card.company)}`);
  for (const phone of card.phones || []) {
    if (!phone.number) continue;
    const label = (phone.label || 'CELL').toUpperCase();
    const type = /office|work|desk/i.test(label) ? 'WORK' : /fax/i.test(label) ? 'FAX' : 'CELL';
    lines.push(`TEL;TYPE=${type},VOICE:${vcardEscape(phone.number)}`);
  }
  if (card.email) lines.push(`EMAIL;TYPE=INTERNET:${vcardEscape(card.email)}`);
  if (card.website) lines.push(`URL:${vcardEscape(absoluteUrl(card.website))}`);
  if (card.linkedin) lines.push(`URL;TYPE=LinkedIn:${vcardEscape(absoluteUrl(card.linkedin))}`);
  if (card.bio) lines.push(`NOTE:${vcardEscape(card.bio)}`);
  const photo = await photoAsBase64(card.photo_url);
  if (photo) {
    lines.push(`PHOTO;ENCODING=b;TYPE=${photo.kind}:${photo.data}`);
  }
  lines.push('END:VCARD');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

export async function downloadVCard(card) {
  const body = await buildVCard(card);
  const blob = new Blob([body], { type: 'text/vcard;charset=utf-8' });
  const slug = card.slug || slugify(card.full_name) || 'contact';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${slug}.vcf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

export function fileToObjectUrl(file) {
  if (!file) return '';
  return URL.createObjectURL(file);
}

export function uniqueSlug(base, existing) {
  const set = new Set(existing);
  let slug = base || 'card';
  if (!set.has(slug)) return slug;
  let i = 2;
  while (set.has(`${slug}-${i}`)) i += 1;
  return `${slug}-${i}`;
}

export function toast(el, message, kind = 'ok') {
  if (!el) return;
  el.hidden = false;
  el.dataset.kind = kind;
  el.textContent = message;
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    el.hidden = true;
  }, 3200);
}

export function renderQr(container, text) {
  if (!container) return;
  container.innerHTML = '';
  if (window.CorepgaQr) {
    window.CorepgaQr.renderSvg(container, text, 4);
    return;
  }
  if (typeof window.qrcode !== 'function') {
    container.textContent = 'QR library missing';
    return;
  }
  const qr = window.qrcode(0, 'H');
  qr.addData(text, 'Byte');
  qr.make();
  container.innerHTML = qr.createSvgTag(4, 2);
}

export function qrPngDataUrl(container, text) {
  if (text && window.CorepgaQr) return window.CorepgaQr.toPngDataUrl(text, 8);
  const img = container?.querySelector('img');
  if (img?.src) return img.src;
  const canvas = container?.querySelector('canvas');
  if (canvas?.toDataURL) return canvas.toDataURL('image/png');
  return '';
}

export function downloadDataUrl(dataUrl, filename) {
  if (!dataUrl) return;
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
