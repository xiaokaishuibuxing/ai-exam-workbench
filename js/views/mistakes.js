/* ==========================================================================
   views/mistakes.js — 错题中心
   ========================================================================== */
(function (global) {
  'use strict';
  const App = global.App;
  const U = App.utils, UI = App.ui;
  const { icon, escapeHtml } = U;

  let filter = { module: 'all', status: 'todo', kw: '' };

  function list() {
    return App.store.state.mistakes.filter(m => {
      if (filter.module !== 'all' && m.module !== filter.module) return false;
      if (filter.status === 'todo' && m.mastered) return false;
      if (filter.status === 'done' && !m.mastered) return false;
      if (filter.kw) {
        const q = App.data.byId(m.qid);
        const text = (q ? q.stem + q.type : m.qid);
        if (text.indexOf(filter.kw) === -1) return false;
      }
      return true;
    });
  }

  function render(root) {
    const all = App.store.state.mistakes;
    const todo = all.filter(m => !m.mastered).length;
    const byMod = {};
    all.forEach(m => { byMod[m.module] = (byMod[m.module] || 0) + 1; });

    root.innerHTML =
      '<div class="view-head"><div><h1>错题中心</h1>' +
      '<div class="sub">共 ' + all.length + ' 道错题 · 待巩固 ' + todo + ' 道 · AI 自动归因</div></div>' +
      '<div class="flex gap-8">' +
      '<button class="btn btn-ghost" data-export>' + icon('download', 15) + '导出错题</button>' +
      '<button class="btn btn-ai" data-ai-report>' + icon('sparkles', 15) + 'AI 错因报告</button></div></div>' +

      '<div class="grid grid-4 mb-20">' +
      UI.kpi({ label: '错题总数', value: all.length, unit: '道', icon: 'alert', color: '#e5484d', bg: '#fdecec', foot: '含已掌握' }) +
      UI.kpi({ label: '待巩固', value: todo, unit: '道', icon: 'target', color: '#f59e0b', bg: '#fff5e6', foot: '建议今日清理 10 道' }) +
      UI.kpi({ label: '已掌握', value: all.length - todo, unit: '道', icon: 'check', color: '#16a34a', bg: '#e8f8ef', foot: '掌握率 ' + U.pct(all.length - todo, all.length || 1) + '%' }) +
      UI.kpi({ label: '重复错误', value: all.filter(m => (m.times || 1) > 1).length, unit: '道', icon: 'refresh', color: '#7c5cf5', bg: '#f3efff', foot: '需重点关注' }) +
      '</div>' +

      '<div class="card mb-16"><div class="card-body tight flex items-center gap-12 flex-wrap">' +
      '<div class="segmented" data-fmod>' +
      '<button class="active" data-v="all">全部模块</button>' +
      App.store.MODULES.map(m => '<button data-v="' + m.key + '">' + m.name + (byMod[m.key] ? '(' + byMod[m.key] + ')' : '') + '</button>').join('') +
      '</div>' +
      '<div class="segmented" data-fstatus><button class="active" data-v="todo">待巩固</button><button data-v="done">已掌握</button><button data-v="all">全部</button></div>' +
      '<div class="topbar-search" style="max-width:230px"><span class="t3">' + icon('search', 14) + '</span><input placeholder="搜索题目关键词" data-fkw></div>' +
      '</div></div>' +

      '<div data-mlist></div>';

    paintList();
    bind(root);
  }

  function paintList() {
    const box = U.$('[data-mlist]');
    const rows = list();
    if (!rows.length) {
      box.innerHTML = '<div class="card">' + UI.empty('trophy', '没有符合条件的错题',
        '继续保持！可以去练习模块挑战新题目',
        '<button class="btn btn-primary btn-sm" data-route="#/practice/data">去刷题</button>') + '</div>';
      return;
    }
    box.innerHTML = rows.map(m => {
      const q = App.data.byId(m.qid);
      const mod = App.store.MODULE_MAP[m.module];
      if (!q) return '';
      return '<div class="card mb-12" data-mid="' + m.id + '">' +
        '<div class="card-body">' +
        '<div class="flex justify-between items-start gap-12 mb-10 flex-wrap">' +
        '<div class="flex gap-6 flex-wrap items-center">' +
        '<span class="tag tag-brand">' + escapeHtml(mod ? mod.name : '') + '</span>' +
        '<span class="tag">' + escapeHtml(q.type) + '</span>' +
        (m.times > 1 ? '<span class="tag tag-danger">错 ' + m.times + ' 次</span>' : '') +
        (m.mastered ? '<span class="tag tag-success">已掌握</span>' : '') +
        '<span class="t4 fs-12">' + U.relTime(m.ts) + '</span></div>' +
        '<div class="flex gap-6">' +
        '<button class="btn btn-ghost btn-sm" data-redo="' + m.qid + '">' + icon('rotate', 13) + '重做</button>' +
        '<button class="btn btn-soft btn-sm" data-why="' + m.id + '">' + icon('brain', 13) + 'AI 归因</button>' +
        '<button class="btn btn-' + (m.mastered ? 'ghost' : 'success') + ' btn-sm" data-master="' + m.id + '">' +
        icon('check', 13) + (m.mastered ? '取消掌握' : '标记掌握') + '</button>' +
        '<button class="icon-btn" style="width:28px;height:28px" data-del="' + m.id + '">' + icon('trash', 14) + '</button>' +
        '</div></div>' +
        '<div class="qs-stem clamp-3" style="font-size:14px">' + escapeHtml(q.stem) + '</div>' +
        '<div class="flex gap-16 mt-10 fs-13 flex-wrap">' +
        '<span class="t3">你的答案：<b class="c-danger">' + escapeHtml(m.myAnswer || '-') + '</b></span>' +
        '<span class="t3">正确答案：<b class="c-success">' + escapeHtml(q.answer) + '</b></span>' +
        '<span class="t3">考点：' + escapeHtml((q.points || []).join('、')) + '</span></div>' +
        (m.aiReason ? '<div class="ai-summary mt-12"><h5>' + icon('sparkles', 13) + ' AI 错因分析</h5><p>' + escapeHtml(m.aiReason) + '</p></div>' : '') +
        '<details class="mt-10"><summary class="fs-13 c-brand pointer">查看完整解析</summary>' +
        '<div class="analysis-box">' +
        q.steps.map((s, i) => '<div class="flex gap-8 mb-4"><span class="opt-key" style="width:20px;height:20px;font-size:11px">' + (i + 1) + '</span><span class="flex-1 fs-13">' + escapeHtml(s) + '</span></div>').join('') +
        '<p class="mt-8">' + escapeHtml(q.analysis) + '</p></div></details>' +
        '</div></div>';
    }).join('');
  }

  function bind(root) {
    U.delegate(root, 'click', '[data-fmod] button', (e, t) => {
      U.$$('[data-fmod] button', root).forEach(b => b.classList.remove('active'));
      t.classList.add('active'); filter.module = t.getAttribute('data-v'); paintList();
    });
    U.delegate(root, 'click', '[data-fstatus] button', (e, t) => {
      U.$$('[data-fstatus] button', root).forEach(b => b.classList.remove('active'));
      t.classList.add('active'); filter.status = t.getAttribute('data-v'); paintList();
    });
    U.delegate(root, 'input', '[data-fkw]', U.debounce((e, t) => { filter.kw = t.value.trim(); paintList(); }, 260));

    U.delegate(root, 'click', '[data-master]', (e, t) => {
      const id = t.getAttribute('data-master');
      App.store.update(s => { const m = s.mistakes.find(x => x.id === id); if (m) m.mastered = !m.mastered; }, 'mistake');
      paintList(); U.toast('已更新掌握状态', 'success');
    });

    U.delegate(root, 'click', '[data-del]', (e, t) => {
      const id = t.getAttribute('data-del');
      App.store.update(s => { s.mistakes = s.mistakes.filter(x => x.id !== id); }, 'mistake');
      paintList();
    });

    U.delegate(root, 'click', '[data-redo]', (e, t) => {
      const q = App.data.byId(t.getAttribute('data-redo'));
      if (!q) return;
      let selected = null, submitted = false;
      const m = U.modal({
        title: '重做错题', desc: q.type, width: '620px',
        content: '<div data-redo-box></div>',
        actions: [{ label: '关闭', kind: 'ghost' }]
      });
      const paint = () => {
        U.$('[data-redo-box]', m.body).innerHTML =
          (q.material ? '<div class="qs-material">' + escapeHtml(q.material) + '</div>' : '') +
          '<div class="qs-stem mb-12">' + escapeHtml(q.stem) + '</div>' +
          q.options.map(op => {
            const k = op.slice(0, 1);
            let cls = 'opt';
            if (submitted) { cls += ' disabled'; if (k === q.answer) cls += ' correct'; else if (k === selected) cls += ' wrong'; }
            else if (selected === k) cls += ' selected';
            return '<div class="' + cls + '" data-ropt="' + k + '"><span class="opt-key">' + k + '</span><span class="flex-1">' +
              escapeHtml(op.replace(/^[A-D][.、．]\s*/, '')) + '</span></div>';
          }).join('') +
          (submitted
            ? '<div class="analysis-box"><h4>' + icon('sparkles', 14) + (selected === q.answer ? '<span class="c-success">回答正确</span>' : '<span class="c-danger">仍然错误，正确答案 ' + q.answer + '</span>') + '</h4><p>' + escapeHtml(q.analysis) + '</p></div>'
            : '<button class="btn btn-primary mt-8" data-rsubmit>提交</button>');
      };
      paint();
      U.delegate(m.body, 'click', '[data-ropt]', (ev, tt) => { if (submitted) return; selected = tt.getAttribute('data-ropt'); paint(); });
      U.delegate(m.body, 'click', '[data-rsubmit]', () => {
        if (!selected) { U.toast('请选择一个选项', 'warn'); return; }
        submitted = true;
        const ok = selected === q.answer;
        App.store.recordAnswer(q.module, q.id, ok, 40);
        if (ok) { App.store.update(s => { const mm = s.mistakes.find(x => x.qid === q.id); if (mm) mm.mastered = true; }, 'mistake'); }
        else App.store.addMistake(q.id, q.module, selected);
        paint(); paintList();
        U.toast(ok ? '答对了，已自动标记为掌握' : '仍然错误，加把劲', ok ? 'success' : 'error');
      });
    });

    U.delegate(root, 'click', '[data-why]', async (e, t) => {
      const id = t.getAttribute('data-why');
      const m = App.store.state.mistakes.find(x => x.id === id);
      const q = App.data.byId(m.qid);
      const old = t.innerHTML; t.disabled = true; t.innerHTML = '<span class="spinner dark"></span>';
      try {
        const r = await App.ai.explainMistake(q, m.myAnswer);
        App.store.update(s => {
          const mm = s.mistakes.find(x => x.id === id);
          if (mm) mm.aiReason = r.reason + ' 纠正方法：' + r.fix + ' 推荐训练：' + (r.drill || []).join('、') + '。';
        }, 'mistake');
        paintList();
      } catch (err) { U.toast('分析失败：' + err.message, 'error'); }
      finally { t.disabled = false; t.innerHTML = old; }
    });

    U.delegate(root, 'click', '[data-export]', () => {
      const rows = list().map(m => {
        const q = App.data.byId(m.qid) || {};
        return '【' + (App.store.MODULE_MAP[m.module] || {}).name + '】' + (q.type || '') + '\n' +
          (q.stem || '') + '\n我的答案：' + m.myAnswer + '　正确答案：' + (q.answer || '') + '\n解析：' + (q.analysis || '') + '\n';
      }).join('\n----------------------------------------\n');
      U.download('错题本_' + U.todayStr() + '.txt', rows || '暂无错题');
      U.toast('错题本已导出', 'success');
    });

    U.delegate(root, 'click', '[data-ai-report]', async (e, btn) => {
      const old = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> 分析中…';
      const all = App.store.state.mistakes;
      const byMod = {};
      all.forEach(m => { byMod[m.module] = (byMod[m.module] || 0) + 1; });
      const pointCount = {};
      all.forEach(m => { const q = App.data.byId(m.qid); (q && q.points || []).forEach(p => pointCount[p] = (pointCount[p] || 0) + 1); });
      const topPoints = Object.keys(pointCount).sort((a, b) => pointCount[b] - pointCount[a]).slice(0, 6);
      await U.sleep(900);
      btn.disabled = false; btn.innerHTML = old;
      const mods = Object.keys(byMod).sort((a, b) => byMod[b] - byMod[a]);
      U.drawer({
        title: 'AI 错因诊断报告', desc: '基于 ' + all.length + ' 道错题生成 · ' + U.fmtDate(Date.now()),
        content: (all.length ? (
          '<div class="ai-summary mb-16"><h5>' + icon('sparkles', 13) + ' 总体诊断</h5><p>' +
          '你的错题主要集中在 <b>' + ((App.store.MODULE_MAP[mods[0]] || {}).name || '—') + '</b>（' + byMod[mods[0]] + ' 道），' +
          '占全部错题的 ' + U.pct(byMod[mods[0]], all.length) + '%。高频失分考点为「' + (topPoints.slice(0, 3).join('、') || '暂无') + '」。' +
          '建议未来一周把 40% 的练习时间投入该模块，并对上述考点做专项突破。</p></div>' +
          '<h4 class="fs-14 mb-8">模块分布</h4>' +
          UI.barChart({ data: mods.map(k => byMod[k]), labels: mods.map(k => (App.store.MODULE_MAP[k] || {}).name || k), colors: mods.map(k => (App.store.MODULE_MAP[k] || {}).hex), height: 190 }) +
          '<h4 class="fs-14 mt-16 mb-8">高频失分考点</h4><div class="flex gap-6 flex-wrap">' +
          topPoints.map((p, i) => '<span class="tag ' + (i < 2 ? 'tag-danger' : 'tag-warning') + ' tag-lg">' + escapeHtml(p) + ' × ' + pointCount[p] + '</span>').join('') + '</div>' +
          '<h4 class="fs-14 mt-16 mb-8">改进行动清单</h4>' +
          ['每天固定 20 分钟清理错题，优先处理错过 2 次以上的题目',
            '对高频考点建立"公式 + 例题 + 易错点"三段式笔记，存入知识库',
            '每周做一次同类型专项限时训练，检验是否真正掌握',
            '标记掌握前必须能独立复述解题步骤，避免"看会了"的假象'].map((t, i) =>
              '<div class="flex gap-8 mb-8"><span class="opt-key" style="width:20px;height:20px;font-size:11px">' + (i + 1) + '</span><span class="flex-1 fs-13 t2">' + escapeHtml(t) + '</span></div>').join('')
        ) : UI.empty('trophy', '暂无错题数据', '先去练习模块刷题吧')),
        actions: [{ label: '导出报告', icon: 'download', onClick: () => { U.download('错因诊断报告_' + U.todayStr() + '.txt', '错题总数：' + all.length + '\n高频考点：' + topPoints.join('、')); } },
        { label: '关闭', kind: 'primary' }]
      });
    });
  }

  App.router.register('mistakes', { render });
})(window);
