// Vice Cover Studio editor: photo slots, layout/grade pickers, per-panel crop and pan,
// caption editing and PNG export. `?shot=` scenes are in ./shots.js.
import { drawCover, renderExport, ensureFonts, layoutPanels, GRADES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const $ = (id) => document.getElementById(id);
const status = $('status');

const state = {
  photos: [],
  panelPhoto: {},
  layout: 'grid',
  grade: 'sunset',
  title: 'NEON SHORE',
  subtitle: 'vice nights, your story',
  badge: 'EST. 2026',
  grain: true,
  vignette: true,
  halftone: true,
  frame: true,
  size: '1080x1350',
};
let selectedPanel = 0;

function redraw() {
  drawCover(canvas, state);
  syncPanelControls();
}

function photoLabel(p, i) { return p.name || ('Photo ' + (i + 1)); }

/** Loads an image from a URL or object URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function addPhotoFiles(files) {
  for (const file of files) {
    try {
      const img = await loadImage(URL.createObjectURL(file));
      state.photos.push({ img, name: file.name.replace(/\.[^.]+$/, ''), zoom: 1.0, ox: 0, oy: 0 });
    } catch { status.textContent = 'Could not read ' + file.name; }
  }
  refreshPhotoUI();
  redraw();
}

async function loadSamples() {
  const names = ['boulevard', 'pier'];
  state.photos = [];
  for (const n of names) {
    try {
      const img = await loadImage('samples/' + n + '.jpg');
      state.photos.push({ img, name: n, zoom: 1.0, ox: 0, oy: 0 });
    } catch { /* a missing sample just skips */ }
  }
  refreshPhotoUI();
  redraw();
  status.textContent = state.photos.length + ' sample photos loaded — pick a layout and export.';
}

function refreshPhotoUI() {
  $('photoCount').textContent = state.photos.length
    ? state.photos.length + ' photo(s) loaded. Panels cycle through them; click a panel to aim one.'
    : 'No photos yet — add your own, or try the samples.';
  $('photoChips').innerHTML = '';
  state.photos.forEach((p, i) => {
    const chip = document.createElement('span');
    chip.textContent = (i + 1) + ' · ' + photoLabel(p, i);
    $('photoChips').appendChild(chip);
  });
  const sel = $('panelPhoto');
  sel.innerHTML = '';
  state.photos.forEach((p, i) => {
    const o = document.createElement('option');
    o.value = i; o.textContent = photoLabel(p, i);
    sel.appendChild(o);
  });
  const auto = document.createElement('option');
  auto.value = 'auto'; auto.textContent = 'Auto (cycle)';
  sel.appendChild(auto);
  sel.value = state.panelPhoto[selectedPanel] ?? 'auto';
}

function syncPanelControls() {
  const { panels } = layoutPanels(state.layout, canvas.width, canvas.height);
  const idx = Math.min(selectedPanel, panels.length - 1);
  const photo = currentPanelPhoto(idx);
  if (!photo) return;
  $('zoom').value = photo.zoom;
  $('panX').value = photo.ox;
  $('panY').value = photo.oy;
  const sel = $('panelPhoto');
  if (sel.options.length) sel.value = state.panelPhoto[idx] ?? 'auto';
}

function currentPanelPhoto(panelIdx) {
  const photos = state.photos;
  if (!photos.length) return null;
  const mapped = state.panelPhoto[panelIdx];
  return photos[(mapped ?? panelIdx) % photos.length];
}

/** Which panel (in layout order) holds canvas point (px, py)? */
function panelAt(px, py) {
  const { panels } = layoutPanels(state.layout, canvas.width, canvas.height);
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    if (px >= p.x * canvas.width && px <= (p.x + p.w) * canvas.width &&
        py >= p.y * canvas.height && py <= (p.y + p.h) * canvas.height) return i;
  }
  return 0;
}

// --- controls ---
$('photos').addEventListener('change', (e) => { addPhotoFiles(e.target.files); e.target.value = ''; });
$('samples').addEventListener('click', loadSamples);
$('fillAll').addEventListener('click', () => {
  if (!state.photos.length) { status.textContent = 'Add a photo first.'; return; }
  const { panels } = layoutPanels(state.layout, canvas.width, canvas.height);
  panels.forEach((_, i) => { state.panelPhoto[i] = 0; });
  redraw();
  status.textContent = 'Every panel now uses ' + photoLabel(state.photos[0], 0) + '.';
});

function segWire(id, key) {
  $(id).addEventListener('click', (e) => {
    const b = e.target.closest('button[data-' + key + ']');
    if (!b) return;
    [...$(id).children].forEach((c) => c.classList.remove('on'));
    b.classList.add('on');
    if (key === 'layout') { state.layout = b.dataset.layout; selectedPanel = 0; }
    if (key === 'grade') state.grade = b.dataset.grade;
    if (key === 'size') state.size = b.dataset.size;
    redraw();
  });
}
segWire('layoutSeg', 'layout');
segWire('gradeSeg', 'grade');
segWire('sizeSeg', 'size');

$('panelPhoto').addEventListener('change', (e) => {
  if (e.target.value === 'auto') delete state.panelPhoto[selectedPanel];
  else state.panelPhoto[selectedPanel] = Number(e.target.value);
  redraw();
});
$('zoom').addEventListener('input', (e) => { const p = currentPanelPhoto(selectedPanel); if (p) { p.zoom = Number(e.target.value); redraw(); } });
$('panX').addEventListener('input', (e) => { const p = currentPanelPhoto(selectedPanel); if (p) { p.ox = Number(e.target.value); redraw(); } });
$('panY').addEventListener('input', (e) => { const p = currentPanelPhoto(selectedPanel); if (p) { p.oy = Number(e.target.value); redraw(); } });
$('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
$('badge').addEventListener('input', (e) => { state.badge = e.target.value; redraw(); });
for (const [id, key] of [['grain', 'grain'], ['vignette', 'vignette'], ['halftone', 'halftone'], ['frame', 'frame']]) {
  $(id).addEventListener('change', (e) => { state[key] = e.target.checked; redraw(); });
}

// --- drag to pan, wheel to zoom, click to select a panel ---
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const r = canvas.getBoundingClientRect();
  const px = (e.clientX - r.left) * (canvas.width / r.width);
  const py = (e.clientY - r.top) * (canvas.height / r.height);
  selectedPanel = panelAt(px, py);
  drag = { x: e.clientX, y: e.clientY, ox: 0, oy: 0 };
  canvas.setPointerCapture(e.pointerId);
  syncPanelControls();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const r = canvas.getBoundingClientRect();
  const p = currentPanelPhoto(selectedPanel);
  if (!p) return;
  p.ox = Math.max(-0.5, Math.min(0.5, p.ox + (e.clientX - drag.x) / r.width));
  p.oy = Math.max(-0.5, Math.min(0.5, p.oy + (e.clientY - drag.y) / r.height));
  drag.x = e.clientX; drag.y = e.clientY;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = currentPanelPhoto(selectedPanel);
  if (!p) return;
  p.zoom = Math.max(1, Math.min(3, p.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  redraw();
}, { passive: false });

// --- export ---
function downloadCanvas(c, name) {
  c.toBlob((blob) => {
    if (!blob) { status.textContent = 'Export failed — try again.'; return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}
$('export').addEventListener('click', () => {
  const c = renderExport(state, state.size);
  downloadCanvas(c, 'vice-cover-' + state.size + '.png');
  status.textContent = 'Saved vice-cover-' + state.size + '.png';
  window.__exported = true;
});
$('exportAll').addEventListener('click', () => {
  for (const size of Object.keys({ '1080x1080': 1, '1080x1350': 1, '1920x1080': 1 })) {
    downloadCanvas(renderExport(state, size), 'vice-cover-' + size + '.png');
  }
  status.textContent = 'Saved all 3 sizes (square, portrait, wide).';
  window.__exported = true;
});

// --- boot ---
const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), state, { loadImage, loadSamples, redraw, setLayout: (l) => { state.layout = l; }, setGrade: (g) => { state.grade = g; } });
} else {
  ensureFonts().then(redraw);
  redraw();
}
window.__viceState = state;
