/* ==========================================================================
   ui.js — 可复用 UI 片段 & 纯 SVG 图表（零依赖）
   所有函数返回 HTML 字符串，方便拼装
   ========================================================================== */
(function (global) {
  'use strict';
  const App = global.App;
  const U = App.utils;
  const { icon, escapeHtml } = U;
  const UI = App.ui = {};

  /* ---------------- 基础片段 ---------------- */
  UI.kpi = function (o) {
    const trendCls = o.trend > 0 ? 'up' : o.trend < 0 ? 'down' : 'flat';
    const trendIco = o.trend > 0 ? 'arrowUp' : o.trend < 0 ? 'arrowDown' : 'check';
    return '<div class="card kpi card-hover">' +
      '<div class="kpi-top"><span class="kpi-label">' + escapeHtml(o.label) + '</span>' +
      '<span class="kpi-ico" style="background:' + o.bg + ';color:' + o.color + '">' + icon(o.icon, 17) + '</span></div>' +
      '<div class="kpi-val">' + o.value + (o.unit ? '<small>' + o.unit + '</small>' : '') + '</div>' +
      '<div class="kpi-foot">' +
      (o.trend !== undefined && o.trend !== null
        ? '<span class="trend ' + trendCls + '">' + icon(trendIco, 11, 2.4) + Math.abs(o.trend) + (o.trendUnit || '%') + '</span>'
        : '') +
      '<span>' + escapeHtml(o.foot || '') + '</span></div></div>';
  };

  UI.cardHead = function (title, sub, right) {
    return '<div class="card-head"><div><h3>' + escapeHtml(title) + '</h3>' +
      (sub ? '<div class="sub">' + escapeHtml(sub) + '</div>' : '') + '</div>' +
      (right || '') + '</div>';
  };

  UI.empty = function (ico, title, desc, btn) {
    return '<div class="empty"><div class="empty-ico">' + icon(ico, 26) + '</div>' +
      '<h4>' + escapeHtml(title) + '</h4><p>' + escapeHtml(desc || '') + '</p>' + (btn || '') + '</div>';
  };

  UI.progressRow = function (name, done, total, colorCls, extra) {
    const p = U.pct(done, total);
    return '<div class="progress-row"><span class="pr-name">' + escapeHtml(name) + '</span>' +
      '<span class="flex-1"><span class="bar"><i class="' + colorCls + '" style="width:' + p + '%"></i></span></span>' +
      '<span class="pr-val">' + done + '/' + total + (extra ? ' · ' + extra : '') + '</span></div>';
  };

  UI.ring = function (percent, size, stroke, color, label, sub) {
    size = size || 108; stroke = stroke || 9;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const off = c * (1 - U.clamp(percent, 0, 100) / 100);
    return '<div class="ring-wrap" style="width:' + size + 'px;height:' + size + 'px">' +
      '<svg class="ring" width="' + size + '" height="' + size + '">' +
      '<circle class="track" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke-width="' + stroke + '"/>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke="' + (color || '#2f6bed') + '" stroke-width="' + stroke +
      '" stroke-dasharray="' + c + '" stroke-dashoffset="' + off + '" style="transition:stroke-dashoffset .9s cubic-bezier(.22,.61,.36,1)"/></svg>' +
      '<div class="ring-center"><b>' + (label !== undefined ? label : percent + '%') + '</b>' +
      (sub ? '<span>' + escapeHtml(sub) + '</span>' : '') + '</div></div>';
  };

  UI.tags = function (arr, cls) {
    return (arr || []).map(t => '<span class="tag ' + (cls || 'tag-outline') + '">' + escapeHtml(t) + '</span>').join('');
  };

  UI.fileIconClass = function (ext) {
    ext = (ext || '').toLowerCase();
    if (ext === 'pdf') return ['fi-pdf', 'PDF'];
    if (['doc', 'docx', 'wps'].indexOf(ext) > -1) return ['fi-doc', 'DOC'];
    if (['txt', 'log', 'csv'].indexOf(ext) > -1) return ['fi-txt', 'TXT'];
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].indexOf(ext) > -1) return ['fi-img', 'IMG'];
    if (['md', 'markdown'].indexOf(ext) > -1) return ['fi-md', 'MD'];
    return ['fi-oth', (ext || '?').slice(0, 3).toUpperCase()];
  };

  /* ---------------- SVG 折线 / 面积图 ---------------- */
  UI.lineChart = function (opt) {
    const w = opt.width || 640, h = opt.height || 200;
    const pad = { l: 34, r: 12, t: 14, b: 26 };
    const data = opt.data || [];
    const labels = opt.labels || [];
    const max = Math.max.apply(null, data.concat([opt.min || 1])) * 1.18 || 1;
    const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    const stepX = data.length > 1 ? iw / (data.length - 1) : iw;
    const X = i => pad.l + stepX * i;
    const Y = v => pad.t + ih - (v / max) * ih;

    let path = '', area = '';
    data.forEach((v, i) => {
      path += (i ? ' L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1);
    });
    if (data.length) {
      area = path + ' L' + X(data.length - 1).toFixed(1) + ' ' + (pad.t + ih) + ' L' + pad.l + ' ' + (pad.t + ih) + ' Z';
    }
    const color = opt.color || '#2f6bed';
    const gid = 'g' + Math.random().toString(36).slice(2, 7);

    let grid = '', yl = '';
    for (let i = 0; i <= 3; i++) {
      const y = pad.t + (ih / 3) * i;
      grid += '<line x1="' + pad.l + '" y1="' + y + '" x2="' + (w - pad.r) + '" y2="' + y + '" stroke="#eef1f7" stroke-width="1"/>';
      yl += '<text x="' + (pad.l - 7) + '" y="' + (y + 4) + '" font-size="10" fill="#aeb6c8" text-anchor="end">' +
        Math.round(max - (max / 3) * i) + '</text>';
    }
    let xl = '', dots = '';
    data.forEach((v, i) => {
      const showEvery = Math.ceil(data.length / 7);
      if (i % showEvery === 0 || i === data.length - 1) {
        xl += '<text x="' + X(i) + '" y="' + (h - 7) + '" font-size="10" fill="#aeb6c8" text-anchor="middle">' +
          escapeHtml((labels[i] || '').slice(5)) + '</text>';
      }
      dots += '<circle cx="' + X(i) + '" cy="' + Y(v) + '" r="2.6" fill="#fff" stroke="' + color + '" stroke-width="2"><title>' +
        escapeHtml(labels[i] || '') + '：' + v + '</title></circle>';
    });

    return '<svg class="chart-svg" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + color + '" stop-opacity=".26"/>' +
      '<stop offset="100%" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>' +
      grid + yl +
      (area ? '<path d="' + area + '" fill="url(#' + gid + ')"/>' : '') +
      (path ? '<path d="' + path + '" fill="none" stroke="' + color + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>' : '') +
      dots + xl + '</svg>';
  };

  /* ---------------- SVG 柱状图 ---------------- */
  UI.barChart = function (opt) {
    const w = opt.width || 640, h = opt.height || 210;
    const pad = { l: 34, r: 12, t: 14, b: 28 };
    const data = opt.data || [], labels = opt.labels || [], colors = opt.colors || [];
    const max = Math.max.apply(null, data.concat([1])) * 1.2;
    const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    const bw = Math.min(38, (iw / Math.max(data.length, 1)) * .52);
    let grid = '';
    for (let i = 0; i <= 3; i++) {
      const y = pad.t + (ih / 3) * i;
      grid += '<line x1="' + pad.l + '" y1="' + y + '" x2="' + (w - pad.r) + '" y2="' + y + '" stroke="#eef1f7"/>' +
        '<text x="' + (pad.l - 7) + '" y="' + (y + 4) + '" font-size="10" fill="#aeb6c8" text-anchor="end">' + Math.round(max - (max / 3) * i) + '</text>';
    }
    let bars = '';
    data.forEach((v, i) => {
      const cx = pad.l + (iw / data.length) * (i + .5);
      const bh = (v / max) * ih;
      bars += '<rect x="' + (cx - bw / 2) + '" y="' + (pad.t + ih - bh) + '" width="' + bw + '" height="' + Math.max(bh, 1) +
        '" rx="5" fill="' + (colors[i] || '#2f6bed') + '" opacity=".9"><title>' + escapeHtml(labels[i] || '') + '：' + v + '</title></rect>' +
        '<text x="' + cx + '" y="' + (pad.t + ih - bh - 5) + '" font-size="10.5" fill="#4b5670" text-anchor="middle" font-weight="600">' + v + '</text>' +
        '<text x="' + cx + '" y="' + (h - 8) + '" font-size="10.5" fill="#8790a6" text-anchor="middle">' + escapeHtml(labels[i] || '') + '</text>';
    });
    return '<svg class="chart-svg" viewBox="0 0 ' + w + ' ' + h + '">' + grid + bars + '</svg>';
  };

  /* ---------------- SVG 雷达图 ---------------- */
  UI.radarChart = function (opt) {
    const size = opt.size || 300;
    const cx = size / 2, cy = size / 2 + 6, R = size * .34;
    const labels = opt.labels || [], data = opt.data || [];
    const n = labels.length || 1;
    const ang = i => (Math.PI * 2 * i) / n - Math.PI / 2;
    const P = (i, r) => [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r];

    let webs = '';
    [.25, .5, .75, 1].forEach(k => {
      let pts = [];
      for (let i = 0; i < n; i++) { const p = P(i, R * k); pts.push(p[0].toFixed(1) + ',' + p[1].toFixed(1)); }
      webs += '<polygon points="' + pts.join(' ') + '" fill="none" stroke="#e5e9f2" stroke-width="1"/>';
    });
    let axes = '', texts = '';
    for (let i = 0; i < n; i++) {
      const p = P(i, R);
      axes += '<line x1="' + cx + '" y1="' + cy + '" x2="' + p[0] + '" y2="' + p[1] + '" stroke="#e5e9f2"/>';
      const lp = P(i, R + 22);
      texts += '<text x="' + lp[0] + '" y="' + (lp[1] + 4) + '" font-size="11" fill="#4b5670" text-anchor="middle">' + escapeHtml(labels[i]) + '</text>';
    }
    let pts = [], dots = '';
    data.forEach((v, i) => {
      const p = P(i, R * U.clamp(v, 0, 100) / 100);
      pts.push(p[0].toFixed(1) + ',' + p[1].toFixed(1));
      dots += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.2" fill="#2f6bed"><title>' + escapeHtml(labels[i]) + '：' + v + '%</title></circle>';
    });
    return '<svg class="chart-svg" viewBox="0 0 ' + size + ' ' + (size + 10) + '">' + webs + axes +
      '<polygon points="' + pts.join(' ') + '" fill="rgba(47,107,237,.18)" stroke="#2f6bed" stroke-width="2" stroke-linejoin="round"/>' +
      dots + texts + '</svg>';
  };

  /* ---------------- 打卡热力图 ---------------- */
  UI.heatmap = function (timeline, weeks) {
    weeks = weeks || 14;
    const days = weeks * 7;
    const list = U.lastNDays(days);
    const maxV = Math.max(1, ...list.map(d => (timeline[d] || {}).questions || 0));
    let html = '<div style="display:flex;gap:3px">';
    for (let w = 0; w < weeks; w++) {
      html += '<div style="display:flex;flex-direction:column;gap:3px">';
      for (let d = 0; d < 7; d++) {
        const idx = w * 7 + d;
        const day = list[idx];
        if (!day) { html += '<div class="heat-cell" style="opacity:0"></div>'; continue; }
        const v = (timeline[day] || {}).questions || 0;
        const level = v === 0 ? 0 : U.clamp(Math.ceil((v / maxV) * 4), 1, 4);
        const colors = ['#eef1f7', '#cfe0ff', '#9dc0fd', '#5b8cfa', '#1d51d4'];
        html += '<div class="heat-cell" title="' + day + '：' + v + ' 题" style="background:' + colors[level] + '"></div>';
      }
      html += '</div>';
    }
    html += '</div>';
    return html;
  };

  /* ---------------- 分数条（申论评分） ---------------- */
  UI.scoreBar = function (name, score, full, comment) {
    const p = U.pct(score, full);
    const cls = p >= 80 ? 'g-green' : p >= 60 ? 'g-blue' : 'g-orange';
    return '<div style="margin-bottom:14px">' +
      '<div class="flex justify-between items-center mb-4"><span class="fs-13 fw-6">' + escapeHtml(name) + '</span>' +
      '<span class="fs-13 mono t2"><b>' + score + '</b> / ' + full + '</span></div>' +
      '<div class="bar"><i class="' + cls + '" style="width:' + p + '%"></i></div>' +
      (comment ? '<div class="t3 fs-12 mt-4">' + escapeHtml(comment) + '</div>' : '') + '</div>';
  };
})(window);
