import { supabase } from '../js/supabase-client.js';
import { MEDIA_BUCKET, TEMPLATES } from '../js/config.js';
import { mountCard } from '../js/card-render.js';
import {
  copyText,
  downloadDataUrl,
  employeeAppUrl,
  emptyCard,
  fileToObjectUrl,
  normalizeCard,
  publicCardUrl,
  qrPngDataUrl,
  renderQr,
  shareUrl,
  slugify,
  toast,
  uniqueSlug
} from '../js/card-utils.js';

const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const dashView = document.getElementById('dash-view');
const builderView = document.getElementById('builder-view');
const listEl = document.getElementById('card-list');
const emptyEl = document.getElementById('dash-empty');
const countEl = document.getElementById('card-count');
const searchEl = document.getElementById('search');
const form = document.getElementById('card-form');
const phonesEl = document.getElementById('phones');
const linksEl = document.getElementById('links');
const templatesEl = document.getElementById('templates');
const previewEl = document.getElementById('live-preview');
const previewPane = document.getElementById('preview-pane');
const builderHeading = document.getElementById('builder-heading');
const slugLive = document.getElementById('slug-live');
const shareModal = document.getElementById('share-modal');
const toastEl = document.getElementById('toast');
const builderStatus = document.getElementById('builder-status');

let cards = [];
let current = emptyCard();
let photoFile = null;
let logoFile = null;
let slugManual = false;
let selectedTemplate = 'classic';

function show(el) { el.hidden = false; }
function hide(el) { el.hidden = true; }

function setLoginError(msg) {
  const el = document.getElementById('login-error');
  el.hidden = !msg;
  el.textContent = msg || '';
}

async function requireAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    hide(appView);
    show(loginView);
    return null;
  }
  const { data: isAdmin, error } = await supabase.rpc('is_admin');
  if (error || !isAdmin) {
    await supabase.auth.signOut();
    hide(appView);
    show(loginView);
    setLoginError('This account is not on the admin allowlist.');
    return null;
  }
  hide(loginView);
  show(appView);
  document.getElementById('admin-email').textContent = session.user.email || '';
  return session;
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  setLoginError('');
  const fd = new FormData(e.target);
  const { error } = await supabase.auth.signInWithPassword({
    email: String(fd.get('email') || '').trim(),
    password: String(fd.get('password') || '')
  });
  if (error) {
    setLoginError(error.message);
    return;
  }
  const session = await requireAdmin();
  if (session) await loadCards();
});

document.getElementById('sign-out').addEventListener('click', async () => {
  await supabase.auth.signOut();
  hide(appView);
  show(loginView);
});

async function loadCards() {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) {
    toast(toastEl, error.message, 'err');
    return;
  }
  cards = (data || []).map(normalizeCard);
  renderList();
}

function renderList() {
  const q = (searchEl.value || '').trim().toLowerCase();
  const filtered = cards.filter((c) => {
    if (!q) return true;
    return [c.full_name, c.title, c.slug, c.email, c.company].join(' ').toLowerCase().includes(q);
  });
  countEl.textContent = `${filtered.length} card${filtered.length === 1 ? '' : 's'}`;
  emptyEl.hidden = filtered.length > 0;
  listEl.innerHTML = filtered.map((c) => `
    <article class="card-row" data-id="${c.id}">
      ${c.photo_url
        ? `<img src="${c.photo_url}" alt="" />`
        : `<div class="avatar">${(c.full_name || '?').slice(0, 1)}</div>`}
      <div>
        <h3>${escapeHtml(c.full_name || 'Untitled')}
          <span class="pill ${c.is_active ? '' : 'off'}">${c.is_active ? 'Active' : 'Off'}</span>
        </h3>
        <p>${escapeHtml(c.title || 'No title')} · /c/${escapeHtml(c.slug)}</p>
      </div>
      <div class="row-actions">
        <button type="button" class="btn-ghost" data-act="edit">Edit</button>
        <button type="button" class="btn-ghost" data-act="share">Links & QR</button>
        <button type="button" class="btn-ghost" data-act="dup">Duplicate</button>
        <button type="button" class="btn-ghost" data-act="del">Delete</button>
      </div>
    </article>
  `).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

searchEl.addEventListener('input', renderList);

listEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const id = btn.closest('[data-id]')?.dataset.id;
  const card = cards.find((c) => c.id === id);
  if (!card) return;
  if (btn.dataset.act === 'edit') openBuilder(card);
  if (btn.dataset.act === 'share') openShare(card);
  if (btn.dataset.act === 'dup') duplicateCard(card);
  if (btn.dataset.act === 'del') deleteCard(card);
});

document.getElementById('new-card').addEventListener('click', () => openBuilder(emptyCard()));
document.getElementById('back-dash').addEventListener('click', () => {
  hide(builderView);
  show(dashView);
});
document.getElementById('toggle-preview').addEventListener('click', () => {
  previewPane.classList.toggle('open');
});

function renderRepeat(root, rows, kind) {
  root.innerHTML = rows.map((row, i) => kind === 'phone'
    ? `<div class="repeat-row">
        <input data-i="${i}" data-f="label" value="${escapeHtml(row.label)}" placeholder="Mobile" />
        <input data-i="${i}" data-f="number" value="${escapeHtml(row.number)}" placeholder="(555) 010-0100" />
        <button type="button" class="btn-ghost" data-remove="${i}">✕</button>
      </div>`
    : `<div class="repeat-row">
        <input data-i="${i}" data-f="label" value="${escapeHtml(row.label)}" placeholder="Label" />
        <input data-i="${i}" data-f="url" value="${escapeHtml(row.url)}" placeholder="https://" />
        <button type="button" class="btn-ghost" data-remove="${i}">✕</button>
      </div>`
  ).join('');
}

function bindRepeat(root, getter, setter, kind) {
  root.addEventListener('input', (e) => {
    const t = e.target;
    if (!t.dataset.f) return;
    const rows = getter();
    const i = Number(t.dataset.i);
    rows[i] = { ...rows[i], [t.dataset.f]: t.value };
    setter(rows);
    refreshPreview();
  });
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove]');
    if (!btn) return;
    const rows = getter().filter((_, i) => i !== Number(btn.dataset.remove));
    setter(rows.length ? rows : (kind === 'phone' ? [{ label: 'Mobile', number: '' }] : []));
    renderRepeat(root, getter(), kind);
    refreshPreview();
  });
}

bindRepeat(phonesEl, () => current.phones, (v) => { current.phones = v; }, 'phone');
bindRepeat(linksEl, () => current.extra_links, (v) => { current.extra_links = v; }, 'link');

document.getElementById('add-phone').addEventListener('click', () => {
  current.phones.push({ label: 'Office', number: '' });
  renderRepeat(phonesEl, current.phones, 'phone');
});
document.getElementById('add-link').addEventListener('click', () => {
  current.extra_links.push({ label: 'Link', url: '' });
  renderRepeat(linksEl, current.extra_links, 'link');
});

function renderTemplates() {
  templatesEl.innerHTML = TEMPLATES.map((t) => `
    <button type="button" class="tpl ${selectedTemplate === t.id ? 'active' : ''}" data-tpl="${t.id}">
      <strong>${t.label}</strong><span>${t.hint}</span>
    </button>
  `).join('');
}
templatesEl.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-tpl]');
  if (!btn) return;
  selectedTemplate = btn.dataset.tpl;
  current.theme.template = selectedTemplate;
  renderTemplates();
  refreshPreview();
});

form.addEventListener('input', (e) => {
  const name = e.target.name;
  if (!name) return;
  if (name === 'full_name' && !slugManual && !current.id) {
    form.slug.value = slugify(form.full_name.value);
    slugLive.textContent = form.slug.value || 'name';
  }
  if (name === 'slug') {
    slugManual = true;
    slugLive.textContent = form.slug.value || 'name';
  }
  if (name === 'accent') current.theme.accent = form.accent.value;
  if (name === 'photo' && e.target.files[0]) {
    photoFile = e.target.files[0];
    current.photo_url = fileToObjectUrl(photoFile);
  }
  if (name === 'logo' && e.target.files[0]) {
    logoFile = e.target.files[0];
    current.logo_url = fileToObjectUrl(logoFile);
  }
  refreshPreview();
});

function readForm() {
  current.full_name = form.full_name.value.trim();
  current.title = form.title.value.trim();
  current.company = form.company.value.trim();
  current.website = form.website.value.trim();
  current.email = form.email.value.trim();
  current.address = form.address.value.trim();
  current.linkedin = form.linkedin.value.trim();
  current.bio = form.bio.value.trim();
  current.slug = slugify(form.slug.value);
  current.is_active = form.is_active.checked;
  current.theme = { template: selectedTemplate, accent: form.accent.value };
  current.phones = current.phones.map((p) => ({ label: p.label.trim(), number: p.number.trim() })).filter((p) => p.number || p.label);
  current.extra_links = current.extra_links.map((l) => ({ label: l.label.trim(), url: l.url.trim() })).filter((l) => l.url);
  return current;
}

function fillForm(card) {
  current = normalizeCard(card);
  selectedTemplate = current.theme.template;
  photoFile = null;
  logoFile = null;
  slugManual = Boolean(card.id);
  form.full_name.value = current.full_name;
  form.title.value = current.title;
  form.company.value = current.company;
  form.website.value = current.website;
  form.email.value = current.email;
  form.address.value = current.address;
  form.linkedin.value = current.linkedin;
  form.bio.value = current.bio;
  form.slug.value = current.slug;
  form.accent.value = current.theme.accent;
  form.is_active.checked = current.is_active;
  slugLive.textContent = current.slug || 'name';
  renderRepeat(phonesEl, current.phones, 'phone');
  renderRepeat(linksEl, current.extra_links, 'link');
  renderTemplates();
  refreshPreview();
}

function refreshPreview() {
  const snapshot = {
    ...current,
    full_name: form.full_name?.value || current.full_name,
    title: form.title?.value || current.title,
    company: form.company?.value || current.company,
    website: form.website?.value || current.website,
    email: form.email?.value || current.email,
    address: form.address?.value || current.address,
    linkedin: form.linkedin?.value || current.linkedin,
    bio: form.bio?.value || current.bio,
    theme: { template: selectedTemplate, accent: form.accent?.value || current.theme.accent }
  };
  mountCard(previewEl, snapshot, 'preview');
}

function openBuilder(card) {
  fillForm(card);
  builderHeading.textContent = card.id ? `Edit ${card.full_name || 'card'}` : 'New card';
  hide(dashView);
  show(builderView);
  window.scrollTo({ top: 0 });
}

async function uploadMedia(cardId, file, kind) {
  if (!file) return '';
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${cardId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/jpeg'
  });
  if (error) throw error;
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function payloadFrom(card) {
  return {
    slug: card.slug,
    full_name: card.full_name,
    title: card.title,
    company: card.company,
    website: card.website,
    email: card.email,
    phones: card.phones,
    address: card.address,
    linkedin: card.linkedin,
    extra_links: card.extra_links,
    bio: card.bio,
    photo_url: card.photo_url?.startsWith('blob:') ? '' : card.photo_url,
    logo_url: card.logo_url?.startsWith('blob:') ? '' : card.logo_url,
    theme: card.theme,
    is_active: card.is_active
  };
}

document.getElementById('save-card').addEventListener('click', async () => {
  const card = readForm();
  if (!card.full_name) {
    toast(toastEl, 'Name is required');
    return;
  }
  if (!card.slug) {
    toast(toastEl, 'Add a URL slug');
    return;
  }
  const others = cards.filter((c) => c.id !== card.id).map((c) => c.slug);
  if (others.includes(card.slug)) {
    toast(toastEl, 'That slug is already in use. Pick another URL.');
    return;
  }
  builderStatus.hidden = false;
  builderStatus.textContent = 'Saving…';
  try {
    let saved;
    const body = payloadFrom(card);
    if (card.id) {
      const { data, error } = await supabase.from('cards').update(body).eq('id', card.id).select('*').single();
      if (error) throw error;
      saved = data;
    } else {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('cards').insert({
        ...body,
        created_by: userData.user?.id || null
      }).select('*').single();
      if (error) throw error;
      saved = data;
    }
    const updates = {};
    if (photoFile) updates.photo_url = await uploadMedia(saved.id, photoFile, 'photo');
    if (logoFile) updates.logo_url = await uploadMedia(saved.id, logoFile, 'logo');
    if (Object.keys(updates).length) {
      const { data, error } = await supabase.from('cards').update(updates).eq('id', saved.id).select('*').single();
      if (error) throw error;
      saved = data;
    }
    photoFile = null;
    logoFile = null;
    current = normalizeCard(saved);
    await loadCards();
    builderStatus.textContent = 'Saved.';
    openShare(current);
  } catch (err) {
    builderStatus.textContent = err.message || 'Save failed';
    toast(toastEl, err.message || 'Save failed');
  }
});

function openShare(card) {
  const full = cards.find((c) => c.id === card.id) || card;
  shareModal.hidden = false;
  shareModal.dataset.id = full.id;
  document.getElementById('share-name').textContent = full.full_name || 'Card saved';
  document.getElementById('emp-link').value = full.owner_token ? employeeAppUrl(full.owner_token) : '';
  document.getElementById('pub-link').value = publicCardUrl(full.slug);
  const pub = publicCardUrl(full.slug);
  shareModal.dataset.pub = pub;
  renderQr(document.getElementById('admin-qr'), pub);
}

document.getElementById('close-share').addEventListener('click', () => { shareModal.hidden = true; });
shareModal.addEventListener('click', (e) => { if (e.target === shareModal) shareModal.hidden = true; });

document.querySelectorAll('[data-copy]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const id = btn.dataset.copy;
    const ok = await copyText(document.getElementById(id).value);
    toast(toastEl, ok ? 'Copied' : 'Could not copy');
  });
});

document.getElementById('share-emp').addEventListener('click', async () => {
  const url = document.getElementById('emp-link').value;
  const result = await shareUrl({ title: 'Your CorePGA card app', text: 'Add this to your Home Screen.', url });
  if (result === 'copied') toast(toastEl, 'Employee link copied');
});
document.getElementById('share-pub').addEventListener('click', async () => {
  const url = document.getElementById('pub-link').value;
  const result = await shareUrl({ title: document.getElementById('share-name').textContent, url });
  if (result === 'copied') toast(toastEl, 'Public link copied');
});
document.getElementById('download-qr').addEventListener('click', () => {
  const pub = shareModal.dataset.pub || document.getElementById('pub-link').value;
  const url = qrPngDataUrl(document.getElementById('admin-qr'), pub);
  const slug = (document.getElementById('pub-link').value.split('/').pop() || 'card');
  downloadDataUrl(url, `${slug}-qr.png`);
});
document.getElementById('print-qr').addEventListener('click', () => {
  const pubUrl = shareModal.dataset.pub || document.getElementById('pub-link').value;
  const url = qrPngDataUrl(document.getElementById('admin-qr'), pubUrl);
  const name = document.getElementById('share-name').textContent;
  const pub = document.getElementById('pub-link').value;
  const w = window.open('', '_blank');
  w.document.write(`<!doctype html><title>QR</title><body style="font-family:sans-serif;text-align:center;padding:32px">
    <h1>${escapeHtml(name)}</h1><p>${escapeHtml(pub)}</p>
    <img src="${url}" style="width:280px;height:280px" />
    <script>setTimeout(()=>print(),300)<\/script></body>`);
  w.document.close();
});
document.getElementById('regen-token').addEventListener('click', async () => {
  const id = shareModal.dataset.id;
  if (!id || !confirm('Reset the employee link? The old Home Screen shortcut will stop working.')) return;
  const { data, error } = await supabase.rpc('regenerate_token', { p_card_id: id });
  if (error) {
    toast(toastEl, error.message);
    return;
  }
  await loadCards();
  const card = cards.find((c) => c.id === id);
  if (card) {
    card.owner_token = data;
    openShare(card);
  }
  toast(toastEl, 'Employee link reset');
});

async function duplicateCard(card) {
  const slug = uniqueSlug(`${card.slug}-copy`, cards.map((c) => c.slug));
  const body = payloadFrom(card);
  body.slug = slug;
  body.full_name = card.full_name;
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('cards').insert({
    ...body,
    created_by: userData.user?.id || null
  }).select('*').single();
  if (error) {
    toast(toastEl, error.message);
    return;
  }
  await loadCards();
  openBuilder(normalizeCard(data));
  toast(toastEl, 'Duplicated. Review and save.');
}

async function deleteCard(card) {
  if (!confirm(`Delete ${card.full_name || 'this card'}? This cannot be undone.`)) return;
  const { error } = await supabase.from('cards').delete().eq('id', card.id);
  if (error) {
    toast(toastEl, error.message);
    return;
  }
  await loadCards();
  toast(toastEl, 'Deleted');
}

supabase.auth.onAuthStateChange(async (event) => {
  if (event === 'SIGNED_OUT') {
    hide(appView);
    show(loginView);
  }
});

const session = await requireAdmin();
if (session) await loadCards();
renderTemplates();
