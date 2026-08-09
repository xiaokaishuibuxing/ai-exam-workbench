/* ==========================================================================
   utils.js — DOM 工具 / 格式化 / 图标 / Toast / Modal / Drawer
   全局命名空间：window.App
   ========================================================================== */
(function (global) {
  'use strict';
  const App = global.App = global.App || {};

  /* ---------------- DOM ---------------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(k => {
        const v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class' || k === 'className') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
        else node.setAttribute(k, v);
      });
    }
    (Array.isArray(children) ? children : children ? [children] : []).forEach(c => {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  /** 事件委托 */
  function delegate(root, evt, selector, handler) {
    root.addEventListener(evt, function (e) {
      const t = e.target.closest(selector);
      if (t && root.contains(t)) handler(e, t);
    });
  }

  const escapeHtml = (s) => String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  /* ---------------- 通用 ---------------- */
  const uid = (p) => (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const pct = (a, b) => (!b ? 0 : Math.round((a / b) * 100));
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => arr.slice().sort(() => Math.random() - .5);

  function debounce(fn, wait) {
    let t; return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(() => fn.apply(c, a), wait || 250); };
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function todayStr(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fmtDate(ts, withTime) {
    const d = new Date(ts);
    let s = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    if (withTime) s += ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    return s;
  }
  function fmtTime(ts) { const d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function relTime(ts) {
    const diff = (Date.now() - ts) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
    if (diff < 86400 * 7) return Math.floor(diff / 86400) + ' 天前';
    return fmtDate(ts);
  }
  function daysUntil(dateStr) {
    const t = new Date(dateStr + 'T00:00:00').getTime();
    return Math.ceil((t - new Date(todayStr() + 'T00:00:00').getTime()) / 86400000);
  }
  function fmtSize(bytes) {
    if (!bytes && bytes !== 0) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  }
  function fmtDuration(min) {
    min = Math.round(min || 0);
    if (min < 60) return min + ' 分钟';
    return Math.floor(min / 60) + ' 小时 ' + (min % 60) + ' 分';
  }
  function lastNDays(n) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); out.push(todayStr(d)); }
    return out;
  }

  /* ---------------- 图标（内联 SVG，零依赖） ---------------- */
  const PATHS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    brain: '<path d="M9.5 3A2.5 2.5 0 0 0 7 5.5v.6A3 3 0 0 0 5 9a3 3 0 0 0 .5 1.7A3 3 0 0 0 5 15a3 3 0 0 0 2.3 2.9A2.7 2.7 0 0 0 10 21a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/><path d="M14.5 3A2.5 2.5 0 0 1 17 5.5v.6A3 3 0 0 1 19 9a3 3 0 0 1-.5 1.7A3 3 0 0 1 19 15a3 3 0 0 1-2.3 2.9A2.7 2.7 0 0 1 14 21a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    arrowDown: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    trash: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    tag: '<path d="M20.6 13.4 12 22l-9-9V3h10z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
    flame: '<path d="M12 2s5 5 5 9a5 5 0 0 1-10 0c0-1.6.6-3 1.5-4.2C9 8.5 9.5 9.5 10 10c0-2 1-6 2-8z"/>',
    zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    sparkles: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
    message: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-4-.9L3 21l1.9-4.9A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4z"/>',
    send: '<path d="m22 2-7 20-4-9-9-4z"/>',
    layers: '<path d="m12 2 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    play: '<path d="m6 3 14 9-14 9z"/>',
    bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a6 6 0 0 0-4 10.5c.7.8 1 1.6 1 2.5h6c0-.9.3-1.7 1-2.5A6 6 0 0 0 12 2z"/>',
    scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M3 12h18"/>',
    graduation: '<path d="M22 10 12 5 2 10l10 5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    trophy: '<path d="M6 4h12v5a6 6 0 0 1-12 0z"/><path d="M6 6H4a2 2 0 0 0 0 4h2M18 6h2a2 2 0 0 1 0 4h-2M10 15h4M9 21h6M12 15v6"/>',
    key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.5 12.5 8-8 3 3-2 2-2-2-1.5 1.5 2 2-2.5 2.5"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
    filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    rotate: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/>'
  };

  function icon(name, size, stroke) {
    const p = PATHS[name] || PATHS.file;
    const s = size || 18;
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="' + (stroke || 1.8) + '" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  }

  /* ---------------- Toast ---------------- */
  let toastWrap = null;
  function toast(msg, type, ms) {
    if (!toastWrap) { toastWrap = el('div', { class: 'toast-wrap' }); document.body.appendChild(toastWrap); }
    const ic = type === 'success' ? 'check' : type === 'error' ? 'alert' : type === 'warn' ? 'alert' : 'sparkles';
    const node = el('div', { class: 'toast ' + (type || ''), html: icon(ic, 15) + '<span>' + escapeHtml(msg) + '</span>' });
    toastWrap.appendChild(node);
    setTimeout(() => {
      node.style.transition = 'opacity .25s, transform .25s';
      node.style.opacity = '0'; node.style.transform = 'translateY(-8px)';
      setTimeout(() => node.remove(), 260);
    }, ms || 2200);
  }

  /* ---------------- Modal ---------------- */
  function modal(opts) {
    const mask = el('div', { class: 'modal-mask' });
    const box = el('div', { class: 'modal', style: opts.width ? { width: opts.width } : null });
    box.innerHTML =
      '<div class="modal-head"><div><h2 style="font-size:17px">' + escapeHtml(opts.title || '') + '</h2>' +
      (opts.desc ? '<div class="t3 fs-12 mt-4">' + escapeHtml(opts.desc) + '</div>' : '') + '</div>' +
      '<button class="icon-btn" data-close>' + icon('x', 17) + '</button></div>' +
      '<div class="modal-body"></div><div class="modal-foot"></div>';
    const body = $('.modal-body', box), foot = $('.modal-foot', box);
    if (typeof opts.content === 'string') body.innerHTML = opts.content;
    else if (opts.content) body.appendChild(opts.content);

    const close = () => { mask.style.opacity = '0'; setTimeout(() => mask.remove(), 180); };
    (opts.actions || [{ label: '关闭', kind: 'ghost' }]).forEach(a => {
      const b = el('button', { class: 'btn btn-' + (a.kind || 'ghost'), text: a.label });
      b.onclick = () => { const r = a.onClick ? a.onClick(body, close) : true; if (r !== false) close(); };
      foot.appendChild(b);
    });
    $('[data-close]', box).onclick = close;
    mask.onclick = (e) => { if (e.target === mask) close(); };
    mask.appendChild(box); document.body.appendChild(mask);
    return { close, body, mask };
  }

  function confirmDialog(title, desc, onOk) {
    return modal({
      title, desc, width: '400px', content: '',
      actions: [{ label: '取消', kind: 'ghost' }, { label: '确定', kind: 'primary', onClick: () => { onOk && onOk(); } }]
    });
  }

  /* ---------------- Drawer ---------------- */
  function drawer(opts) {
    const mask = el('div', { class: 'drawer-mask' });
    const box = el('div', { class: 'drawer' });
    box.innerHTML =
      '<div class="drawer-head"><div style="min-width:0"><h2 style="font-size:17px" class="ellipsis">' + escapeHtml(opts.title || '') + '</h2>' +
      (opts.desc ? '<div class="t3 fs-12 mt-4">' + escapeHtml(opts.desc) + '</div>' : '') + '</div>' +
      '<button class="icon-btn" data-close>' + icon('x', 17) + '</button></div>' +
      '<div class="drawer-body"></div>' + (opts.actions ? '<div class="drawer-foot"></div>' : '');
    const body = $('.drawer-body', box);
    if (typeof opts.content === 'string') body.innerHTML = opts.content;
    else if (opts.content) body.appendChild(opts.content);

    const close = () => {
      box.style.transition = 'transform .2s'; box.style.transform = 'translateX(30px)';
      mask.style.transition = 'opacity .2s'; mask.style.opacity = '0';
      setTimeout(() => { mask.remove(); box.remove(); }, 200);
    };
    if (opts.actions) {
      const foot = $('.drawer-foot', box);
      opts.actions.forEach(a => {
        const b = el('button', { class: 'btn btn-' + (a.kind || 'ghost'), html: (a.icon ? icon(a.icon, 15) : '') + '<span>' + escapeHtml(a.label) + '</span>' });
        b.onclick = () => { const r = a.onClick ? a.onClick(body, close) : true; if (r !== false) close(); };
        foot.appendChild(b);
      });
    }
    $('[data-close]', box).onclick = close;
    mask.onclick = close;
    document.body.appendChild(mask); document.body.appendChild(box);
    return { close, body };
  }

  /* ---------------- 文件读取 ---------------- */
  function readFileAs(file, as) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      if (as === 'text') fr.readAsText(file, 'utf-8');
      else if (as === 'arraybuffer') fr.readAsArrayBuffer(file);
      else fr.readAsDataURL(file);
    });
  }

  /** 压缩图片为缩略图 dataURL（用于 localStorage 存历史） */
  function makeThumb(dataUrl, maxSide, quality) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, (maxSide || 220) / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * scale));
        c.height = Math.max(1, Math.round(img.height * scale));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        try { resolve(c.toDataURL('image/jpeg', quality || .62)); } catch (e) { resolve(dataUrl); }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  function download(filename, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: filename });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast('已复制到剪贴板', 'success'));
    } else {
      const ta = el('textarea', { style: { position: 'fixed', opacity: '0' } }); ta.value = text;
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      toast('已复制到剪贴板', 'success');
    }
  }

  App.utils = {
    $, $$, el, delegate, escapeHtml, uid, sleep, clamp, pct, rand, pick, shuffle, debounce,
    pad, todayStr, fmtDate, fmtTime, relTime, daysUntil, fmtSize, fmtDuration, lastNDays,
    icon, toast, modal, confirmDialog, drawer, readFileAs, makeThumb, download, copyText
  };
  App.icon = icon;
})(window);
