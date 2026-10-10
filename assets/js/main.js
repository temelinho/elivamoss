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
