(function (global) {
  'use strict';

  function makeQr(text, errorCorrection) {
    const qr = qrcode(0, errorCorrection || 'M');
    qr.addData(text, 'Byte');
    qr.make();
    return qr;
  }

  function renderSvg(container, text, cellSize) {
    const qr = makeQr(text);
    let svg;
    try {
      svg = qr.createSvgTag({
        cellSize: cellSize || 4,
        margin: 2,
        scalable: true
      });
    } catch {
      svg = qr.createSvgTag(cellSize || 4, 2);
    }
    container.innerHTML = svg;
    const el = container.querySelector('svg');
    if (el) {
      el.setAttribute('role', 'img');
      el.removeAttribute('width');
      el.removeAttribute('height');
      el.style.width = '100%';
      el.style.height = 'auto';
      el.style.display = 'block';
    }
    return qr;
  }

  function toPngDataUrl(text, pixelSize) {
    const qr = makeQr(text);
    const modules = qr.getModuleCount();
    const margin = 4;
    const scale = pixelSize || 8;
    const canvas = document.createElement('canvas');
    const dim = (modules + margin * 2) * scale;
    canvas.width = dim;
    canvas.height = dim;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, dim, dim);
    ctx.fillStyle = '#000608';
    for (let r = 0; r < modules; r += 1) {
      for (let c = 0; c < modules; c += 1) {
        if (qr.isDark(r, c)) {
          ctx.fillRect((c + margin) * scale, (r + margin) * scale, scale, scale);
        }
      }
    }
    return canvas.toDataURL('image/png');
  }

  function downloadPng(filename, text) {
    const a = document.createElement('a');
    a.href = toPngDataUrl(text, 10);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  global.CorepgaQr = { makeQr, renderSvg, toPngDataUrl, downloadPng };
})(window);
