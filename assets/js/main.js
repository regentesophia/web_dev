// Show a placeholder icon if an image is missing
document.querySelectorAll('.file img, .shortcut img, .details-icon img').forEach((img) => {
  const showFallback = () => {
    img.style.display = 'none';
    img.parentElement.querySelector('.fallback').style.display = 'block';
  };
  img.addEventListener('error', showFallback);
  if (img.complete && img.naturalWidth === 0) showFallback();
});

const details = document.getElementById('details');
const emptyState = details.querySelector('.details-empty');
const fileState = details.querySelector('.details-file');
const recycleDialog = document.getElementById('recycle-dialog');
const items = document.querySelectorAll('.file, .shortcut'); // window files + desktop shortcuts
const touch = window.matchMedia('(pointer: coarse)').matches;
if (touch) document.getElementById('hint').textContent = 'Tap to select';

// Only one item is selected at a time. Files fill the details pane;
// desktop shortcuts clear it.
function fillDetails(f) {
  document.getElementById('d-name').textContent = f.dataset.name;
  document.getElementById('d-type').textContent = f.dataset.type;
  document.getElementById('d-modified').textContent = f.dataset.modified;
  document.getElementById('d-desc').textContent = f.dataset.desc;
  document.getElementById('d-open').href = f.href;
  emptyState.hidden = true;
  fileState.hidden = false;
}

function resetDetails() {
  fileState.hidden = true;
  emptyState.hidden = false;
}

function select(item) {
  items.forEach((i) => i.classList.toggle('selected', i === item));
  if (item.classList.contains('file')) fillDetails(item);
  else resetDetails();
}

function deselectAll() {
  items.forEach((i) => i.classList.remove('selected'));
  resetDetails();
}

// Click selects. The second click of a double-click, the Enter key, or a tap on a
// desktop shortcut (touch screens) opens it. Links are opened by the browser itself,
// so target="_blank" gives a real new tab and nothing gets popup-blocked.
items.forEach((item) => {
  const isShortcut = item.classList.contains('shortcut');
  item.addEventListener('click', (e) => {
    select(item);
    const wantsOpen = e.detail === 2 || e.detail === 0 || (touch && isShortcut);
    if (!wantsOpen) {
      e.preventDefault();
    } else if (item.dataset.action === 'recycle') {
      e.preventDefault();
      recycleDialog.showModal();
    }
  });
  item.addEventListener('focus', () => select(item));
});

document.addEventListener('click', (e) => {
  const inside = [...items].some((i) => i.contains(e.target)) || details.contains(e.target);
  if (!inside) deselectAll();
});

// Taskbar clock
const clock = document.getElementById('clock');
const tick = () => {
  clock.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};
tick();
setInterval(tick, 30000);
