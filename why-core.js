(function () {
  const player = document.querySelector("[data-why-video]");
  const soon = document.getElementById("whyVideoSoon");
  if (!player) return;

  const video = player.querySelector("video");
  const cfg = window.CorepgaVideo || {};
  const src = String(cfg.src || player.getAttribute("data-video-src") || "").trim();
  const poster = String(cfg.poster || player.getAttribute("data-video-poster") || "").trim();

  function showSoon() {
    player.hidden = true;
    if (video) {
      video.removeAttribute("src");
      video.removeAttribute("poster");
    }
    if (soon) soon.hidden = false;
  }

  function showPlayer() {
    if (soon) soon.hidden = true;
    player.hidden = false;
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
})();
