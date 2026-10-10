/*
 * Runs inside every preview page (served by the sandbox proxy, see preview-proxy.ts). It:
 *  - reports crashes, failed script loads and blank pages to the sandbox (→ builder alerts);
 *  - implements visual editing, driven by postMessage from the builder:
 *      { type: 'sitara:mode', mode: 'off' | 'select' | 'text' }
 *    and answering with { source: 'sitara-preview', type: 'selected' | 'text-edit' | ... }.
 *
 * Elements are mapped back to source through React's dev-mode fiber `_debugSource`
 * (file/line/column of the JSX), which both the Next.js and Vite templates (React 18) provide —
 * no build plugin needed. Written as plain ES5-style JS: it is injected verbatim.
 */
export const PREVIEW_BRIDGE_SCRIPT = String.raw`
(function () {
  if (window.__sitaraBridge) return;
  window.__sitaraBridge = true;

  /* ---------------- error reporting ---------------- */
  var sent = 0;
  function report(d) {
    if (sent++ > 20) return;
    d.url = location.href;
    try { navigator.sendBeacon('/__sitara/error', JSON.stringify(d)); } catch (e) {}
  }
  window.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t !== window && (t.src || t.href)) {
      report({ kind: 'runtime', message: 'Failed to load ' + (t.src || t.href), stack: '' });
      return;
    }
    report({ kind: 'runtime', message: String(e.message || (e.error && e.error.message) || 'Error'), stack: (e.error && e.error.stack) || '' });
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    report({ kind: 'runtime', message: 'Unhandled promise rejection: ' + ((r && r.message) || String(r)), stack: (r && r.stack) || '' });
  });
  window.addEventListener('load', function () {
    setTimeout(function () {
      var root = document.getElementById('root') || document.getElementById('app') || document.getElementById('__next');
      if (root && !root.children.length && !sent) {
        report({ kind: 'runtime', message: 'The page rendered nothing (#' + root.id + ' is empty).', stack: '' });
      }
    }, 5000);
  });

  /* ---------------- visual editing ---------------- */
  var mode = 'off';
  var editing = null;
  var hoverBox = null;
  var ACCENT = '#8b5cf6';

  function post(msg) {
    // Own field: "source" is the element's code location and must not be overwritten.
    msg.from = 'sitara-preview';
    try { window.parent.postMessage(msg, '*'); } catch (e) {}
  }

  function fiberOf(el) {
    for (var key in el) {
      if (key.indexOf('__reactFiber$') === 0 || key.indexOf('__reactInternalInstance$') === 0) return el[key];
    }
    return null;
  }

  /*
   * Where this element's own JSX is written. Only the element's own fiber counts: walking up
   * to an ancestor (an earlier version did) lands on wrappers like a SmoothScroll/Providers
   * component whenever the element itself has no source — e.g. it was rendered by a Next.js
   * server component — and the AI then edits the wrong file. null lets the builder locate the
   * element by its text instead.
   */
  var STACK_FRAME = /(?:https?:\/\/[^\/\s]+)?(\/(?:src|app|components|pages|lib)\/[^?\s):]+\.(?:tsx|jsx|ts|js))(?:\?[^\s):]*)?:(\d+):(\d+)/;

  function sourceOf(el) {
    var fiber = fiberOf(el) || {};
    var s = fiber._debugSource;
    if (s && s.fileName && s.fileName.indexOf('node_modules') === -1) {
      return { file: s.fileName, line: s.lineNumber, column: s.columnNumber };
    }

    /*
     * React 19 (TanStack Start) dropped _debugSource, but keeps the stack where the element was
     * created. Its first frame inside the project names the component's file; the line number
     * refers to the dev server's transformed code, so it is only a hint (approx) — the builder
     * finds the exact lines by the element's text within that file.
     */
    var stack = fiber._debugStack && fiber._debugStack.stack;
    if (typeof stack === 'string') {
      var lines = stack.split('\n');
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].indexOf('node_modules') !== -1) continue;
        var m = lines[i].match(STACK_FRAME);
        if (m) return { file: m[1].replace(/^\//, ''), line: Number(m[2]), approx: true };
      }
    }
    return null;
  }

  function makeBox(dashed) {
    var d = document.createElement('div');
    d.setAttribute('data-sitara-overlay', '');
    d.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;display:none;border-radius:4px;' +
      'border:2px ' + (dashed ? 'dashed ' : 'solid ') + ACCENT + ';background:rgba(139,92,246,0.08);';
    var label = document.createElement('div');
    label.style.cssText = 'position:absolute;top:-22px;left:-2px;padding:2px 6px;border-radius:4px;font:11px/16px system-ui,sans-serif;' +
      'color:#fff;background:' + ACCENT + ';white-space:nowrap;max-width:320px;overflow:hidden;text-overflow:ellipsis;';
    d.appendChild(label);
    document.documentElement.appendChild(d);
    return d;
  }

  function place(box, el, text) {
    var r = el.getBoundingClientRect();
    box.style.display = 'block';
    box.style.left = r.left - 2 + 'px';
    box.style.top = r.top - 2 + 'px';
    box.style.width = r.width + 4 + 'px';
    box.style.height = r.height + 4 + 'px';
    box.firstChild.textContent = text;
    box.firstChild.style.top = r.top < 26 ? 'auto' : '-22px';
    box.firstChild.style.bottom = r.top < 26 ? '-22px' : 'auto';
  }

  function hide(box) { if (box) box.style.display = 'none'; }

  function shortFile(src) {
    if (!src) return '';
    var parts = src.file.split('/');
    return parts.slice(-2).join('/') + (src.approx ? '' : ':' + src.line);
  }

  /* Multi-select: each selection keeps its own numbered box, re-placed on scroll/resize. */
  var selections = [];
  var nextSelectionId = 1;

  function placeSelections() {
    for (var i = 0; i < selections.length; i++) {
      var s = selections[i];
      if (mode === 'off' || !document.documentElement.contains(s.el)) { hide(s.box); continue; }
      place(s.box, s.el, '#' + (i + 1) + ' · ' + describe(s.el) + '  ' + shortFile(s.source));
    }
  }

  function removeSelection(id) {
    selections = selections.filter(function (s) {
      if (s.id !== id) return true;
      s.box.remove();
      return false;
    });
    placeSelections();
  }

  function toggleSelection(el) {
    for (var i = 0; i < selections.length; i++) {
      if (selections[i].el === el) {
        var id = selections[i].id;
        removeSelection(id);
        post({ type: 'deselected', id: id });
        return;
      }
    }
    var source = sourceOf(el);
    var selection = { id: nextSelectionId++, el: el, source: source, box: makeBox(false) };
    selections.push(selection);
    placeSelections();
    post({
      type: 'selected',
      id: selection.id,
      source: source,
      tag: el.tagName.toLowerCase(),
      text: (el.innerText || '').slice(0, 400),
      html: el.outerHTML.slice(0, 1500),
    });
  }

  function describe(el) {
    var name = el.tagName.toLowerCase();
    if (el.id) name += '#' + el.id;
    return name;
  }

  function isTextOnly(el) {
    if (!el || !el.childNodes || !el.childNodes.length) return false;
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 1 && n.tagName !== 'BR') return false;
    }
    return (el.textContent || '').trim().length > 0;
  }

  function textTarget(el) {
    while (el && el !== document.body) {
      if (isTextOnly(el)) return el;
      el = el.parentElement;
    }
    return null;
  }

  function isOverlay(el) { return el && el.closest && el.closest('[data-sitara-overlay]'); }

  function onMove(e) {
    if (mode === 'off' || editing || isOverlay(e.target)) return;
    var el = mode === 'text' ? textTarget(e.target) : e.target;
    if (!el || el === document.documentElement || el === document.body) { hide(hoverBox); return; }
    hoverBox = hoverBox || makeBox(true);
    place(hoverBox, el, (mode === 'text' ? 'Edit text · ' : '') + describe(el) + '  ' + shortFile(sourceOf(el)));
  }

  function finishEdit(commit) {
    if (!editing) return;
    var ed = editing;
    editing = null;
    ed.el.removeAttribute('contenteditable');
    ed.el.style.outline = ed.outline;
    var next = ed.el.innerText;
    if (!commit) {
      ed.el.innerText = ed.old;
      return;
    }
    if (next !== ed.old) {
      post({ type: 'text-edit', source: ed.source, oldText: ed.old, newText: next, tag: ed.el.tagName.toLowerCase() });
    }
  }

  function startEdit(el) {
    // src can be null (e.g. Next.js server components): the builder then searches the project.
    var src = sourceOf(el);
    hide(hoverBox);
    editing = { el: el, old: el.innerText, source: src, outline: el.style.outline };
    el.setAttribute('contenteditable', 'true');
    el.style.outline = '2px solid ' + ACCENT;
    el.focus();
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function onClick(e) {
    if (mode === 'off' || isOverlay(e.target)) return;
    if (editing && editing.el.contains(e.target)) return; // clicks inside the field being edited
    e.preventDefault();
    e.stopPropagation();
    if (editing) { finishEdit(true); return; }

    if (mode === 'text') {
      var t = textTarget(e.target);
      if (t) startEdit(t);
      else post({ type: 'unsupported', reason: 'not-text' });
      return;
    }

    toggleSelection(e.target);
  }

  function onKey(e) {
    if (!editing) {
      if (e.key === 'Escape' && mode !== 'off') post({ type: 'escape' });
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finishEdit(true); }
    else if (e.key === 'Escape') { e.preventDefault(); finishEdit(false); }
  }

  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKey, true);
  document.addEventListener('focusout', function (e) {
    if (editing && e.target === editing.el) finishEdit(true);
  }, true);
  var placing = false;
  function schedulePlaceSelections() {
    if (placing) return;
    placing = true;
    requestAnimationFrame(function () { placing = false; placeSelections(); });
  }
  window.addEventListener('scroll', function () { hide(hoverBox); schedulePlaceSelections(); }, true);
  window.addEventListener('resize', schedulePlaceSelections);

  window.addEventListener('message', function (e) {
    if (e.source !== window.parent || !e.data || typeof e.data.type !== 'string') return;
    if (e.data.type === 'sitara:mode') {
      if (editing) finishEdit(false);
      mode = e.data.mode;
      document.documentElement.style.cursor = mode === 'off' ? '' : mode === 'text' ? 'text' : 'crosshair';
      hide(hoverBox);
      placeSelections();
    } else if (e.data.type === 'sitara:clear-selection') {
      selections.forEach(function (s) { s.box.remove(); });
      selections = [];
    } else if (e.data.type === 'sitara:remove-selection') {
      removeSelection(e.data.id);
    }
  });

  post({ type: 'ready' });
})();
`;
