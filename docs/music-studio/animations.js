/**
 * 青鸾 DAW — 动画效果库
 * QingluanAnimations
 * 包含：淡入淡出、滑入滑出、缩放、水波纹、彩纸、打字机、跑马灯、视差、闪光、
 * 脉冲、弹跳、摇晃、旋转、形状变换、SVG描边、页面转场、滚动揭示、数字滚动、
 * 均衡器条、粒子背景，以及完整 Easing 缓动函数集。
 */

const Easing = {
  linear: t => t,
  easeInQuad: t => t * t,
  easeOutQuad: t => 1 - (1 - t) * (1 - t),
  easeInOutQuad: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  easeInCubic: t => t * t * t,
  easeOutCubic: t => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeInQuart: t => t * t * t * t,
  easeOutQuart: t => 1 - Math.pow(1 - t, 4),
  easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
  easeInQuint: t => t * t * t * t * t,
  easeOutQuint: t => 1 - Math.pow(1 - t, 5),
  easeInOutQuint: t => t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2,
  easeInSine: t => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine: t => Math.sin((t * Math.PI) / 2),
  easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  easeInExpo: t => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: t => t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  easeInCirc: t => 1 - Math.sqrt(1 - Math.pow(t, 2)),
  easeOutCirc: t => Math.sqrt(1 - Math.pow(t - 1, 2)),
  easeInOutCirc: t => t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
  easeInBack: t => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  easeOutBack: t => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInOutBack: t => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },
  easeInElastic: t => {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
  },
  easeOutElastic: t => {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  easeInOutElastic: t => {
    const c5 = (2 * Math.PI) / 4.5;
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) {
      return -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2;
    }
    return (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
  },
  easeInBounce: t => 1 - Easing.easeOutBounce(1 - t),
  easeOutBounce: t => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
  easeInOutBounce: t => t < 0.5
    ? (1 - Easing.easeOutBounce(1 - 2 * t)) / 2
    : (1 + Easing.easeOutBounce(2 * t - 1)) / 2,
  spring: t => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  bounce: t => Easing.easeOutBounce(t),
  smoothStep: t => t * t * (3 - 2 * t),
  smootherStep: t => t * t * t * (t * (t * 6 - 15) + 10)
};

function _resolveEl(el) {
  return typeof el === 'string' ? document.getElementById(el) : el;
}

function _animate({ duration = 500, easing = Easing.easeOutQuad, onUpdate, onComplete }) {
  const startTime = performance.now();
  let rafId;
  function step(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = easing(t);
    onUpdate(eased, t);
    if (t < 1) {
      rafId = requestAnimationFrame(step);
    } else {
      if (onComplete) onComplete();
    }
  }
  rafId = requestAnimationFrame(step);
  return () => cancelAnimationFrame(rafId);
}

/* ================= 基础显隐动画 ================= */

function fadeIn(element, duration = 400) {
  const el = _resolveEl(element);
  if (!el) return;
  el.style.opacity = '0';
  el.style.display = '';
  const computed = window.getComputedStyle(el).display;
  if (computed === 'none') el.style.display = 'block';
  _animate({
    duration,
    easing: Easing.easeOutQuad,
    onUpdate: (eased) => { el.style.opacity = String(eased); }
  });
}

function fadeOut(element, duration = 400) {
  const el = _resolveEl(element);
  if (!el) return;
  _animate({
    duration,
    easing: Easing.easeInQuad,
    onUpdate: (eased) => { el.style.opacity = String(1 - eased); },
    onComplete: () => { el.style.display = 'none'; el.style.opacity = '1'; }
  });
}

function slideUp(element, duration = 400) {
  const el = _resolveEl(element);
  if (!el) return;
  const h = el.scrollHeight;
  el.style.overflow = 'hidden';
  el.style.height = h + 'px';
  el.style.display = '';
  _animate({
    duration,
    easing: Easing.easeOutQuad,
    onUpdate: (eased) => { el.style.height = (h * (1 - eased)) + 'px'; },
    onComplete: () => { el.style.display = 'none'; el.style.height = ''; el.style.overflow = ''; }
  });
}

function slideDown(element, duration = 400) {
  const el = _resolveEl(element);
  if (!el) return;
  el.style.display = '';
  el.style.overflow = 'hidden';
  const h = el.scrollHeight;
  el.style.height = '0px';
  _animate({
    duration,
    easing: Easing.easeOutQuad,
    onUpdate: (eased) => { el.style.height = (h * eased) + 'px'; },
    onComplete: () => { el.style.height = ''; el.style.overflow = ''; }
  });
}

function scaleIn(element, duration = 400) {
  const el = _resolveEl(element);
  if (!el) return;
  el.style.transform = 'scale(0.85)';
  el.style.opacity = '0';
  el.style.display = '';
  const computed = window.getComputedStyle(el).display;
  if (computed === 'none') el.style.display = 'block';
  _animate({
    duration,
    easing: Easing.easeOutBack,
    onUpdate: (eased) => {
      const s = 0.85 + 0.15 * eased;
      el.style.transform = `scale(${s})`;
      el.style.opacity = String(eased);
    }
  });
}

function scaleOut(element, duration = 300) {
  const el = _resolveEl(element);
  if (!el) return;
  _animate({
    duration,
    easing: Easing.easeInBack,
    onUpdate: (eased) => {
      const s = 1 - 0.15 * eased;
      el.style.transform = `scale(${s})`;
      el.style.opacity = String(1 - eased);
    },
    onComplete: () => { el.style.display = 'none'; el.style.transform = ''; el.style.opacity = '1'; }
  });
}

/* ================= Ripple 水波纹效果 ================= */

function ripple(x, y, color = 'var(--accent, #5b4dff)') {
  const ripple = document.createElement('span');
  ripple.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:10px;height:10px;border-radius:50%;background:${color};opacity:0.5;pointer-events:none;transform:translate(-50%,-50%) scale(1);z-index:99999;`;
  document.body.appendChild(ripple);

  _animate({
    duration: 600,
    easing: Easing.easeOutQuad,
    onUpdate: (eased) => {
      const scale = 1 + eased * 40;
      ripple.style.transform = `translate(-50%,-50%) scale(${scale})`;
      ripple.style.opacity = String(0.5 * (1 - eased));
    },
    onComplete: () => ripple.remove()
  });
}

/* ================= Confetti 彩纸庆祝 ================= */

function confetti(options = {}) {
  const count = options.count || 80;
  const colors = options.colors || ['#5b4dff', '#ff6b9d', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6b6b'];
  const origin = options.origin || { x: 0.5, y: 0.5 };
  const cx = origin.x * window.innerWidth;
  const cy = origin.y * window.innerHeight;

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    const size = Math.random() * 8 + 4;
    const color = colors[Math.floor(Math.random() * colors.length)];
    el.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;background:${color};border-radius:${Math.random() > 0.5 ? '50%' : '2px'};pointer-events:none;z-index:99999;`;
    document.body.appendChild(el);

    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 12 + 4;
    const vx = Math.cos(angle) * velocity;
    const vy = Math.sin(angle) * velocity - 6;
    const gravity = 0.4;
    const drag = 0.96;
    let posX = 0, posY = 0, velX = vx, velY = vy;
    let rotation = 0, rotSpeed = (Math.random() - 0.5) * 20;

    _animate({
      duration: Math.random() * 1000 + 1200,
      easing: Easing.linear,
      onUpdate: (eased) => {
        velX *= drag;
        velY += gravity;
        posX += velX;
        posY += velY;
        rotation += rotSpeed;
        el.style.transform = `translate(${posX}px, ${posY}px) rotate(${rotation}deg)`;
        el.style.opacity = String(1 - eased);
      },
      onComplete: () => el.remove()
    });
  }
}

/* ================= Typewriter 打字机效果 ================= */

function typewriter(element, text, speed = 50) {
  const el = _resolveEl(element);
  if (!el) return;
  el.textContent = '';
  let i = 0;
  const timer = setInterval(() => {
    el.textContent += text.charAt(i);
    i++;
    if (i >= text.length) clearInterval(timer);
  }, speed);
  return () => clearInterval(timer);
}

/* ================= Marquee 跑马灯 ================= */

function marquee(element, speed = 50) {
  const el = _resolveEl(element);
  if (!el) return;
  const text = el.textContent || '';
  el.innerHTML = `<span style="display:inline-block;white-space:nowrap;">${text}&nbsp;&nbsp;&nbsp;&nbsp;${text}</span>`;
  const inner = el.firstElementChild;
  let offset = 0;
  const step = speed / 60;

  function loop() {
    if (!inner) return;
    offset += step;
    const half = inner.scrollWidth / 2;
    if (offset >= half) offset = 0;
    inner.style.transform = `translateX(-${offset}px)`;
    requestAnimationFrame(loop);
  }
  loop();
}

/* ================= Parallax 视差滚动 ================= */

function parallax(element, intensity = 0.5) {
  const el = _resolveEl(element);
  if (!el) return;
  function onScroll() {
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const progress = (vh - rect.top) / (vh + rect.height);
    const y = (progress - 0.5) * intensity * 100;
    el.style.transform = `translateY(${y}px)`;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  return () => window.removeEventListener('scroll', onScroll);
}

/* ================= Shimmer 闪光动画 ================= */

function shimmer(element) {
  const el = _resolveEl(element);
  if (!el) return;
  el.style.position = 'relative';
  el.style.overflow = 'hidden';
  const shine = document.createElement('div');
  shine.style.cssText = 'position:absolute;top:0;left:-100%;width:50%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent);pointer-events:none;';
  el.appendChild(shine);

  _animate({
    duration: 1200,
    easing: Easing.easeInOutSine,
    onUpdate: (eased) => {
      shine.style.left = (-100 + eased * 250) + '%';
    },
    onComplete: () => shine.remove()
  });
}

/* ================= Pulse 脉冲动画 ================= */

function pulse(element) {
  const el = _resolveEl(element);
  if (!el) return;
  _animate({
    duration: 800,
    easing: Easing.easeInOutSine,
    onUpdate: (eased) => {
      const s = 1 + Math.sin(eased * Math.PI) * 0.06;
      el.style.transform = `scale(${s})`;
    },
    onComplete: () => { el.style.transform = ''; }
  });
}

/* ================= Bounce 弹跳动画 ================= */

function bounce(element) {
  const el = _resolveEl(element);
  if (!el) return;
  _animate({
    duration: 900,
    easing: Easing.easeOutBounce,
    onUpdate: (eased) => {
      const y = -40 * Math.sin(eased * Math.PI) * (1 - eased);
      el.style.transform = `translateY(${y}px)`;
    },
    onComplete: () => { el.style.transform = ''; }
  });
}

/* ================= Shake 摇晃动画 ================= */

function shake(element) {
  const el = _resolveEl(element);
  if (!el) return;
  _animate({
    duration: 500,
    easing: Easing.linear,
    onUpdate: (eased) => {
      const decay = 1 - eased;
      const x = Math.sin(eased * Math.PI * 8) * 10 * decay;
      el.style.transform = `translateX(${x}px)`;
    },
    onComplete: () => { el.style.transform = ''; }
  });
}

/* ================= Rotate 旋转动画 ================= */

function rotate(element, degrees = 360, duration = 600) {
  const el = _resolveEl(element);
  if (!el) return;
  _animate({
    duration,
    easing: Easing.easeInOutCubic,
    onUpdate: (eased) => {
      el.style.transform = `rotate(${eased * degrees}deg)`;
    },
    onComplete: () => { el.style.transform = ''; }
  });
}

/* ================= MorphShape 形状变换（clip-path） ================= */

function morphShape(element, fromShape, toShape, duration = 800) {
  const el = _resolveEl(element);
  if (!el) return;
  el.style.clipPath = fromShape;
  _animate({
    duration,
    easing: Easing.easeInOutCubic,
    onUpdate: (eased) => {
      // 简单插值无法处理复杂 polygon，这里用 fade + scale 模拟
      const s = 0.9 + 0.1 * eased;
      el.style.transform = `scale(${s})`;
      el.style.opacity = String(0.5 + 0.5 * eased);
    },
    onComplete: () => {
      el.style.clipPath = toShape;
      el.style.transform = '';
      el.style.opacity = '1';
    }
  });
}

/* ================= DrawSVG SVG描边动画 ================= */

function drawSVG(pathElement, duration = 1000) {
  const path = _resolveEl(pathElement);
  if (!path || !(path instanceof SVGPathElement)) return;
  const length = path.getTotalLength();
  path.style.strokeDasharray = length;
  path.style.strokeDashoffset = length;
  _animate({
    duration,
    easing: Easing.easeOutCubic,
    onUpdate: (eased) => {
      path.style.strokeDashoffset = String(length * (1 - eased));
    }
  });
}

/* ================= PageTransition 页面转场 ================= */

function pageTransition(direction = 'left') {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99998;background:var(--accent,#5b4dff);pointer-events:none;';
  document.body.appendChild(overlay);

  const fromX = direction === 'left' ? '100%' : direction === 'right' ? '-100%' : '0';
  const fromY = direction === 'up' ? '100%' : direction === 'down' ? '-100%' : '0';
  overlay.style.transform = `translate(${fromX}, ${fromY})`;

  _animate({
    duration: 500,
    easing: Easing.easeInOutCubic,
    onUpdate: (eased) => {
      const x = direction === 'left' ? 100 * (1 - eased) : direction === 'right' ? -100 * (1 - eased) : 0;
      const y = direction === 'up' ? 100 * (1 - eased) : direction === 'down' ? -100 * (1 - eased) : 0;
      overlay.style.transform = `translate(${x}%, ${y}%)`;
    },
    onComplete: () => {
      _animate({
        duration: 400,
        easing: Easing.easeInOutCubic,
        onUpdate: (eased2) => {
          const x = direction === 'left' ? -100 * eased2 : direction === 'right' ? 100 * eased2 : 0;
          const y = direction === 'up' ? -100 * eased2 : direction === 'down' ? 100 * eased2 : 0;
          overlay.style.transform = `translate(${x}%, ${y}%)`;
        },
        onComplete: () => overlay.remove()
      });
    }
  });
}

/* ================= ScrollReveal 滚动揭示 ================= */

function scrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const delay = parseInt(el.dataset.revealDelay || '0', 10);
        const type = el.dataset.reveal || 'fade-up';
        setTimeout(() => {
          el.style.opacity = '1';
          el.style.transform = 'none';
        }, delay);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('[data-reveal]').forEach(el => {
    const type = el.dataset.reveal;
    el.style.transition = 'opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)';
    el.style.opacity = '0';
    switch (type) {
      case 'fade-up': el.style.transform = 'translateY(30px)'; break;
      case 'fade-down': el.style.transform = 'translateY(-30px)'; break;
      case 'fade-left': el.style.transform = 'translateX(30px)'; break;
      case 'fade-right': el.style.transform = 'translateX(-30px)'; break;
      case 'zoom': el.style.transform = 'scale(0.9)'; break;
      default: el.style.transform = 'translateY(20px)';
    }
    observer.observe(el);
  });
}

/* ================= CounterAnimation 数字滚动 ================= */

function counterAnimation(element, target, duration = 1200) {
  const el = _resolveEl(element);
  if (!el) return;
  const from = parseFloat(el.textContent.replace(/,/g, '')) || 0;
  const isFloat = !Number.isInteger(target);
  _animate({
    duration,
    easing: Easing.easeOutExpo,
    onUpdate: (eased) => {
      const val = from + (target - from) * eased;
      el.textContent = isFloat ? val.toFixed(2) : Math.round(val).toLocaleString();
    }
  });
}

/* ================= EqualizerBars 均衡器条动画 ================= */

function equalizerBars(canvasId, dataProvider) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const barCount = 32;
  const barW = w / barCount;

  function draw() {
    requestAnimationFrame(draw);
    let data;
    if (typeof dataProvider === 'function') {
      data = dataProvider();
    } else {
      data = new Array(barCount).fill(0).map(() => Math.random() * 0.8 + 0.1);
    }
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < barCount; i++) {
      const val = data[i] || 0;
      const height = val * h;
      const hue = 200 + (i / barCount) * 60;
      ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.9)`;
      ctx.fillRect(i * barW, h - height, barW - 2, height);
    }
  }
  draw();
}

/* ================= ParticleBackground 粒子背景 ================= */

function particleBackground(canvasId, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h;

  function resize() {
    w = canvas.width = canvas.clientWidth;
    h = canvas.height = canvas.clientHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const particleCount = options.count || 60;
  const connectionDistance = options.connectDistance || 100;
  const particles = [];
  const colors = options.colors || ['#5b4dff', '#ff6b9d', '#4d96ff'];

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: Math.random() * 2 + 1,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    });

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < connectionDistance) {
          ctx.strokeStyle = `rgba(91,77,255,${0.15 * (1 - dist / connectionDistance)})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();

  return () => window.removeEventListener('resize', resize);
}

/* ================= 组合动画快捷方法 ================= */

function popIn(element, duration = 400) {
  scaleIn(element, duration);
}

function popOut(element, duration = 300) {
  scaleOut(element, duration);
}

function flash(element, duration = 300) {
  const el = _resolveEl(element);
  if (!el) return;
  el.style.transition = `opacity ${duration}ms`;
  el.style.opacity = '0.3';
  setTimeout(() => { el.style.opacity = '1'; }, duration);
}

function wobble(element, duration = 600) {
  const el = _resolveEl(element);
  if (!el) return;
  _animate({
    duration,
    easing: Easing.easeInOutSine,
    onUpdate: (eased) => {
      const r = Math.sin(eased * Math.PI * 4) * 5 * (1 - eased);
      el.style.transform = `rotate(${r}deg)`;
    },
    onComplete: () => { el.style.transform = ''; }
  });
}

function heartBeat(element, duration = 1300) {
  const el = _resolveEl(element);
  if (!el) return;
  _animate({
    duration,
    easing: Easing.easeInOutSine,
    onUpdate: (eased) => {
      const s = 1 + Math.sin(eased * Math.PI * 2) * 0.1;
      el.style.transform = `scale(${s})`;
    },
    onComplete: () => { el.style.transform = ''; }
  });
}

function flipInX(element, duration = 600) {
  const el = _resolveEl(element);
  if (!el) return;
  el.style.display = '';
  el.style.opacity = '0';
  _animate({
    duration,
    easing: Easing.easeInOutCubic,
    onUpdate: (eased) => {
      const angle = eased * 90;
      const o = eased;
      el.style.transform = `perspective(400px) rotateX(${90 - angle}deg)`;
      el.style.opacity = String(o);
    },
    onComplete: () => { el.style.transform = ''; }
  });
}

function flipInY(element, duration = 600) {
  const el = _resolveEl(element);
  if (!el) return;
  el.style.display = '';
  el.style.opacity = '0';
  _animate({
    duration,
    easing: Easing.easeInOutCubic,
    onUpdate: (eased) => {
      const angle = eased * 90;
      el.style.transform = `perspective(400px) rotateY(${90 - angle}deg)`;
      el.style.opacity = String(eased);
    },
    onComplete: () => { el.style.transform = ''; }
  });
}

function swing(element, duration = 600) {
  const el = _resolveEl(element);
  if (!el) return;
  _animate({
    duration,
    easing: Easing.easeInOutQuad,
    onUpdate: (eased) => {
      const r = Math.sin(eased * Math.PI) * 15 * (1 - eased);
      el.style.transform = `rotate(${r}deg)`;
    },
    onComplete: () => { el.style.transform = ''; }
  });
}

function rubberBand(element, duration = 800) {
  const el = _resolveEl(element);
  if (!el) return;
  _animate({
    duration,
    easing: Easing.easeInOutQuad,
    onUpdate: (eased) => {
      const t = eased;
      let s;
      if (t < 0.3) s = 1 + 0.3 * t / 0.3;
      else if (t < 0.5) s = 1.3 - 0.2 * (t - 0.3) / 0.2;
      else if (t < 0.7) s = 1.1 + 0.1 * (t - 0.5) / 0.2;
      else s = 1.2 - 0.2 * (t - 0.7) / 0.3;
      el.style.transform = `scale(${s})`;
    },
    onComplete: () => { el.style.transform = ''; }
  });
}

function tada(element, duration = 800) {
  const el = _resolveEl(element);
  if (!el) return;
  _animate({
    duration,
    easing: Easing.linear,
    onUpdate: (eased) => {
      const scale = 1 + Math.sin(eased * Math.PI * 6) * 0.05;
      const rotate = Math.sin(eased * Math.PI * 4) * 3;
      el.style.transform = `scale(${scale}) rotate(${rotate}deg)`;
    },
    onComplete: () => { el.style.transform = ''; }
  });
}

function glow(element, color = 'var(--accent, #5b4dff)', duration = 1500) {
  const el = _resolveEl(element);
  if (!el) return;
  _animate({
    duration,
    easing: Easing.easeInOutSine,
    onUpdate: (eased) => {
      const intensity = Math.sin(eased * Math.PI) * 15;
      el.style.boxShadow = `0 0 ${intensity}px ${color}`;
    },
    onComplete: () => { el.style.boxShadow = ''; }
  });
}

function blurIn(element, duration = 500) {
  const el = _resolveEl(element);
  if (!el) return;
  el.style.display = '';
  el.style.opacity = '0';
  _animate({
    duration,
    easing: Easing.easeOutQuad,
    onUpdate: (eased) => {
      el.style.filter = `blur(${(1 - eased) * 10}px)`;
      el.style.opacity = String(eased);
    },
    onComplete: () => { el.style.filter = ''; }
  });
}

function blurOut(element, duration = 400) {
  const el = _resolveEl(element);
  if (!el) return;
  _animate({
    duration,
    easing: Easing.easeInQuad,
    onUpdate: (eased) => {
      el.style.filter = `blur(${eased * 10}px)`;
      el.style.opacity = String(1 - eased);
    },
    onComplete: () => { el.style.display = 'none'; el.style.filter = ''; el.style.opacity = '1'; }
  });
}

function slideInLeft(element, duration = 500) {
  const el = _resolveEl(element);
  if (!el) return;
  el.style.display = '';
  el.style.opacity = '0';
  _animate({
    duration,
    easing: Easing.easeOutCubic,
    onUpdate: (eased) => {
      el.style.transform = `translateX(${(1 - eased) * -60}px)`;
      el.style.opacity = String(eased);
    },
    onComplete: () => { el.style.transform = ''; }
  });
}

function slideInRight(element, duration = 500) {
  const el = _resolveEl(element);
  if (!el) return;
  el.style.display = '';
  el.style.opacity = '0';
  _animate({
    duration,
    easing: Easing.easeOutCubic,
    onUpdate: (eased) => {
      el.style.transform = `translateX(${(1 - eased) * 60}px)`;
      el.style.opacity = String(eased);
    },
    onComplete: () => { el.style.transform = ''; }
  });
}

function slideInUp(element, duration = 500) {
  const el = _resolveEl(element);
  if (!el) return;
  el.style.display = '';
  el.style.opacity = '0';
  _animate({
    duration,
    easing: Easing.easeOutCubic,
    onUpdate: (eased) => {
      el.style.transform = `translateY(${(1 - eased) * 40}px)`;
      el.style.opacity = String(eased);
    },
    onComplete: () => { el.style.transform = ''; }
  });
}

function slideInDown(element, duration = 500) {
  const el = _resolveEl(element);
  if (!el) return;
  el.style.display = '';
  el.style.opacity = '0';
  _animate({
    duration,
    easing: Easing.easeOutCubic,
    onUpdate: (eased) => {
      el.style.transform = `translateY(${(1 - eased) * -40}px)`;
      el.style.opacity = String(eased);
    },
    onComplete: () => { el.style.transform = ''; }
  });
}

function hinge(element, duration = 1200) {
  const el = _resolveEl(element);
  if (!el) return;
  _animate({
    duration,
    easing: Easing.easeInOutCubic,
    onUpdate: (eased) => {
      const rotate = eased * 80;
      const opacity = eased > 0.7 ? 1 - (eased - 0.7) / 0.3 : 1;
      el.style.transformOrigin = 'top left';
      el.style.transform = `rotate(${rotate}deg)`;
      el.style.opacity = String(opacity);
    },
    onComplete: () => { el.style.display = 'none'; el.style.transform = ''; el.style.transformOrigin = ''; el.style.opacity = '1'; }
  });
}

function jackInTheBox(element, duration = 700) {
  const el = _resolveEl(element);
  if (!el) return;
  el.style.display = '';
  el.style.opacity = '0';
  _animate({
    duration,
    easing: Easing.easeOutCubic,
    onUpdate: (eased) => {
      const scale = eased < 0.5 ? 0.3 + 0.7 * (eased / 0.5) : 1;
      const rotate = (1 - eased) * 30;
      el.style.transform = `scale(${scale}) rotate(${rotate}deg)`;
      el.style.opacity = String(eased);
    },
    onComplete: () => { el.style.transform = ''; }
  });
}

function rollIn(element, duration = 600) {
  const el = _resolveEl(element);
  if (!el) return;
  el.style.display = '';
  el.style.opacity = '0';
  _animate({
    duration,
    easing: Easing.easeOutCubic,
    onUpdate: (eased) => {
      el.style.transform = `translateX(${(1 - eased) * -100}%) rotate(${(1 - eased) * -120}deg)`;
      el.style.opacity = String(eased);
    },
    onComplete: () => { el.style.transform = ''; }
  });
}

function rollOut(element, duration = 600) {
  const el = _resolveEl(element);
  if (!el) return;
  _animate({
    duration,
    easing: Easing.easeInCubic,
    onUpdate: (eased) => {
      el.style.transform = `translateX(${eased * 100}%) rotate(${eased * 120}deg)`;
      el.style.opacity = String(1 - eased);
    },
    onComplete: () => { el.style.display = 'none'; el.style.transform = ''; el.style.opacity = '1'; }
  });
}

function zoomIn(element, duration = 400) {
  scaleIn(element, duration);
}

function zoomOut(element, duration = 300) {
  scaleOut(element, duration);
}

/* ================= 高级粒子系统 ================= */

function firework(x, y, options = {}) {
  const colors = options.colors || ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6b9d', '#5b4dff'];
  const particleCount = options.count || 60;
  for (let i = 0; i < particleCount; i++) {
    const el = document.createElement('div');
    const size = Math.random() * 4 + 2;
    const color = colors[Math.floor(Math.random() * colors.length)];
    el.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${color};border-radius:50%;pointer-events:none;z-index:99999;`;
    document.body.appendChild(el);

    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 2;
    let vx = Math.cos(angle) * speed;
    let vy = Math.sin(angle) * speed;
    let posX = 0, posY = 0;
    const gravity = 0.15;

    _animate({
      duration: Math.random() * 800 + 800,
      easing: Easing.easeOutQuad,
      onUpdate: (eased) => {
        vy += gravity;
        posX += vx;
        posY += vy;
        el.style.transform = `translate(${posX}px, ${posY}px)`;
        el.style.opacity = String(1 - eased);
      },
      onComplete: () => el.remove()
    });
  }
}

function snow(canvasId, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h;
  function resize() { w = canvas.width = canvas.clientWidth; h = canvas.height = canvas.clientHeight; }
  resize();
  window.addEventListener('resize', resize);

  const count = options.count || 50;
  const flakes = [];
  for (let i = 0; i < count; i++) {
    flakes.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2 + 1,
      d: Math.random() * count,
      vx: (Math.random() - 0.5) * 0.3,
      vy: Math.random() * 0.5 + 0.3
    });
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    flakes.forEach(f => {
      f.y += f.vy;
      f.x += f.vx + Math.sin(f.d / 30) * 0.3;
      if (f.y > h) { f.y = -5; f.x = Math.random() * w; }
      if (f.x > w) f.x = 0;
      if (f.x < 0) f.x = w;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
  return () => window.removeEventListener('resize', resize);
}

function rain(canvasId, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h;
  function resize() { w = canvas.width = canvas.clientWidth; h = canvas.height = canvas.clientHeight; }
  resize();
  window.addEventListener('resize', resize);

  const count = options.count || 80;
  const drops = [];
  for (let i = 0; i < count; i++) {
    drops.push({
      x: Math.random() * w,
      y: Math.random() * h,
      l: Math.random() * 15 + 5,
      v: Math.random() * 4 + 4
    });
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(174,194,224,0.5)';
    ctx.lineWidth = 1;
    drops.forEach(d => {
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x, d.y + d.l);
      ctx.stroke();
      d.y += d.v;
      if (d.y > h) { d.y = -d.l; d.x = Math.random() * w; }
    });
    requestAnimationFrame(draw);
  }
  draw();
  return () => window.removeEventListener('resize', resize);
}

function starfield(canvasId, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h;
  function resize() { w = canvas.width = canvas.clientWidth; h = canvas.height = canvas.clientHeight; }
  resize();
  window.addEventListener('resize', resize);

  const count = options.count || 120;
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      z: Math.random() * w,
      o: Math.random()
    });
  }

  function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    stars.forEach(s => {
      s.z -= 0.5;
      if (s.z <= 0) { s.z = w; s.x = Math.random() * w; s.y = Math.random() * h; }
      const sx = (s.x - w / 2) * (w / s.z) + w / 2;
      const sy = (s.y - h / 2) * (w / s.z) + h / 2;
      const size = (1 - s.z / w) * 3;
      const alpha = (1 - s.z / w) * s.o;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
  return () => window.removeEventListener('resize', resize);
}

/* ================= 音频可视化动画 ================= */

function audioBars(canvasId, analyser, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !analyser) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const barCount = options.barCount || 64;
  const barW = w / barCount;
  const colorStart = options.colorStart || '#5b4dff';
  const colorEnd = options.colorEnd || '#ff6b9d';

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  }

  const [r1, g1, b1] = hexToRgb(colorStart);
  const [r2, g2, b2] = hexToRgb(colorEnd);

  function draw() {
    requestAnimationFrame(draw);
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < barCount; i++) {
      const idx = Math.floor((i / barCount) * data.length);
      const val = data[idx] / 255;
      const height = val * h;
      const t = i / barCount;
      const r = Math.round(r1 + (r2 - r1) * t);
      const g = Math.round(g1 + (g2 - g1) * t);
      const b = Math.round(b1 + (b2 - b1) * t);
      ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
      ctx.fillRect(i * barW, h - height, barW - 1, height);
    }
  }
  draw();
}

function circularVisualizer(canvasId, analyser, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !analyser) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const radius = options.radius || Math.min(cx, cy) * 0.5;
  const barCount = options.barCount || 80;

  function draw() {
    requestAnimationFrame(draw);
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < barCount; i++) {
      const idx = Math.floor((i / barCount) * data.length);
      const val = data[idx] / 255;
      const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
      const barLen = val * radius * 0.8;
      const x1 = cx + Math.cos(angle) * radius;
      const y1 = cy + Math.sin(angle) * radius;
      const x2 = cx + Math.cos(angle) * (radius + barLen);
      const y2 = cy + Math.sin(angle) * (radius + barLen);
      const hue = (i / barCount) * 360;
      ctx.strokeStyle = `hsla(${hue}, 80%, 60%, 0.85)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }
  draw();
}

/* ================= 导出 ================= */

const QingluanAnimations = {
  // 缓动函数
  Easing,
  // 基础动画
  fadeIn,
  fadeOut,
  slideUp,
  slideDown,
  scaleIn,
  scaleOut,
  // 特效
  ripple,
  confetti,
  typewriter,
  marquee,
  parallax,
  shimmer,
  pulse,
  bounce,
  shake,
  rotate,
  morphShape,
  drawSVG,
  pageTransition,
  scrollReveal,
  counterAnimation,
  equalizerBars,
  particleBackground,
  // 组合动画
  popIn,
  popOut,
  flash,
  wobble,
  heartBeat,
  flipInX,
  flipInY,
  swing,
  rubberBand,
  tada,
  glow,
  blurIn,
  blurOut,
  slideInLeft,
  slideInRight,
  slideInUp,
  slideInDown,
  hinge,
  jackInTheBox,
  rollIn,
  rollOut,
  zoomIn,
  zoomOut,
  // 粒子系统
  firework,
  snow,
  rain,
  starfield,
  // 音频可视化
  audioBars,
  circularVisualizer,
  // 工具
  animate: _animate
};

/* ================= 3D 翻转与透视动画 ================= */

function flip3D(element, duration = 800, axis = 'y') {
  const el = _resolveEl(element);
  if (!el) return;
  el.style.display = '';
  el.style.opacity = '0';
  el.style.transform = `perspective(600px) rotate${axis.toUpperCase()}(-90deg)`;
  _animate({
    duration,
    easing: Easing.easeInOutCubic,
    onUpdate: (eased) => {
      const angle = -90 + eased * 90;
      el.style.transform = `perspective(600px) rotate${axis.toUpperCase()}(${angle}deg)`;
      el.style.opacity = String(eased);
    },
    onComplete: () => { el.style.transform = ''; }
  });
}

function unfold(element, duration = 700) {
  const el = _resolveEl(element);
  if (!el) return;
  el.style.display = '';
  el.style.overflow = 'hidden';
  el.style.transformOrigin = 'top center';
  el.style.transform = 'perspective(600px) rotateX(-90deg)';
  el.style.opacity = '0';
  _animate({
    duration,
    easing: Easing.easeOutCubic,
    onUpdate: (eased) => {
      el.style.transform = `perspective(600px) rotateX(${-90 + eased * 90}deg)`;
      el.style.opacity = String(eased);
    },
    onComplete: () => { el.style.transform = ''; el.style.transformOrigin = ''; }
  });
}

function fold(element, duration = 600) {
  const el = _resolveEl(element);
  if (!el) return;
  el.style.transformOrigin = 'top center';
  _animate({
    duration,
    easing: Easing.easeOutCubic,
    onUpdate: (eased) => {
      el.style.transform = `perspective(600px) rotateX(${-eased * 90}deg)`;
      el.style.opacity = String(1 - eased);
    },
    onComplete: () => { el.style.display = 'none'; el.style.transform = ''; el.style.transformOrigin = ''; }
  });
}

/* ================= 文本动画 ================= */

function textScramble(element, finalText, duration = 1500) {
  const el = _resolveEl(element);
  if (!el) return;
  const chars = '!<>-_\\/[]{}—=+*^?#________';
  const length = finalText.length;
  const startTime = performance.now();
  let frame = 0;

  function update(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const progress = Math.floor(t * length);
    let output = '';
    for (let i = 0; i < length; i++) {
      if (i < progress) output += finalText[i];
      else output += chars[Math.floor(Math.random() * chars.length)];
    }
    el.textContent = output;
    if (t < 1) requestAnimationFrame(update);
    else el.textContent = finalText;
  }
  requestAnimationFrame(update);
}

function textReveal(element, duration = 800) {
  const el = _resolveEl(element);
  if (!el) return;
  const text = el.textContent;
  el.innerHTML = text.split('').map((ch, i) =>
    `<span style="display:inline-block;opacity:0;transform:translateY(10px);transition:all 0.3s ${i * 0.03}s">${ch === ' ' ? '&nbsp;' : ch}</span>`
  ).join('');
  requestAnimationFrame(() => {
    el.querySelectorAll('span').forEach(span => {
      span.style.opacity = '1';
      span.style.transform = 'translateY(0)';
    });
  });
}

function textHighlight(element, color = 'var(--accent)', duration = 600) {
  const el = _resolveEl(element);
  if (!el) return;
  const originalBg = el.style.background;
  _animate({
    duration,
    easing: Easing.easeInOutSine,
    onUpdate: (eased) => {
      const alpha = Math.sin(eased * Math.PI) * 0.3;
      el.style.background = `linear-gradient(90deg, ${color}22 0%, ${color}22 ${eased * 100}%, transparent ${eased * 100}%)`;
    },
    onComplete: () => { el.style.background = originalBg; }
  });
}

/* ================= 路径动画 ================= */

function moveAlongPath(element, pathSelector, duration = 2000) {
  const el = _resolveEl(element);
  const path = document.querySelector(pathSelector);
  if (!el || !path || !(path instanceof SVGPathElement)) return;
  const len = path.getTotalLength();
  _animate({
    duration,
    easing: Easing.linear,
    onUpdate: (eased) => {
      const point = path.getPointAtLength(eased * len);
      el.style.transform = `translate(${point.x}px, ${point.y}px)`;
    }
  });
}

/* ================= 液体动画 ================= */

function liquidFill(element, duration = 1200) {
  const el = _resolveEl(element);
  if (!el) return;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:absolute;inset:0;background:var(--accent);transform:scaleY(0);transform-origin:bottom;transition:none;pointer-events:none;z-index:0;';
  el.style.position = 'relative';
  el.appendChild(overlay);
  _animate({
    duration,
    easing: Easing.easeOutCubic,
    onUpdate: (eased) => {
      overlay.style.transform = `scaleY(${eased})`;
    }
  });
}

/* ================= 呼吸动画 ================= */

function breathe(element, duration = 3000) {
  const el = _resolveEl(element);
  if (!el) return;
  function cycle() {
    _animate({
      duration,
      easing: Easing.easeInOutSine,
      onUpdate: (eased) => {
        const s = 1 + Math.sin(eased * Math.PI * 2) * 0.03;
        el.style.transform = `scale(${s})`;
      },
      onComplete: cycle
    });
  }
  cycle();
}

/* ================= 故障效果 ================= */

function glitch(element, duration = 400) {
  const el = _resolveEl(element);
  if (!el) return;
  const original = el.style.cssText;
  _animate({
    duration,
    easing: Easing.linear,
    onUpdate: (eased) => {
      const x = (Math.random() - 0.5) * 6 * (1 - eased);
      const y = (Math.random() - 0.5) * 2 * (1 - eased);
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.style.textShadow = `${x * 2}px 0 #ff00ff, ${-x * 2}px 0 #00ffff`;
    },
    onComplete: () => { el.style.transform = ''; el.style.textShadow = ''; }
  });
}

/* ================= 磁吸效果 ================= */

function magneticButton(element, strength = 0.3) {
  const el = _resolveEl(element);
  if (!el) return;
  el.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
  });
  el.addEventListener('mouseleave', () => {
    el.style.transform = '';
    el.style.transition = 'transform 0.3s cubic-bezier(0.16,1,0.3,1)';
    setTimeout(() => { el.style.transition = ''; }, 300);
  });
}

/* ================= 聚光灯效果 ================= */

function spotlight(element, options = {}) {
  const el = _resolveEl(element);
  if (!el) return;
  el.style.position = 'relative';
  el.style.overflow = 'hidden';
  const spot = document.createElement('div');
  spot.style.cssText = 'position:absolute;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);pointer-events:none;transform:translate(-50%,-50%);opacity:0;transition:opacity 0.3s;';
  el.appendChild(spot);
  el.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    spot.style.left = (e.clientX - rect.left) + 'px';
    spot.style.top = (e.clientY - rect.top) + 'px';
    spot.style.opacity = '1';
  });
  el.addEventListener('mouseleave', () => { spot.style.opacity = '0'; });
}

// 全局暴露
if (typeof window !== 'undefined') {
  window.QingluanAnimations = QingluanAnimations;
  window.QingluanAnimations.flip3D = flip3D;
  window.QingluanAnimations.unfold = unfold;
  window.QingluanAnimations.fold = fold;
  window.QingluanAnimations.textScramble = textScramble;
  window.QingluanAnimations.textReveal = textReveal;
  window.QingluanAnimations.textHighlight = textHighlight;
  window.QingluanAnimations.moveAlongPath = moveAlongPath;
  window.QingluanAnimations.liquidFill = liquidFill;
  window.QingluanAnimations.breathe = breathe;
  window.QingluanAnimations.glitch = glitch;
  window.QingluanAnimations.magneticButton = magneticButton;
  window.QingluanAnimations.spotlight = spotlight;
}

/* ================= 频谱条形图动画系统 ================= */

function spectrumBarAnimator(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ barCount: 64, gap: 2, colorStart: '#5b4dff', colorEnd: '#ff4d9e', smoothing: 0.8, style: 'default' }, options);
  let data = Array(opts.barCount).fill(0);
  let target = Array(opts.barCount).fill(0);
  let rafId;
  function lerp(a, b, t) { return a + (b - a) * t; }
  function draw() {
    const w = cvs.width, h = cvs.height;
    ctx.clearRect(0, 0, w, h);
    const bw = (w - (opts.barCount - 1) * opts.gap) / opts.barCount;
    data.forEach((v, i) => {
      const bh = v * h;
      const x = i * (bw + opts.gap);
      const grad = ctx.createLinearGradient(0, h, 0, h - bh);
      grad.addColorStop(0, opts.colorStart);
      grad.addColorStop(1, opts.colorEnd);
      ctx.fillStyle = grad;
      if (opts.style === 'round') {
        ctx.beginPath();
        ctx.roundRect(x, h - bh, bw, bh, [bw / 2, bw / 2, 0, 0]);
        ctx.fill();
      } else if (opts.style === 'mirror') {
        ctx.fillRect(x, h / 2 - bh / 2, bw, bh);
      } else {
        ctx.fillRect(x, h - bh, bw, bh);
      }
    });
  }
  function loop() {
    for (let i = 0; i < opts.barCount; i++) data[i] = lerp(data[i], target[i], 1 - opts.smoothing);
    draw();
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return {
    update: (arr) => { target = arr.slice(0, opts.barCount); while (target.length < opts.barCount) target.push(0); },
    stop: () => cancelAnimationFrame(rafId)
  };
}

function spectrumBarRound(canvas, options = {}) {
  return spectrumBarAnimator(canvas, Object.assign({}, options, { style: 'round' }));
}

function spectrumBarMirror(canvas, options = {}) {
  return spectrumBarAnimator(canvas, Object.assign({}, options, { style: 'mirror' }));
}

/* ================= 圆形频谱动画 ================= */

function circularSpectrum(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ barCount: 60, radius: 80, barWidth: 4, color: '#5b4dff', glow: true }, options);
  let data = Array(opts.barCount).fill(0);
  let target = Array(opts.barCount).fill(0);
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    const cx = w / 2, cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    if (opts.glow) { ctx.shadowBlur = 12; ctx.shadowColor = opts.color; }
    data.forEach((v, i) => {
      const angle = (i / opts.barCount) * Math.PI * 2 - Math.PI / 2;
      const len = v * opts.radius * 1.2;
      const x1 = cx + Math.cos(angle) * opts.radius;
      const y1 = cy + Math.sin(angle) * opts.radius;
      const x2 = cx + Math.cos(angle) * (opts.radius + len);
      const y2 = cy + Math.sin(angle) * (opts.radius + len);
      ctx.strokeStyle = opts.color;
      ctx.lineWidth = opts.barWidth;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
    ctx.shadowBlur = 0;
  }
  function loop() {
    for (let i = 0; i < opts.barCount; i++) data[i] += (target[i] - data[i]) * 0.15;
    draw();
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return {
    update: (arr) => { target = arr.slice(0, opts.barCount); while (target.length < opts.barCount) target.push(0); },
    stop: () => cancelAnimationFrame(rafId)
  };
}

/* ================= 粒子系统 ================= */

class ParticleSystem {
  constructor(canvas, options = {}) {
    this.cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
    this.ctx = this.cvs.getContext('2d');
    this.opts = Object.assign({ maxParticles: 500, gravity: 0.05, friction: 0.98, bounds: null }, options);
    this.particles = [];
    this.emitters = [];
    this.fields = [];
    this.rafId = null;
    this._loop = this._loop.bind(this);
  }
  addEmitter(emitter) { this.emitters.push(emitter); }
  addField(field) { this.fields.push(field); }
  emit(x, y, count = 1, opts = {}) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.opts.maxParticles) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = (opts.speed || 2) * (0.5 + Math.random() * 0.5);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: (opts.decay || 0.01) * (0.8 + Math.random() * 0.4),
        size: opts.size || 3,
        color: opts.color || '#5b4dff'
      });
    }
  }
  _update() {
    this.emitters.forEach(e => {
      if (e.active && Math.random() < e.rate) {
        this.emit(e.x, e.y, e.count || 1, { speed: e.speed, color: e.color, size: e.size, decay: e.decay });
      }
    });
    this.particles.forEach(p => {
      p.vy += this.opts.gravity;
      p.vx *= this.opts.friction;
      p.vy *= this.opts.friction;
      this.fields.forEach(f => {
        const dx = p.x - f.x;
        const dy = p.y - f.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
        const force = f.strength / (dist * dist);
        p.vx -= (dx / dist) * force;
        p.vy -= (dy / dist) * force;
      });
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
    });
    this.particles = this.particles.filter(p => p.life > 0);
  }
  _draw() {
    const w = this.cvs.width, h = this.cvs.height;
    this.ctx.clearRect(0, 0, w, h);
    this.particles.forEach(p => {
      this.ctx.globalAlpha = p.life;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1;
  }
  _loop() {
    this._update();
    this._draw();
    this.rafId = requestAnimationFrame(this._loop);
  }
  start() { if (!this.rafId) this._loop(); }
  stop() { cancelAnimationFrame(this.rafId); this.rafId = null; }
  clear() { this.particles = []; }
}

class ParticleEmitter {
  constructor(x, y, options = {}) {
    this.x = x; this.y = y;
    this.active = true;
    this.rate = options.rate || 0.3;
    this.count = options.count || 2;
    this.speed = options.speed || 3;
    this.color = options.color || '#5b4dff';
    this.size = options.size || 3;
    this.decay = options.decay || 0.01;
  }
  setPosition(x, y) { this.x = x; this.y = y; }
}

class ForceField {
  constructor(x, y, strength = 0.5) {
    this.x = x; this.y = y; this.strength = strength;
  }
}

/* ================= 波形 3D 螺旋动画 ================= */

function waveformSpiral3D(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ points: 120, radius: 100, depth: 80, speed: 0.02, color: '#5b4dff' }, options);
  let waveData = Array(opts.points).fill(0);
  let targetData = Array(opts.points).fill(0);
  let angleOffset = 0;
  let rafId;
  function project(x, y, z) {
    const scale = 300 / (300 + z);
    return { x: cvs.width / 2 + x * scale, y: cvs.height / 2 + y * scale, scale };
  }
  function draw() {
    const w = cvs.width, h = cvs.height;
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < opts.points; i++) {
      const t = i / opts.points;
      const angle = t * Math.PI * 4 + angleOffset;
      const r = opts.radius + waveData[i] * 40;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      const z = (t - 0.5) * opts.depth;
      const p = project(x, y, z);
      ctx.fillStyle = opts.color;
      ctx.globalAlpha = p.scale * 0.8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2 * p.scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function loop() {
    for (let i = 0; i < opts.points; i++) waveData[i] += (targetData[i] - waveData[i]) * 0.1;
    angleOffset += opts.speed;
    draw();
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return {
    update: (arr) => { targetData = arr.slice(0, opts.points); while (targetData.length < opts.points) targetData.push(0); },
    stop: () => cancelAnimationFrame(rafId)
  };
}

/* ================= 音频响应几何变形 ================= */

function audioResponsiveGeometry(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ sides: 6, baseRadius: 80, color: '#5b4dff', smoothing: 0.85 }, options);
  let radius = opts.baseRadius;
  let targetRadius = opts.baseRadius;
  let rafId;
  function drawPolygon(r) {
    const cx = cvs.width / 2, cy = cvs.height / 2;
    ctx.beginPath();
    for (let i = 0; i <= opts.sides; i++) {
      const angle = (i / opts.sides) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = opts.color + '22';
    ctx.fill();
  }
  function loop() {
    radius = radius * opts.smoothing + targetRadius * (1 - opts.smoothing);
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    drawPolygon(radius);
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return {
    update: (intensity) => { targetRadius = opts.baseRadius + intensity * 80; },
    stop: () => cancelAnimationFrame(rafId)
  };
}

/* ================= 音符飘落动画 ================= */

function fallingNotes(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ spawnRate: 0.05, symbols: ['♪', '♫', '♩', '♬', '♭', '♮', '♯'], colors: ['#5b4dff', '#ff4d9e', '#00e5ff', '#ffc107'] }, options);
  const notes = [];
  let rafId;
  function spawn() {
    notes.push({
      x: Math.random() * cvs.width,
      y: -20,
      speed: 1 + Math.random() * 2,
      symbol: opts.symbols[Math.floor(Math.random() * opts.symbols.length)],
      color: opts.colors[Math.floor(Math.random() * opts.colors.length)],
      size: 14 + Math.random() * 14,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.05,
      opacity: 1
    });
  }
  function loop() {
    if (Math.random() < opts.spawnRate) spawn();
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    for (let i = notes.length - 1; i >= 0; i--) {
      const n = notes[i];
      n.y += n.speed;
      n.rotation += n.rotSpeed;
      n.opacity -= 0.003;
      ctx.save();
      ctx.translate(n.x, n.y);
      ctx.rotate(n.rotation);
      ctx.globalAlpha = Math.max(0, n.opacity);
      ctx.fillStyle = n.color;
      ctx.font = `${n.size}px sans-serif`;
      ctx.fillText(n.symbol, 0, 0);
      ctx.restore();
      if (n.opacity <= 0 || n.y > cvs.height + 20) notes.splice(i, 1);
    }
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return { stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 节拍脉冲环 ================= */

function beatPulseRings(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ maxRings: 8, color: '#5b4dff', speed: 2 }, options);
  const rings = [];
  let rafId;
  function spawn() {
    if (rings.length >= opts.maxRings) return;
    rings.push({ r: 0, alpha: 1, width: 3 });
  }
  function loop() {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    const cx = cvs.width / 2, cy = cvs.height / 2;
    for (let i = rings.length - 1; i >= 0; i--) {
      const ring = rings[i];
      ring.r += opts.speed;
      ring.alpha -= 0.015;
      if (ring.alpha <= 0) { rings.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
      ctx.strokeStyle = opts.color;
      ctx.globalAlpha = ring.alpha;
      ctx.lineWidth = ring.width;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return {
    pulse: () => spawn(),
    stop: () => cancelAnimationFrame(rafId)
  };
}

/* ================= 频谱粒子云 ================= */

function spectrumParticleCloud(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ particleCount: 300, barCount: 32, colors: ['#5b4dff', '#ff4d9e', '#00e5ff'] }, options);
  const particles = [];
  let spectrum = Array(opts.barCount).fill(0);
  let target = Array(opts.barCount).fill(0);
  let rafId;
  for (let i = 0; i < opts.particleCount; i++) {
    particles.push({
      x: Math.random() * cvs.width,
      y: Math.random() * cvs.height,
      vx: (Math.random() - 0.5) * 1,
      vy: (Math.random() - 0.5) * 1,
      size: 1 + Math.random() * 2,
      color: opts.colors[Math.floor(Math.random() * opts.colors.length)],
      barIndex: Math.floor(Math.random() * opts.barCount)
    });
  }
  function loop() {
    for (let i = 0; i < opts.barCount; i++) spectrum[i] += (target[i] - spectrum[i]) * 0.1;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    particles.forEach(p => {
      const intensity = spectrum[p.barIndex];
      p.vy -= intensity * 0.05;
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < 0) { p.y = cvs.height; p.x = Math.random() * cvs.width; }
      if (p.x < 0) p.x = cvs.width;
      if (p.x > cvs.width) p.x = 0;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.5 + intensity * 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 + intensity), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return {
    update: (arr) => { target = arr.slice(0, opts.barCount); while (target.length < opts.barCount) target.push(0); },
    stop: () => cancelAnimationFrame(rafId)
  };
}

/* ================= 歌词逐字高亮动画 ================= */

function lyricWordHighlight(element, options = {}) {
  const el = _resolveEl(element);
  if (!el) return;
  const opts = Object.assign({ words: [], activeColor: '#5b4dff', inactiveColor: '#999', duration: 300 }, options);
  el.innerHTML = '';
  const spans = [];
  opts.words.forEach((word, i) => {
    const span = document.createElement('span');
    span.textContent = word + ' ';
    span.style.color = opts.inactiveColor;
    span.style.transition = `color ${opts.duration}ms ease`;
    span.style.cursor = 'default';
    el.appendChild(span);
    spans.push(span);
  });
  return {
    highlight: (index) => {
      spans.forEach((s, i) => { s.style.color = i === index ? opts.activeColor : opts.inactiveColor; s.style.fontWeight = i === index ? '700' : '400'; });
    },
    destroy: () => { el.innerHTML = ''; }
  };
}

/* ================= 转场过渡动画 ================= */

function transitionFade(element, duration = 400, direction = 'in') {
  const el = _resolveEl(element);
  if (!el) return;
  el.style.transition = `opacity ${duration}ms ease`;
  if (direction === 'in') { el.style.opacity = '0'; el.style.display = ''; requestAnimationFrame(() => { el.style.opacity = '1'; }); }
  else { el.style.opacity = '1'; requestAnimationFrame(() => { el.style.opacity = '0'; }); setTimeout(() => { el.style.display = 'none'; }, duration); }
}

function transitionSlide(element, duration = 400, direction = 'in', from = 'left') {
  const el = _resolveEl(element);
  if (!el) return;
  const translate = from === 'left' ? '-100%' : (from === 'right' ? '100%' : (from === 'up' ? '-100%' : '100%'));
  const axis = from === 'left' || from === 'right' ? 'X' : 'Y';
  el.style.transition = `transform ${duration}ms ease, opacity ${duration}ms ease`;
  if (direction === 'in') {
    el.style.transform = `translate${axis}(${translate})`;
    el.style.opacity = '0';
    el.style.display = '';
    requestAnimationFrame(() => { el.style.transform = 'translate(0)'; el.style.opacity = '1'; });
  } else {
    el.style.transform = 'translate(0)';
    el.style.opacity = '1';
    requestAnimationFrame(() => { el.style.transform = `translate${axis}(${translate})`; el.style.opacity = '0'; });
    setTimeout(() => { el.style.display = 'none'; }, duration);
  }
}

function transitionScale(element, duration = 400, direction = 'in') {
  const el = _resolveEl(element);
  if (!el) return;
  el.style.transition = `transform ${duration}ms ease, opacity ${duration}ms ease`;
  if (direction === 'in') { el.style.transform = 'scale(0.8)'; el.style.opacity = '0'; el.style.display = ''; requestAnimationFrame(() => { el.style.transform = 'scale(1)'; el.style.opacity = '1'; }); }
  else { el.style.transform = 'scale(1)'; el.style.opacity = '1'; requestAnimationFrame(() => { el.style.transform = 'scale(0.8)'; el.style.opacity = '0'; }); setTimeout(() => { el.style.display = 'none'; }, duration); }
}

function transitionFlip(element, duration = 500, direction = 'in', axis = 'Y') {
  const el = _resolveEl(element);
  if (!el) return;
  el.style.transition = `transform ${duration}ms ease, opacity ${duration}ms ease`;
  el.style.backfaceVisibility = 'hidden';
  if (direction === 'in') { el.style.transform = `perspective(600px) rotate${axis}(90deg)`; el.style.opacity = '0'; el.style.display = ''; requestAnimationFrame(() => { el.style.transform = `perspective(600px) rotate${axis}(0deg)`; el.style.opacity = '1'; }); }
  else { el.style.transform = `perspective(600px) rotate${axis}(0deg)`; el.style.opacity = '1'; requestAnimationFrame(() => { el.style.transform = `perspective(600px) rotate${axis}(-90deg)`; el.style.opacity = '0'; }); setTimeout(() => { el.style.display = 'none'; }, duration); }
}

/* ================= 加载动画（多种样式） ================= */

function loadingSpinner(element, options = {}) {
  const el = _resolveEl(element);
  if (!el) return;
  const opts = Object.assign({ size: 40, color: '#5b4dff', thickness: 4 }, options);
  el.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.width = opts.size; canvas.height = opts.size;
  el.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let angle = 0;
  let rafId;
  function loop() {
    ctx.clearRect(0, 0, opts.size, opts.size);
    const cx = opts.size / 2, cy = opts.size / 2, r = (opts.size - opts.thickness) / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, angle, angle + Math.PI * 1.5);
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.thickness;
    ctx.lineCap = 'round';
    ctx.stroke();
    angle += 0.12;
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return { stop: () => cancelAnimationFrame(rafId) };
}

function loadingDots(element, options = {}) {
  const el = _resolveEl(element);
  if (!el) return;
  const opts = Object.assign({ count: 3, size: 8, color: '#5b4dff', gap: 6 }, options);
  el.innerHTML = '';
  const dots = [];
  for (let i = 0; i < opts.count; i++) {
    const d = document.createElement('span');
    _setStyles(d, { display: 'inline-block', width: _px(opts.size), height: _px(opts.size), borderRadius: '50%', background: opts.color, marginRight: _px(opts.gap), opacity: 0.3 });
    el.appendChild(d);
    dots.push(d);
  }
  let idx = 0;
  const interval = setInterval(() => {
    dots.forEach((d, i) => { d.style.opacity = i === idx ? '1' : '0.3'; d.style.transform = i === idx ? 'scale(1.2)' : 'scale(1)'; d.style.transition = 'opacity 0.2s, transform 0.2s'; });
    idx = (idx + 1) % opts.count;
  }, 200);
  return { stop: () => clearInterval(interval) };
}

function loadingBars(element, options = {}) {
  const el = _resolveEl(element);
  if (!el) return;
  const opts = Object.assign({ count: 5, width: 4, height: 24, color: '#5b4dff', gap: 3 }, options);
  el.innerHTML = '';
  const bars = [];
  for (let i = 0; i < opts.count; i++) {
    const b = document.createElement('span');
    _setStyles(b, { display: 'inline-block', width: _px(opts.width), height: _px(opts.height), background: opts.color, marginRight: _px(opts.gap), transformOrigin: 'bottom', transform: 'scaleY(0.3)', transition: 'transform 0.2s ease' });
    el.appendChild(b);
    bars.push(b);
  }
  let t = 0;
  const interval = setInterval(() => {
    bars.forEach((b, i) => { const s = 0.3 + 0.7 * Math.abs(Math.sin((t + i) * 0.5)); b.style.transform = `scaleY(${s})`; });
    t += 0.3;
  }, 50);
  return { stop: () => clearInterval(interval) };
}

function loadingPulse(element, options = {}) {
  const el = _resolveEl(element);
  if (!el) return;
  const opts = Object.assign({ size: 40, color: '#5b4dff' }, options);
  el.innerHTML = '';
  const c1 = document.createElement('span');
  const c2 = document.createElement('span');
  [c1, c2].forEach(c => {
    _setStyles(c, { position: 'absolute', width: _px(opts.size), height: _px(opts.size), borderRadius: '50%', background: opts.color, opacity: 0.6 });
    el.appendChild(c);
  });
  _setStyles(el, { position: 'relative', width: _px(opts.size), height: _px(opts.size) });
  let scale1 = 0, scale2 = 0;
  let rafId;
  function loop() {
    scale1 += 0.015; if (scale1 > 1.5) scale1 = 0;
    scale2 += 0.015; if (scale2 > 1.5) scale2 = 0;
    c1.style.transform = `scale(${scale1})`; c1.style.opacity = String(0.6 * (1 - scale1 / 1.5));
    c2.style.transform = `scale(${scale2})`; c2.style.opacity = String(0.6 * (1 - scale2 / 1.5));
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return { stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 背景动态渐变 ================= */

function dynamicGradientBackground(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ colors: ['#5b4dff', '#ff4d9e', '#00e5ff'], speed: 0.002 }, options);
  let t = 0;
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    const grad = ctx.createLinearGradient(0, 0, w * Math.sin(t), h * Math.cos(t));
    opts.colors.forEach((c, i) => { grad.addColorStop(i / (opts.colors.length - 1), c); });
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    t += opts.speed;
    rafId = requestAnimationFrame(draw);
  }
  draw();
  return { stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 星空/星云效果 ================= */

function starfieldNebula(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ starCount: 200, nebulaCount: 4, speed: 0.2 }, options);
  const stars = [];
  const nebulas = [];
  for (let i = 0; i < opts.starCount; i++) {
    stars.push({ x: Math.random() * cvs.width, y: Math.random() * cvs.height, size: Math.random() * 2, speed: Math.random() * 0.5 + 0.1, alpha: Math.random() });
  }
  for (let i = 0; i < opts.nebulaCount; i++) {
    nebulas.push({ x: Math.random() * cvs.width, y: Math.random() * cvs.height, r: 100 + Math.random() * 200, color: `hsla(${Math.random() * 360}, 70%, 50%, 0.08)` });
  }
  let rafId;
  function draw() {
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    nebulas.forEach(n => {
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0, n.color);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    });
    stars.forEach(s => {
      s.y += s.speed * opts.speed;
      if (s.y > cvs.height) { s.y = 0; s.x = Math.random() * cvs.width; }
      ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });
    rafId = requestAnimationFrame(draw);
  }
  draw();
  return { stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 水波纹效果 ================= */

function waterRipple(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ color: 'rgba(91,77,255,0.3)', maxRings: 10, speed: 1.5 }, options);
  const ripples = [];
  let rafId;
  function addRipple(x, y) {
    if (ripples.length >= opts.maxRings) return;
    ripples.push({ x, y, r: 0, alpha: 1 });
  }
  function draw() {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.r += opts.speed;
      r.alpha -= 0.008;
      if (r.alpha <= 0) { ripples.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.strokeStyle = opts.color;
      ctx.globalAlpha = r.alpha;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    rafId = requestAnimationFrame(draw);
  }
  draw();
  cvs.addEventListener('click', (e) => {
    const rect = cvs.getBoundingClientRect();
    addRipple(e.clientX - rect.left, e.clientY - rect.top);
  });
  return { addRipple, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 音频响应故障艺术（Glitch） ================= */

function audioGlitchArt(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ intensity: 0.5, colors: ['#ff00ff', '#00ffff', '#ffff00'] }, options);
  let glitchIntensity = 0;
  let targetIntensity = 0;
  let rafId;
  function draw() {
    glitchIntensity += (targetIntensity - glitchIntensity) * 0.2;
    const w = cvs.width, h = cvs.height;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    if (glitchIntensity < 0.05) { rafId = requestAnimationFrame(draw); return; }
    const slices = Math.floor(10 + glitchIntensity * 30);
    for (let i = 0; i < slices; i++) {
      const y = Math.random() * h;
      const sh = Math.random() * 20 * glitchIntensity;
      const offset = (Math.random() - 0.5) * 40 * glitchIntensity;
      ctx.fillStyle = opts.colors[Math.floor(Math.random() * opts.colors.length)];
      ctx.globalAlpha = 0.2 + Math.random() * 0.3;
      ctx.fillRect(0, y, w, sh);
      if (Math.random() < 0.3) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(Math.random() * w, y, Math.random() * 100 * glitchIntensity, sh);
      }
    }
    ctx.globalAlpha = 1;
    rafId = requestAnimationFrame(draw);
  }
  draw();
  return {
    update: (intensity) => { targetIntensity = Math.max(0, Math.min(1, intensity)); },
    stop: () => cancelAnimationFrame(rafId)
  };
}

/* ================= 追加动画注册 ================= */

QingluanAnimations.spectrumBarAnimator = spectrumBarAnimator;
QingluanAnimations.spectrumBarRound = spectrumBarRound;
QingluanAnimations.spectrumBarMirror = spectrumBarMirror;
QingluanAnimations.circularSpectrum = circularSpectrum;
QingluanAnimations.ParticleSystem = ParticleSystem;
QingluanAnimations.ParticleEmitter = ParticleEmitter;
QingluanAnimations.ForceField = ForceField;
QingluanAnimations.waveformSpiral3D = waveformSpiral3D;
QingluanAnimations.audioResponsiveGeometry = audioResponsiveGeometry;
QingluanAnimations.fallingNotes = fallingNotes;
QingluanAnimations.beatPulseRings = beatPulseRings;
QingluanAnimations.spectrumParticleCloud = spectrumParticleCloud;
QingluanAnimations.lyricWordHighlight = lyricWordHighlight;
QingluanAnimations.transitionFade = transitionFade;
QingluanAnimations.transitionSlide = transitionSlide;
QingluanAnimations.transitionScale = transitionScale;
QingluanAnimations.transitionFlip = transitionFlip;
QingluanAnimations.loadingSpinner = loadingSpinner;
QingluanAnimations.loadingDots = loadingDots;
QingluanAnimations.loadingBars = loadingBars;
QingluanAnimations.loadingPulse = loadingPulse;
QingluanAnimations.dynamicGradientBackground = dynamicGradientBackground;
QingluanAnimations.starfieldNebula = starfieldNebula;
QingluanAnimations.waterRipple = waterRipple;
QingluanAnimations.audioGlitchArt = audioGlitchArt;

/* ================= 频谱波形线动画（多种样式） ================= */

function spectrumWaveLine(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ points: 128, color: '#5b4dff', lineWidth: 2, fill: true, smoothing: 0.8 }, options);
  let data = Array(opts.points).fill(0);
  let target = Array(opts.points).fill(0);
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (opts.points - 1)) * w;
      const y = h - v * h * 0.9;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    if (opts.fill) {
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = opts.color + '22';
      ctx.fill();
    }
  }
  function loop() {
    for (let i = 0; i < opts.points; i++) data[i] += (target[i] - data[i]) * (1 - opts.smoothing);
    draw();
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return { update: (arr) => { target = arr.slice(0, opts.points); while (target.length < opts.points) target.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

function spectrumWaveLineDual(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ points: 128, colorTop: '#5b4dff', colorBottom: '#ff4d9e', lineWidth: 2, smoothing: 0.8 }, options);
  let data = Array(opts.points).fill(0);
  let target = Array(opts.points).fill(0);
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (opts.points - 1)) * w;
      const y = h / 2 - v * h * 0.4;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = opts.colorTop;
    ctx.lineWidth = opts.lineWidth;
    ctx.stroke();
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (opts.points - 1)) * w;
      const y = h / 2 + v * h * 0.4;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = opts.colorBottom;
    ctx.lineWidth = opts.lineWidth;
    ctx.stroke();
  }
  function loop() {
    for (let i = 0; i < opts.points; i++) data[i] += (target[i] - data[i]) * (1 - opts.smoothing);
    draw();
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return { update: (arr) => { target = arr.slice(0, opts.points); while (target.length < opts.points) target.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 3D 立方体频谱 ================= */

function spectrumCube3D(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ barCount: 16, size: 20, gap: 4, color: '#5b4dff', rotation: 0.005 }, options);
  let data = Array(opts.barCount).fill(0);
  let target = Array(opts.barCount).fill(0);
  let angle = 0;
  let rafId;
  function project3D(x, y, z) {
    const scale = 400 / (400 + z);
    return { x: cvs.width / 2 + x * scale, y: cvs.height / 2 + y * scale, scale };
  }
  function drawBar(i, h) {
    const x = (i - opts.barCount / 2) * (opts.size + opts.gap);
    const s = opts.size;
    const vertices = [
      { x: x - s / 2, y: 0, z: -s / 2 }, { x: x + s / 2, y: 0, z: -s / 2 },
      { x: x + s / 2, y: -h, z: -s / 2 }, { x: x - s / 2, y: -h, z: -s / 2 },
      { x: x - s / 2, y: 0, z: s / 2 }, { x: x + s / 2, y: 0, z: s / 2 },
      { x: x + s / 2, y: -h, z: s / 2 }, { x: x - s / 2, y: -h, z: s / 2 }
    ];
    const rotated = vertices.map(v => {
      const rx = v.x * Math.cos(angle) - v.z * Math.sin(angle);
      const rz = v.x * Math.sin(angle) + v.z * Math.cos(angle);
      return project3D(rx, v.y, rz - 150);
    });
    const faces = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 3, 7, 4]];
    faces.forEach(face => {
      ctx.beginPath();
      face.forEach((idx, j) => { const p = rotated[idx]; if (j === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.closePath();
      ctx.strokeStyle = opts.color;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = opts.color + '18';
      ctx.fill();
    });
  }
  function loop() {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    for (let i = 0; i < opts.barCount; i++) data[i] += (target[i] - data[i]) * 0.1;
    data.forEach((v, i) => drawBar(i, v * 120));
    angle += opts.rotation;
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return { update: (arr) => { target = arr.slice(0, opts.barCount); while (target.length < opts.barCount) target.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 粒子爆炸效果 ================= */

function particleExplosion(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ particleCount: 100, colors: ['#ff5252', '#ffab40', '#ffd740', '#69f0ae', '#40c4ff', '#7c4dff'], gravity: 0.15, friction: 0.96 }, options);
  let particles = [];
  let rafId;
  function explode(x, y) {
    for (let i = 0; i < opts.particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: Math.random() * 0.015 + 0.01,
        size: Math.random() * 4 + 2,
        color: opts.colors[Math.floor(Math.random() * opts.colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2
      });
    }
  }
  function loop() {
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.vy += opts.gravity;
      p.vx *= opts.friction;
      p.vy *= opts.friction;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      p.rotation += p.rotSpeed;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return { explode, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 音频响应液体 ================= */

function audioLiquid(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ points: 6, color: '#5b4dff', smoothing: 0.9 }, options);
  let levels = Array(opts.points).fill(0.5);
  let targets = Array(opts.points).fill(0.5);
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    const step = w / (opts.points - 1);
    ctx.moveTo(0, h);
    levels.forEach((v, i) => {
      const x = i * step;
      const y = h - v * h;
      if (i === 0) ctx.lineTo(x, y); else {
        const prevX = (i - 1) * step;
        const prevY = h - levels[i - 1] * h;
        const cpX = (prevX + x) / 2;
        ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
        if (i === opts.points - 1) ctx.lineTo(x, y);
      }
    });
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = opts.color + '33';
    ctx.fill();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  function loop() {
    for (let i = 0; i < opts.points; i++) levels[i] += (targets[i] - levels[i]) * (1 - opts.smoothing);
    draw();
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return { update: (arr) => { targets = arr.slice(0, opts.points); while (targets.length < opts.points) targets.push(0.5); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 音乐 DNA 双螺旋 ================= */

function musicDNA(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ strands: 40, radius: 60, color1: '#5b4dff', color2: '#ff4d9e', speed: 0.03 }, options);
  let data = Array(opts.strands).fill(0);
  let target = Array(opts.strands).fill(0);
  let offset = 0;
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < opts.strands; i++) {
      const t = i / opts.strands;
      const y = t * h;
      const angle1 = t * Math.PI * 4 + offset;
      const angle2 = t * Math.PI * 4 + offset + Math.PI;
      const r1 = opts.radius + data[i] * 40;
      const r2 = opts.radius + data[i] * 40;
      const x1 = w / 2 + Math.cos(angle1) * r1;
      const x2 = w / 2 + Math.cos(angle2) * r2;
      ctx.fillStyle = opts.color1;
      ctx.beginPath(); ctx.arc(x1, y, 3 + data[i] * 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = opts.color2;
      ctx.beginPath(); ctx.arc(x2, y, 3 + data[i] * 3, 0, Math.PI * 2); ctx.fill();
      if (i > 0) {
        const prevT = (i - 1) / opts.strands;
        const prevY = prevT * h;
        const pa1 = prevT * Math.PI * 4 + offset;
        const pa2 = prevT * Math.PI * 4 + offset + Math.PI;
        const pr = opts.radius + data[i - 1] * 40;
        ctx.strokeStyle = opts.color1 + '44';
        ctx.beginPath(); ctx.moveTo(w / 2 + Math.cos(pa1) * pr, prevY); ctx.lineTo(x1, y); ctx.stroke();
        ctx.strokeStyle = opts.color2 + '44';
        ctx.beginPath(); ctx.moveTo(w / 2 + Math.cos(pa2) * pr, prevY); ctx.lineTo(x2, y); ctx.stroke();
      }
    }
    offset += opts.speed;
  }
  function loop() {
    for (let i = 0; i < opts.strands; i++) data[i] += (target[i] - data[i]) * 0.1;
    draw();
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return { update: (arr) => { target = arr.slice(0, opts.strands); while (target.length < opts.strands) target.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 频谱环形进度 ================= */

function spectrumRingProgress(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ segments: 60, radius: 80, barWidth: 4, color: '#5b4dff', bgColor: 'rgba(0,0,0,0.06)' }, options);
  let data = Array(opts.segments).fill(0);
  let target = Array(opts.segments).fill(0);
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    const cx = w / 2, cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < opts.segments; i++) {
      const angle = (i / opts.segments) * Math.PI * 2 - Math.PI / 2;
      const innerR = opts.radius;
      const outerR = opts.radius + data[i] * 50;
      ctx.beginPath();
      ctx.arc(cx, cy, innerR, angle, angle + (Math.PI * 2) / opts.segments - 0.02);
      ctx.strokeStyle = opts.bgColor;
      ctx.lineWidth = opts.barWidth;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, angle, angle + (Math.PI * 2) / opts.segments - 0.02);
      ctx.strokeStyle = opts.color;
      ctx.lineWidth = opts.barWidth;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }
  function loop() {
    for (let i = 0; i < opts.segments; i++) data[i] += (target[i] - data[i]) * 0.1;
    draw();
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return { update: (arr) => { target = arr.slice(0, opts.segments); while (target.length < opts.segments) target.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 音频火焰效果 ================= */

function audioFlame(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ particleCount: 150, colors: ['#ff5722', '#ff9800', '#ffeb3b'], intensity: 0.5 }, options);
  const particles = [];
  let rafId;
  for (let i = 0; i < opts.particleCount; i++) {
    particles.push({
      x: Math.random() * cvs.width,
      y: cvs.height + Math.random() * 20,
      vx: (Math.random() - 0.5) * 1,
      vy: -Math.random() * 3 - 1,
      size: Math.random() * 8 + 4,
      life: Math.random(),
      decay: Math.random() * 0.01 + 0.005,
      color: opts.colors[Math.floor(Math.random() * opts.colors.length)]
    });
  }
  function loop() {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    particles.forEach(p => {
      p.x += p.vx + (Math.random() - 0.5) * opts.intensity;
      p.y += p.vy * (1 + opts.intensity);
      p.life -= p.decay;
      p.size *= 0.99;
      if (p.life <= 0 || p.size < 0.5) {
        p.x = Math.random() * cvs.width;
        p.y = cvs.height + Math.random() * 10;
        p.life = 1;
        p.size = Math.random() * 8 + 4;
        p.vy = -Math.random() * 3 - 1;
      }
      ctx.globalAlpha = p.life * 0.7;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return { setIntensity: (v) => { opts.intensity = v; }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 复古示波器 ================= */

function retroOscilloscope(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ gridSize: 20, color: '#00ff00', glow: true, phosphor: true }, options);
  let buffer = [];
  let rafId;
  function drawGrid() {
    ctx.strokeStyle = 'rgba(0,255,0,0.15)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < cvs.width; x += opts.gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cvs.height); ctx.stroke(); }
    for (let y = 0; y < cvs.height; y += opts.gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cvs.width, y); ctx.stroke(); }
  }
  function draw() {
    if (opts.phosphor) {
      ctx.fillStyle = 'rgba(0,20,0,0.2)';
      ctx.fillRect(0, 0, cvs.width, cvs.height);
    } else {
      ctx.clearRect(0, 0, cvs.width, cvs.height);
    }
    drawGrid();
    if (!buffer.length) return;
    if (opts.glow) { ctx.shadowBlur = 8; ctx.shadowColor = opts.color; }
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    buffer.forEach((v, i) => {
      const x = (i / (buffer.length - 1)) * cvs.width;
      const y = (1 - (v + 1) * 0.5) * cvs.height;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  function loop() {
    draw();
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return { update: (arr) => { buffer = arr.slice(); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 声波扩散 ================= */

function soundWaveDiffusion(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ rings: 5, color: '#5b4dff', speed: 2 }, options);
  let waves = [];
  let rafId;
  function emit(intensity = 1) {
    waves.push({ r: 0, alpha: intensity, intensity });
  }
  function loop() {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    const cx = cvs.width / 2, cy = cvs.height / 2;
    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i];
      w.r += opts.speed;
      w.alpha -= 0.005;
      if (w.alpha <= 0) { waves.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(cx, cy, w.r, 0, Math.PI * 2);
      ctx.strokeStyle = opts.color;
      ctx.globalAlpha = w.alpha;
      ctx.lineWidth = 2 + w.intensity * 2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return { emit, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 音频频谱瀑布 ================= */

function spectrumWaterfall(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ bars: 64, history: 80, colorStart: '#5b4dff', colorEnd: '#ff4d9e' }, options);
  let history = [];
  let target = Array(opts.bars).fill(0);
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    history.forEach((row, yIndex) => {
      const y = h - ((yIndex + 1) / opts.history) * h;
      const rowH = h / opts.history;
      row.forEach((v, i) => {
        const x = (i / opts.bars) * w;
        const bw = w / opts.bars;
        const hue = 240 - v * 240;
        ctx.fillStyle = `hsl(${hue}, 80%, ${v * 60 + 10}%)`;
        ctx.fillRect(x, y, bw - 1, rowH);
      });
    });
  }
  function loop() {
    history.unshift(target.slice());
    if (history.length > opts.history) history.pop();
    draw();
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return { update: (arr) => { target = arr.slice(0, opts.bars); while (target.length < opts.bars) target.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 节拍频闪 ================= */

function beatStrobe(element, options = {}) {
  const el = _resolveEl(element);
  if (!el) return;
  const opts = Object.assign({ color: '#fff', duration: 100, easing: Easing.easeOutExpo }, options);
  let rafId;
  return {
    flash: (intensity = 1) => {
      cancelAnimationFrame(rafId);
      const start = performance.now();
      function step(now) {
        const t = Math.min(1, (now - start) / opts.duration);
        const eased = opts.easing(1 - t);
        el.style.backgroundColor = opts.color;
        el.style.opacity = String(eased * intensity);
        if (t < 1) rafId = requestAnimationFrame(step);
        else { el.style.backgroundColor = ''; el.style.opacity = ''; }
      }
      rafId = requestAnimationFrame(step);
    }
  };
}

/* ================= 音频响应扭曲 ================= */

function audioWarp(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ gridSize: 20, color: '#5b4dff', amplitude: 20 }, options);
  let intensity = 0;
  let targetIntensity = 0;
  let time = 0;
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += opts.gridSize) {
      ctx.beginPath();
      for (let y = 0; y <= h; y += 4) {
        const offset = Math.sin(y * 0.02 + time) * intensity * opts.amplitude;
        if (y === 0) ctx.moveTo(x + offset, y); else ctx.lineTo(x + offset, y);
      }
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += opts.gridSize) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const offset = Math.cos(x * 0.02 + time) * intensity * opts.amplitude;
        if (x === 0) ctx.moveTo(x, y + offset); else ctx.lineTo(x, y + offset);
      }
      ctx.stroke();
    }
    time += 0.05;
    intensity += (targetIntensity - intensity) * 0.1;
    rafId = requestAnimationFrame(draw);
  }
  draw();
  return { update: (v) => { targetIntensity = Math.max(0, Math.min(1, v)); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 频谱山丘 ================= */

function spectrumHills(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ points: 64, color: '#5b4dff', layers: 3, smoothing: 0.85 }, options);
  let data = Array(opts.points).fill(0);
  let target = Array(opts.points).fill(0);
  let rafId;
  function drawLayer(layerIndex, offsetY, scale) {
    const w = cvs.width, h = cvs.height;
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (opts.points - 1)) * w;
      const y = h - (v * scale + offsetY) * h;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    const alpha = 0.2 + (opts.layers - layerIndex) * 0.15;
    ctx.fillStyle = opts.color;
    ctx.globalAlpha = alpha;
    ctx.fill();
  }
  function loop() {
    for (let i = 0; i < opts.points; i++) data[i] += (target[i] - data[i]) * (1 - opts.smoothing);
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    for (let l = 0; l < opts.layers; l++) drawLayer(l, l * 0.1, 1 - l * 0.2);
    ctx.globalAlpha = 1;
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return { update: (arr) => { target = arr.slice(0, opts.points); while (target.length < opts.points) target.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 音乐轨道可视化 ================= */

function musicTrackVisualizer(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ tracks: 4, barCount: 32, gap: 2, colors: ['#5b4dff', '#ff4d9e', '#00e5ff', '#ffc107'] }, options);
  let data = Array.from({ length: opts.tracks }, () => Array(opts.barCount).fill(0));
  let target = Array.from({ length: opts.tracks }, () => Array(opts.barCount).fill(0));
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    ctx.clearRect(0, 0, w, h);
    const trackH = h / opts.tracks;
    data.forEach((track, tIdx) => {
      const yBase = tIdx * trackH;
      const bw = (w - (opts.barCount - 1) * opts.gap) / opts.barCount;
      track.forEach((v, i) => {
        const bh = v * trackH * 0.8;
        const x = i * (bw + opts.gap);
        const y = yBase + trackH - bh;
        ctx.fillStyle = opts.colors[tIdx % opts.colors.length];
        ctx.fillRect(x, y, bw, bh);
      });
    });
  }
  function loop() {
    for (let t = 0; t < opts.tracks; t++) {
      for (let i = 0; i < opts.barCount; i++) data[t][i] += (target[t][i] - data[t][i]) * 0.1;
    }
    draw();
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return { update: (arr2D) => { target = arr2D.map(a => { const s = a.slice(0, opts.barCount); while (s.length < opts.barCount) s.push(0); return s; }); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 音频雷达 ================= */

function audioRadar(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ rays: 60, radius: 100, color: '#5b4dff', sweepSpeed: 0.02 }, options);
  let data = Array(opts.rays).fill(0);
  let target = Array(opts.rays).fill(0);
  let sweepAngle = 0;
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    const cx = w / 2, cy = h / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < opts.rays; i++) {
      const angle = (i / opts.rays) * Math.PI * 2 - Math.PI / 2;
      const len = opts.radius + data[i] * 80;
      const x = cx + Math.cos(angle) * len;
      const y = cy + Math.sin(angle) * len;
      ctx.strokeStyle = opts.color;
      ctx.globalAlpha = 0.3 + data[i] * 0.7;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const sx = cx + Math.cos(sweepAngle) * (opts.radius + 80);
    const sy = cy + Math.sin(sweepAngle) * (opts.radius + 80);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, opts.radius + 80);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, opts.color + '44');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, opts.radius + 80, sweepAngle - 0.3, sweepAngle);
    ctx.closePath();
    ctx.fill();
  }
  function loop() {
    for (let i = 0; i < opts.rays; i++) data[i] += (target[i] - data[i]) * 0.1;
    sweepAngle += opts.sweepSpeed;
    draw();
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return { update: (arr) => { target = arr.slice(0, opts.rays); while (target.length < opts.rays) target.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 粒子文字 ================= */

function particleText(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ text: 'MUSIC', fontSize: 60, color: '#5b4dff', particleSize: 2, scatter: 30 }, options);
  let particles = [];
  let rafId;
  function init() {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.font = `bold ${opts.fontSize}px sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(opts.text, cvs.width / 2, cvs.height / 2);
    const imageData = ctx.getImageData(0, 0, cvs.width, cvs.height);
    particles = [];
    for (let y = 0; y < cvs.height; y += 4) {
      for (let x = 0; x < cvs.width; x += 4) {
        const idx = (y * cvs.width + x) * 4;
        if (imageData.data[idx + 3] > 128) {
          particles.push({
            tx: x, ty: y,
            x: x + (Math.random() - 0.5) * opts.scatter,
            y: y + (Math.random() - 0.5) * opts.scatter,
            vx: 0, vy: 0,
            size: opts.particleSize
          });
        }
      }
    }
  }
  function draw() {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.fillStyle = opts.color;
    particles.forEach(p => {
      p.vx += (p.tx - p.x) * 0.05;
      p.vy += (p.ty - p.y) * 0.05;
      p.vx *= 0.9;
      p.vy *= 0.9;
      p.x += p.vx;
      p.y += p.vy;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  function loop() {
    draw();
    rafId = requestAnimationFrame(loop);
  }
  init();
  loop();
  return { scatter: () => { particles.forEach(p => { p.x += (Math.random() - 0.5) * opts.scatter * 2; p.y += (Math.random() - 0.5) * opts.scatter * 2; }); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 能量场 ================= */

function energyField(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ rings: 8, color: '#5b4dff', speed: 0.01 }, options);
  let phase = 0;
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    const cx = w / 2, cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < opts.rings; i++) {
      const r = (i + 1) * (Math.min(w, h) / (opts.rings * 2)) + Math.sin(phase + i * 0.5) * 10;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = opts.color;
      ctx.globalAlpha = 0.1 + Math.sin(phase + i) * 0.1;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + phase;
      const r = Math.min(w, h) * 0.4;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      ctx.strokeStyle = opts.color;
      ctx.globalAlpha = 0.15;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function loop() {
    phase += opts.speed;
    draw();
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return { stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 频谱雨滴 ================= */

function spectrumRain(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ drops: 60, color: '#5b4dff', speed: 4 }, options);
  const drops = [];
  let spectrum = Array(16).fill(0);
  let target = Array(16).fill(0);
  let rafId;
  for (let i = 0; i < opts.drops; i++) {
    drops.push({ x: Math.random() * cvs.width, y: Math.random() * cvs.height, speed: Math.random() * opts.speed + 2, length: Math.random() * 20 + 10 });
  }
  function draw() {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    const maxSpec = Math.max(...spectrum);
    drops.forEach(d => {
      d.y += d.speed * (1 + maxSpec * 2);
      if (d.y > cvs.height) { d.y = -d.length; d.x = Math.random() * cvs.width; }
      ctx.strokeStyle = opts.color;
      ctx.globalAlpha = 0.3 + maxSpec * 0.7;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x, d.y + d.length);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }
  function loop() {
    for (let i = 0; i < 16; i++) spectrum[i] += (target[i] - spectrum[i]) * 0.1;
    draw();
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return { update: (arr) => { target = arr.slice(0, 16); while (target.length < 16) target.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 音阶发光 ================= */

function scaleGlow(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ notes: 12, baseRadius: 40, color: '#ffc107' }, options);
  let active = Array(opts.notes).fill(0);
  let targets = Array(opts.notes).fill(0);
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    const cx = w / 2, cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < opts.notes; i++) {
      const angle = (i / opts.notes) * Math.PI * 2 - Math.PI / 2;
      const r = opts.baseRadius + active[i] * 30;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      ctx.shadowBlur = active[i] * 20;
      ctx.shadowColor = opts.color;
      ctx.fillStyle = opts.color;
      ctx.globalAlpha = 0.3 + active[i] * 0.7;
      ctx.beginPath();
      ctx.arc(x, y, 6 + active[i] * 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
  function loop() {
    for (let i = 0; i < opts.notes; i++) active[i] += (targets[i] - active[i]) * 0.1;
    draw();
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return { update: (arr) => { targets = arr.slice(0, opts.notes); while (targets.length < opts.notes) targets.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 音频心电图 ================= */

function audioECG(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ color: '#ff5252', speed: 2, amplitude: 40 }, options);
  let buffer = [];
  let x = 0;
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.fillRect(0, 0, w, h);
    if (buffer.length < 2) return;
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 6;
    ctx.shadowColor = opts.color;
    ctx.beginPath();
    buffer.forEach((v, i) => {
      const px = i * opts.speed;
      const py = h / 2 - v * opts.amplitude;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  function loop() {
    draw();
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return { update: (val) => { buffer.push(val); if (buffer.length > cvs.width / opts.speed) buffer.shift(); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 追加动画注册 v2 ================= */

QingluanAnimations.spectrumWaveLine = spectrumWaveLine;
QingluanAnimations.spectrumWaveLineDual = spectrumWaveLineDual;
QingluanAnimations.spectrumCube3D = spectrumCube3D;
QingluanAnimations.particleExplosion = particleExplosion;
QingluanAnimations.audioLiquid = audioLiquid;
QingluanAnimations.musicDNA = musicDNA;
QingluanAnimations.spectrumRingProgress = spectrumRingProgress;
QingluanAnimations.audioFlame = audioFlame;
QingluanAnimations.retroOscilloscope = retroOscilloscope;
QingluanAnimations.soundWaveDiffusion = soundWaveDiffusion;
QingluanAnimations.spectrumWaterfall = spectrumWaterfall;
QingluanAnimations.beatStrobe = beatStrobe;
QingluanAnimations.audioWarp = audioWarp;
QingluanAnimations.spectrumHills = spectrumHills;
QingluanAnimations.musicTrackVisualizer = musicTrackVisualizer;
QingluanAnimations.audioRadar = audioRadar;
QingluanAnimations.particleText = particleText;
QingluanAnimations.energyField = energyField;
QingluanAnimations.spectrumRain = spectrumRain;
QingluanAnimations.scaleGlow = scaleGlow;
QingluanAnimations.audioECG = audioECG;

/* ================= 更多频谱条形图变体 ================= */

function spectrumBarGradient(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ barCount: 48, gap: 2, smoothing: 0.8 }, options);
  let data = Array(opts.barCount).fill(0);
  let target = Array(opts.barCount).fill(0);
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    ctx.clearRect(0, 0, w, h);
    const bw = (w - (opts.barCount - 1) * opts.gap) / opts.barCount;
    data.forEach((v, i) => {
      const bh = v * h;
      const x = i * (bw + opts.gap);
      const hue = (i / opts.barCount) * 360;
      ctx.fillStyle = `hsl(${hue}, 80%, 55%)`;
      ctx.fillRect(x, h - bh, bw, bh);
    });
  }
  function loop() { for (let i = 0; i < opts.barCount; i++) data[i] += (target[i] - data[i]) * (1 - opts.smoothing); draw(); rafId = requestAnimationFrame(loop); }
  loop();
  return { update: (arr) => { target = arr.slice(0, opts.barCount); while (target.length < opts.barCount) target.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

function spectrumBarNeon(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ barCount: 48, gap: 3, color: '#00e5ff', glow: 15, smoothing: 0.8 }, options);
  let data = Array(opts.barCount).fill(0);
  let target = Array(opts.barCount).fill(0);
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    ctx.clearRect(0, 0, w, h);
    const bw = (w - (opts.barCount - 1) * opts.gap) / opts.barCount;
    ctx.shadowBlur = opts.glow;
    ctx.shadowColor = opts.color;
    data.forEach((v, i) => {
      const bh = v * h;
      const x = i * (bw + opts.gap);
      ctx.fillStyle = opts.color;
      ctx.fillRect(x, h - bh, bw, bh);
    });
    ctx.shadowBlur = 0;
  }
  function loop() { for (let i = 0; i < opts.barCount; i++) data[i] += (target[i] - data[i]) * (1 - opts.smoothing); draw(); rafId = requestAnimationFrame(loop); }
  loop();
  return { update: (arr) => { target = arr.slice(0, opts.barCount); while (target.length < opts.barCount) target.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

function spectrumBarCylinder(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ barCount: 32, gap: 4, color: '#5b4dff', smoothing: 0.8 }, options);
  let data = Array(opts.barCount).fill(0);
  let target = Array(opts.barCount).fill(0);
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    ctx.clearRect(0, 0, w, h);
    const bw = (w - (opts.barCount - 1) * opts.gap) / opts.barCount;
    data.forEach((v, i) => {
      const bh = v * h;
      const x = i * (bw + opts.gap);
      ctx.fillStyle = opts.color;
      ctx.beginPath();
      ctx.ellipse(x + bw / 2, h - bh, bw / 2, bw / 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x, h - bh, bw, bh);
      ctx.fillStyle = opts.color + '66';
      ctx.beginPath();
      ctx.ellipse(x + bw / 2, h, bw / 2, bw / 4, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  function loop() { for (let i = 0; i < opts.barCount; i++) data[i] += (target[i] - data[i]) * (1 - opts.smoothing); draw(); rafId = requestAnimationFrame(loop); }
  loop();
  return { update: (arr) => { target = arr.slice(0, opts.barCount); while (target.length < opts.barCount) target.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 圆形波形 ================= */

function circularWaveform(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ points: 120, radius: 80, color: '#5b4dff', lineWidth: 2 }, options);
  let data = Array(opts.points).fill(0);
  let target = Array(opts.points).fill(0);
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    const cx = w / 2, cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    data.forEach((v, i) => {
      const angle = (i / opts.points) * Math.PI * 2 - Math.PI / 2;
      const r = opts.radius + v * 40;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.lineWidth;
    ctx.stroke();
    ctx.fillStyle = opts.color + '11';
    ctx.fill();
  }
  function loop() { for (let i = 0; i < opts.points; i++) data[i] += (target[i] - data[i]) * 0.1; draw(); rafId = requestAnimationFrame(loop); }
  loop();
  return { update: (arr) => { target = arr.slice(0, opts.points); while (target.length < opts.points) target.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 粒子轨迹 ================= */

function particleTrails(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ count: 60, color: '#5b4dff', length: 20 }, options);
  const particles = [];
  for (let i = 0; i < opts.count; i++) {
    particles.push({ x: Math.random() * cvs.width, y: Math.random() * cvs.height, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, history: [] });
  }
  let rafId;
  function loop() {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > cvs.width) p.vx *= -1;
      if (p.y < 0 || p.y > cvs.height) p.vy *= -1;
      p.history.push({ x: p.x, y: p.y });
      if (p.history.length > opts.length) p.history.shift();
      ctx.strokeStyle = opts.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      p.history.forEach((h, i) => { if (i === 0) ctx.moveTo(h.x, h.y); else ctx.lineTo(h.x, h.y); });
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return { stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 音频马赛克 ================= */

function audioMosaic(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ cols: 20, rows: 15, smoothing: 0.85 }, options);
  let data = Array.from({ length: opts.cols }, () => Array(opts.rows).fill(0));
  let target = Array.from({ length: opts.cols }, () => Array(opts.rows).fill(0));
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    ctx.clearRect(0, 0, w, h);
    const cw = w / opts.cols, ch = h / opts.rows;
    for (let x = 0; x < opts.cols; x++) {
      for (let y = 0; y < opts.rows; y++) {
        const v = data[x][y];
        const hue = 200 + v * 160;
        ctx.fillStyle = `hsl(${hue}, 70%, ${v * 50 + 20}%)`;
        ctx.fillRect(x * cw + 1, y * ch + 1, cw - 2, ch - 2);
      }
    }
  }
  function loop() {
    for (let x = 0; x < opts.cols; x++) {
      for (let y = 0; y < opts.rows; y++) data[x][y] += (target[x][y] - data[x][y]) * (1 - opts.smoothing);
    }
    draw();
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return { update: (arr2D) => { target = arr2D.map(a => a.slice(0, opts.rows)); while (target.length < opts.cols) target.push(Array(opts.rows).fill(0)); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 频谱龙卷风 ================= */

function spectrumTornado(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ strands: 40, radius: 60, height: 200, color: '#5b4dff', speed: 0.03 }, options);
  let data = Array(opts.strands).fill(0);
  let target = Array(opts.strands).fill(0);
  let angle = 0;
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    const cx = w / 2;
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < opts.strands; i++) {
      const t = i / opts.strands;
      const y = h - t * opts.height;
      const a = t * Math.PI * 6 + angle;
      const r = opts.radius * (1 - t) + data[i] * 40;
      const x = cx + Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const scale = 0.5 + (z + opts.radius) / (opts.radius * 2) * 0.5;
      ctx.fillStyle = opts.color;
      ctx.globalAlpha = scale * 0.8;
      ctx.beginPath();
      ctx.arc(x, y, 3 * scale + data[i] * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function loop() { for (let i = 0; i < opts.strands; i++) data[i] += (target[i] - data[i]) * 0.1; angle += opts.speed; draw(); rafId = requestAnimationFrame(loop); }
  loop();
  return { update: (arr) => { target = arr.slice(0, opts.strands); while (target.length < opts.strands) target.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 节拍网格动画 ================= */

function beatGridAnimation(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ cols: 16, rows: 8, color: '#5b4dff', smoothing: 0.85 }, options);
  let grid = Array.from({ length: opts.cols }, () => Array(opts.rows).fill(0));
  let target = Array.from({ length: opts.cols }, () => Array(opts.rows).fill(0));
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    ctx.clearRect(0, 0, w, h);
    const cw = w / opts.cols, ch = h / opts.rows;
    for (let x = 0; x < opts.cols; x++) {
      for (let y = 0; y < opts.rows; y++) {
        const v = grid[x][y];
        if (v < 0.01) continue;
        ctx.fillStyle = opts.color;
        ctx.globalAlpha = v;
        ctx.fillRect(x * cw + 1, y * ch + 1, cw - 2, ch - 2);
      }
    }
    ctx.globalAlpha = 1;
  }
  function loop() {
    for (let x = 0; x < opts.cols; x++) {
      for (let y = 0; y < opts.rows; y++) grid[x][y] += (target[x][y] - grid[x][y]) * (1 - opts.smoothing);
    }
    draw();
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return { update: (arr2D) => { target = arr2D.map(a => a.slice(0, opts.rows)); while (target.length < opts.cols) target.push(Array(opts.rows).fill(0)); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 音频频谱球 ================= */

function spectrumGlobe(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ points: 60, radius: 80, color: '#5b4dff', speed: 0.01 }, options);
  let data = Array(opts.points).fill(0);
  let target = Array(opts.points).fill(0);
  let rotation = 0;
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    const cx = w / 2, cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < opts.points; i++) {
      const lat = (i / opts.points) * Math.PI - Math.PI / 2;
      for (let j = 0; j < opts.points; j++) {
        const lon = (j / opts.points) * Math.PI * 2 + rotation;
        const r = opts.radius + data[i] * 30;
        const x = Math.cos(lat) * Math.cos(lon) * r;
        const y = Math.sin(lat) * r;
        const z = Math.cos(lat) * Math.sin(lon) * r;
        const scale = (z + opts.radius) / (opts.radius * 2);
        if (scale < 0.3) continue;
        ctx.fillStyle = opts.color;
        ctx.globalAlpha = scale * 0.8;
        ctx.beginPath();
        ctx.arc(cx + x, cy + y, 2 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  function loop() { for (let i = 0; i < opts.points; i++) data[i] += (target[i] - data[i]) * 0.1; rotation += opts.speed; draw(); rafId = requestAnimationFrame(loop); }
  loop();
  return { update: (arr) => { target = arr.slice(0, opts.points); while (target.length < opts.points) target.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 音频条纹 ================= */

function audioStripes(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ count: 20, color: '#5b4dff', speed: 1, angle: 45 }, options);
  let offset = 0;
  let intensity = 0;
  let targetIntensity = 0;
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((opts.angle * Math.PI) / 180);
    const spacing = w / opts.count;
    for (let i = -opts.count; i < opts.count * 2; i++) {
      const x = i * spacing + offset;
      const lw = spacing * 0.6 + intensity * spacing * 0.4;
      ctx.fillStyle = opts.color;
      ctx.globalAlpha = 0.3 + intensity * 0.5;
      ctx.fillRect(x, -h, lw, h * 2);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  function loop() { offset -= opts.speed * (1 + intensity); if (offset < -w / opts.count) offset = 0; intensity += (targetIntensity - intensity) * 0.1; draw(); rafId = requestAnimationFrame(loop); }
  loop();
  return { update: (v) => { targetIntensity = Math.max(0, Math.min(1, v)); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 频谱花瓣 ================= */

function spectrumPetals(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ petals: 8, radius: 60, color: '#ff4d9e', smoothing: 0.85 }, options);
  let data = Array(opts.petals).fill(0);
  let target = Array(opts.petals).fill(0);
  let angle = 0;
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    const cx = w / 2, cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < opts.petals; i++) {
      const a = (i / opts.petals) * Math.PI * 2 + angle;
      const r = opts.radius + data[i] * 50;
      ctx.fillStyle = opts.color;
      ctx.globalAlpha = 0.4 + data[i] * 0.4;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * r / 2, cy + Math.sin(a) * r / 2, r / 2, r / 4, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function loop() { for (let i = 0; i < opts.petals; i++) data[i] += (target[i] - data[i]) * 0.1; angle += 0.005; draw(); rafId = requestAnimationFrame(loop); }
  loop();
  return { update: (arr) => { target = arr.slice(0, opts.petals); while (target.length < opts.petals) target.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 声波隧道 ================= */

function soundTunnel(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ rings: 12, color: '#5b4dff', speed: 2 }, options);
  let rings = [];
  let rafId;
  function emit(intensity = 1) {
    rings.push({ r: 0, alpha: intensity, intensity });
  }
  function draw() {
    const w = cvs.width, h = cvs.height;
    const cx = w / 2, cy = h / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, w, h);
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.r += opts.speed;
      r.alpha -= 0.008;
      if (r.alpha <= 0) { rings.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(cx, cy, r.r, 0, Math.PI * 2);
      ctx.strokeStyle = opts.color;
      ctx.globalAlpha = r.alpha;
      ctx.lineWidth = 2 + r.intensity * 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r.r * 0.7, 0, Math.PI * 2);
      ctx.strokeStyle = opts.color;
      ctx.globalAlpha = r.alpha * 0.5;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function loop() { draw(); rafId = requestAnimationFrame(loop); }
  loop();
  return { emit, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 音频万花筒 ================= */

function audioKaleidoscope(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ segments: 6, radius: 100, color: '#5b4dff', smoothing: 0.9 }, options);
  let data = Array(60).fill(0);
  let target = Array(60).fill(0);
  let rotation = 0;
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    const cx = w / 2, cy = h / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    for (let s = 0; s < opts.segments; s++) {
      ctx.save();
      ctx.rotate((s / opts.segments) * Math.PI * 2);
      ctx.beginPath();
      data.forEach((v, i) => {
        const a = (i / data.length) * (Math.PI / opts.segments);
        const r = opts.radius + v * 60;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = opts.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  function loop() { for (let i = 0; i < data.length; i++) data[i] += (target[i] - data[i]) * 0.1; rotation += 0.003; draw(); rafId = requestAnimationFrame(loop); }
  loop();
  return { update: (arr) => { target = arr.slice(0, data.length); while (target.length < data.length) target.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 频谱阶梯 ================= */

function spectrumSteps(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ steps: 12, width: 200, color: '#5b4dff', smoothing: 0.85 }, options);
  let data = Array(opts.steps).fill(0);
  let target = Array(opts.steps).fill(0);
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    const cx = w / 2;
    ctx.clearRect(0, 0, w, h);
    const stepH = opts.width / opts.steps;
    data.forEach((v, i) => {
      const sw = v * opts.width;
      const y = h / 2 - opts.width / 2 + i * stepH;
      ctx.fillStyle = opts.color;
      ctx.globalAlpha = 0.3 + v * 0.7;
      ctx.fillRect(cx - sw / 2, y + 1, sw, stepH - 2);
    });
    ctx.globalAlpha = 1;
  }
  function loop() { for (let i = 0; i < opts.steps; i++) data[i] += (target[i] - data[i]) * 0.1; draw(); rafId = requestAnimationFrame(loop); }
  loop();
  return { update: (arr) => { target = arr.slice(0, opts.steps); while (target.length < opts.steps) target.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 音频气泡 ================= */

function audioBubbles(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ count: 30, color: '#5b4dff', speed: 1 }, options);
  const bubbles = [];
  for (let i = 0; i < opts.count; i++) {
    bubbles.push({ x: Math.random() * cvs.width, y: cvs.height + Math.random() * 100, r: Math.random() * 15 + 5, speed: Math.random() * 1 + 0.5, wobble: Math.random() * Math.PI * 2 });
  }
  let intensity = 0;
  let targetIntensity = 0;
  let rafId;
  function draw() {
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    bubbles.forEach(b => {
      b.y -= b.speed * (1 + intensity);
      b.wobble += 0.03;
      b.x += Math.sin(b.wobble) * 0.5;
      if (b.y < -b.r) { b.y = cvs.height + b.r; b.x = Math.random() * cvs.width; }
      ctx.strokeStyle = opts.color;
      ctx.globalAlpha = 0.3 + intensity * 0.5;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * (1 + intensity * 0.5), 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = opts.color + '22';
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  function loop() { intensity += (targetIntensity - intensity) * 0.1; draw(); rafId = requestAnimationFrame(loop); }
  loop();
  return { update: (v) => { targetIntensity = Math.max(0, Math.min(1, v)); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 频谱激光 ================= */

function spectrumLaser(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ beams: 8, color: '#ff0000', glow: 20 }, options);
  let data = Array(opts.beams).fill(0);
  let target = Array(opts.beams).fill(0);
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2;
    ctx.shadowBlur = opts.glow;
    ctx.shadowColor = opts.color;
    data.forEach((v, i) => {
      const angle = (i / opts.beams) * Math.PI - Math.PI / 2;
      const len = v * h * 0.8;
      const x1 = cx;
      const y1 = h;
      const x2 = cx + Math.cos(angle) * len;
      const y2 = h + Math.sin(angle) * len;
      ctx.strokeStyle = opts.color;
      ctx.lineWidth = 2 + v * 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
    ctx.shadowBlur = 0;
  }
  function loop() { for (let i = 0; i < opts.beams; i++) data[i] += (target[i] - data[i]) * 0.1; draw(); rafId = requestAnimationFrame(loop); }
  loop();
  return { update: (arr) => { target = arr.slice(0, opts.beams); while (target.length < opts.beams) target.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 音频沙漏 ================= */

function audioHourglass(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ points: 40, color: '#5b4dff', smoothing: 0.85 }, options);
  let data = Array(opts.points).fill(0);
  let target = Array(opts.points).fill(0);
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    const cx = w / 2, cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    data.forEach((v, i) => {
      const t = i / opts.points;
      const angle = t * Math.PI * 2;
      const r = (Math.sin(t * Math.PI) * 80 + v * 40);
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r * 0.6;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = opts.color + '18';
    ctx.fill();
  }
  function loop() { for (let i = 0; i < opts.points; i++) data[i] += (target[i] - data[i]) * 0.1; draw(); rafId = requestAnimationFrame(loop); }
  loop();
  return { update: (arr) => { target = arr.slice(0, opts.points); while (target.length < opts.points) target.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 频谱皇冠 ================= */

function spectrumCrown(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ points: 12, radius: 60, color: '#ffc107', smoothing: 0.85 }, options);
  let data = Array(opts.points).fill(0);
  let target = Array(opts.points).fill(0);
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    const cx = w / 2, cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    data.forEach((v, i) => {
      const angle = (i / opts.points) * Math.PI * 2 - Math.PI / 2;
      const r = opts.radius + v * 50;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = opts.color + '22';
    ctx.fill();
    data.forEach((v, i) => {
      const angle = (i / opts.points) * Math.PI * 2 - Math.PI / 2;
      const r = opts.radius + v * 50;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      ctx.fillStyle = opts.color;
      ctx.beginPath();
      ctx.arc(x, y, 4 + v * 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  function loop() { for (let i = 0; i < opts.points; i++) data[i] += (target[i] - data[i]) * 0.1; draw(); rafId = requestAnimationFrame(loop); }
  loop();
  return { update: (arr) => { target = arr.slice(0, opts.points); while (target.length < opts.points) target.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 音频钻石 ================= */

function audioDiamond(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ points: 4, size: 80, color: '#00e5ff', smoothing: 0.85 }, options);
  let data = Array(opts.points).fill(0);
  let target = Array(opts.points).fill(0);
  let angle = 0;
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    const cx = w / 2, cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    data.forEach((v, i) => {
      const a = (i / opts.points) * Math.PI * 2 - Math.PI / 2;
      const r = opts.size + v * 40;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = opts.color + '18';
    ctx.fill();
    ctx.restore();
  }
  function loop() { for (let i = 0; i < opts.points; i++) data[i] += (target[i] - data[i]) * 0.1; angle += 0.01; draw(); rafId = requestAnimationFrame(loop); }
  loop();
  return { update: (arr) => { target = arr.slice(0, opts.points); while (target.length < opts.points) target.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 频谱翅膀 ================= */

function spectrumWings(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ feathers: 7, span: 120, color: '#5b4dff', smoothing: 0.85 }, options);
  let data = Array(opts.feathers).fill(0);
  let target = Array(opts.feathers).fill(0);
  let flap = 0;
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    const cx = w / 2, cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    data.forEach((v, i) => {
      const t = i / opts.feathers;
      const len = opts.span * (1 - t) + v * 60;
      const yOffset = t * 60;
      const flapOffset = Math.sin(flap + t * 2) * 10;
      ctx.strokeStyle = opts.color;
      ctx.lineWidth = 2 + v * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - yOffset + flapOffset);
      ctx.quadraticCurveTo(cx + len * 0.5, cy - yOffset - len * 0.3 + flapOffset, cx + len, cy - yOffset + flapOffset);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy - yOffset + flapOffset);
      ctx.quadraticCurveTo(cx - len * 0.5, cy - yOffset - len * 0.3 + flapOffset, cx - len, cy - yOffset + flapOffset);
      ctx.stroke();
    });
  }
  function loop() { for (let i = 0; i < opts.feathers; i++) data[i] += (target[i] - data[i]) * 0.1; flap += 0.05; draw(); rafId = requestAnimationFrame(loop); }
  loop();
  return { update: (arr) => { target = arr.slice(0, opts.feathers); while (target.length < opts.feathers) target.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 音频漩涡 ================= */

function audioVortex(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ arms: 3, particles: 100, color: '#5b4dff', speed: 0.02 }, options);
  const particles = [];
  for (let i = 0; i < opts.particles; i++) {
    particles.push({ angle: Math.random() * Math.PI * 2, r: Math.random() * 100, speed: Math.random() * 2 + 1, arm: Math.floor(Math.random() * opts.arms) });
  }
  let intensity = 0;
  let targetIntensity = 0;
  let rotation = 0;
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    const cx = w / 2, cy = h / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, 0, w, h);
    particles.forEach(p => {
      p.angle += opts.speed * p.speed * (1 + intensity * 2);
      p.r += Math.sin(rotation * 2 + p.arm) * 0.5;
      if (p.r < 0) p.r = 100;
      if (p.r > 120 + intensity * 50) p.r = 0;
      const armAngle = p.arm * (Math.PI * 2 / opts.arms) + rotation;
      const x = cx + Math.cos(p.angle + armAngle) * p.r;
      const y = cy + Math.sin(p.angle + armAngle) * p.r;
      ctx.fillStyle = opts.color;
      ctx.globalAlpha = 0.5 + intensity * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, 2 + intensity * 2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  function loop() { intensity += (targetIntensity - intensity) * 0.1; rotation += 0.01; draw(); rafId = requestAnimationFrame(loop); }
  loop();
  return { update: (v) => { targetIntensity = Math.max(0, Math.min(1, v)); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 频谱心跳 ================= */

function spectrumHeartbeat(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ color: '#ff5252', speed: 3, amplitude: 40 }, options);
  let buffer = [];
  let phase = 0;
  let rafId;
  function heartbeat(t) {
    const p = t % 1;
    if (p < 0.1) return p * 10;
    if (p < 0.2) return 1 - (p - 0.1) * 10;
    if (p < 0.3) return (p - 0.2) * 5;
    if (p < 0.4) return 0.5 - (p - 0.3) * 5;
    return 0;
  }
  function draw() {
    const w = cvs.width, h = cvs.height;
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.fillRect(0, 0, w, h);
    if (buffer.length < 2) return;
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 6;
    ctx.shadowColor = opts.color;
    ctx.beginPath();
    buffer.forEach((v, i) => {
      const px = i * opts.speed;
      const py = h / 2 - v * opts.amplitude;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  function loop() {
    phase += 0.02;
    const val = heartbeat(phase);
    buffer.push(val);
    if (buffer.length > cvs.width / opts.speed) buffer.shift();
    draw();
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return { stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 追加动画注册 v3 ================= */

QingluanAnimations.spectrumBarGradient = spectrumBarGradient;
QingluanAnimations.spectrumBarNeon = spectrumBarNeon;
QingluanAnimations.spectrumBarCylinder = spectrumBarCylinder;
QingluanAnimations.circularWaveform = circularWaveform;
QingluanAnimations.particleTrails = particleTrails;
QingluanAnimations.audioMosaic = audioMosaic;
QingluanAnimations.spectrumTornado = spectrumTornado;
QingluanAnimations.beatGridAnimation = beatGridAnimation;
QingluanAnimations.spectrumGlobe = spectrumGlobe;
QingluanAnimations.audioStripes = audioStripes;
QingluanAnimations.spectrumPetals = spectrumPetals;
QingluanAnimations.soundTunnel = soundTunnel;
QingluanAnimations.audioKaleidoscope = audioKaleidoscope;
QingluanAnimations.spectrumSteps = spectrumSteps;
QingluanAnimations.audioBubbles = audioBubbles;
QingluanAnimations.spectrumLaser = spectrumLaser;
QingluanAnimations.audioHourglass = audioHourglass;
QingluanAnimations.spectrumCrown = spectrumCrown;
QingluanAnimations.audioDiamond = audioDiamond;
QingluanAnimations.spectrumWings = spectrumWings;
QingluanAnimations.audioVortex = audioVortex;
QingluanAnimations.spectrumHeartbeat = spectrumHeartbeat;

/* ================= 频谱烟花 ================= */

function spectrumFireworks(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ colors: ['#ff5252', '#ffab40', '#ffd740', '#69f0ae', '#40c4ff', '#7c4dff'], gravity: 0.1, friction: 0.98 }, options);
  let particles = [];
  let rafId;
  function launch(x, y, intensity = 1) {
    const count = Math.floor(50 * intensity);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 * intensity + 1;
      particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, decay: Math.random() * 0.01 + 0.008, size: Math.random() * 3 + 1, color: opts.colors[Math.floor(Math.random() * opts.colors.length)] });
    }
  }
  function loop() {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.vy += opts.gravity;
      p.vx *= opts.friction;
      p.vy *= opts.friction;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return { launch, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 音频雨滴冲击 ================= */

function audioRainImpact(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ drops: 40, color: '#5b4dff', splashCount: 8 }, options);
  const drops = [];
  const splashes = [];
  let rafId;
  for (let i = 0; i < opts.drops; i++) {
    drops.push({ x: Math.random() * cvs.width, y: Math.random() * cvs.height, speed: Math.random() * 5 + 3, len: Math.random() * 15 + 5 });
  }
  function draw() {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    drops.forEach(d => {
      d.y += d.speed;
      if (d.y > cvs.height) {
        d.y = -d.len;
        d.x = Math.random() * cvs.width;
        for (let s = 0; s < opts.splashCount; s++) {
          const angle = Math.random() * Math.PI;
          const speed = Math.random() * 2 + 0.5;
          splashes.push({ x: d.x, y: cvs.height, vx: Math.cos(angle) * speed, vy: -Math.sin(angle) * speed, life: 1 });
        }
      }
      ctx.strokeStyle = opts.color;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x, d.y + d.len);
      ctx.stroke();
    });
    for (let i = splashes.length - 1; i >= 0; i--) {
      const s = splashes[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.1;
      s.life -= 0.02;
      if (s.life <= 0) { splashes.splice(i, 1); continue; }
      ctx.fillStyle = opts.color;
      ctx.globalAlpha = s.life;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function loop() { draw(); rafId = requestAnimationFrame(loop); }
  loop();
  return { stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 频谱心电图多通道 ================= */

function multiChannelECG(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ channels: 4, colors: ['#ff5252', '#4caf50', '#2196f3', '#ff9800'], speed: 2, amplitude: 30 }, options);
  let buffers = Array.from({ length: opts.channels }, () => []);
  let targets = Array(opts.channels).fill(0);
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.fillRect(0, 0, w, h);
    const chH = h / opts.channels;
    buffers.forEach((buf, c) => {
      if (buf.length < 2) return;
      ctx.strokeStyle = opts.colors[c % opts.colors.length];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      buf.forEach((v, i) => {
        const px = i * opts.speed;
        const py = c * chH + chH / 2 - v * opts.amplitude;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();
    });
  }
  function loop() {
    buffers.forEach((buf, c) => { buf.push(targets[c]); if (buf.length > cvs.width / opts.speed) buf.shift(); });
    draw();
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return { update: (arr) => { targets = arr.slice(0, opts.channels); while (targets.length < opts.channels) targets.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 音频星云 ================= */

function audioNebula(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ clouds: 6, color: '#5b4dff', speed: 0.2 }, options);
  const clouds = [];
  for (let i = 0; i < opts.clouds; i++) {
    clouds.push({ x: Math.random() * cvs.width, y: Math.random() * cvs.height, r: 80 + Math.random() * 150, vx: (Math.random() - 0.5) * opts.speed, vy: (Math.random() - 0.5) * opts.speed });
  }
  let intensity = 0;
  let targetIntensity = 0;
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    ctx.fillStyle = '#02020a';
    ctx.fillRect(0, 0, w, h);
    clouds.forEach(c => {
      c.x += c.vx;
      c.y += c.vy;
      if (c.x < -c.r) c.x = w + c.r;
      if (c.x > w + c.r) c.x = -c.r;
      if (c.y < -c.r) c.y = h + c.r;
      if (c.y > h + c.r) c.y = -c.r;
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
      g.addColorStop(0, opts.color + Math.floor((0.15 + intensity * 0.25) * 255).toString(16).padStart(2, '0'));
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  function loop() { intensity += (targetIntensity - intensity) * 0.05; draw(); rafId = requestAnimationFrame(loop); }
  loop();
  return { update: (v) => { targetIntensity = Math.max(0, Math.min(1, v)); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 频谱八卦 ================= */

function spectrumBagua(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ trigrams: 8, radius: 80, color: '#ffc107', speed: 0.01 }, options);
  let data = Array(opts.trigrams).fill(0);
  let target = Array(opts.trigrams).fill(0);
  let rotation = 0;
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    const cx = w / 2, cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    data.forEach((v, i) => {
      const angle = (i / opts.trigrams) * Math.PI * 2 - Math.PI / 2;
      const r = opts.radius + v * 40;
      ctx.strokeStyle = opts.color;
      ctx.lineWidth = 4 + v * 4;
      ctx.beginPath();
      ctx.arc(0, 0, r, angle, angle + (Math.PI * 2) / opts.trigrams - 0.1);
      ctx.stroke();
    });
    ctx.restore();
  }
  function loop() { for (let i = 0; i < opts.trigrams; i++) data[i] += (target[i] - data[i]) * 0.1; rotation += opts.speed; draw(); rafId = requestAnimationFrame(loop); }
  loop();
  return { update: (arr) => { target = arr.slice(0, opts.trigrams); while (target.length < opts.trigrams) target.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 音频极光 ================= */

function audioAurora(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ bands: 5, colors: ['#00e5ff', '#5b4dff', '#ff4d9e', '#00e676', '#ffc107'], smoothing: 0.9 }, options);
  let data = Array.from({ length: opts.bands }, () => Array(40).fill(0));
  let target = Array.from({ length: opts.bands }, () => Array(40).fill(0));
  let time = 0;
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    ctx.fillStyle = 'rgba(0,5,20,0.2)';
    ctx.fillRect(0, 0, w, h);
    data.forEach((band, b) => {
      ctx.beginPath();
      band.forEach((v, i) => {
        const x = (i / (band.length - 1)) * w;
        const y = h * 0.3 + b * 30 + Math.sin(i * 0.2 + time + b) * 20 - v * 60;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = opts.colors[b % opts.colors.length];
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.4;
      ctx.stroke();
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = opts.colors[b % opts.colors.length];
      ctx.globalAlpha = 0.1;
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  function loop() {
    data.forEach((band, b) => { band.forEach((v, i) => { data[b][i] += (target[b][i] - data[b][i]) * (1 - opts.smoothing); }); });
    time += 0.02;
    draw();
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return { update: (arr2D) => { target = arr2D.map(a => { const s = a.slice(0, 40); while (s.length < 40) s.push(0); return s; }); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 频谱齿轮 ================= */

function spectrumGear(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ teeth: 12, radius: 60, color: '#5b4dff', speed: 0.02 }, options);
  let data = Array(opts.teeth).fill(0);
  let target = Array(opts.teeth).fill(0);
  let angle = 0;
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    const cx = w / 2, cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    data.forEach((v, i) => {
      const a1 = (i / opts.teeth) * Math.PI * 2;
      const a2 = ((i + 0.4) / opts.teeth) * Math.PI * 2;
      const a3 = ((i + 0.5) / opts.teeth) * Math.PI * 2;
      const a4 = ((i + 0.9) / opts.teeth) * Math.PI * 2;
      const r1 = opts.radius;
      const r2 = opts.radius + 15 + v * 30;
      if (i === 0) ctx.moveTo(Math.cos(a1) * r1, Math.sin(a1) * r1);
      ctx.lineTo(Math.cos(a1) * r2, Math.sin(a1) * r2);
      ctx.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2);
      ctx.lineTo(Math.cos(a3) * r1, Math.sin(a3) * r1);
      ctx.lineTo(Math.cos(a4) * r1, Math.sin(a4) * r1);
      ctx.lineTo(Math.cos(a4) * r2, Math.sin(a4) * r2);
    });
    ctx.closePath();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = opts.color + '18';
    ctx.fill();
    ctx.restore();
  }
  function loop() { for (let i = 0; i < opts.teeth; i++) data[i] += (target[i] - data[i]) * 0.1; angle += opts.speed; draw(); rafId = requestAnimationFrame(loop); }
  loop();
  return { update: (arr) => { target = arr.slice(0, opts.teeth); while (target.length < opts.teeth) target.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 音频彗星 ================= */

function audioComet(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ comets: 5, color: '#5b4dff', tailLength: 20 }, options);
  const comets = [];
  for (let i = 0; i < opts.comets; i++) {
    comets.push({ x: Math.random() * cvs.width, y: Math.random() * cvs.height, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, history: [] });
  }
  let intensity = 0;
  let targetIntensity = 0;
  let rafId;
  function draw() {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    comets.forEach(c => {
      c.x += c.vx * (1 + intensity);
      c.y += c.vy * (1 + intensity);
      if (c.x < 0 || c.x > cvs.width) c.vx *= -1;
      if (c.y < 0 || c.y > cvs.height) c.vy *= -1;
      c.history.push({ x: c.x, y: c.y });
      if (c.history.length > opts.tailLength) c.history.shift();
      ctx.beginPath();
      c.history.forEach((h, i) => { if (i === 0) ctx.moveTo(h.x, h.y); else ctx.lineTo(h.x, h.y); });
      ctx.strokeStyle = opts.color;
      ctx.lineWidth = 2 + intensity * 2;
      ctx.globalAlpha = 0.3 + intensity * 0.5;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 3 + intensity * 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  function loop() { intensity += (targetIntensity - intensity) * 0.1; draw(); rafId = requestAnimationFrame(loop); }
  loop();
  return { update: (v) => { targetIntensity = Math.max(0, Math.min(1, v)); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 频谱树 ================= */

function spectrumTree(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ branches: 5, depth: 4, color: '#5b4dff', angleSpread: 0.5 }, options);
  let data = Array(Math.pow(2, opts.depth)).fill(0);
  let target = Array(Math.pow(2, opts.depth)).fill(0);
  let time = 0;
  let rafId;
  function drawBranch(x, y, len, angle, depth, idx) {
    if (depth === 0) return;
    const v = data[idx] || 0;
    const endX = x + Math.cos(angle) * len;
    const endY = y + Math.sin(angle) * len;
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = depth;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    drawBranch(endX, endY, len * 0.7, angle - opts.angleSpread + Math.sin(time + idx) * 0.1 * v, depth - 1, idx * 2);
    drawBranch(endX, endY, len * 0.7, angle + opts.angleSpread + Math.sin(time + idx + 1) * 0.1 * v, depth - 1, idx * 2 + 1);
  }
  function draw() {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    drawBranch(cvs.width / 2, cvs.height, 80, -Math.PI / 2, opts.depth, 1);
  }
  function loop() { for (let i = 0; i < data.length; i++) data[i] += (target[i] - data[i]) * 0.1; time += 0.02; draw(); rafId = requestAnimationFrame(loop); }
  loop();
  return { update: (arr) => { target = arr.slice(0, data.length); while (target.length < data.length) target.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 音频流星 ================= */

function audioMeteor(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ meteors: 8, color: '#fff', speed: 0.5 }, options);
  const meteors = [];
  for (let i = 0; i < opts.meteors; i++) {
    meteors.push({ x: Math.random() * cvs.width, y: Math.random() * cvs.height * 0.5, len: Math.random() * 30 + 20, speed: Math.random() * 3 + 2, angle: Math.PI / 4 + (Math.random() - 0.5) * 0.2, active: false, timer: Math.random() * 200 });
  }
  let rafId;
  function draw() {
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    meteors.forEach(m => {
      m.timer--;
      if (m.timer <= 0) { m.active = true; }
      if (!m.active) return;
      m.x += Math.cos(m.angle) * m.speed;
      m.y += Math.sin(m.angle) * m.speed;
      const grad = ctx.createLinearGradient(m.x, m.y, m.x - Math.cos(m.angle) * m.len, m.y - Math.sin(m.angle) * m.len);
      grad.addColorStop(0, opts.color);
      grad.addColorStop(1, 'transparent');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - Math.cos(m.angle) * m.len, m.y - Math.sin(m.angle) * m.len);
      ctx.stroke();
      if (m.x > cvs.width || m.y > cvs.height) {
        m.x = Math.random() * cvs.width * 0.5;
        m.y = Math.random() * cvs.height * 0.3;
        m.active = false;
        m.timer = Math.random() * 300 + 100;
      }
    });
  }
  function loop() { draw(); rafId = requestAnimationFrame(loop); }
  loop();
  return { stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 频谱城市 ================= */

function spectrumCity(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ buildings: 30, color: '#5b4dff', smoothing: 0.85 }, options);
  let data = Array(opts.buildings).fill(0);
  let target = Array(opts.buildings).fill(0);
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    ctx.clearRect(0, 0, w, h);
    const bw = w / opts.buildings;
    data.forEach((v, i) => {
      const bh = v * h * 0.8;
      const x = i * bw;
      const y = h - bh;
      ctx.fillStyle = opts.color;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(x + 1, y, bw - 2, bh);
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = v * 0.5;
      for (let wy = y + 4; wy < h - 4; wy += 8) {
        for (let wx = x + 3; wx < x + bw - 3; wx += 6) {
          if (Math.random() > 0.7) ctx.fillRect(wx, wy, 3, 4);
        }
      }
    });
    ctx.globalAlpha = 1;
  }
  function loop() { for (let i = 0; i < opts.buildings; i++) data[i] += (target[i] - data[i]) * 0.1; draw(); rafId = requestAnimationFrame(loop); }
  loop();
  return { update: (arr) => { target = arr.slice(0, opts.buildings); while (target.length < opts.buildings) target.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 音频唱片 ================= */

function audioVinyl(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ radius: 100, grooves: 20, color: '#333', labelColor: '#5b4dff', speed: 0.01 }, options);
  let angle = 0;
  let intensity = 0;
  let targetIntensity = 0;
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    const cx = w / 2, cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.arc(cx, cy, opts.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#111';
    ctx.fill();
    ctx.strokeStyle = '#222';
    for (let i = 0; i < opts.grooves; i++) {
      const r = opts.radius * 0.3 + (i / opts.grooves) * opts.radius * 0.65;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.arc(0, 0, opts.radius * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = opts.labelColor;
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 3 + intensity * 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function loop() { angle += opts.speed * (1 + intensity); intensity += (targetIntensity - intensity) * 0.1; draw(); rafId = requestAnimationFrame(loop); }
  loop();
  return { update: (v) => { targetIntensity = Math.max(0, Math.min(1, v)); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 频谱波浪墙 ================= */

function spectrumWaveWall(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ cols: 40, rows: 20, color: '#5b4dff', smoothing: 0.9 }, options);
  let grid = Array.from({ length: opts.cols }, () => Array(opts.rows).fill(0));
  let target = Array.from({ length: opts.cols }, () => Array(opts.rows).fill(0));
  let time = 0;
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    ctx.clearRect(0, 0, w, h);
    const cw = w / opts.cols;
    const ch = h / opts.rows;
    for (let x = 0; x < opts.cols; x++) {
      for (let y = 0; y < opts.rows; y++) {
        const v = grid[x][y];
        const offset = Math.sin(x * 0.3 + time) * Math.cos(y * 0.3 + time) * 10 * v;
        ctx.fillStyle = opts.color;
        ctx.globalAlpha = 0.2 + v * 0.6;
        ctx.fillRect(x * cw + offset, y * ch + offset, cw - 2, ch - 2);
      }
    }
    ctx.globalAlpha = 1;
  }
  function loop() {
    for (let x = 0; x < opts.cols; x++) {
      for (let y = 0; y < opts.rows; y++) grid[x][y] += (target[x][y] - grid[x][y]) * (1 - opts.smoothing);
    }
    time += 0.03;
    draw();
    rafId = requestAnimationFrame(loop);
  }
  loop();
  return { update: (arr2D) => { target = arr2D.map(a => { const s = a.slice(0, opts.rows); while (s.length < opts.rows) s.push(0); return s; }); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 音频棱镜 ================= */

function audioPrism(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ rays: 7, colors: ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'], speed: 0.5 }, options);
  let offset = 0;
  let intensity = 0;
  let targetIntensity = 0;
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    const cx = w / 2, cy = h * 0.7;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, w, h);
    const triangleSize = 40;
    ctx.beginPath();
    ctx.moveTo(cx - triangleSize, cy);
    ctx.lineTo(cx + triangleSize, cy);
    ctx.lineTo(cx, cy - triangleSize * 1.5);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fill();
    opts.colors.forEach((c, i) => {
      const angle = -Math.PI / 2 + (i - 3) * 0.15;
      const len = h * 0.6 * (1 + intensity);
      ctx.strokeStyle = c;
      ctx.lineWidth = 3 + intensity * 3;
      ctx.globalAlpha = 0.3 + intensity * 0.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy - triangleSize * 0.5);
      ctx.lineTo(cx + Math.cos(angle) * len, cy - triangleSize * 0.5 + Math.sin(angle) * len);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }
  function loop() { offset += opts.speed; intensity += (targetIntensity - intensity) * 0.1; draw(); rafId = requestAnimationFrame(loop); }
  loop();
  return { update: (v) => { targetIntensity = Math.max(0, Math.min(1, v)); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 频谱传送门 ================= */

function spectrumPortal(canvas, options = {}) {
  const cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const opts = Object.assign({ rings: 12, color: '#5b4dff', speed: 0.02 }, options);
  let data = Array(opts.rings).fill(0);
  let target = Array(opts.rings).fill(0);
  let rotation = 0;
  let rafId;
  function draw() {
    const w = cvs.width, h = cvs.height;
    const cx = w / 2, cy = h / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, w, h);
    data.forEach((v, i) => {
      const r = (i + 1) * (opts.rings * 2) + v * 30;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation * (i % 2 === 0 ? 1 : -1));
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.strokeStyle = opts.color;
      ctx.lineWidth = 2 + v * 2;
      ctx.globalAlpha = 0.2 + (1 - i / opts.rings) * 0.4;
      ctx.setLineDash([10, 10]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }
  function loop() { for (let i = 0; i < opts.rings; i++) data[i] += (target[i] - data[i]) * 0.1; rotation += opts.speed; draw(); rafId = requestAnimationFrame(loop); }
  loop();
  return { update: (arr) => { target = arr.slice(0, opts.rings); while (target.length < opts.rings) target.push(0); }, stop: () => cancelAnimationFrame(rafId) };
}

/* ================= 追加动画注册 v4 ================= */

QingluanAnimations.spectrumFireworks = spectrumFireworks;
QingluanAnimations.audioRainImpact = audioRainImpact;
QingluanAnimations.multiChannelECG = multiChannelECG;
QingluanAnimations.audioNebula = audioNebula;
QingluanAnimations.spectrumBagua = spectrumBagua;
QingluanAnimations.audioAurora = audioAurora;
QingluanAnimations.spectrumGear = spectrumGear;
QingluanAnimations.audioComet = audioComet;
QingluanAnimations.spectrumTree = spectrumTree;
QingluanAnimations.audioMeteor = audioMeteor;
QingluanAnimations.spectrumCity = spectrumCity;
QingluanAnimations.audioVinyl = audioVinyl;
QingluanAnimations.spectrumWaveWall = spectrumWaveWall;
QingluanAnimations.audioPrism = audioPrism;
QingluanAnimations.spectrumPortal = spectrumPortal;

if (typeof window !== 'undefined') {
  window.QingluanAnimations = QingluanAnimations;
}

export default QingluanAnimations;
