(function () {
  const player = document.querySelector("[data-why-video]");
  const soon = document.getElementById("whyVideoSoon");
  const fsBtn = document.getElementById("whyFullscreenBtn");
  if (!player) return;

  const video = player.querySelector("video");
  const cfg = window.CorepgaVideo || {};
  const src = String(cfg.src || player.getAttribute("data-video-src") || "").trim();
  const poster = String(cfg.poster || player.getAttribute("data-video-poster") || "").trim();

  function showSoon() {
    player.hidden = true;
    if (fsBtn) fsBtn.hidden = true;
    if (video) {
      video.removeAttribute("src");
      video.removeAttribute("poster");
    }
    if (soon) soon.hidden = false;
  }

  function showPlayer() {
    if (soon) soon.hidden = true;
    player.hidden = false;
    if (fsBtn) fsBtn.hidden = false;
  }

  function enterFullscreen() {
    if (!video) return;

    if (typeof video.webkitEnterFullscreen === "function") {
      const enter = function () {
        video.webkitEnterFullscreen();
      };
      try {
        if (video.paused && typeof video.play === "function") {
          const played = video.play();
          if (played && typeof played.then === "function") {
            played.then(enter).catch(enter);
            return;
          }
        }
        enter();
        return;
      } catch (err) {
        /* fall through to requestFullscreen */
      }
    }

    const target = player.requestFullscreen || video.requestFullscreen
      ? (player.requestFullscreen ? player : video)
      : video;
    const request =
      target.requestFullscreen ||
      target.webkitRequestFullscreen ||
      target.webkitRequestFullScreen;

    if (request) {
      const result = request.call(target);
      if (result && typeof result.catch === "function") {
        result.catch(function () {
          if (typeof video.webkitEnterFullscreen === "function") {
            video.webkitEnterFullscreen();
          }
        });
      }
    }
  }

  if (!src || !video) {
    showSoon();
    return;
  }

  const source = video.querySelector("source");
  if (source) source.src = src;
  video.src = src;
  if (poster) video.setAttribute("poster", poster);
  else video.removeAttribute("poster");
  showPlayer();

  video.addEventListener("error", showSoon);

  fsBtn?.addEventListener("click", function () {
    enterFullscreen();
  });
})();
