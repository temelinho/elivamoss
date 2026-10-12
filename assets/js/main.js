/**
 * Eliva Moss — Ana Vanilla JS
 * Performans odaklı, sıfır kütüphane bağımlılığı.
 */

document.addEventListener('DOMContentLoaded', () => {
  initHeaderScroll();
  initMobileMenu();
  initFaqAccordion();
  initGallery();
  initShop();
  initProductGallery();
  initProductLightbox();
  initMobileQuickBar();
});

/* 1. Header Scroll Efekti */
function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const handleScroll = () => {
    if (window.scrollY > 35) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll(); // Başlangıç kontrolü
}

/* 2. Mobil Menü Aç/Kapa */
function initMobileMenu() {
  const toggleBtn = document.querySelector('.mobile-toggle');
  const drawer = document.querySelector('.mobile-drawer');
  const overlay = document.querySelector('.mobile-drawer__overlay');
  const closeBtn = document.querySelector('.mobile-drawer__close');
  const drawerLinks = document.querySelectorAll('.mobile-drawer__link');

  if (!toggleBtn || !drawer || !overlay) return;

  const openDrawer = () => {
    drawer.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    toggleBtn.setAttribute('aria-expanded', 'true');
  };

  const closeDrawer = () => {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    toggleBtn.setAttribute('aria-expanded', 'false');
  };

  toggleBtn.addEventListener('click', openDrawer);
  overlay.addEventListener('click', closeDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

  drawerLinks.forEach(link => {
    link.addEventListener('click', closeDrawer);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) {
      closeDrawer();
    }
  });
}

/* 3. SSS (FAQ) Akordiyon */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  if (!faqItems.length) return;

  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

    if (!questionBtn || !answer) return;

    questionBtn.addEventListener('click', () => {
      const isOpen = item.classList.contains('active');

      // Diğerlerini kapat (akordiyon davranışı)
      faqItems.forEach(otherItem => {
        if (otherItem !== item && otherItem.classList.contains('active')) {
          otherItem.classList.remove('active');
          const otherAns = otherItem.querySelector('.faq-answer');
          const otherBtn = otherItem.querySelector('.faq-question');
          if (otherAns) otherAns.style.maxHeight = null;
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
        }
      });

      // Seçileni aç/kapa
      if (isOpen) {
        item.classList.remove('active');
        answer.style.maxHeight = null;
        questionBtn.setAttribute('aria-expanded', 'false');
      } else {
        item.classList.add('active');
        answer.style.maxHeight = answer.scrollHeight + 'px';
        questionBtn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/* 4. Ürün Galerisi */
function initGallery() {
  const main = document.querySelector('.product-gallery__main');
  const thumbs = document.querySelectorAll('.product-gallery__thumb');
  if (!main || !thumbs.length) return;

  const mainImg = main.querySelector('img');
  const mainSource = main.querySelector('picture source[type="image/webp"]');
  if (!mainImg) return;

  thumbs.forEach(thumb => {
    thumb.addEventListener('click', () => {
      const base = thumb.getAttribute('data-full');
      if (!base) return;

      thumbs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-pressed', 'false');
      });
      thumb.classList.add('active');
      thumb.setAttribute('aria-pressed', 'true');

      // <picture> içindeki WebP kaynağı da güncellenmeli, yoksa tarayıcı eski görseli göstermeye devam eder
      if (mainSource) mainSource.srcset = base + '.webp';
      mainImg.src = base + '.jpg';
      const label = thumb.getAttribute('aria-label');
      if (label) mainImg.alt = label;
    });
  });
}

/* 5. Mağaza: kategori filtresi ve fiyat sıralaması */
function initShop() {
  const grid = document.getElementById('shop-grid');
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll('.shop-card'));
  const filters = document.querySelectorAll('.shop-filter');
  const sortSel = document.getElementById('shop-sort');
  const countEl = document.querySelector('.shop-count strong');
  let current = 'all';

  const apply = () => {
    let visible = 0;
    cards.forEach(card => {
      const show = current === 'all' || card.dataset.cat === current;
      card.classList.toggle('is-hidden', !show);
      if (show) visible++;
    });
    if (countEl) countEl.textContent = visible;

    const mode = sortSel ? sortSel.value : 'default';
    const sorted = cards.slice().sort((a, b) => {
      if (mode === 'price-asc') return parseFloat(a.dataset.price) - parseFloat(b.dataset.price);
      if (mode === 'price-desc') return parseFloat(b.dataset.price) - parseFloat(a.dataset.price);
      return parseInt(a.dataset.order, 10) - parseInt(b.dataset.order, 10);
    });
    sorted.forEach(card => grid.appendChild(card));
  };

  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      current = btn.dataset.filter;
      filters.forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      apply();
    });
  });
  if (sortSel) sortSel.addEventListener('change', apply);
}

/* 6. Ürün sayfası galerisi: küçük resim, ok tuşları ve kaydırma */
function initProductGallery() {
  document.querySelectorAll('[data-gallery]').forEach(gal => {
    const slides = Array.from(gal.querySelectorAll('.pgallery__slide'));
    const thumbs = Array.from(gal.querySelectorAll('.pgallery__thumb'));
    const counter = gal.querySelector('[data-current]');
    if (!slides.length) return;
    let current = 0;

    const show = (i) => {
      current = (i + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle('active', k === current));
      thumbs.forEach((t, k) => {
        t.classList.toggle('active', k === current);
        t.setAttribute('aria-pressed', k === current ? 'true' : 'false');
      });
      if (counter) counter.textContent = current + 1;
    };

    thumbs.forEach((t, k) => t.addEventListener('click', () => show(k)));
    const prev = gal.querySelector('.pgallery__nav--prev');
    const next = gal.querySelector('.pgallery__nav--next');
    if (prev) prev.addEventListener('click', () => show(current - 1));
    if (next) next.addEventListener('click', () => show(current + 1));

    const stage = gal.querySelector('.pgallery__stage');
    let startX = null;
    stage.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', e => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
      startX = null;
    }, { passive: true });

    gal.setAttribute('tabindex', '-1');
    gal.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });
  });
}

/* 7. Mobil Hızlı İletişim Çubuğu (Sticky Floating Bar) */
function initMobileQuickBar() {
  if (document.querySelector('.mobile-quick-bar')) return;

  const bar = document.createElement('div');
  bar.className = 'mobile-quick-bar';
  bar.setAttribute('aria-label', 'Hızlı İletişim');

  const pageTitle = document.querySelector('h1')?.textContent?.trim() || document.title.split('|')[0].trim();
  const waText = encodeURIComponent(`Merhaba, ${pageTitle} hakkında detaylı bilgi ve fiyat teklifi almak istiyorum.`);

  bar.innerHTML = `
    <a href="tel:+905324866767" class="mobile-quick-btn mobile-quick-btn--call" aria-label="Müşteri Hizmetlerini Arayın">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
      <span>Hemen Arayın</span>
    </a>
    <a href="https://wa.me/905324866767?text=${waText}" target="_blank" rel="noopener noreferrer" class="mobile-quick-btn mobile-quick-btn--whatsapp" aria-label="WhatsApp Destek Hattı">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
      <span>WhatsApp ile Yazın</span>
    </a>
  `;

  document.body.appendChild(bar);
}

/* 8. Ürün Görseli Tam Ekran Lightbox (Zoom İnceleme) */
function initProductLightbox() {
  const stage = document.querySelector('.pgallery__stage');
  if (!stage) return;

  let lightbox = document.getElementById('pgalleryLightbox');
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.id = 'pgalleryLightbox';
    lightbox.className = 'pgallery-lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', 'Görsel Yakınlaştırma');
    lightbox.innerHTML = `
      <div class="pgallery-lightbox__backdrop"></div>
      <div class="pgallery-lightbox__dialog">
        <button class="pgallery-lightbox__close" aria-label="Kapat">&times;</button>
        <img class="pgallery-lightbox__img" src="" alt="Ürün Detayı" />
        <p class="pgallery-lightbox__caption"></p>
      </div>
    `;
    document.body.appendChild(lightbox);

    const closeBtn = lightbox.querySelector('.pgallery-lightbox__close');
    const backdrop = lightbox.querySelector('.pgallery-lightbox__backdrop');

    const close = () => {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
    };

    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && lightbox.classList.contains('open')) close();
    });
  }

  stage.addEventListener('click', e => {
    // If click was on navigation arrows, don't open lightbox
    if (e.target.closest('.pgallery__nav')) return;

    const activeSlide = stage.querySelector('.pgallery__slide.active img');
    if (!activeSlide) return;
    const imgEl = lightbox.querySelector('.pgallery-lightbox__img');
    const capEl = lightbox.querySelector('.pgallery-lightbox__caption');
    imgEl.src = activeSlide.currentSrc || activeSlide.src;
    imgEl.alt = activeSlide.alt || 'Ürün Detayı';
    if (capEl) capEl.textContent = activeSlide.alt || '';
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  });

  stage.style.cursor = 'zoom-in';
}
