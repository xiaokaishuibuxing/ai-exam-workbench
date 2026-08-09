/* ==========================================================================
   views/dashboard.js — 工作台首页
   ========================================================================== */
(function (global) {
  'use strict';
  const App = global.App;
  const U = App.utils, UI = App.ui;
  const { icon, escapeHtml } = U;

  const MOD_NAME = { review: '错题复盘', data: '资料分析', logic: '逻辑推理', math: '数量关系', verbal: '言语理解', common: '常识判断', shenlun: '申论' };
  const MOD_ROUTE = { review: '#/mistakes', shenlun: '#/shenlun', data: '#/practice/data', logic: '#/practice/logic', math: '#/practice/math', verbal: '#/practice/verbal', common: '#/practice/common' };

  function todayTasks() {
    const s = App.store.state;
    return s.tasks.filter(t => t.date === U.todayStr());
  }

  function taskHTML() {
    const list = todayTasks();
    if (!list.length) {
      return UI.empty('calendar', '今天还没有安排', '让 AI 根据你的学情生成一份任务清单',
        '<button class="btn btn-ai" data-gen-plan>' + icon('sparkles', 15) + '生成今日计划</button>');
    }
    const done = list.filter(t => t.done).length;
    const mins = list.reduce((a, t) => a + (t.minutes || 0), 0);
    let html = '<div class="flex items-center gap-12 mb-12">' +
      '<div class="flex-1"><div class="bar thick"><i class="g-blue" style="width:' + U.pct(done, list.length) + '%"></i></div></div>' +
      '<span class="fs-12 t3 mono">' + done + '/' + list.length + ' · 约 ' + mins + ' 分钟</span></div>';
    list.forEach(t => {
      html += '<div class="task' + (t.done ? ' done' : '') + '" data-task="' + t.id + '">' +
        '<span class="checkbox">' + icon('check', 12, 3) + '</span>' +
        '<span class="flex-1"><div class="task-title">' + escapeHtml(t.title) + '</div>' +
        '<div class="task-meta"><span class="tag">' + escapeHtml(MOD_NAME[t.module] || '综合') + '</span>' +
        '<span>' + icon('clock', 11) + ' ' + (t.minutes || 0) + ' 分钟</span>' +
        (t.from ? '<span class="c-purple">' + escapeHtml(t.from) + '</span>' : '') + '</div></span>' +
        '<button class="icon-btn" style="width:26px;height:26px" data-task-go="' + t.id + '" title="去练习">' + icon('arrowRight', 15) + '</button>' +
        '<button class="icon-btn" style="width:26px;height:26px" data-task-del="' + t.id + '" title="删除">' + icon('x', 14) + '</button>' +
        '</div>';
    });
    return html;
  }

  function render(root) {
    const s = App.store.state;
    const st = App.store.stats();
    const days = U.daysUntil(s.profile.examDate);
    const tl = s.timeline;
    const last14 = U.lastNDays(14);
    const series = last14.map(d => (tl[d] || {}).questions || 0);
    const todayMin = Math.round((tl[U.todayStr()] || {}).minutes || 0);

    /* 顶部 Banner */
    let html = '<div class="banner mb-20 anim-fade-up">' +
      '<div class="flex justify-between items-start flex-wrap gap-16">' +
      '<div style="position:relative;z-index:1">' +
      '<h2>' + escapeHtml(hello()) + '，' + escapeHtml(s.profile.name) + ' ' + '</h2>' +
      '<p>' + escapeHtml(s.profile.target) + ' · 距离考试还有 <b>' + (days > 0 ? days : 0) + '</b> 天，今日已学习 ' + todayMin + ' 分钟</p>' +
      '<div class="flex gap-8 mt-16">' +
      '<button class="btn btn-lg" style="background:#fff;color:#1d51d4" data-route="#/photo">' + icon('camera', 16) + '拍照解题</button>' +
      '<button class="btn btn-lg btn-ghost" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.3);color:#fff" data-gen-plan>' + icon('sparkles', 16) + 'AI 规划今日</button>' +
      '</div></div>' +
      '<div class="banner-stat">' +
      '<div><b>' + st.done + '</b><span>累计刷题</span></div>' +
      '<div><b>' + st.accuracy + '%</b><span>综合正确率</span></div>' +
      '<div><b>' + st.streak + '</b><span>连续打卡</span></div>' +
      '</div></div></div>';

    /* KPI */
    const yesterday = (tl[U.lastNDays(2)[0]] || {}).questions || 0;
    const todayQ = (tl[U.todayStr()] || {}).questions || 0;
    html += '<div class="grid grid-4 mb-20">' +
      UI.kpi({ label: '今日刷题', value: todayQ, unit: '题', icon: 'zap', color: '#2f6bed', bg: '#eef4ff', trend: yesterday ? Math.round((todayQ - yesterday) / yesterday * 100) : null, foot: '较昨日' }) +
      UI.kpi({ label: '综合正确率', value: st.accuracy, unit: '%', icon: 'target', color: '#16a34a', bg: '#e8f8ef', foot: '共 ' + st.done + ' 题' }) +
      UI.kpi({ label: '待巩固错题', value: st.mistakes, unit: '道', icon: 'alert', color: '#e5484d', bg: '#fdecec', foot: '点击进入错题中心' }) +
      UI.kpi({ label: '累计学习', value: Math.round(st.minutes / 60 * 10) / 10, unit: '小时', icon: 'clock', color: '#7c5cf5', bg: '#f3efff', foot: '连续 ' + st.streak + ' 天打卡' }) +
      '</div>';

    /* 主区：进度 + 任务 */
    html += '<div class="grid grid-main mb-20">';

    // 左：学习进度
    html += '<div class="card">' +
      UI.cardHead('学习进度', '各模块题库完成情况', '<button class="btn btn-ghost btn-sm" data-route="#/stats">' + icon('chart', 14) + '详细学情</button>') +
      '<div class="card-body"><div class="flex gap-24 items-center flex-wrap">' +
      '<div class="text-center">' + UI.ring(st.progressPct, 116, 10, '#2f6bed', st.progressPct + '%', '总进度') +
      '<div class="t3 fs-12 mt-8">' + st.done + ' / ' + st.total + ' 题</div></div>' +
      '<div class="flex-1" style="min-width:260px">';
    App.store.MODULES.forEach(m => {
      const ms = App.store.moduleStat(m.key);
      html += UI.progressRow(m.name, ms.done, ms.total, m.color, ms.done ? ms.accuracy + '%' : '—');
    });
    html += '</div></div>' +
      '<div class="mt-20"><div class="flex justify-between items-center mb-8">' +
      '<h4 class="fs-13">近 14 日刷题趋势</h4>' +
      '<span class="legend"><span><i style="background:#2f6bed"></i>每日题量</span></span></div>' +
      UI.lineChart({ data: series, labels: last14, color: '#2f6bed', height: 180 }) +
      '</div></div></div>';

    // 右：今日任务
    html += '<div class="card" style="align-self:start">' +
      UI.cardHead('今日任务', U.fmtDate(Date.now()) + ' · ' + weekday(),
        '<div class="flex gap-6"><button class="btn btn-soft btn-sm" data-gen-plan>' + icon('sparkles', 14) + 'AI 规划</button>' +
        '<button class="icon-btn" style="width:28px;height:28px" data-add-task>' + icon('plus', 16) + '</button></div>') +
      '<div class="card-body" data-task-list>' + taskHTML() + '</div></div>';

    html += '</div>';

    /* AI 能力卡片 */
    html += '<div class="flex justify-between items-center mb-12"><div>' +
      '<h2 style="font-size:17px">AI 能力中心</h2>' +
      '<div class="t3 fs-12 mt-4">六大智能引擎覆盖备考全流程 · 支持接入自有大模型</div></div>' +
      '<span class="tag tag-purple">' + icon('sparkles', 12) + ' ' + (App.ai._http.isReal() ? '已接入真实模型' : '演示模式') + '</span></div>';
    html += '<div class="grid grid-3 mb-20">';
    App.data.aiCards.forEach(c => {
      html += '<div class="ai-card" style="color:' + c.color + '" data-route="' + c.route + '">' +
        '<div class="ai-card-ico" style="background:' + c.bg + ';color:' + c.color + '">' + icon(c.icon, 19) + '</div>' +
        '<h4>' + escapeHtml(c.title) + '</h4><p>' + escapeHtml(c.desc) + '</p>' +
        '<div class="ac-foot">' + escapeHtml(c.cta) + icon('arrowRight', 13) + '</div></div>';
    });
    html += '</div>';

    /* 最近动态 */
    html += '<div class="grid grid-side">' +
      '<div class="card">' + UI.cardHead('打卡热力', '近 14 周学习记录') +
      '<div class="card-body scroll-x">' + UI.heatmap(tl, 14) +
      '<div class="flex items-center gap-6 mt-12 fs-12 t3"><span>少</span>' +
      ['#eef1f7', '#cfe0ff', '#9dc0fd', '#5b8cfa', '#1d51d4'].map(c => '<span class="heat-cell" style="background:' + c + '"></span>').join('') +
      '<span>多</span></div></div></div>' +
      '<div class="card">' + UI.cardHead('最近练习记录', '最新 8 条') +
      '<div class="card-body tight">' + recentHTML() + '</div></div>' +
      '</div>';

    root.innerHTML = html;
    bind(root);
  }

  function recentHTML() {
    const rs = App.store.state.records.slice(-8).reverse();
    if (!rs.length) return UI.empty('list', '暂无练习记录', '去行测模块开始你的第一题',
      '<button class="btn btn-primary btn-sm" data-route="#/practice/data">开始刷题</button>');
    return rs.map(r => {
      const q = App.data.byId(r.qid);
      const m = App.store.MODULE_MAP[r.module];
      return '<div class="list-item">' +
        '<span class="kpi-ico" style="width:30px;height:30px;background:' + (r.correct ? '#e8f8ef' : '#fdecec') + ';color:' + (r.correct ? '#16a34a' : '#e5484d') + '">' +
        icon(r.correct ? 'check' : 'x', 15) + '</span>' +
        '<span class="flex-1" style="min-width:0"><div class="fs-13 fw-5 ellipsis">' + escapeHtml(q ? (q.type || q.stem.slice(0, 26)) : r.qid) + '</div>' +
        '<div class="t3 fs-12">' + escapeHtml(m ? m.name : '') + ' · ' + U.relTime(r.ts) + '</div></span>' +
        '<span class="tag ' + (r.correct ? 'tag-success' : 'tag-danger') + '">' + (r.correct ? '正确' : '错误') + '</span></div>';
    }).join('');
  }

  function hello() {
    const h = new Date().getHours();
    return h < 6 ? '凌晨好' : h < 11 ? '早上好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好';
  }
  function weekday() {
    return '星期' + '日一二三四五六'.charAt(new Date().getDay());
  }

  function refreshTasks(root) {
    const box = U.$('[data-task-list]', root);
    if (box) box.innerHTML = taskHTML();
  }

  function bind(root) {
    // 勾选任务
    U.delegate(root, 'click', '[data-task]', (e, t) => {
      if (e.target.closest('[data-task-del]') || e.target.closest('[data-task-go]')) return;
      const id = t.getAttribute('data-task');
      App.store.update(s => {
        const task = s.tasks.find(x => x.id === id);
        if (task) {
          task.done = !task.done;
          if (task.done) { s.timeline[U.todayStr()] = s.timeline[U.todayStr()] || { minutes: 0, questions: 0, correct: 0 }; s.timeline[U.todayStr()].minutes += task.minutes || 0; }
        }
      }, 'task');
      refreshTasks(root);
      U.toast('任务状态已更新', 'success');
    });

    U.delegate(root, 'click', '[data-task-del]', (e, t) => {
      e.stopPropagation();
      const id = t.getAttribute('data-task-del');
      App.store.update(s => { s.tasks = s.tasks.filter(x => x.id !== id); }, 'task');
      refreshTasks(root);
    });

    U.delegate(root, 'click', '[data-task-go]', (e, t) => {
      e.stopPropagation();
      const id = t.getAttribute('data-task-go');
      const task = App.store.state.tasks.find(x => x.id === id);
      if (task) App.router.go(MOD_ROUTE[task.module] || '#/practice/data');
    });

    // 新增任务
    U.delegate(root, 'click', '[data-add-task]', () => {
      const m = U.modal({
        title: '新增今日任务', width: '440px',
        content: '<div class="field"><label>任务名称</label><input class="input" id="nt-title" placeholder="例如：资料分析 20 题限时训练"></div>' +
          '<div class="grid grid-2"><div class="field"><label>所属模块</label><select class="select" id="nt-module">' +
          Object.keys(MOD_NAME).map(k => '<option value="' + k + '">' + MOD_NAME[k] + '</option>').join('') +
          '</select></div><div class="field"><label>预计时长（分钟）</label><input class="input" id="nt-min" type="number" value="20"></div></div>',
        actions: [{ label: '取消' }, {
          label: '添加', kind: 'primary', onClick: (body) => {
            const title = U.$('#nt-title', body).value.trim();
            if (!title) { U.toast('请填写任务名称', 'warn'); return false; }
            App.store.update(s => {
              s.tasks.push({ id: U.uid('t'), title, module: U.$('#nt-module', body).value, minutes: Number(U.$('#nt-min', body).value) || 20, done: false, date: U.todayStr(), from: '手动添加' });
            }, 'task');
            refreshTasks(root); U.toast('任务已添加', 'success');
          }
        }]
      });
      setTimeout(() => { const i = U.$('#nt-title', m.body); i && i.focus(); }, 80);
    });

    // AI 生成计划
    U.delegate(root, 'click', '[data-gen-plan]', async (e, btn) => {
      const old = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> AI 规划中…';
      try {
        const tasks = await App.ai.makePlan();
        App.store.update(s => {
          s.tasks = s.tasks.filter(t => t.date !== U.todayStr() || t.from === '手动添加');
          tasks.forEach(t => s.tasks.push({ id: U.uid('t'), title: t.title, module: t.module, minutes: t.minutes, done: false, date: U.todayStr(), from: 'AI 规划' }));
        }, 'task');
        refreshTasks(root);
        U.toast('AI 已生成 ' + tasks.length + ' 条任务', 'success');
      } catch (err) {
        U.toast('生成失败：' + err.message, 'error');
      } finally { btn.disabled = false; btn.innerHTML = old; }
    });
  }

  App.router.register('dashboard', { render });
})(window);
