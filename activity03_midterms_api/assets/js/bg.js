// Animated background: twinkling stars plus occasional random glitches.
// Everything lives in one fixed layer behind the page (#bg). Honors prefers-reduced-motion.
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  const bg = document.createElement('div');
  bg.id = 'bg';
  bg.setAttribute('aria-hidden', 'true');

  const stars = document.createElement('div');
  stars.className = 'bg-stars';
  const count = window.innerWidth < 700 ? 45 : 90;
  const tints = ['', '', '', 'lav', 'lav', 'gold'];
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    const big = Math.random() < 0.12;
    const size = big ? rand(2.4, 3.4) : rand(1, 2.2);
    s.className = 'star ' + pick(tints) + (big ? ' big' : '');
    s.style.cssText = `left:${rand(0, 100).toFixed(2)}%;top:${rand(0, 100).toFixed(2)}%;` +
      `width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;` +
      `--d:${rand(2.2, 6.5).toFixed(2)}s;--dl:-${rand(0, 6).toFixed(2)}s;--lo:${rand(0.08, 0.35).toFixed(2)}`;
    stars.appendChild(s);
  }
  bg.appendChild(stars);
  document.body.prepend(bg);

  function glitch() {
    if (document.hidden || reduce.matches) return;

    // Horizontal slices with an RGB split.
    const strips = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < strips; i++) {
      const el = document.createElement('div');
      el.className = 'glitch-strip';
      const w = rand(25, 100);
      el.style.cssText = `top:${rand(0, 98).toFixed(1)}%;left:${rand(0, 100 - w).toFixed(1)}%;` +
        `width:${w.toFixed(1)}%;height:${Math.round(rand(3, 36))}px;--dx:${Math.round(rand(-26, 26))}px`;
      bg.appendChild(el);
      setTimeout(() => el.remove(), 400);
    }

    // Little pixel blocks, like the squares in the window frame.
    const blocks = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < blocks; i++) {
      const el = document.createElement('div');
      el.className = 'glitch-block ' + pick(['', 'cy', 'mg']);
      const w = Math.round(rand(2, 7)) * 4;
      el.style.cssText = `top:${rand(0, 96).toFixed(1)}%;left:${rand(0, 98).toFixed(1)}%;` +
        `width:${w}px;height:${pick([4, 4, 8, 12])}px`;
      bg.appendChild(el);
      setTimeout(() => el.remove(), 400);
    }

    // The star field jolts sideways for a moment.
    stars.classList.remove('jolt');
    void stars.offsetWidth;
    stars.classList.add('jolt');
  }

  function loop() {
    glitch();
    setTimeout(loop, rand(2500, 8500));
  }
  setTimeout(loop, rand(1500, 4000));
})();
