/* ==========================================================================
   MINDMAP CONTENT
   Edit this object to build your own mindmap. Nothing below this block
   needs to change for content edits.

   - root: the center node. label + optional short "sub" line under it.
   - branches: array of top-level nodes connected to root. Each becomes
     visible when the root node is clicked. "hue" picks the accent color
     for that branch and its wire (blue | teal | violet | rust).
   - Each branch has an "article" object shown in the side panel when the
     branch is clicked: eyebrow (small label), title, and body (array of
     paragraph strings).
   - x / y are position offsets in pixels, relative to the root node's
     center. Adjust these to change the layout.
   ========================================================================== */
const MINDMAP_DATA = {
  root: {
    label: 'Main Topic'
  },
  branches: [
    {
      id: 'b1',
      label: 'Branch One',
      hue: 'blue',
      x: -320, y: -180,
      article: {
        eyebrow: 'Section 01',
        title: 'Branch One',
        body: [
          'Replace this with the content for your first branch.',
          'Add as many paragraphs as you need here.'
        ]
      }
    },
    {
      id: 'b2',
      label: 'Branch Two',
      hue: 'teal',
      x: 320, y: -140,
      article: {
        eyebrow: 'Section 02',
        title: 'Branch Two',
        body: [
          'Replace this with the content for your second branch.'
        ]
      }
    },
    {
      id: 'b3',
      label: 'Branch Three',
      hue: 'violet',
      x: -280, y: 190,
      article: {
        eyebrow: 'Section 03',
        title: 'Branch Three',
        body: [
          'Replace this with the content for your third branch.'
        ]
      }
    },
    {
      id: 'b4',
      label: 'Branch Four',
      hue: 'rust',
      x: 300, y: 200,
      article: {
        eyebrow: 'Section 04',
        title: 'Branch Four',
        body: [
          'Replace this with the content for your fourth branch.'
        ]
      }
    }
  ]
};

/* ==========================================================================
   Rendering + interaction
   You shouldn't need to edit below this line to change content.
   ========================================================================== */
(function () {
  'use strict';

  var WORLD_W = 3200, WORLD_H = 2200;
  var TAP_MOVE_THRESHOLD = 6;
  var ZOOM_MIN = 0.4, ZOOM_MAX = 2.2, ZOOM_STEP = 0.18;

  var world = document.getElementById('world');
  var svg = document.getElementById('connectors');
  var canvasWrap = document.getElementById('canvasWrap');
  var hint = document.getElementById('hint');
  var themeBtn = document.getElementById('themeToggle');
  var articlePanel = document.getElementById('articlePanel');
  var articleClose = document.getElementById('articleClose');
  var articleEyebrow = document.getElementById('articleEyebrow');
  var articleTitle = document.getElementById('articleTitle');
  var articleBody = document.getElementById('articleBody');
  var scrim = document.getElementById('scrim');

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // ---------- build node position list from data ----------
  var centerX = WORLD_W / 2, centerY = WORLD_H / 2;
  var rootPos = { x: centerX - 75, y: centerY - 22 };
  var branches = MINDMAP_DATA.branches.map(function (b) {
    return {
      id: b.id,
      label: b.label,
      hue: b.hue,
      article: b.article,
      x: centerX + b.x - 70,
      y: centerY + b.y - 20
    };
  });

  var rootExpanded = false;

  // ---------- view transform (pan/zoom) ----------
  var view = { x: 0, y: 0, scale: 1 };

  function applyView() {
    world.style.transform = 'translate(' + view.x + 'px,' + view.y + 'px) scale(' + view.scale + ')';
  }

  function zoomAround(clientPoint, newScale) {
    var rect = canvasWrap.getBoundingClientRect();
    var localX = clientPoint.x - rect.left, localY = clientPoint.y - rect.top;
    var worldX = (localX - view.x) / view.scale;
    var worldY = (localY - view.y) / view.scale;
    view.scale = newScale;
    view.x = localX - worldX * view.scale;
    view.y = localY - worldY * view.scale;
    applyView();
  }

  function centerOn(worldX, worldY, scale) {
    var rect = canvasWrap.getBoundingClientRect();
    view.scale = scale;
    view.x = rect.width / 2 - worldX * scale;
    view.y = rect.height / 2 - worldY * scale;
    applyView();
  }

  function fitInitial() {
    var el = document.getElementById('node-root');
    var cx = rootPos.x + (el ? el.offsetWidth / 2 : 75);
    var cy = rootPos.y + (el ? el.offsetHeight / 2 : 22);
    centerOn(cx, cy, 1);
  }

  // ---------- build node elements ----------
  function buildRootEl() {
    var el = document.createElement('div');
    el.className = 'node root';
    el.id = 'node-root';
    el.style.left = rootPos.x + 'px';
    el.style.top = rootPos.y + 'px';

    var label = document.createElement('div');
    label.className = 'label';
    label.textContent = MINDMAP_DATA.root.label;
    el.appendChild(label);

    var arrow = document.createElement('span');
    arrow.className = 'arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.innerHTML = '&#8964;';
    el.appendChild(arrow);

    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-expanded', 'false');
    el.setAttribute('aria-label', MINDMAP_DATA.root.label + ' — toggle branches');

    wireDrag(el, rootPos, function onTap() { toggleRoot(el); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRoot(el); }
    });

    return el;
  }

  function buildBranchEl(b) {
    var el = document.createElement('div');
    el.className = 'node branch';
    el.id = 'node-' + b.id;
    el.style.left = b.x + 'px';
    el.style.top = b.y + 'px';
    el.style.setProperty('--edge', 'var(--h-' + b.hue + ')');

    var label = document.createElement('div');
    label.className = 'label';
    label.textContent = b.label;
    el.appendChild(label);

    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '-1');
    el.setAttribute('aria-label', b.label + ' — open article');

    wireDrag(el, b, function onTap() { openArticle(b); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openArticle(b); }
    });

    return el;
  }

  // ---------- drag + tap detection (shared by root + branch nodes) ----------
  function wireDrag(el, posRef, onTap) {
    var pointer = null;

    el.addEventListener('pointerdown', function (e) {
      e.stopPropagation();
      el.setPointerCapture(e.pointerId);
      pointer = {
        id: e.pointerId,
        startX: e.clientX, startY: e.clientY,
        startLeft: posRef.x, startTop: posRef.y,
        moved: false
      };
      el.classList.add('dragging');
    });

    el.addEventListener('pointermove', function (e) {
      if (!pointer || e.pointerId !== pointer.id) return;
      var dx = (e.clientX - pointer.startX) / view.scale;
      var dy = (e.clientY - pointer.startY) / view.scale;
      if (Math.abs(dx) > TAP_MOVE_THRESHOLD || Math.abs(dy) > TAP_MOVE_THRESHOLD) pointer.moved = true;
      posRef.x = pointer.startLeft + dx;
      posRef.y = pointer.startTop + dy;
      el.style.left = posRef.x + 'px';
      el.style.top = posRef.y + 'px';
      updateConnectors();
    });

    function endPointer(e) {
      if (!pointer || e.pointerId !== pointer.id) return;
      el.classList.remove('dragging');
      var wasMoved = pointer.moved;
      pointer = null;
      if (!wasMoved) onTap();
    }
    el.addEventListener('pointerup', endPointer);
    el.addEventListener('pointercancel', endPointer);
  }

  // ---------- root expand/collapse ----------
  function toggleRoot(rootEl) {
    rootExpanded = !rootExpanded;
    rootEl.classList.toggle('expanded', rootExpanded);
    rootEl.setAttribute('aria-expanded', String(rootExpanded));

    branches.forEach(function (b) {
      var el = document.getElementById('node-' + b.id);
      if (el) {
        el.classList.toggle('shown', rootExpanded);
        el.setAttribute('tabindex', rootExpanded ? '0' : '-1');
      }
      var wireEls = svg.querySelectorAll('[data-branch="' + b.id + '"] .wire, [data-branch="' + b.id + '"] .pin');
      wireEls.forEach(function (w) { w.classList.toggle('shown', rootExpanded); });
    });

    if (!rootExpanded) closeArticle();
    requestAnimationFrame(updateConnectors);
  }

  // ---------- connectors (curved wires from root to each branch) ----------
  function edgePoint(el, towardX, towardY) {
    var cx = el.offsetLeft + el.offsetWidth / 2;
    var cy = el.offsetTop + el.offsetHeight / 2;
    var hw = el.offsetWidth / 2, hh = el.offsetHeight / 2;
    var dx = towardX - cx, dy = towardY - cy;
    if (dx === 0 && dy === 0) return { x: cx, y: cy };
    var sx = dx !== 0 ? hw / Math.abs(dx) : 1e6;
    var sy = dy !== 0 ? hh / Math.abs(dy) : 1e6;
    var s = Math.min(sx, sy, 1e6);
    return { x: cx + dx * s, y: cy + dy * s };
  }

  function curvePath(p1, p2) {
    var dx = p2.x - p1.x, dy = p2.y - p1.y;
    var k = Math.max(Math.abs(dx), Math.abs(dy)) * 0.35;
    var sx = dx === 0 ? 1 : (dx > 0 ? 1 : -1);
    var sy = dy === 0 ? 1 : (dy > 0 ? 1 : -1);
    var c1, c2;
    if (Math.abs(dx) >= Math.abs(dy)) {
      c1 = { x: p1.x + k * sx, y: p1.y };
      c2 = { x: p2.x - k * sx, y: p2.y };
    } else {
      c1 = { x: p1.x, y: p1.y + k * sy };
      c2 = { x: p2.x, y: p2.y - k * sy };
    }
    return 'M ' + p1.x + ' ' + p1.y + ' C ' + c1.x + ' ' + c1.y + ', ' + c2.x + ' ' + c2.y + ', ' + p2.x + ' ' + p2.y;
  }

  function buildConnectors() {
    branches.forEach(function (b) {
      var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('data-branch', b.id);

      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'wire');
      path.style.setProperty('--wire-color', 'var(--h-' + b.hue + ')');

      var pin1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pin1.setAttribute('class', 'pin'); pin1.setAttribute('r', 3.5);
      pin1.style.setProperty('--wire-color', 'var(--h-' + b.hue + ')');

      var pin2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pin2.setAttribute('class', 'pin'); pin2.setAttribute('r', 3.5);
      pin2.style.setProperty('--wire-color', 'var(--h-' + b.hue + ')');

      g.appendChild(path); g.appendChild(pin1); g.appendChild(pin2);
      svg.appendChild(g);
    });
  }

  function updateConnectors() {
    var rootEl = document.getElementById('node-root');
    if (!rootEl) return;
    var rc = { x: rootEl.offsetLeft + rootEl.offsetWidth / 2, y: rootEl.offsetTop + rootEl.offsetHeight / 2 };

    branches.forEach(function (b) {
      var bEl = document.getElementById('node-' + b.id);
      if (!bEl) return;
      var bc = { x: bEl.offsetLeft + bEl.offsetWidth / 2, y: bEl.offsetTop + bEl.offsetHeight / 2 };
      var p1 = edgePoint(rootEl, bc.x, bc.y);
      var p2 = edgePoint(bEl, rc.x, rc.y);
      var d = curvePath(p1, p2);

      var g = svg.querySelector('[data-branch="' + b.id + '"]');
      var path = g.querySelector('path');
      path.setAttribute('d', d);
      var pins = g.querySelectorAll('circle');
      pins[0].setAttribute('cx', p1.x); pins[0].setAttribute('cy', p1.y);
      pins[1].setAttribute('cx', p2.x); pins[1].setAttribute('cy', p2.y);
    });
  }

  // ---------- article side panel ----------
  var activeArticleId = null;

  function openArticle(b) {
    activeArticleId = b.id;
    articleEyebrow.textContent = b.article.eyebrow || '';
    articleEyebrow.style.color = 'var(--h-' + b.hue + ')';
    articleTitle.textContent = b.article.title || b.label;
    articleBody.innerHTML = '';
    (b.article.body || []).forEach(function (para) {
      var p = document.createElement('p');
      p.textContent = para;
      articleBody.appendChild(p);
    });

    Array.prototype.forEach.call(world.querySelectorAll('.node.branch'), function (el) {
      el.classList.toggle('selected', el.id === 'node-' + b.id);
    });

    articlePanel.classList.add('shown');
    articlePanel.setAttribute('aria-hidden', 'false');
    scrim.classList.add('shown');
  }

  function closeArticle() {
    activeArticleId = null;
    articlePanel.classList.remove('shown');
    articlePanel.setAttribute('aria-hidden', 'true');
    scrim.classList.remove('shown');
    Array.prototype.forEach.call(world.querySelectorAll('.node.branch.selected'), function (el) {
      el.classList.remove('selected');
    });
  }

  articleClose.addEventListener('click', closeArticle);
  scrim.addEventListener('click', closeArticle);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && activeArticleId) closeArticle();
  });

  // ---------- pan + pinch zoom on empty canvas ----------
  var canvasPointers = new Map();
  var panPointer = null;
  var pinch = null;

  function isCanvasBackground(target) { return target === canvasWrap || target === world || target === svg; }

  canvasWrap.addEventListener('pointerdown', function (e) {
    if (!isCanvasBackground(e.target)) return;
    canvasWrap.setPointerCapture(e.pointerId);
    canvasPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (canvasPointers.size === 1) {
      panPointer = { id: e.pointerId, startX: e.clientX, startY: e.clientY, startViewX: view.x, startViewY: view.y };
      canvasWrap.classList.add('panning');
    } else if (canvasPointers.size === 2) {
      panPointer = null;
      var pts = Array.from(canvasPointers.values());
      pinch = { startDist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), startScale: view.scale };
    }
  });

  canvasWrap.addEventListener('pointermove', function (e) {
    if (!canvasPointers.has(e.pointerId)) return;
    canvasPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (canvasPointers.size === 2 && pinch) {
      var pts = Array.from(canvasPointers.values());
      var dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      var mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      var scale = clamp(pinch.startScale * (dist / pinch.startDist), ZOOM_MIN, ZOOM_MAX);
      zoomAround(mid, scale);
    } else if (panPointer && e.pointerId === panPointer.id) {
      view.x = panPointer.startViewX + (e.clientX - panPointer.startX);
      view.y = panPointer.startViewY + (e.clientY - panPointer.startY);
      applyView();
    }
  });

  function releaseCanvasPointer(e) {
    canvasPointers.delete(e.pointerId);
    if (panPointer && e.pointerId === panPointer.id) { panPointer = null; canvasWrap.classList.remove('panning'); }
    pinch = null;
    if (canvasPointers.size === 1) {
      var remaining = Array.from(canvasPointers.entries())[0];
      panPointer = { id: remaining[0], startX: remaining[1].x, startY: remaining[1].y, startViewX: view.x, startViewY: view.y };
    }
  }
  canvasWrap.addEventListener('pointerup', releaseCanvasPointer);
  canvasWrap.addEventListener('pointercancel', releaseCanvasPointer);

  canvasWrap.addEventListener('wheel', function (e) {
    e.preventDefault();
    var factor = Math.pow(1.001, -e.deltaY);
    var newScale = clamp(view.scale * factor, ZOOM_MIN, ZOOM_MAX);
    zoomAround({ x: e.clientX, y: e.clientY }, newScale);
  }, { passive: false });

  document.getElementById('zoomIn').addEventListener('click', function () {
    var rect = canvasWrap.getBoundingClientRect();
    zoomAround({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, clamp(view.scale + ZOOM_STEP, ZOOM_MIN, ZOOM_MAX));
  });
  document.getElementById('zoomOut').addEventListener('click', function () {
    var rect = canvasWrap.getBoundingClientRect();
    zoomAround({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, clamp(view.scale - ZOOM_STEP, ZOOM_MIN, ZOOM_MAX));
  });
  document.getElementById('zoomReset').addEventListener('click', fitInitial);

  // ---------- theme ----------
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    themeBtn.innerHTML = t === 'dark' ? '&#9728;' : '&#9790;';
  }
  var currentTheme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  applyTheme(currentTheme);
  themeBtn.addEventListener('click', function () {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(currentTheme);
  });

  // ---------- init ----------
  function init() {
    world.appendChild(buildRootEl());
    branches.forEach(function (b) { world.appendChild(buildBranchEl(b)); });
    buildConnectors();
    requestAnimationFrame(updateConnectors);
    fitInitial();

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { requestAnimationFrame(updateConnectors); });
    }
    window.addEventListener('resize', function () { requestAnimationFrame(updateConnectors); });
    setTimeout(function () { hint.classList.add('hide'); }, 6000);
  }

  init();
})();
