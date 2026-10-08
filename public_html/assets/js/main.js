/**
 * Eliva Moss — Ana Vanilla JS
 * Performans odaklı, sıfır kütüphane bağımlılığı.
 */

document.addEventListener('DOMContentLoaded', () => {
  initHeaderScroll();
  initMobileMenu();
  initFaqAccordion();
  initGallery();
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
  const mainImg = document.querySelector('.product-gallery__main img');
  const thumbs = document.querySelectorAll('.product-gallery__thumb');

  if (!mainImg || !thumbs.length) return;

  thumbs.forEach(thumb => {
    thumb.addEventListener('click', () => {
      thumbs.forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      const newSrc = thumb.getAttribute('data-full');
      if (newSrc) {
        mainImg.src = newSrc;
      }
    });
  });
}
