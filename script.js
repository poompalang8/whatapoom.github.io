const revealSections = Array.from(document.querySelectorAll('.app-showcase[data-motion="reveal"]'));

const showcases = Array.from(document.querySelectorAll('.app-showcase:not([data-motion="reveal"])')).map((el) => ({
  el,
  phone: el.querySelector('.iphone-shell'),
  progress: 0,
  targetProgress: 0,
}));

if (revealSections.length > 0) {
  const setRevealState = () => {
    revealSections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const visible = rect.top < window.innerHeight * 0.8 && rect.bottom > window.innerHeight * 0.2;
      section.classList.toggle('is-visible', visible);
    });
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle('is-visible', entry.isIntersecting);
        });
      },
      { threshold: 0.35 }
    );

    revealSections.forEach((section) => observer.observe(section));
  } else {
    window.addEventListener('scroll', setRevealState, { passive: true });
    setRevealState();
  }
}

if (showcases.length > 0) {
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const lockSpeed = 0.00115;
  const smoothFactor = 0.18;
  const epsilon = 0.0008;

  let activeIndex = -1;
  let activeLockY = 0;
  let lastInputDir = 1;
  let touchStartY = 0;
  let rafId = 0;

  const getRectTop = (element) => element.getBoundingClientRect().top + window.scrollY;

  const getDirectionConfig = (sectionEl) => {
    const rtl = sectionEl.dataset.direction === 'rtl';
    return {
      startXRatio: rtl ? 0.9 : -0.9,
      endXRatio: rtl ? -0.1 : 0.1,
      rotateStart: rtl ? -16 : 16,
      rotateEnd: rtl ? 16 : -16,
    };
  };

  const renderState = (state) => {
    if (!state.phone) {
      return;
    }

    const cfg = getDirectionConfig(state.el);
    const x = window.innerWidth * (cfg.startXRatio + (cfg.endXRatio - cfg.startXRatio) * state.progress);
    const rotate = cfg.rotateStart + (cfg.rotateEnd - cfg.rotateStart) * state.progress;

    state.phone.style.transform = `translate3d(${x}px, 0, 0) rotate(${rotate}deg)`;

    if (state.progress > 0.02) {
      state.el.classList.add('is-visible');
    }
  };

  const getActiveSectionIndex = () => {
    const y = window.scrollY;
    for (let i = 0; i < showcases.length; i += 1) {
      const top = getRectTop(showcases[i].el);
      const bottom = top + showcases[i].el.offsetHeight;
      if (y >= top - 1 && y < bottom - 1) {
        return i;
      }
    }
    return -1;
  };

  const lockAtCurrentPosition = () => {
    if (activeIndex < 0) {
      return;
    }

    const section = showcases[activeIndex].el;
    const top = getRectTop(section);
    const bottom = top + section.offsetHeight;

    // Keep lock point inside the active section bounds without snapping to top.
    activeLockY = clamp(activeLockY, top + 1, bottom - 1);
    window.scrollTo({ top: activeLockY, behavior: 'auto' });
  };

  const hasMotion = () => showcases.some((state) => Math.abs(state.targetProgress - state.progress) > epsilon);

  const releaseLock = () => {
    if (activeIndex < 0) {
      return;
    }

    const nudge = lastInputDir >= 0 ? 2 : -2;
    activeIndex = -1;
    window.scrollBy({ top: nudge, left: 0, behavior: 'auto' });
  };

  const animate = () => {
    showcases.forEach((state) => {
      const delta = state.targetProgress - state.progress;
      if (Math.abs(delta) <= epsilon) {
        state.progress = state.targetProgress;
      } else {
        state.progress += delta * smoothFactor;
      }
      renderState(state);
    });

    if (activeIndex !== -1) {
      lockAtCurrentPosition();

      const state = showcases[activeIndex];
      const doneForward = state.progress >= 0.999 && state.targetProgress >= 0.999;
      const doneBackward = state.progress <= 0.001 && state.targetProgress <= 0.001;

      if (doneForward || doneBackward) {
        releaseLock();
      }
    }

    if (hasMotion() || activeIndex !== -1) {
      rafId = window.requestAnimationFrame(animate);
    } else {
      rafId = 0;
    }
  };

  const startAnimationLoop = () => {
    if (rafId === 0) {
      rafId = window.requestAnimationFrame(animate);
    }
  };

  const applyInputDelta = (deltaY) => {
    if (deltaY === 0) {
      return false;
    }

    lastInputDir = deltaY > 0 ? 1 : -1;

    if (activeIndex === -1) {
      const candidate = getActiveSectionIndex();
      if (candidate === -1) {
        return false;
      }

      const state = showcases[candidate];
      const canForward = deltaY > 0 && state.progress < 1;
      const canBackward = deltaY < 0 && state.progress > 0;

      if (!canForward && !canBackward) {
        return false;
      }

      activeIndex = candidate;
      state.targetProgress = state.progress;
      activeLockY = window.scrollY;
      lockAtCurrentPosition();
    }

    const state = showcases[activeIndex];
    const nextTarget = clamp(state.targetProgress + deltaY * lockSpeed, 0, 1);
    state.targetProgress = nextTarget;
    startAnimationLoop();
    return true;
  };

  const onWheel = (event) => {
    const handled = applyInputDelta(event.deltaY);
    if (handled) {
      event.preventDefault();
    }
  };

  const onTouchStart = (event) => {
    if (event.touches.length > 0) {
      touchStartY = event.touches[0].clientY;
    }
  };

  const onTouchMove = (event) => {
    if (event.touches.length === 0) {
      return;
    }

    const currentY = event.touches[0].clientY;
    const deltaY = touchStartY - currentY;
    touchStartY = currentY;

    const handled = applyInputDelta(deltaY);
    if (handled) {
      event.preventDefault();
    }
  };

  const onResize = () => {
    showcases.forEach(renderState);
    if (activeIndex !== -1) {
      lockAtCurrentPosition();
    }
  };

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('resize', onResize);

  showcases.forEach((state) => {
    const rect = state.el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92 && rect.bottom > window.innerHeight * 0.12) {
      state.el.classList.add('is-visible');
    }
    renderState(state);
  });
}

const designTarget = document.querySelector('.design-target');

if (designTarget) {
  const hoverCursor = designTarget.querySelector('.hover-cursor');

  const setCursorPosition = (clientX, clientY) => {
    const rect = designTarget.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    designTarget.style.setProperty('--cursor-x', `${x}px`);
    designTarget.style.setProperty('--cursor-y', `${y}px`);
  };

  designTarget.addEventListener('pointerenter', (event) => {
    if (hoverCursor) {
      designTarget.classList.add('is-hovering');
      setCursorPosition(event.clientX, event.clientY);
    }
  });

  designTarget.addEventListener('pointermove', (event) => {
    if (hoverCursor) {
      setCursorPosition(event.clientX, event.clientY);
    }
  });

  designTarget.addEventListener('pointerleave', () => {
    designTarget.classList.remove('is-hovering');
  });
}