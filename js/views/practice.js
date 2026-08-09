/* ==========================================================================
   views/practice.js — 行测五大模块通用刷题页
   路由：#/practice/:module
   ========================================================================== */
(function (global) {
  'use strict';
  const App = global.App;
  const U = App.utils, UI = App.ui;
  const { icon, escapeHtml } = U;

  let ctx = null;

  function render(root, params) {
    const key = params[0] || 'data';
    const mod = App.store.MODULE_MAP[key];
    if (!mod) { root.innerHTML = UI.empty('alert', '模块不存在', '请从左侧导航选择'); return; }
    const list = App.data.byModule(key);
    ctx = { key, mod, list, idx: 0, selected: null, submitted: false, t0: Date.now(), timer: null, elapsed: 0 };

    const ms = App.store.moduleStat(key);
    root.innerHTML =
      '<div class="view-head"><div><h1>' + escapeHtml(mod.name) + '</h1>' +
      '<div class="sub">题库 ' + list.length + ' 题 · 已练 ' + ms.done + ' 题 · 正确率 ' + (ms.done ? ms.accuracy + '%' : '—') + '</div></div>' +
      '<div class="flex gap-8">' +
      '<div class="segmented" data-mode><button class="active" data-m="practice">练习模式</button><button data-m="exam">限时模考</button></div>' +
      '<button class="btn btn-ghost" data-restart>' + icon('refresh', 15) + '重新开始</button>' +
      '<button class="btn btn-ai" data-route="#/photo">' + icon('camera', 15) + '拍照解题</button>' +
      '</div></div>' +
      '<div class="grid grid-main">' +
      '<div><div class="card" data-qcard></div></div>' +
      '<div class="flex-col gap-16" style="align-self:start">' +
      '<div class="card" data-panel></div>' +
      '<div class="card" data-nav></div>' +
      '</div></div>';

    paint();
    bind(root);
    startTimer(root);
  }

  function startTimer(root) {
    stopTimer();
    ctx.timer = setInterval(() => {
      ctx.elapsed = Math.floor((Date.now() - ctx.t0) / 1000);
      const t = U.$('[data-timer]', root);
      if (t) t.textContent = U.pad(Math.floor(ctx.elapsed / 60)) + ':' + U.pad(ctx.elapsed % 60);
    }, 1000);
  }
  function stopTimer() { if (ctx && ctx.timer) { clearInterval(ctx.timer); ctx.timer = null; } }

  function currentQ() { return ctx.list[ctx.idx]; }

  function paint() {
    paintQuestion();
    paintPanel();
    paintNav();
  }

  function paintQuestion() {
    const q = currentQ();
    const box = U.$('[data-qcard]');
    if (!q) { box.innerHTML = UI.empty('trophy', '本模块题目已全部完成', '可切换其他模块，或去错题中心巩固', '<button class="btn btn-primary btn-sm" data-route="#/mistakes">去错题中心</button>'); return; }

    let html = UI.cardHead(q.type, '第 ' + (ctx.idx + 1) + ' / ' + ctx.list.length + ' 题 · 难度 ' + '★'.repeat(q.difficulty || 3),
      '<div class="flex items-center gap-10"><span class="tag tag-brand mono" data-timer>00:00</span>' +
      '<span class="tag">' + escapeHtml(q.id) + '</span></div>');

    html += '<div class="card-body">';
    if (q.material) html += '<div class="qs-material">' + escapeHtml(q.material) + '</div>';
    html += '<div class="qs-stem mb-16">' + escapeHtml(q.stem) + '</div>';

    q.options.forEach(op => {
      const k = op.slice(0, 1);
      let cls = 'opt';
      if (ctx.submitted) {
        cls += ' disabled';
        if (k === q.answer) cls += ' correct';
        else if (k === ctx.selected) cls += ' wrong';
      } else if (ctx.selected === k) cls += ' selected';
      html += '<div class="' + cls + '" data-opt="' + k + '">' +
        '<span class="opt-key">' + k + '</span><span class="flex-1">' + escapeHtml(op.replace(/^[A-D][.、．]\s*/, '')) + '</span>' +
        (ctx.submitted && k === q.answer ? '<span class="c-success">' + icon('check', 16) + '</span>' : '') +
        '</div>';
    });

    if (ctx.submitted) {
      const ok = ctx.selected === q.answer;
      html += '<div class="analysis-box">' +
        '<h4>' + icon('sparkles', 14) + 'AI 解析 · ' + (ok ? '<span class="c-success">回答正确</span>' : '<span class="c-danger">回答错误，正确答案 ' + q.answer + '</span>') + '</h4>' +
        '<div class="mb-12">' + q.steps.map((s, i) => '<div class="flex gap-8 mb-4"><span class="opt-key" style="width:20px;height:20px;font-size:11px">' + (i + 1) + '</span>' +
          '<span class="flex-1 fs-13" style="line-height:1.8">' + escapeHtml(s) + '</span></div>').join('') + '</div>' +
        '<p>' + escapeHtml(q.analysis) + '</p>' +
        '<div class="flex gap-6 mt-12 flex-wrap">' + UI.tags(q.points, 'tag-purple') + '</div>' +
        '<div class="flex gap-8 mt-12"><button class="btn btn-ghost btn-sm" data-ask-ai>' + icon('brain', 14) + '追问 AI</button>' +
        '<button class="btn btn-ghost btn-sm" data-add-note>' + icon('star', 14) + '收藏到知识库</button></div>' +
        '</div>';
    }
    html += '</div>';

    html += '<div class="card-foot flex justify-between items-center">' +
      '<button class="btn btn-ghost btn-sm" data-prev' + (ctx.idx === 0 ? ' disabled' : '') + '>上一题</button>' +
      '<div class="flex gap-8">' +
      (ctx.submitted
        ? '<button class="btn btn-primary" data-next>' + (ctx.idx >= ctx.list.length - 1 ? '完成练习' : '下一题') + icon('arrowRight', 15) + '</button>'
        : '<button class="btn btn-primary" data-submit>提交答案</button>') +
      '</div></div>';

    box.innerHTML = html;
  }

  function paintPanel() {
    const ms = App.store.moduleStat(ctx.key);
    const q = currentQ();
    const panel = U.$('[data-panel]');
    panel.innerHTML = UI.cardHead('本模块学情', ctx.mod.name) +
      '<div class="card-body"><div class="flex gap-16 items-center">' +
      UI.ring(ms.accuracy, 92, 9, ctx.mod.hex, ms.accuracy + '%', '正确率') +
      '<div class="flex-1"><div class="flex justify-between fs-13 mb-8"><span class="t3">已完成</span><b class="mono">' + ms.done + ' / ' + ms.total + '</b></div>' +
      '<div class="bar mb-12"><i class="' + ctx.mod.color + '" style="width:' + ms.pct + '%"></i></div>' +
      '<div class="flex justify-between fs-13 mb-4"><span class="t3">答对</span><b class="mono c-success">' + ms.correct + '</b></div>' +
      '<div class="flex justify-between fs-13"><span class="t3">答错</span><b class="mono c-danger">' + ms.wrong + '</b></div>' +
      '</div></div>' +
      (q ? '<hr><h4 class="fs-13 mb-8">本题考点</h4><div class="flex gap-6 flex-wrap">' + UI.tags(q.points, 'tag-brand') + '</div>' : '') +
      '<hr><div class="flex gap-8"><button class="btn btn-soft btn-sm flex-1" data-hint>' + icon('bulb', 14) + '要点提示</button>' +
      '<button class="btn btn-soft btn-sm flex-1" data-route="#/assistant">' + icon('message', 14) + '问 AI</button></div>' +
      '</div>';
  }

  function paintNav() {
    const nav = U.$('[data-nav]');
    let html = UI.cardHead('答题卡', '点击可跳转');
    html += '<div class="card-body"><div class="flex gap-8 flex-wrap">';
    ctx.list.forEach((q, i) => {
      const rec = App.store.state.records.filter(r => r.qid === q.id).pop();
      let bg = 'var(--bg-soft)', color = 'var(--text-2)';
      if (rec) { bg = rec.correct ? 'var(--success-50)' : 'var(--danger-50)'; color = rec.correct ? 'var(--success-600)' : 'var(--danger-500)'; }
      if (i === ctx.idx) { bg = 'var(--brand-500)'; color = '#fff'; }
      html += '<button class="opt-key" style="width:32px;height:32px;background:' + bg + ';color:' + color + ';cursor:pointer" data-jump="' + i + '">' + (i + 1) + '</button>';
    });
    html += '</div><div class="flex gap-12 mt-12 fs-12 t3">' +
      '<span><i class="nav-dot" style="background:var(--success-500);display:inline-block"></i> 已答对</span>' +
      '<span><i class="nav-dot" style="background:var(--danger-500);display:inline-block"></i> 已答错</span>' +
      '<span><i class="nav-dot" style="background:var(--border-strong);display:inline-block"></i> 未作答</span></div></div>';
    nav.innerHTML = html;
  }

  function bind(root) {
    U.delegate(root, 'click', '[data-opt]', (e, t) => {
      if (ctx.submitted) return;
      ctx.selected = t.getAttribute('data-opt');
      paintQuestion();
    });

    U.delegate(root, 'click', '[data-submit]', () => {
      if (!ctx.selected) { U.toast('请先选择一个选项', 'warn'); return; }
      const q = currentQ();
      const ok = ctx.selected === q.answer;
      ctx.submitted = true;
      stopTimer();
      App.store.recordAnswer(ctx.key, q.id, ok, ctx.elapsed);
      if (!ok) App.store.addMistake(q.id, ctx.key, ctx.selected);
      paint();
      U.toast(ok ? '回答正确！用时 ' + ctx.elapsed + ' 秒' : '答错了，已加入错题本', ok ? 'success' : 'error');
    });

    U.delegate(root, 'click', '[data-next]', () => {
      if (ctx.idx >= ctx.list.length - 1) {
        const done = App.store.moduleStat(ctx.key);
        U.modal({
          title: '本轮练习完成', desc: ctx.mod.name + ' · 共 ' + ctx.list.length + ' 题',
          content: '<div class="flex gap-16 items-center"><div>' + UI.ring(done.accuracy, 100, 9, ctx.mod.hex, done.accuracy + '%', '正确率') + '</div>' +
            '<div class="flex-1"><p class="fs-13 t2">已累计完成 <b>' + done.done + '</b> 题，答对 <b class="c-success">' + done.correct + '</b> 题。</p>' +
            '<p class="fs-13 t2">建议接下来去错题中心复盘，巩固薄弱考点。</p></div></div>',
          actions: [{ label: '再练一轮', onClick: () => { ctx.idx = 0; ctx.selected = null; ctx.submitted = false; ctx.t0 = Date.now(); startTimer(root); paint(); } },
          { label: '去错题中心', kind: 'primary', onClick: () => App.router.go('#/mistakes') }]
        });
        return;
      }
      ctx.idx++; ctx.selected = null; ctx.submitted = false; ctx.t0 = Date.now(); ctx.elapsed = 0;
      startTimer(root); paint();
    });

    U.delegate(root, 'click', '[data-prev]', () => {
      if (ctx.idx === 0) return;
      ctx.idx--; ctx.selected = null; ctx.submitted = false; ctx.t0 = Date.now(); ctx.elapsed = 0;
      startTimer(root); paint();
    });

    U.delegate(root, 'click', '[data-jump]', (e, t) => {
      ctx.idx = Number(t.getAttribute('data-jump'));
      ctx.selected = null; ctx.submitted = false; ctx.t0 = Date.now(); ctx.elapsed = 0;
      startTimer(root); paint();
    });

    U.delegate(root, 'click', '[data-restart]', () => {
      ctx.idx = 0; ctx.selected = null; ctx.submitted = false; ctx.t0 = Date.now(); ctx.elapsed = 0;
      startTimer(root); paint(); U.toast('已重新开始', 'success');
    });

    U.delegate(root, 'click', '[data-hint]', () => {
      const q = currentQ(); if (!q) return;
      U.modal({
        title: '要点提示', desc: q.type,
        content: '<div class="ai-summary"><h5>' + icon('bulb', 13) + ' 解题思路提示</h5><p>' + escapeHtml(q.steps[0]) + '</p></div>' +
          '<div class="mt-12 flex gap-6 flex-wrap">' + UI.tags(q.points, 'tag-brand') + '</div>' +
          '<p class="hint mt-12">提示不会计入错误统计，但建议先独立思考再查看。</p>',
        actions: [{ label: '继续作答', kind: 'primary' }]
      });
    });

    U.delegate(root, 'click', '[data-ask-ai]', async () => {
      const q = currentQ();
      const m = U.modal({
        title: 'AI 追问', desc: q.type,
        content: '<div class="ai-summary" data-ai-out><span class="typing"><i></i><i></i><i></i></span> AI 正在生成更详细的讲解…</div>',
        actions: [{ label: '关闭', kind: 'primary' }]
      });
      try {
        const r = await App.ai.explainMistake(q, ctx.selected || q.answer);
        U.$('[data-ai-out]', m.body).innerHTML =
          '<h5>' + icon('sparkles', 13) + ' 深度讲解</h5>' +
          '<p><b>错因分析：</b>' + escapeHtml(r.reason) + '</p>' +
          '<p class="mt-8"><b>纠正方法：</b>' + escapeHtml(r.fix) + '</p>' +
          '<p class="mt-8"><b>推荐训练：</b>' + escapeHtml((r.drill || []).join(' / ')) + '</p>';
      } catch (e) { U.$('[data-ai-out]', m.body).innerHTML = '生成失败：' + escapeHtml(e.message); }
    });

    U.delegate(root, 'click', '[data-add-note]', () => {
      const q = currentQ();
      App.store.update(s => {
        s.docs.unshift({
          id: U.uid('doc'), name: '[题目笔记] ' + q.id + ' ' + q.type + '.txt', ext: 'txt',
          size: (q.stem || '').length * 2, category: 'cuoti', tags: q.points.slice(0, 3), starred: false,
          created: Date.now(), text: q.stem + '\n\n答案：' + q.answer + '\n\n解析：' + q.analysis,
          summary: q.analysis.slice(0, 90), keypoints: q.steps.slice(0, 3), blobKey: ''
        });
      }, 'docs');
      U.toast('已收藏到知识库 · 错题分类', 'success');
    });

    U.delegate(root, 'click', '[data-mode] button', (e, t) => {
      U.$$('[data-mode] button', root).forEach(b => b.classList.remove('active'));
      t.classList.add('active');
      U.toast(t.getAttribute('data-m') === 'exam' ? '已切换到限时模考（每题 60 秒建议用时）' : '已切换到练习模式');
    });
  }

  App.router.register('practice', { render, unmount: stopTimer });
})(window);
