(function () {
  'use strict';

  const org = window.COREPGA_ORG || {
    name: 'Core Power Generation Advisors, INC',
    website: 'https://www.corepga.com',
    email: 'contact@corepga.com'
  };

  const PLACEHOLDER = '[to be provided]';

  function vcardEscape(value) {
    return String(value || '')
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');
  }

  function displayValue(value) {
    const trimmed = (value || '').trim();
    return trimmed ? trimmed : PLACEHOLDER;
  }

  function isMissing(value) {
    return !(value || '').trim();
  }

  function fullName(person) {
    return [person.firstName, person.lastName].filter(Boolean).join(' ').trim() || PLACEHOLDER;
  }

  function buildVCard(person) {
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:' + vcardEscape(person.lastName) + ';' + vcardEscape(person.firstName) + ';;;',
      'FN:' + vcardEscape(fullName(person)),
      'ORG:' + vcardEscape(org.name)
    ];
    if ((person.title || '').trim()) lines.push('TITLE:' + vcardEscape(person.title));
    if ((person.phone || '').trim()) lines.push('TEL;TYPE=WORK,VOICE:' + vcardEscape(person.phone));
    if ((person.email || '').trim()) lines.push('EMAIL;TYPE=INTERNET,WORK:' + vcardEscape(person.email));
    if (org.website) lines.push('URL:' + vcardEscape(org.website));
    lines.push('END:VCARD');
    return lines.join('\r\n');
  }

  function downloadVcf(person) {
    const blob = new Blob([buildVCard(person)], { type: 'text/vcard;charset=utf-8' });
    const a = document.createElement('a');
    const slug = (person.id || fullName(person) || 'contact').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.href = URL.createObjectURL(blob);
    a.download = slug + '.vcf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function cardHtml(person, index) {
    const name = fullName(person);
    const titleClass = isMissing(person.title) ? ' missing-field' : '';
    const phoneClass = isMissing(person.phone) ? ' missing-field' : '';
    const emailClass = isMissing(person.email) ? ' missing-field' : '';
    const lastClass = isMissing(person.lastName) ? ' missing-field' : '';
    const phoneHref = isMissing(person.phone) ? '' : 'href="tel:' + person.phone.replace(/\s+/g, '') + '"';
    const emailHref = isMissing(person.email) ? '' : 'href="mailto:' + person.email + '"';

    return (
      '<article class="card specialist-card" data-specialist-index="' + index + '">' +
        '<span class="kicker">Digital business card</span>' +
        '<h3 class="' + lastClass.trim() + '">' + name + '</h3>' +
        '<p class="specialist-title' + titleClass + '">' + displayValue(person.title) + '</p>' +
        '<p class="specialist-org">' + org.name + '</p>' +
        '<ul class="specialist-meta">' +
          '<li class="' + phoneClass.trim() + '"><span>Phone</span> ' +
            (phoneHref ? '<a ' + phoneHref + '>' + displayValue(person.phone) + '</a>' : displayValue(person.phone)) +
          '</li>' +
          '<li class="' + emailClass.trim() + '"><span>Email</span> ' +
            (emailHref ? '<a ' + emailHref + '>' + displayValue(person.email) + '</a>' : displayValue(person.email)) +
          '</li>' +
          '<li><span>Web</span> <a href="' + org.website + '">' + org.website.replace(/^https?:\/\//, '') + '</a></li>' +
        '</ul>' +
        '<div class="specialist-qr" data-qr></div>' +
        '<p class="specialist-qr-caption">Scan with your phone camera to add this contact</p>' +
        '<div class="btn-row">' +
          '<button type="button" class="btn-primary" data-save-contact>Save contact</button>' +
          '<button type="button" class="btn-secondary" data-download-qr>Download QR</button>' +
        '</div>' +
      '</article>'
    );
  }

  function render() {
    const grid = document.getElementById('specialistGrid');
    if (!grid) return;
    const people = window.COREPGA_SPECIALISTS || [];
    if (!people.length) {
      grid.innerHTML = '<p class="lead">No specialists have been added yet. Edit specialists.js to add the team.</p>';
      return;
    }
    grid.innerHTML = people.map(cardHtml).join('');

    grid.querySelectorAll('.specialist-card').forEach((card) => {
      const index = Number(card.getAttribute('data-specialist-index'));
      const person = people[index];
      const vcard = buildVCard(person);
      const qrMount = card.querySelector('[data-qr]');
      if (qrMount && window.CorepgaQr) {
        CorepgaQr.renderSvg(qrMount, vcard, 4);
        const svg = qrMount.querySelector('svg');
        if (svg) svg.setAttribute('aria-label', 'vCard QR code for ' + fullName(person));
      }
      card.querySelector('[data-save-contact]')?.addEventListener('click', () => downloadVcf(person));
      card.querySelector('[data-download-qr]')?.addEventListener('click', () => {
        const slug = (person.id || fullName(person) || 'contact').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        CorepgaQr.downloadPng(slug + '-qr.png', vcard);
      });
    });
  }

  render();
})();
