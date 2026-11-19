// Fixed scenes for screenshots: ?shot=cover shows an exported cover alone (landscape),
// ?shot=cover-portrait / cover-square show the other post sizes, ?shot=editor shows the
// editor with sample photos loaded. window.__shotReady is set once painted.
export async function runShot(shot, query, state, helpers) {
  const canvas = document.getElementById('cover');
  const title = document.getElementById('title');
  const subtitle = document.getElementById('subtitle');
  await helpers.loadSamples();
  state.title = query.get('caption') || 'NEON SHORE';
  state.subtitle = query.get('sub') || 'vice nights, your story';
  state.grade = query.get('grade') || 'sunset';
  state.layout = query.get('layout') || 'grid';
  if (title) title.value = state.title;
  if (subtitle) subtitle.value = state.subtitle;
  document.querySelectorAll('#gradeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.grade === state.grade));
  document.querySelectorAll('#layoutSeg button').forEach((b) => b.classList.toggle('on', b.dataset.layout === state.layout));

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    canvas.width = 1920; canvas.height = 1080;
    state.size = '1920x1080';
  } else if (shot === 'cover-portrait') {
    document.body.classList.add('shot-cover');
    canvas.width = 1080; canvas.height = 1350;
    state.size = '1080x1350';
  } else if (shot === 'cover-square') {
    document.body.classList.add('shot-cover');
    canvas.width = 1080; canvas.height = 1080;
    state.size = '1080x1080';
    state.layout = query.get('layout') || 'tilt';
    state.grade = query.get('grade') || 'palm';
  }
  // editor shot keeps the default portrait preview and the full editor chrome.
  const { ensureFonts } = await import('./cover.js');
  await ensureFonts();
  helpers.redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
