(function () {
  'use strict';
  const menu = document.getElementById('menu-toggle');
  const links = document.getElementById('site-links');
  if (menu && links) {
    menu.hidden = false;
    menu.closest('nav').classList.add('nav-ready');
    const close = (restoreFocus = false) => {
      links.classList.remove('is-open'); menu.setAttribute('aria-expanded', 'false');
      if (restoreFocus) menu.focus();
    };
    menu.addEventListener('click', () => {
      const open = menu.getAttribute('aria-expanded') !== 'true';
      menu.setAttribute('aria-expanded', String(open)); links.classList.toggle('is-open', open);
    });
    links.querySelectorAll('a').forEach(link => link.addEventListener('click', () => close()));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') close(true);
    });
  }

  const tour = document.querySelector('[data-product-tour]');
  if (!tour) return;
  const tabs = Array.from(tour.querySelectorAll('[data-tour-step]'));
  const panels = Array.from(tour.querySelectorAll('[data-tour-panel]'));
  const videos = panels.map(panel => panel.querySelector('video'));
  const play = tour.querySelector('[data-tour-play]');
  const replay = tour.querySelector('[data-tour-replay]');
  const count = tour.querySelector('[data-tour-count]');
  const status = tour.querySelector('[data-tour-status]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const failedVideos = new Set();
  let active = 0;
  let playing = !reducedMotion.matches;
  let visible = !('IntersectionObserver' in window);
  let timer = null;
  let remaining = 8500;
  let scheduledAt = 0;

  function clearTimer() {
    if (timer !== null) {
      window.clearTimeout(timer);
      remaining = Math.max(0, remaining - (Date.now() - scheduledAt));
    }
    timer = null;
  }
  function updateControls() {
    play.textContent = reducedMotion.matches ? 'Next step' : (playing ? 'Pause animation' : 'Play animation');
    play.setAttribute('aria-pressed', String(playing));
    if (status) status.textContent = reducedMotion.matches ? 'Reduced motion · Choose a chapter' : (playing ? 'Auto-playing · Choose any chapter' : 'Paused · Choose a chapter or press Play');
  }
  function schedule() {
    clearTimer();
    const running = playing && visible && !document.hidden && !reducedMotion.matches;
    tour.classList.toggle('is-animating', running);
    videos.forEach((video, index) => {
      if (!video) return;
      if (index !== active || !running || failedVideos.has(video)) { video.pause(); return; }
      video.hidden = false;
      video.play().catch(error => {
        // A browser may block autoplay; retain the complete, readable poster.
        if (index !== active || !playing || !visible || document.hidden || error?.name === 'AbortError') return;
        video.hidden = true; playing = false; clearTimer(); updateControls();
        tour.classList.remove('is-animating');
      });
    });
    if (running) {
      scheduledAt = Date.now();
      timer = window.setTimeout(() => { timer = null; render((active + 1) % panels.length); }, remaining);
    }
    updateControls();
  }
  function render(index) {
    clearTimer();
    active = (index + panels.length) % panels.length;
    remaining = videos[active] ? 8500 : 6500;
    videos.forEach(video => { if (video) { video.pause(); video.currentTime = 0; video.hidden = true; } });
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === active)); tab.tabIndex = i === active ? 0 : -1;
    });
    panels.forEach((panel, i) => { panel.hidden = i !== active; });
    count.textContent = `${active + 1} / ${panels.length}`;
    schedule();
  }
  tabs.forEach((tab, index) => {
    panels[index].setAttribute('role', 'tabpanel');
    panels[index].setAttribute('aria-labelledby', tab.id);
    panels[index].tabIndex = 0;
    // Clicking jumps into the animation and preserves the user's playback mode.
    tab.addEventListener('click', () => render(index));
    tab.addEventListener('keydown', event => {
      const moves = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      let next;
      if (event.key in moves) next = active + moves[event.key];
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = panels.length - 1;
      else return;
      event.preventDefault(); playing = false; render(next); tabs[active].focus();
    });
    const video = videos[index];
    if (video) {
      video.muted = true;
      video.addEventListener('ended', () => {
        if (index === active && playing && visible && !document.hidden) render((active + 1) % panels.length);
      });
      video.addEventListener('waiting', () => {
        if (index !== active || !playing || !visible) return;
        clearTimer(); remaining = 15000; scheduledAt = Date.now();
        timer = window.setTimeout(() => { timer = null; render((active + 1) % panels.length); }, remaining);
      });
      video.addEventListener('playing', () => {
        if (index !== active || !playing) return;
        clearTimer(); remaining = Math.max(250, (video.duration - video.currentTime) * 1000 + 250) || 8500; schedule();
      });
      video.addEventListener('error', () => {
        failedVideos.add(video); video.hidden = true; video.pause();
        if (index === active) { clearTimer(); remaining = 3000; schedule(); }
      });
    }
  });
  play.addEventListener('click', () => {
    if (reducedMotion.matches) { render((active + 1) % panels.length); return; }
    playing = !playing; schedule();
  });
  replay.addEventListener('click', () => { playing = !reducedMotion.matches; render(0); });
  document.addEventListener('visibilitychange', schedule);
  reducedMotion.addEventListener('change', () => { playing = false; render(active); });
  // Focus inside a changing scene pauses it; the persistent chapter controls do not.
  tour.addEventListener('focusin', event => {
    if (panels.includes(event.target) || event.target.closest?.('[data-tour-panel]')) { playing = false; schedule(); }
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting); schedule();
    }, { threshold: 0.1 }).observe(tour);
  }
  window.addEventListener('pagehide', () => { clearTimer(); videos.forEach(video => video?.pause()); });
  window.addEventListener('pageshow', schedule);
  tour.classList.add('tour-ready');
  tour.querySelector('[role="tablist"]').hidden = false;
  tour.querySelector('.native-tour-controls').hidden = false;
  render(0);

  const expand = tour.querySelector('[data-tour-expand]');
  const captureDialog = document.getElementById('capture-dialog');
  if (expand && captureDialog) {
    const captureMotion = document.getElementById('capture-video');
    let resumeAfterDialog = false;
    expand.addEventListener('click', () => {
      resumeAfterDialog = playing; playing = false; schedule();
      const source = panels[active].querySelector('picture img');
      const captureImage = document.getElementById('capture-image');
      captureImage.src = source.src; captureImage.alt = source.alt;
      const motion = videos[active];
      captureMotion.hidden = !motion || reducedMotion.matches;
      captureImage.hidden = !captureMotion.hidden;
      captureDialog.showModal(); document.getElementById('capture-close').focus();
      if (!captureMotion.hidden) {
        captureMotion.src = motion.currentSrc || motion.querySelector('source').src;
        captureMotion.muted = true;
        captureMotion.play().catch(() => { captureMotion.hidden = true; captureImage.hidden = false; });
      }
    });
    document.getElementById('capture-close').addEventListener('click', () => captureDialog.close());
    captureDialog.addEventListener('click', event => { if (event.target === captureDialog) captureDialog.close(); });
    captureDialog.addEventListener('close', () => {
      captureMotion.pause(); playing = resumeAfterDialog && !reducedMotion.matches; expand.focus(); schedule();
    });
  }

  const dialog = document.getElementById('gallery-dialog');
  const dialogImage = document.getElementById('gallery-dialog-image');
  const titles = ['Find the big idea — sketchnote', 'Connect the steps — process map', 'See a way forward — next steps'];
  let galleryTrigger = null;
  document.querySelectorAll('[data-gallery]').forEach(button => {
    button.addEventListener('click', () => {
      const source = button.querySelector('img');
      dialogImage.src = source.src; dialogImage.alt = source.alt;
      document.getElementById('gallery-dialog-title').textContent = titles[Number(button.dataset.gallery)];
      galleryTrigger = button;
      dialog.showModal();
      document.getElementById('gallery-close').focus();
    });
  });
  document.getElementById('gallery-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { if (galleryTrigger) galleryTrigger.focus(); });
})();
