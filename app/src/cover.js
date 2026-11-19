// Vice Cover Studio render engine: draws a GTA-poster-style multi-panel cover onto any
// 2D canvas, from the editor state. All art is drawn in code — no Rockstar artwork, logos
// or fonts. Lettering is Anton (display) and Pacifico (neon script), both SIL OFL.

export const GRADES = {
  sunset:   { filter: 'saturate(1.35) contrast(1.08) sepia(0.18)', wash: ['rgba(255,94,58,0)', 'rgba(255,46,136,0.34)'], title: ['#ffd166', '#ff5e3a'], sub: '#7df9ff', sky: ['#ff5e3a', '#ff2e88', '#7b2ff7'] },
  neon:     { filter: 'saturate(1.55) contrast(1.15) hue-rotate(-14deg)', wash: ['rgba(123,47,247,0)', 'rgba(255,46,136,0.38)'], title: ['#7df9ff', '#ff2e88'], sub: '#ffd166', sky: ['#12082b', '#ff2e88', '#00e5ff'] },
  palm:     { filter: 'sepia(0.35) saturate(1.3) contrast(1.05)', wash: ['rgba(255,209,102,0)', 'rgba(255,140,40,0.30)'], title: ['#fff3c4', '#ffb347'], sub: '#5b1a00', sky: ['#ffe29a', '#ff9a3d', '#c96f2e'] },
  midnight: { filter: 'saturate(0.9) contrast(1.2) brightness(0.92)', wash: ['rgba(20,10,60,0)', 'rgba(10,10,60,0.42)'], title: ['#cfe8ff', '#7b2ff7'], sub: '#ffd166', sky: ['#0b1035', '#1c2a6b', '#3b1d5e'] },
  noir:     { filter: 'grayscale(1) contrast(1.28) brightness(1.02)', wash: ['rgba(255,255,255,0)', 'rgba(0,0,0,0.30)'], title: ['#ffffff', '#bbbbbb'], sub: '#ffffff', sky: ['#e8e8e8', '#777777', '#111111'] },
};

export const LAYOUTS = ['grid', 'hero', 'bleed', 'tilt'];
export const SIZES = { '1080x1080': [1080, 1080], '1080x1350': [1080, 1350], '1920x1080': [1920, 1080] };

/** Waits until the two display fonts are usable on canvas. */
export async function ensureFonts() {
  try {
    await Promise.all([document.fonts.load('100px Anton'), document.fonts.load('60px Pacifico')]);
  } catch { /* fall back to system fonts */ }
}

function fitRect(r, w, h) { return { x: r.x, y: r.y, w: r.w, h: r.h }; }

/** Panel rectangles (fractions of W/H) for each layout. The `title` rect is the title zone. */
export function layoutPanels(layout, W, H) {
  const g = 0.012; // gutter fraction
  if (layout === 'hero') {
    const top = 0.60, band = 0.155;
    return {
      panels: [
        { x: 0, y: 0, w: 1, h: top },
        { x: 0, y: top + g, w: 1 / 3 - g, h: 1 - top - g },
        { x: 1 / 3 + g / 2, y: top + g, w: 1 / 3 - g, h: 1 - top - g },
        { x: 2 / 3 + g / 2, y: top + g, w: 1 / 3 - g, h: 1 - top - g },
      ],
      title: { x: 0.05, y: top - band, w: 0.9, h: band },
    };
  }
  if (layout === 'bleed') {
    return { panels: [{ x: 0, y: 0, w: 1, h: 1 }], title: { x: 0.05, y: 0.68, w: 0.9, h: 0.26 } };
  }
  if (layout === 'tilt') {
    return {
      panels: [
        { x: 0.06, y: 0.30, w: 0.52, h: 0.44, tilt: -0.06 },
        { x: 0.44, y: 0.24, w: 0.52, h: 0.44, tilt: 0.05 },
        { x: 0.24, y: 0.58, w: 0.52, h: 0.38, tilt: -0.02 },
      ],
      title: { x: 0.06, y: 0.05, w: 0.88, h: 0.17 },
    };
  }
  // grid: 3x3, centre cell is the title block, 8 photo panels.
  const panels = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    if (r === 1 && c === 1) continue;
    panels.push({ x: c / 3 + (c ? g / 2 : 0), y: r / 3 + (r ? g / 2 : 0), w: 1 / 3 - g, h: 1 / 3 - g });
  }
  return { panels, title: { x: 1 / 3 + g / 2, y: 1 / 3 + g / 2, w: 1 / 3 - g, h: 1 / 3 - g } };
}

/** Draws one photo into a rect, cover-fit, with the panel's zoom and pan. */
export function drawPhotoPanel(ctx, photo, rect, grade) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (photo && photo.img) {
    const img = photo.img;
    const base = Math.max(w / img.naturalWidth, h / img.naturalHeight) * (photo.zoom || 1.0);
    const pw = img.naturalWidth * base, ph = img.naturalHeight * base;
    // Top bias: a cover-fit crop eats the top and bottom equally, which beheads people;
    // shift the photo down a little so faces stay in frame. The user's pan adds on top.
    const dx = x + (w - pw) / 2 + (photo.ox || 0) * w;
    const dy = y + (h - ph) / 2 + ph * 0.12 + (photo.oy || 0) * h;
    ctx.filter = grade.filter;
    ctx.drawImage(img, dx, dy, pw, ph);
    ctx.filter = 'none';
  } else {
    const sky = ctx.createLinearGradient(x, y, x, y + h);
    sky.addColorStop(0, grade.sky[0]); sky.addColorStop(0.55, grade.sky[1]); sky.addColorStop(1, grade.sky[2]);
    ctx.fillStyle = sky; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `bold ${Math.round(h * 0.09)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ADD A PHOTO', x + w / 2, y + h / 2);
  }
  const wash = ctx.createLinearGradient(x, y, x, y + h);
  wash.addColorStop(0, grade.wash[0]); wash.addColorStop(1, grade.wash[1]);
  ctx.fillStyle = wash; ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = Math.max(2, w * 0.006);
  ctx.strokeRect(x, y, w, h);
}

/** Bold display title with gradient fill, outline and optional halftone dots. */
export function drawTitleBlock(ctx, rect, state, grade) {
  const { x, y, w, h } = rect;
  const title = (state.title || 'NEON SHORE').toUpperCase();
  const sub = state.subtitle || '';
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const bg = ctx.createLinearGradient(x, y, x + w, y + h);
  bg.addColorStop(0, grade.sky[0]); bg.addColorStop(0.5, grade.sky[1]); bg.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
  // sun disc behind the words
  ctx.fillStyle = 'rgba(255,214,120,0.9)';
  ctx.beginPath(); ctx.arc(x + w * 0.78, y + h * 0.30, h * 0.20, 0, Math.PI * 2); ctx.fill();
  // halftone dots
  if (state.halftone) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    const step = Math.max(8, h * 0.055);
    for (let yy = y + step; yy < y + h; yy += step) {
      for (let xx = x + step; xx < x + w; xx += step) {
        const r = step * 0.16 * (1 + ((xx + yy) % 3) * 0.3);
        ctx.beginPath(); ctx.arc(xx, yy, r, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  // title, wrapped to at most two lines, fitted to the block
  const words = title.split(/\s+/);
  const lines = []; let cur = '';
  for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (t.length > 12 && cur) { lines.push(cur); cur = wd; } else cur = t; }
  if (cur) lines.push(cur);
  let size = h * (lines.length > 1 ? 0.34 : 0.44);
  const setFont = (s) => { ctx.font = `${Math.round(s)}px Anton, 'Arial Black', sans-serif`; };
  setFont(size);
  while (lines.some((ln) => ctx.measureText(ln).width > w * 0.92) && size > 10) { size -= 2; setFont(size); }
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, grade.title[0]); grad.addColorStop(1, grade.title[1]);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const lineH = size * 1.02;
  const startY = y + h / 2 - ((lines.length - 1) * lineH) / 2 - (sub ? size * 0.22 : 0);
  lines.forEach((ln, i) => {
    const cy = startY + i * lineH;
    ctx.lineWidth = Math.max(2, size * 0.07);
    ctx.strokeStyle = 'rgba(20,5,30,0.9)';
    ctx.strokeText(ln, x + w / 2, cy);
    ctx.fillStyle = grad;
    ctx.fillText(ln, x + w / 2, cy);
  });
  if (sub) {
    let subSize = h * 0.16;
    const setSub = (s) => { ctx.font = `${Math.round(s)}px Pacifico, cursive`; };
    setSub(subSize);
    while (ctx.measureText(sub).width > w * 0.92 && subSize > 10) { subSize -= 2; setSub(subSize); }
    ctx.fillStyle = grade.sub;
    ctx.shadowColor = grade.sub; ctx.shadowBlur = h * 0.06;
    ctx.fillText(sub, x + w / 2, y + h - h * 0.13);
    ctx.shadowBlur = 0;
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = Math.max(2, w * 0.006);
  ctx.strokeRect(x, y, w, h);
}

/** Tilted badge ribbon, top-right. */
export function drawBadge(ctx, W, H, text, grade) {
  if (!text) return;
  const s = Math.min(W, H);
  ctx.save();
  ctx.translate(W * 0.84, H * 0.955);
  ctx.rotate(0.05);
  ctx.font = `${Math.round(s * 0.028)}px Anton, sans-serif`;
  const tw = ctx.measureText(text.toUpperCase()).width + s * 0.05;
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(-tw / 2, -s * 0.022, tw, s * 0.044);
  ctx.fillStyle = '#14091f';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), 0, 0);
  ctx.restore();
}

function addGrain(ctx, W, H) {
  const pat = document.createElement('canvas');
  pat.width = 160; pat.height = 160;
  const p = pat.getContext('2d');
  const id = p.createImageData(160, 160);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = Math.random() * 255;
    id.data[i] = v; id.data[i + 1] = v; id.data[i + 2] = v; id.data[i + 3] = 14;
  }
  p.putImageData(id, 0, 0);
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = ctx.createPattern(pat, 'repeat');
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function addVignette(ctx, W, H) {
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

/** The whole cover. `state` carries photos, layout, grade, title, subtitle, badge and toggles. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  ctx.fillStyle = '#14091f';
  ctx.fillRect(0, 0, W, H);
  const { panels, title } = layoutPanels(state.layout || 'grid', W, H);
  const photos = state.photos || [];
  panels.forEach((p, i) => {
    const rect = { x: p.x * W, y: p.y * H, w: p.w * W, h: p.h * H };
    const photo = photos.length ? photos[(state.panelPhoto?.[i] ?? i) % photos.length] : null;
    if (p.tilt) {
      ctx.save();
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(p.tilt);
      ctx.translate(-rect.w / 2, -rect.h / 2);
      drawPhotoPanel(ctx, photo, { x: 0, y: 0, w: rect.w, h: rect.h }, grade);
      ctx.restore();
    } else {
      drawPhotoPanel(ctx, photo, rect, grade);
    }
  });
  if (state.layout !== 'bleed') {
    drawTitleBlock(ctx, { x: title.x * W, y: title.y * H, w: title.w * W, h: title.h * H }, state, grade);
  } else {
    // full-bleed: title floats over a dark band at the foot
    ctx.fillStyle = 'rgba(10,4,18,0.72)';
    ctx.fillRect(0, title.y * H, W, title.h * H);
    drawTitleBlock(ctx, { x: title.x * W, y: title.y * H, w: title.w * W, h: title.h * H }, { ...state, halftone: false }, grade);
  }
  drawBadge(ctx, W, H, state.badge, grade);
  if (state.grain) addGrain(ctx, W, H);
  if (state.vignette) addVignette(ctx, W, H);
  if (state.frame) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(6, W * 0.008);
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
  }
}

/** Renders the cover at an export size and returns the canvas. */
export function renderExport(state, sizeKey) {
  const [w, h] = SIZES[sizeKey] || SIZES['1080x1350'];
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  drawCover(c, state);
  return c;
}
