document.querySelectorAll('[data-year]').forEach((el) => {
  el.textContent = new Date().getFullYear();
});

const burger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mnav');

if (burger && mobileNav) {
  burger.addEventListener('click', () => mobileNav.classList.toggle('open'));
  mobileNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => mobileNav.classList.remove('open'));
  });
}

document.querySelectorAll('form[action*="formspree.io"]').forEach((form) => {
  let next = form.querySelector('input[name="_next"]');
  if (!next) {
    next = document.createElement('input');
    next.type = 'hidden';
    next.name = '_next';
    form.prepend(next);
  }
  next.value = new URL('thanks.html', window.location.href).href;
});

const contactForm = document.getElementById('contactForm');
if (contactForm) {
  const copyEmailBtn = document.getElementById('copyEmail');
  const feedback = document.getElementById('contactFeedback');

  copyEmailBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('contact@corepga.com');
      if (feedback) {
        feedback.hidden = false;
        feedback.textContent = 'Email copied: contact@corepga.com';
      }
    } catch {
      if (feedback) {
        feedback.hidden = false;
        feedback.textContent = 'Copy failed. Please use: contact@corepga.com';
      }
    }
  });
}
