/**
 * Eliva Moss — Mağaza kartı görsel kaydırıcı
 * Ürüne girmeden kart üzerinde görseller arasında gezinme (ok, kaydırma, dokunma).
 */
(function () {
  'use strict';
  document.querySelectorAll('.card-slider').forEach(function (slider) {
    var track = slider.querySelector('.card-slider__track');
    var count = slider.querySelector('.card-slider__count');
    var dots = slider.querySelectorAll('.card-slider__dots span');
    var prev = slider.querySelector('.card-slider__btn--prev');
    var next = slider.querySelector('.card-slider__btn--next');
    var total = track ? track.children.length : 0;
    if (!track || total < 2) return;

    var current = 0;
    function index() { return Math.round(track.scrollLeft / track.clientWidth); }
    function update() {
      current = Math.max(0, Math.min(total - 1, index()));
      if (count) count.textContent = (current + 1) + ' / ' + total;
      dots.forEach(function (d, i) { d.classList.toggle('active', i === current); });
      if (prev) prev.disabled = current === 0;
      if (next) next.disabled = current === total - 1;
    }
    function go(i) {
      i = (i + total) % total;
      track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
    }

    if (prev) prev.addEventListener('click', function (e) { e.preventDefault(); go(current - 1); });
    if (next) next.addEventListener('click', function (e) { e.preventDefault(); go(current + 1); });

    var t;
    track.addEventListener('scroll', function () { clearTimeout(t); t = setTimeout(update, 60); }, { passive: true });
    window.addEventListener('resize', function () { track.scrollLeft = current * track.clientWidth; });

    // Masaüstünde fare ile sürükleyerek kaydırma (sürükleme sonrası tıklama ürüne gitmesin)
    var down = false, startX = 0, startLeft = 0, moved = false;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; startX = e.clientX; startLeft = track.scrollLeft;
      track.classList.add('is-dragging');
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 5) moved = true;
      track.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return;
      down = false; track.classList.remove('is-dragging');
      go(Math.round(track.scrollLeft / track.clientWidth));
    });
    slider.querySelector('.product-card__thumb').addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); moved = false; }
    });

    update();
  });
})();
