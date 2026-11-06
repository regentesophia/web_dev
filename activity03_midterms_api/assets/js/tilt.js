// Hover tilt for light cones. Any element with .tilt-zone follows the pointer; the .tilt-inner inside it
// does the actual rotating (so the hover area itself never moves and can't flicker at the edges).
// data-tilt sets the max angle in degrees (default 12). Skipped for touch screens and reduced motion.
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let cur = null;
  const set = (el, px, py, gx, gy) => {
    el.style.setProperty('--px', px);
    el.style.setProperty('--py', py);
    el.style.setProperty('--gx', gx);
    el.style.setProperty('--gy', gy);
  };
  const reset = el => { set(el, 0, 0, '50%', '50%'); el.classList.remove('tilting'); };

  document.addEventListener('pointermove', e => {
    const el = e.target.closest ? e.target.closest('.tilt-zone') : null;
    if (cur && cur !== el) reset(cur);
    cur = el;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    el.style.setProperty('--max', (Number(el.dataset.tilt) || 12) + 'deg');
    set(el, ((x - 0.5) * 2).toFixed(3), ((y - 0.5) * 2).toFixed(3), (x * 100).toFixed(1) + '%', (y * 100).toFixed(1) + '%');
    el.classList.add('tilting');
  });
  document.addEventListener('pointerout', e => {
    if (cur && !cur.contains(e.relatedTarget)) { reset(cur); cur = null; }
  });
})();
