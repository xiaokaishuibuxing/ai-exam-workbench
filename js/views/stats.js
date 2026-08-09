/* ==========================================================================
   views/stats.js — 学习数据（能力雷达 / 趋势曲线 / 模块对比 / 提分建议）
   ========================================================================== */
(function (global) {
  'use strict';
  const App = global.App;
  const U = App.utils, UI = App.ui;
  const { icon, escapeHtml } = U;

  function render(root) {
    const S = App.store.stats();
    const mods = App.store.MODULES;

    const days = U.lastNDays(14);
    const qData = days.map(d => (App.store.state.timeline[d] || {}).questions || 0);
    const aData = days.map(d => (App.store.state.timeline[d] || {}).correct || 0);
    const minData = days.map(d => Math.round((App.store.state.timeline[d] || {}).minutes || 0));

    // 模块能力
    const radarLabels = mods.map(m => m.name);
    const radarData = mods.map(m => App.store.moduleStat(m.key).accuracy);

    const ranked = mods.map(m => Object.assign({ name: m.name, icon: m.icon, color: m.color, hex: m.hex }, App.store.moduleStat(m.key)))
      .sort((a, b) => a.accuracy - b.accuracy);
    const weak = ranked[0], strong = ranked[ranked.length - 1];
    const focus = ranked.filter(m => m.done > 0).slice(0, 2);

    root.innerHTML =
      '<div class="view-head"><div><h1>学习数据</h1>' +
      '<div class="sub">能力雷达、趋势曲线与提分优先级，让每一分钟都花在刀刃上</div></div>' +
      '<button class="btn btn-ghost" data-export>' + icon('download', 15) + '导出报告</button></div>' +

      // KPI
      '<div class="kpi-grid mb-16">' +
      UI.kpi({ label: '累计刷题', value: S.done, unit: '题', icon: 'list', bg: 'var(--brand-50)', color: 'var(--brand-500)', foot: '目标 ' + S.total + ' 题', trend: S.progressPct, trendUnit: '%' }) +
      UI.kpi({ label: '整体正确率', value: S.accuracy, unit: '%', icon: 'target', bg: 'var(--success-50)', color: 'var(--success-500)', foot: '已答对 ' + S.correct + ' 题', trend: S.accuracy, trendUnit: '%' }) +
      UI.kpi({ label: '学习时长', value: Math.round(S.minutes), unit: '分', icon: 'clock', bg: 'var(--purple-50)', color: 'var(--purple-500)', foot: '约 ' + U.fmtDuration(S.minutes) }) +
      UI.kpi({ label: '连续打卡', value: S.streak, unit: '天', icon: 'flame', bg: 'var(--warning-50)', color: 'var(--warning-500)', foot: '保持节奏' }) +
      UI.kpi({ label: '待巩固错题', value: S.mistakes, unit: '道', icon: 'alert', bg: 'var(--danger-50)', color: 'var(--danger-500)', foot: '来自错题中心' }) +
      '</div>' +

      '<div class="grid grid-split mb-16">' +
      /* 雷达 */
      '<div class="card">' + UI.cardHead('模块能力雷达', '各模块正确率分布（%）') +
      '<div class="card-body flex justify-center">' + UI.radarChart({ labels: radarLabels, data: radarData }) + '</div></div>' +
      /* 趋势 */
      '<div class="card">' + UI.cardHead('近 14 天刷题趋势', '每日题量与正确题数') +
      '<div class="card-body">' +
      '<div class="legend flex gap-16 mb-8"><span class="flex items-center gap-6"><i class="legend-dot" style="background:#2f6bed"></i>刷题量</span>' +
      '<span class="flex items-center gap-6"><i class="legend-dot" style="background:#16a34a"></i>正确题数</span>' +
      '<span class="flex items-center gap-6"><i class="legend-dot" style="background:#f59e0b"></i>学习分钟</span></span>' +
      doubleLine(days, qData, aData, minData) +
      '</div></div>' +
      '</div>' +

      // 模块对比
      '<div class="card mb-16">' + UI.cardHead('模块进度与正确率', '点击进入对应模块刷题') + '<div class="card-body">' +
      '<div class="grid grid-2 gap-16">' +
      mods.map(m => {
        const st = App.store.moduleStat(m.key);
        return '<div class="mod-stat" data-go="#/practice/' + m.key + '" style="cursor:pointer">' +
          '<div class="flex items-center gap-10 mb-8"><span class="kpi-ico" style="width:30px;height:30px;background:' + hexA(m.hex, .12) + ';color:' + m.hex + '">' + icon(m.icon, 16) + '</span>' +
          '<b class="fs-14">' + escapeHtml(m.name) + '</b><span class="t4 fs-12 ml-auto">正确率 ' + st.accuracy + '%</span></div>' +
          UI.progressRow('已完成', st.done, st.total, m.color.replace('g-', 'g-'), st.accuracy + '% 正确') +
          '<div class="flex gap-12 mt-8 fs-12 t3"><span>已练 ' + st.done + '</span><span>对 ' + st.correct + '</span><span>错 ' + st.wrong + '</span></div>' +
          '</div>';
      }).join('') +
      '</div></div></div>' +

      // 提分优先级 + 打卡
      '<div class="grid grid-split">' +
      '<div class="card">' + UI.cardHead('提分优先级建议', '基于正确率与练习量自动排序') +
      '<div class="card-body">' +
      '<div class="ai-summary mb-12"><h5>' + icon('sparkles', 13) + ' AI 诊断</h5>' +
      '<p>' + (S.done ? ('当前最薄弱模块为 <b>' + weak.name + '</b>（正确率 ' + weak.accuracy + '%）。建议把每日刷题量的 40% 投入此处，并配合错题本二次复盘；<b>' + strong.name + '</b> 表现最稳（' + strong.accuracy + '%），维持少量训练即可。') : '你还没有刷题记录，先去「行测」任一模块练习 10 题，系统就能给出针对性建议。建议从「资料分析」开始。') + '</p></div>' +
      (focus.length ? focus.map(m => '<div class="flex gap-10 mb-10"><span class="opt-key" style="width:24px;height:24px;background:' + hexA(m.hex, .14) + ';color:' + m.hex + '">' + icon(m.icon, 14) + '</span>' +
        '<div class="flex-1"><div class="fs-13 fw-6">' + escapeHtml(m.name) + ' · 优先强化</div>' +
        '<div class="t3 fs-12">当前正确率 ' + m.accuracy + '%，建议每日 ' + (m.key === 'data' ? 15 : 12) + ' 题限时训练</div></div></div>').join('') : '<div class="t3 fs-13">完成首轮刷题后这里会生成专项计划。</div>') +
      '</div></div>' +
      '<div class="card">' + UI.cardHead('打卡热力图', '坚持是提分最稳的杠杆') +
      '<div class="card-body"><div style="overflow-x:auto">' + UI.heatmap(App.store.state.timeline, 14) + '</div>' +
      '<div class="flex justify-between items-center mt-12 fs-12 t3"><span>近 14 天共刷题 <b>' + qData.reduce((a, b) => a + b, 0) + '</b> 题</span><span class="flex gap-6 items-center"><i class="legend-dot" style="background:#1d51d4"></i>题量越深越活跃</span></div>' +
      '</div></div>' +
      '</div>';

    bind(root);
  }

  function doubleLine(labels, d1, d2, d3) {
    const w = 640, h = 200, pad = { l: 30, r: 12, t: 14, b: 26 };
    const max = Math.max.apply(null, d1.concat(d2).concat([1])) * 1.18;
    const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    const stepX = d1.length > 1 ? iw / (d1.length - 1) : iw;
    const X = i => pad.l + stepX * i;
    const Y = v => pad.t + ih - (v / max) * ih;
    function pathOf(data, color) {
      let p = '';
      data.forEach((v, i) => { p += (i ? ' L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); });
      return '<path d="' + p + '" fill="none" stroke="' + color + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>';
    }
    let grid = '', yl = '';
    for (let i = 0; i <= 3; i++) { const y = pad.t + (ih / 3) * i; grid += '<line x1="' + pad.l + '" y1="' + y + '" x2="' + (w - pad.r) + '" y2="' + y + '" stroke="#eef1f7"/>'; yl += '<text x="' + (pad.l - 6) + '" y="' + (y + 4) + '" font-size="10" fill="#aeb6c8" text-anchor="end">' + Math.round(max - (max / 3) * i) + '</text>'; }
    let xl = '';
    d1.forEach((v, i) => { if (i % 2 === 0 || i === d1.length - 1) xl += '<text x="' + X(i) + '" y="' + (h - 7) + '" font-size="10" fill="#aeb6c8" text-anchor="middle">' + escapeHtml((labels[i] || '').slice(5)) + '</text>'; });
    return '<svg class="chart-svg" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' + grid + yl + pathOf(d1, '#2f6bed') + pathOf(d2, '#16a34a') + pathOf(d3, '#f59e0b') + xl + '</svg>';
  }

  function bind(root) {
    U.delegate(root, 'click', '[data-go]', (e, t) => App.router.go(t.getAttribute('data-go')));
    U.delegate(root, 'click', '[data-export]', () => {
      const S = App.store.stats();
      const report = { generatedAt: U.fmtDate(Date.now(), true), stats: S, modules: App.store.MODULES.map(m => Object.assign({ name: m.name }, App.store.moduleStat(m.key))) };
      U.download('学习报告_' + U.todayStr() + '.json', JSON.stringify(report, null, 2));
      U.toast('已导出学习报告', 'success');
    });
  }

  function hexA(hex, a) {
    const h = (hex || '#4b5670').replace('#', '');
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  App.router.register('stats', { render });
})(window);
