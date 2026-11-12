(function () {
  'use strict';

  const PRODUCTION_PRESENTATION_URL = 'https://corepgatest.vercel.app/presentation.html';
  const VIDEO_SRC = 'assets/presentation.mp4';
  const POSTER_SRC = 'assets/presentation-poster.jpg';

  function presentationUrl() {
    const loc = window.location;
    if (loc.protocol === 'http:' || loc.protocol === 'https:') {
      if (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1') {
        return PRODUCTION_PRESENTATION_URL;
      }
      return new URL('presentation.html', loc.origin + '/').href;
    }
    return PRODUCTION_PRESENTATION_URL;
  }

  function showComingSoon(player, soon) {
    if (player) player.hidden = true;
    if (soon) soon.hidden = false;
  }

  function showPlayer(player, soon, video) {
    if (soon) soon.hidden = true;
    if (player) player.hidden = false;
    if (video && !video.getAttribute('src')) {
      video.src = VIDEO_SRC;
    }
  }

  function setupVideo() {
    const player = document.getElementById('presentationPlayer');
    const video = document.getElementById('presentationVideo');
    const soon = document.getElementById('presentationSoon');
    if (!video || !player || !soon) return;

    fetch(POSTER_SRC, { method: 'HEAD' })
      .then((res) => {
        if (res.ok) video.setAttribute('poster', POSTER_SRC);
      })
      .catch(() => {});

    const revealWhenReady = () => {
      const onReady = () => showPlayer(player, soon, video);
      const onFail = () => {
        video.removeAttribute('src');
        showComingSoon(player, soon);
      };
      video.addEventListener('loadeddata', onReady, { once: true });
      video.addEventListener('error', onFail, { once: true });
      video.src = VIDEO_SRC;
    };

    fetch(VIDEO_SRC, { method: 'HEAD' })
      .then((res) => {
        if (res.ok) showPlayer(player, soon, video);
        else showComingSoon(player, soon);
      })
      .catch(revealWhenReady);
  }

  function setupQr() {
    const mount = document.getElementById('presentationQr');
    const urlEl = document.getElementById('presentationQrUrl');
    const downloadBtn = document.getElementById('downloadPresentationQr');
    const printBtn = document.getElementById('printPresentationQr');
    const url = presentationUrl();
    if (urlEl) urlEl.textContent = url;
    if (mount && window.CorepgaQr) {
      CorepgaQr.renderSvg(mount, url, 5);
      const svg = mount.querySelector('svg');
      if (svg) svg.setAttribute('aria-label', 'QR code linking to ' + url);
    }
    downloadBtn?.addEventListener('click', () => {
      CorepgaQr.downloadPng('corepga-presentation-qr.png', url);
    });
    printBtn?.addEventListener('click', () => window.print());
  }

  setupVideo();
  setupQr();
})();
