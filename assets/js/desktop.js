// Shared desktop behavior for every page:
// working window buttons (close, minimize, maximize), a draggable title bar,
// a Start menu with a joke Shut Down screen, and a boot screen (landing page only).
// Wrapped in a function so its variables can't clash with the page's own scripts.
(() => {
  const SCRIPT_URL = document.currentScript ? document.currentScript.src : location.href;
  const siteUrl = (path) => new URL(path, SCRIPT_URL).href; // paths relative to assets/js/
  const touch = window.matchMedia('(pointer: coarse)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const win = document.querySelector('.retro-window');
  const taskbar = document.querySelector('.retro-taskbar');
  const taskBtn = taskbar && taskbar.querySelector('.task');
  const startBtn = taskbar && taskbar.querySelector('.start');

  // Replays the pop-up animation
  function popIn() {
    if (!win) return;
    win.classList.remove('pop-in');
    void win.offsetWidth; // restart the animation
    win.classList.add('pop-in');
  }

  /* ---------- Window: close, minimize, maximize, drag ---------- */
  if (win && taskBtn) {
    const titlebar = win.querySelector('.retro-titlebar');
    const maxBtn = win.querySelector('[data-win="max"]');
    let state = 'open'; // 'open' | 'minimized' | 'closed'
    let maximized = false;
    let dx = 0;
    let dy = 0;

    // Desktop icon that reopens the window after it is closed
    let nav = document.querySelector('.desktop-icons');
    if (!nav) {
      nav = document.createElement('nav');
      nav.className = 'desktop-icons desktop-icons-float';
      nav.setAttribute('aria-label', 'Desktop');
      document.body.append(nav);
    }
    const reopen = document.createElement('button');
    reopen.type = 'button';
    reopen.className = 'shortcut reopen-icon';
    reopen.hidden = true;
    const iconFile = win.dataset.icon; // optional: file in assets/, e.g. data-icon="bento_icon.png"
    reopen.innerHTML =
      (iconFile ? '<img alt="" width="56" height="56">' : '') +
      '<svg class="fallback" viewBox="0 0 16 16" aria-hidden="true">' +
      '<rect x="1" y="2" width="14" height="12" fill="#fde7e4" stroke="#2b2350" stroke-width="1"/>' +
      '<rect x="2" y="3" width="12" height="3" fill="#b7a4ec"/>' +
      '<rect x="11" y="3.5" width="2" height="2" fill="#f6a9dc"/>' +
      '<rect x="3" y="8" width="6" height="2" fill="#f6a9dc"/>' +
      '<rect x="3" y="11" width="9" height="1" fill="#9fe0c0"/></svg>' +
      '<span class="label"></span>';
    if (iconFile) {
      const img = reopen.querySelector('img');
      const fallback = reopen.querySelector('.fallback');
      fallback.style.display = 'none';
      img.addEventListener('error', () => { // icon missing: show the generic window icon
        img.style.display = 'none';
        fallback.style.display = 'block';
      });
      img.src = siteUrl('../' + iconFile);
    }
    reopen.querySelector('.label').textContent =
      win.querySelector('.retro-titlebar .name').textContent.trim();
    nav.prepend(reopen);

    const applyOffset = () => { win.style.translate = maximized ? '' : `${dx}px ${dy}px`; };

    function openWindow() {
      state = 'open';
      win.hidden = false;
      taskBtn.hidden = false;
      reopen.hidden = true;
      reopen.classList.remove('selected');
      taskBtn.setAttribute('aria-pressed', 'true');
      popIn();
    }

    function minimizeWindow() {
      state = 'minimized';
      win.hidden = true;
      taskBtn.setAttribute('aria-pressed', 'false');
    }

    function closeWindow() {
      state = 'closed';
      win.hidden = true;
      taskBtn.hidden = true;
      maximized = false;
      win.classList.remove('is-maximized');
      dx = 0;
      dy = 0;
      applyOffset();
      reopen.hidden = false;
      reopen.focus({ preventScroll: true });
    }

    function toggleMaximize() {
      maximized = !maximized;
      win.classList.toggle('is-maximized', maximized);
      if (maxBtn) maxBtn.setAttribute('aria-label', maximized ? 'Restore' : 'Maximize');
      applyOffset();
    }

    win.querySelector('[data-win="min"]').addEventListener('click', minimizeWindow);
    win.querySelector('[data-win="close"]').addEventListener('click', closeWindow);
    if (maxBtn) maxBtn.addEventListener('click', toggleMaximize);
    titlebar.addEventListener('dblclick', (e) => {
      if (!e.target.closest('.retro-winbtn')) toggleMaximize();
    });

    // Taskbar button: minimize when open, restore when minimized
    taskBtn.addEventListener('click', () => {
      if (state === 'open') minimizeWindow();
      else if (state === 'minimized') openWindow();
    });

    // Reopen icon: click selects, double-click / Enter / tap opens
    reopen.addEventListener('click', (e) => {
      reopen.classList.add('selected');
      if (e.detail >= 2 || e.detail === 0 || touch) openWindow();
    });
    document.addEventListener('click', (e) => {
      if (!reopen.contains(e.target)) reopen.classList.remove('selected');
    });

    // Dragging by the title bar (kept on screen)
    let drag = null;
    titlebar.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || maximized || e.target.closest('.retro-winbtn')) return;
      drag = { x: e.clientX, y: e.clientY, baseX: dx, baseY: dy, rect: win.getBoundingClientRect() };
      if (titlebar.setPointerCapture) titlebar.setPointerCapture(e.pointerId);
    });
    titlebar.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const keep = 80; // always leave this much of the window on screen
      const r = drag.rect;
      const minX = -(r.left + r.width - keep);
      const maxX = window.innerWidth - keep - r.left;
      const minY = -r.top;
      const maxY = Math.max(window.innerHeight - 110 - r.top, minY);
      dx = drag.baseX + Math.min(Math.max(e.clientX - drag.x, minX), maxX);
      dy = drag.baseY + Math.min(Math.max(e.clientY - drag.y, minY), maxY);
      applyOffset();
    });
    const endDrag = () => { drag = null; };
    titlebar.addEventListener('pointerup', endDrag);
    titlebar.addEventListener('pointercancel', endDrag);
    window.addEventListener('resize', () => { dx = 0; dy = 0; applyOffset(); });
  }

  /* ---------- Start menu + Shut Down ---------- */
  if (startBtn) {
    const entries = [
      { label: 'Portfolio', href: 'https://regentesophia.github.io', dot: 'pink' },
      { label: 'Web Dev Projects', href: siteUrl('../../index.html'), dot: 'lavender' },
      { label: 'activity01_bento', href: siteUrl('../../activity01_bento/index.html'), dot: 'mint' },
      { label: 'activity02_json', href: siteUrl('../../activity02_json/index.html'), dot: 'lavender' },
      'sep',
      { label: 'GitHub', href: 'https://github.com/regentesophia', dot: 'lilac', newTab: true },
      { label: 'Mail', href: 'mailto:regentesophia@gmail.com', dot: 'pink' },
      'sep',
      { label: 'Shut Down...', dot: 'ink', action: 'shutdown' },
    ];

    const menu = document.createElement('div');
    menu.className = 'start-menu';
    menu.hidden = true;
    menu.setAttribute('role', 'menu');
    entries.forEach((entry) => {
      if (entry === 'sep') {
        const sep = document.createElement('div');
        sep.className = 'start-sep';
        sep.setAttribute('role', 'separator');
        menu.append(sep);
        return;
      }
      const item = document.createElement(entry.href ? 'a' : 'button');
      item.className = 'start-item';
      item.setAttribute('role', 'menuitem');
      if (entry.href) {
        item.href = entry.href;
        if (entry.newTab) { item.target = '_blank'; item.rel = 'noopener'; }
      } else {
        item.type = 'button';
        item.dataset.action = entry.action;
      }
      const dot = document.createElement('span');
      dot.className = 'start-dot dot-' + entry.dot;
      dot.setAttribute('aria-hidden', 'true');
      const text = document.createElement('span');
      text.textContent = entry.label;
      item.append(dot, text);
      menu.append(item);
    });
    taskbar.append(menu);

    // Shut Down screen
    const shutdown = document.createElement('div');
    shutdown.className = 'shutdown';
    shutdown.hidden = true;
    shutdown.tabIndex = -1;
    shutdown.setAttribute('role', 'dialog');
    shutdown.setAttribute('aria-label', 'Shut down');
    shutdown.innerHTML =
      '<p>It is now safe to turn off your computer.</p>' +
      '<p class="small">Click or press any key to power on</p>';
    document.body.append(shutdown);

    const powerOn = () => { shutdown.hidden = true; popIn(); };
    shutdown.addEventListener('click', powerOn);
    document.addEventListener('keydown', (e) => {
      if (!shutdown.hidden && !e.repeat) powerOn();
    });

    const setMenu = (open, viaKeyboard) => {
      menu.hidden = !open;
      startBtn.setAttribute('aria-expanded', String(open));
      if (open && viaKeyboard) menu.querySelector('.start-item').focus();
    };

    startBtn.addEventListener('click', (e) => setMenu(menu.hidden, e.detail === 0));
    menu.addEventListener('click', (e) => {
      const item = e.target.closest('.start-item');
      if (!item) return;
      setMenu(false);
      if (item.dataset.action === 'shutdown') {
        shutdown.hidden = false;
        shutdown.focus();
      }
    });
    document.addEventListener('click', (e) => {
      if (!menu.hidden && !menu.contains(e.target) && !startBtn.contains(e.target)) setMenu(false);
    });
    document.addEventListener('keydown', (e) => {
      if (menu.hidden) return;
      if (e.key === 'Escape') {
        setMenu(false);
        startBtn.focus();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const items = [...menu.querySelectorAll('.start-item')];
        const i = items.indexOf(document.activeElement);
        const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
        items[next].focus();
        e.preventDefault();
      }
    });
  }

  /* ---------- Boot screen (landing page, once per browser session) ---------- */
  const boot = document.getElementById('boot');
  if (boot) {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      try { sessionStorage.setItem('webdev:booted', '1'); } catch (err) { /* ignore */ }
      boot.remove();
      document.documentElement.classList.add('booted');
      if (!reduceMotion) popIn();
    };

    if (document.documentElement.classList.contains('booted') || reduceMotion) {
      finish();
    } else {
      const fill = document.getElementById('boot-fill');
      const text = document.getElementById('boot-text');
      const messages = ['Starting up...', 'Checking memory...', 'Loading desktop...', 'Reading icons...', 'Welcome!'];
      const STEPS = 10;
      let step = 0;
      const timer = setInterval(() => {
        step += 1;
        fill.style.width = (step / STEPS) * 100 + '%';
        text.textContent = messages[Math.min(Math.floor((step / STEPS) * messages.length), messages.length - 1)];
        if (step >= STEPS) {
          clearInterval(timer);
          setTimeout(finish, 350);
        }
      }, 180);
      const skip = () => { clearInterval(timer); finish(); };
      boot.addEventListener('click', skip);
      document.addEventListener('keydown', skip, { once: true });
    }
  }
})();
