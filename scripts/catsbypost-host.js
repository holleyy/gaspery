/* ============================================================================
 * Cats by Post on the web page: the Sorting Office board.
 * Everything above this file in the bundle is the game's own source, unmodified
 * (rules, score, board animation, projection, acting, paper pieces). This host
 * only does what the game's app layer does around them: keep the tray, turn taps
 * into turntables, tick the rules every 300 ms, and draw each frame.
 * ========================================================================== */
const CatsByPostBoard = (function () {
  'use strict';
  const R = OfficeRules, BA = BOARDANIM, P = CivicProjection, ACT = CivicActing.create(BA);
  const SPRITES = __SPRITES__;
  const LEVELS = __LEVELS__;
  const CW = ['U', 'R', 'D', 'L'], TYPES = ['plain', 'ginger', 'blue'], TICK = R.GR_TICK_MS / 1000;
  const FACING = { U: 'away to the right', R: 'towards you on the right', D: 'towards you on the left', L: 'away to the left' };
  const MSG = {
    start: 'Place your turntables, then send the post.',
    running: 'The cats are on their way.',
    won: 'Delivered. Every cat is home.',
    time: 'Out of time. A cat is still travelling. Change your turntables and try again.',
    wrong: (c, b) => 'Wrong basket. A ' + c + ' cat ended up in a ' + b + ' basket. Change your turntables and try again.',
    empty: (t) => 'No ' + t + ' turntables left in the tray.',
    hint: 'Hint: one turntable is locked in place.',
    noHint: 'Every turntable a hint would give is already down. Send the post.',
    locked: 'That turntable came from a hint, so it stays where it is.',
  };
  const byDepth = (a, b) => a.depth - b.depth || a.order - b.order;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function mount(root) {
    const stage = root.querySelector('[data-stage]');
    const canvas = root.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const $ = (name) => root.querySelector('[data-' + name + ']');
    const $$ = (name) => [...root.querySelectorAll('[data-' + name + ']')];
    const plate = { w: +root.dataset.plateW, h: +root.dataset.plateH, ox: +root.dataset.originX, oy: +root.dataset.originY, hw: +root.dataset.hw };
    const k = plate.hw / P.HW;                                   // the game's floor units to plate pixels
    const MAXW = 5, MAXH = 4, NUDGE_AFTER = 3500;                    // ms of an untouched floor before the nudge
    // The slice of the plate the canvas covers: the 5 x 4 floor plus room for a cat's height.
    const reg = { x: plate.ox - MAXH * plate.hw - 120, y: plate.oy - 210, w: (MAXW + MAXH) * plate.hw + 240, h: (MAXW + MAXH) * plate.hw / 2 + 210 + 80 };
    canvas.style.left = (reg.x / plate.w * 100) + '%';
    canvas.style.top = (reg.y / plate.h * 100) + '%';
    canvas.style.width = (reg.w / plate.w * 100) + '%';
    canvas.style.height = (reg.h / plate.h * 100) + '%';

    // The few things the paper pieces ask of their renderer.
    const sheet = new Image();
    const r = {
      ctx, images: { acting: sheet }, assets: { acting: { sprites: SPRITES } },
      path(points, fill, stroke, width = 1) { ctx.beginPath(); for (let i = 0; i < points.length; i++) { const p = points[i]; if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); } ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); } },
      shadow(x, y, rx, ry, alpha = 0.13) { const old = ctx.globalAlpha; ctx.globalAlpha = old * alpha; ctx.fillStyle = '#413323'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = old; },
      label(text, p, colour = '#5e7774', size = 12) { ctx.font = '600 ' + size + 'px Signika, "Trebuchet MS", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = colour; ctx.fillText(text, p.x, p.y); },
    };
    const pieces = new CivicPieces(r);

    const g = { li: -1, L: null, chutes: [], tray: {}, sel: 'plain', mode: 'edit', sim: null, start: 0, endAt: 0, attempts: 0, hinted: false, slots: {}, cursor: null, keyboard: false, solved: new Set(), failed: false, touched: false, idleFrom: Infinity };
    const scene = { level: null, hatches: [], hatchStates: [], dogStates: [], preview: [], previewTraces: [], traces: [], poses: [], items: [] };
    let ready = false, dirty = true, lastDraw = 0, visible = true, raf = 0;

    // ---- the level ---------------------------------------------------------
    function load(i) {
      g.li = i; g.L = LEVELS[i]; g.chutes = []; g.tray = { ...g.L.tray };
      g.sel = TYPES.find((t) => g.tray[t] > 0) || 'plain';
      g.mode = 'edit'; g.sim = null; g.attempts = 0; g.hinted = false; g.failed = false; g.cursor = null;
      scene.traces = []; status(MSG.start); hud(); dirty = true;
    }
    function pieceAt(x, y) {
      const L = g.L;
      for (const p of L.hatches) if (p.x === x && p.y === y) return 'hatch';
      for (const p of L.baskets) if (p.x === x && p.y === y) return 'basket';
      for (const p of L.dogs || []) if (p.x === x && p.y === y) return 'dog';
      return null;
    }
    const chuteAt = (x, y) => g.chutes.findIndex((c) => c.x === x && c.y === y);
    function toEdit() { if (g.mode !== 'edit') { g.mode = 'edit'; g.sim = null; scene.traces = []; hud(); dirty = true; } }

    // Tap: place the selected turntable (pointing up), turn it clockwise, or after "left" pick it up.
    function tap(x, y) {
      g.touched = true;
      if (g.mode === 'running') return;
      const wasEdit = g.mode === 'edit';
      toEdit();
      if (!wasEdit) { status(MSG.start); return; }
      if (pieceAt(x, y)) return;
      const i = chuteAt(x, y);
      if (i >= 0) {
        const c = g.chutes[i], d = CW.indexOf(c.dir);
        if (c.locked) { status(MSG.locked); return; }
        if (d === 3) { g.chutes.splice(i, 1); g.tray[c.type]++; }
        else c.dir = CW[d + 1];
      } else {
        let t = g.sel;
        if (g.tray[t] <= 0) t = TYPES.find((u) => g.tray[u] > 0);
        if (!t) { status(MSG.empty(g.sel)); return; }
        g.tray[t]--; g.sel = g.tray[t] > 0 ? t : (TYPES.find((u) => g.tray[u] > 0) || t);
        g.chutes.push({ x, y, type: t, dir: 'U' });
      }
      status(MSG.start); hud(); dirty = true;
    }
    function hint() {
      g.touched = true;
      if (g.mode === 'running') return;
      toEdit();
      const res = SCORE.applyHint(g.L, g.chutes, g.tray);
      if (!res) { status(MSG.noHint); return; }
      g.chutes = res.placements; g.tray = res.tray; g.hinted = true;
      if (g.tray[g.sel] <= 0) g.sel = TYPES.find((u) => g.tray[u] > 0) || g.sel;
      g.cursor = { x: res.hint.x, y: res.hint.y };
      status(MSG.hint); hud(); dirty = true;
    }
    function clear() {
      if (g.mode === 'running') { toEdit(); status(MSG.start); return; }
      toEdit(); g.chutes = []; g.tray = { ...g.L.tray }; g.sel = TYPES.find((t) => g.tray[t] > 0) || 'plain';
      status(MSG.start); hud(); dirty = true;
    }

    // ---- the run: rules ticks become per-cat traces; boardanim poses them every frame ----
    function send() {
      g.touched = true;
      if (g.mode === 'running') { toEdit(); status(MSG.start); return; }                 // Stop
      const s = g.sim = R.grCreate(g.L, g.chutes);
      g.mode = 'running'; g.slots = {}; g.attempts++; g.endAt = Infinity;
      scene.traces = [];
      for (let i = 0; i < s.n; i++) { const tr = BA.makeTrace(s.timeLimit + 2); BA.reset(tr); tr.rel = Infinity; tr.pop = TICK; scene.traces.push(tr); }
      while (scene.poses.length < s.n) scene.poses.push(ACT.makeOut());
      g.start = performance.now();
      tickRules();
      status(MSG.running); hud(); dirty = true;
      if (reduced()) {                                                                  // no travelling: straight to the result
        while (s.outcome === R.GO_RUNNING) tickRules();
        g.start = performance.now() - (s.tick * TICK + 6) * 1000;
        finish();
      }
    }
    function tickRules() {
      const s = g.sim, t = s.tick;
      R.grTick(s);
      for (let i = 0; i < s.n; i++) {
        const tr = scene.traces[i], ev = s.ev[i];
        if (ev === R.GE_RELEASED) {
          tr.big = !!s.big[i]; tr.rel = (t + 1) * TICK; tr.tick = TICK; tr.pop = TICK; tr.hx = s.x[i]; tr.hy = s.y[i]; tr.hatchDir = s.dir[i];
          tr.ox = 0; tr.oy = 0; tr.bw = s.W; tr.bh = s.H; tr.coat = s.coat[i];
          tr.look = i & 3; tr.blinkPhase = (i * 13) % 40;
        } else if (ev === R.GE_MOVED || ev === R.GE_DELIVERED || ev === R.GE_WRONG || ev === R.GE_STUCK || ev === R.GE_TUNNEL || ev === R.GE_WAIT) {
          BA.record(tr, s.px[i], s.py[i], s.pdir[i], s.x[i], s.y[i], s.dir[i], ev, s.bounced[i]);
          BA.recordDestination(tr, s, i);
          if (ev === R.GE_DELIVERED) {                              // two cats can share a basket: the second snuggles in beside
            const key = s.x[i] + ',' + s.y[i], n = g.slots[key] | 0;
            g.slots[key] = n + 1;
            if (n > 0) { tr.homeDX = 3; tr.homeDY = -3; }
          }
        }
      }
      if (s.outcome !== R.GO_RUNNING) {
        for (let i = 0; i < s.n; i++) { const tr = scene.traces[i]; if (tr.end === BA.END_RUNNING && tr.rel !== Infinity) tr.end = BA.END_STOPPED; }
        g.endAt = (t + 1) * TICK + (s.outcome === R.GO_WON ? BA.T_NAP + 0.35 : 1.1);
      }
    }
    function finish() {
      const s = g.sim;
      g.mode = s.outcome === R.GO_WON ? 'won' : 'lost';
      if (g.mode === 'won') {
        g.stars = SCORE.stars(g.L, g.chutes.length, g.attempts, g.hinted); g.solved.add(g.li);
        status(MSG.won);
      } else if (s.outcome === R.GO_WRONG) {
        const lc = R.GR_COATS[s.coat[s.wrong]];
        status(MSG.wrong(lc, lc === 'ginger' ? 'blue' : 'ginger'));
      } else status(MSG.time);
      if (g.mode === 'lost') g.failed = true;
      hud(); dirty = true;
    }

    // ---- drawing: the middle of the game's paper renderer, without its building ----
    function prepare(elapsed, ambient, motion) {
      const L = g.L;
      if (scene.level !== L) {
        scene.level = L; pieces.prepareBoard(L.board.w, L.board.h);
        let first = 0;
        scene.hatches = L.hatches.map((h) => { const v = { ...h, first }; first += h.cats.length; return v; });
        scene.hatchStates = scene.hatches.map(() => ACT.makeHatchOut());
        scene.dogStates = (L.dogs || []).map(() => ACT.makeDogOut());
        scene.preview = scene.hatches.map((h) => { const o = ACT.makeOut(); o.anim = BA.A.IDLE; o.x = h.x * 16 + 8; o.y = h.y * 16 + 8; o.dir = o.head = R.GR_DIR[h.dir]; return o; });
        scene.previewTraces = scene.hatches.map((h) => ({ coat: (typeof h.cats[0] === 'string' ? h.cats[0] : h.cats[0].coat) === 'blue' ? 2 : 1 }));
      }
      const traces = scene.traces;
      for (let i = 0; i < traces.length; i++) ACT.sample(traces[i], elapsed, scene.poses[i]);
      for (let i = 0; i < scene.hatches.length; i++) ACT.hatch(scene.hatches[i], traces, elapsed, scene.hatchStates[i]);
      for (let i = 0; i < scene.preview.length; i++) scene.preview[i].eyes = motion && (Math.floor(ambient * 10) + i * 13) % 40 === 0 ? 1 : 0;
      for (let i = 0; i < scene.dogStates.length; i++) ACT.dog(L.dogs[i], i, scene.poses.slice(0, traces.length), motion ? ambient : 0, scene.dogStates[i]);
      pieces.motion = motion; pieces.beginFrame();
    }
    function item(kind, index, depth, order = 0) { scene.items.push({ kind, index, depth, order }); }
    function draw(now) {
      const L = g.L, B = L.board, edit = g.mode === 'edit', motion = !reduced();
      const elapsed = edit ? 0 : (now - g.start) / 1000, ambient = now / 1000;
      const sc = canvas.width / reg.w;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(sc * k, 0, 0, sc * k, (plate.ox - reg.x) * sc - 760 * k * sc, (plate.oy - reg.y) * sc - 465 * k * sc);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      prepare(elapsed, ambient, motion);
      const poses = scene.poses, traces = scene.traces;
      if (g.cursor && edit) {
        const { x, y } = g.cursor, px = 760 + (x - y) * P.HW, py = 465 + (x + y) * P.HH;
        r.path([{ x: px, y: py }, { x: px + P.HW, y: py + P.HH }, { x: px, y: py + 2 * P.HH }, { x: px - P.HW, y: py + P.HH }], '#fff7d22b', '#fff3c8', 2);
      }
      if (nudging(now)) {                                         // a first visit: the square the first turntable belongs on glows until the floor is touched
        const t = L.solution[0], px = 760 + (t.x - t.y) * P.HW, py = 465 + (t.x + t.y) * P.HH;
        const age = (now - g.idleFrom - NUDGE_AFTER) / 1000, fade = Math.min(1, age / 0.9);
        const pulse = motion ? 0.5 - 0.5 * Math.cos(age * 2.3) : 0.7;
        const tile = [{ x: px, y: py }, { x: px + P.HW, y: py + P.HH }, { x: px, y: py + 2 * P.HH }, { x: px - P.HW, y: py + P.HH }];
        ctx.globalAlpha = fade * (0.14 + 0.3 * pulse); r.path(tile, '#fff3c8');
        ctx.globalAlpha = fade * (0.45 + 0.5 * pulse); r.path(tile, null, '#fff3c8', 2.5);
        ctx.globalAlpha = 1;
      }
      for (const t of g.chutes) { let spin = 0; for (let i = 0; i < traces.length; i++) { const o = poses[i]; if (o.spinX === t.x && o.spinY === t.y) spin = Math.max(spin, o.spin); } pieces.table(t, spin); }
      for (let i = 0; i < scene.hatches.length; i++) pieces.hatch(scene.hatches[i], scene.hatchStates[i]);
      scene.items.length = 0;
      for (let i = 0; i < L.baskets.length; i++) { const b = L.baskets[i], py = 465 + (b.x + b.y + 1) * P.HH; item('basket', i, py - 2); item('basket-front', i, py + 24, 5); }
      for (let i = 0; i < (L.dogs || []).length; i++) { const d = L.dogs[i]; item('dog', i, 465 + (d.x + d.y + 1) * P.HH + 5); }
      if (edit) for (let i = 0; i < scene.hatches.length; i++) { const h = scene.hatches[i]; item('preview', i, 465 + (h.x + h.y + 1) * P.HH + 2); }
      else for (let i = 0; i < traces.length; i++) {
        const o = poses[i]; if (!o.cat.visible) continue;
        if (o.box.visible && !o.box.occupied) item('box', i, 465 + (o.boxX / 16 + o.boxY / 16) * P.HH + 1);
        item(o.cat.boxed ? 'boxed' : 'cat', i, 465 + (o.x / 16 + o.y / 16) * P.HH + 2, o.anim === BA.A.PUZZLED ? 8 : 1);
      }
      scene.items.sort(byDepth);
      for (const it of scene.items) {
        const i = it.index, o = poses[i], tr = traces[i];
        switch (it.kind) {
          case 'basket': pieces.basket(L.baskets[i]); break;
          case 'basket-front': pieces.basket(L.baskets[i], true); break;
          case 'dog': pieces.dog(L.dogs[i], i, scene.dogStates[i]); break;
          case 'preview': pieces.boxed(scene.preview[i], scene.previewTraces[i], ambient); break;
          case 'box': pieces.carrier(o.boxX, o.boxY, tr.d0[tr.n - 1], o.boxFold, o.boxFade); break;
          case 'boxed': pieces.boxed(o, tr, elapsed); break;
          case 'cat': pieces.loose(o, tr, elapsed); break;
        }
      }
      for (let i = 0; i < scene.hatches.length; i++) if (scene.hatchStates[i].open) pieces.hatchFront(scene.hatches[i]);
      // Cats still waiting their turn sit out of sight in the game's ticket rack; here a small count stands in.
      if (edit) for (const h of scene.hatches) if (h.cats.length > 1) {
        const p = P.project(h.x + 0.5, h.y + 0.5);
        r.shadow(p.x + 34, p.y - 44, 13, 13, 0.3); ctx.beginPath(); ctx.arc(p.x + 34, p.y - 46, 12, 0, Math.PI * 2); ctx.fillStyle = '#fbf3e4'; ctx.fill();
        r.label('×' + h.cats.length, { x: p.x + 34, y: p.y - 41 }, '#17392e', 14);
      }
    }
    const nudging = (now) => !!g.L.nudge && !g.touched && g.mode === 'edit' && !g.chutes.length && now - g.idleFrom > NUDGE_AFTER;
    function frame(now) {
      raf = 0;
      if (!ready || !visible) return;
      if (g.mode === 'running') {
        const s = g.sim, elapsed = (now - g.start) / 1000;
        while (s.outcome === R.GO_RUNNING && elapsed >= s.tick * TICK) tickRules();
        if (s.outcome !== R.GO_RUNNING && elapsed >= g.endAt) finish();
        dirty = true;
      }
      const settling = g.mode !== 'edit' && g.mode !== 'running' && (now - g.start) / 1000 < g.endAt + 3;
      if (dirty || settling || (!reduced() && now - lastDraw > (nudging(now) ? 30 : 100))) { draw(now); lastDraw = now; dirty = false; }
      if (!reduced() || g.mode === 'running' || dirty) raf = requestAnimationFrame(frame);
    }
    const kick = () => { if (!raf && ready && visible) raf = requestAnimationFrame(frame); };

    // ---- the tray, the buttons and the words --------------------------------
    function status(text) { const el = $('status'); if (el && el.textContent !== text) el.textContent = text; }
    function hud() {
      const L = g.L, running = g.mode === 'running', won = g.mode === 'won';
      root.dataset.mode = g.mode;
      for (const el of $$('title')) el.textContent = L.title;
      for (const el of $$('place')) el.textContent = L.label;
      for (const el of $$('idea')) el.textContent = L.idea;
      for (const b of $$('tray')) {
        const t = b.dataset.tray, has = (L.tray[t] | 0) > 0;
        b.hidden = !has; b.disabled = running || g.tray[t] <= 0;
        b.setAttribute('aria-pressed', String(g.sel === t && g.tray[t] > 0));
        const n = b.querySelector('[data-left]'); if (n) n.textContent = g.tray[t] | 0;
        b.setAttribute('aria-label', t[0].toUpperCase() + t.slice(1) + ' turntable, ' + (g.tray[t] | 0) + ' left');
      }
      const send = $('send'); if (send) send.textContent = running ? 'Stop' : g.mode === 'lost' ? 'Try again' : 'Send the post';
      const hintB = $('hint'); if (hintB) hintB.disabled = running || won;
      const clearB = $('clear'); if (clearB) clearB.disabled = running || (!g.chutes.length && g.mode === 'edit');
      const next = $('next'); if (next) { next.hidden = !won || g.li >= LEVELS.length - 1; }
      const done = $('done'); if (done) done.hidden = !(won && g.li >= LEVELS.length - 1);
      const store = $('store'); if (store) store.hidden = !(won && g.li >= LEVELS.length - 1);
      const when = g.failed && !g.hinted ? 'tried' : 'start';       // after a failed post, the how-to line gives way to the offer of a hint
      for (const el of $$('when')) el.hidden = el.dataset.when !== when;
      const stamps = $('stamps'); if (stamps) { stamps.hidden = !won; if (won) for (const el of stamps.querySelectorAll('[data-stamp]')) { const got = !!g.stars[el.dataset.stamp]; el.dataset.earned = String(got); el.setAttribute('aria-label', el.textContent.trim() + (got ? ': earned' : ': not this time')); } }
      $$('level').forEach((b) => { const i = +b.dataset.level; b.setAttribute('aria-current', String(i === g.li)); b.dataset.solved = String(g.solved.has(i)); });
      canvas.style.cursor = running ? 'default' : 'pointer';
    }
    function describe(x, y) {
      const where = 'Column ' + (x + 1) + ', row ' + (y + 1) + ': ';
      const h = g.L.hatches.find((p) => p.x === x && p.y === y);
      if (h) return where + 'a hatch with ' + h.cats.length + (h.cats.length > 1 ? ' cats' : ' ' + h.cats[0] + ' cat') + ' waiting.';
      const b = g.L.baskets.find((p) => p.x === x && p.y === y); if (b) return where + 'the ' + b.coat + ' basket.';
      if ((g.L.dogs || []).some((p) => p.x === x && p.y === y)) return where + 'a sleeping dog.';
      const c = g.chutes[chuteAt(x, y)]; if (c) return where + 'a ' + c.type + ' turntable pointing ' + FACING[c.dir] + '.';
      return where + 'empty floor.';
    }
    function tileAt(e) {
      const b = canvas.getBoundingClientRect();
      const px = reg.x + (e.clientX - b.left) / b.width * reg.w, py = reg.y + (e.clientY - b.top) / b.height * reg.h;
      return P.pick(760 + (px - plate.ox) / k, 465 + (py - plate.oy) / k, g.L.board.w, g.L.board.h);
    }
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' || g.mode === 'running') return;
      const t = tileAt(e), free = t && !pieceAt(t.x, t.y);
      const next = free ? t : null;
      if ((next && next.x) !== (g.cursor && g.cursor.x) || (next && next.y) !== (g.cursor && g.cursor.y)) { g.cursor = next; g.keyboard = false; dirty = true; }
      canvas.style.cursor = free ? 'pointer' : 'default';
    });
    canvas.addEventListener('pointerleave', () => { if (!g.keyboard && g.cursor) { g.cursor = null; dirty = true; } });
    canvas.addEventListener('click', (e) => { const t = tileAt(e); if (t) { tap(t.x, t.y); kick(); } });
    canvas.addEventListener('keydown', (e) => {
      const step = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
      if (step) {
        e.preventDefault(); const c = g.cursor || { x: 0, y: 0 }, B = g.L.board;
        g.cursor = g.cursor ? { x: Math.max(0, Math.min(B.w - 1, c.x + step[0])), y: Math.max(0, Math.min(B.h - 1, c.y + step[1])) } : c;
        g.keyboard = true; g.touched = true; status(describe(g.cursor.x, g.cursor.y)); dirty = true; kick();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault(); if (!g.cursor) g.cursor = { x: 0, y: 0 }; g.keyboard = true;
        tap(g.cursor.x, g.cursor.y); if (g.mode === 'edit') status(describe(g.cursor.x, g.cursor.y)); kick();
      } else if (e.key === 's' || e.key === 'S') { e.preventDefault(); send(); kick(); }
    });
    canvas.addEventListener('blur', () => { if (g.keyboard) { g.cursor = null; g.keyboard = false; dirty = true; kick(); } });
    root.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b || !root.contains(b)) return;
      if (b.dataset.tray) { g.touched = true; if (g.tray[b.dataset.tray] > 0) { toEdit(); g.sel = b.dataset.tray; hud(); } }
      else if ('send' in b.dataset) send();
      else if ('hint' in b.dataset) hint();
      else if ('clear' in b.dataset) clear();
      else if ('next' in b.dataset) load(g.li + 1);
      else if ('level' in b.dataset) { g.touched = true; load(+b.dataset.level); }
      else return;
      kick();
    });

    function resize() {
      const b = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 3);
      const w = Math.max(1, Math.round(b.width * dpr)), h = Math.max(1, Math.round(b.height * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; dirty = true; kick(); }
    }
    new ResizeObserver(resize).observe(stage);
    new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; kick(); }, { rootMargin: '200px' }).observe(canvas);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') kick(); });

    load(0);
    sheet.onload = () => {
      ready = true; root.dataset.ready = 'true'; g.idleFrom = performance.now(); resize(); dirty = true; kick();
      setTimeout(() => { dirty = true; kick(); }, NUDGE_AFTER + 60);    // under reduced motion nothing else would draw the nudge
    };
    sheet.src = root.dataset.sprites;
    return { load, tap, send, hint, clear, get state() { return { mode: g.mode, level: g.L.id, chutes: g.chutes.map((c) => ({ ...c })), tray: { ...g.tray }, outcome: g.sim ? g.sim.outcome : null, stars: g.stars || null }; } };
  }

  const boards = [];
  function start() { for (const el of document.querySelectorAll('[data-cbp-board]')) if (!el.dataset.mounted) { el.dataset.mounted = 'true'; boards.push(mount(el)); } }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  return { boards, LEVELS, rules: R };
})();
