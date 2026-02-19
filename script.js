const showcase = document.querySelector('.swillcal-showcase');
const phone = document.getElementById('iphoneShell');

if (showcase && phone) {
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  let ticking = false;

  const updatePhoneAnimation = () => {
    const rect = showcase.getBoundingClientRect();
    const maxScroll = rect.height - window.innerHeight;

    if (maxScroll <= 0) {
      phone.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
      return;
    }

    const scrolled = clamp(-rect.top, 0, maxScroll);
    const progress = scrolled / maxScroll;

    const startX = -window.innerWidth * 0.42;
    const endX = window.innerWidth * 0.2;
    const x = startX + (endX - startX) * progress;
    const rotate = 16 - 32 * progress;

    phone.style.transform = `translate3d(${x}px, 0, 0) rotate(${rotate}deg)`;
  };

  const requestTick = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updatePhoneAnimation();
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', requestTick);
  updatePhoneAnimation();
}

