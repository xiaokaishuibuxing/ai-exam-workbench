/* ==========================================================================
   views/shenlun.js — 申论写作 + AI 五维批改
   ========================================================================== */
(function (global) {
  'use strict';
  const App = global.App;
  const U = App.utils, UI = App.ui;
  const { icon, escapeHtml } = U;

  let cur = null;

  function render(root) {
    const list = App.data.byModule('shenlun');
    cur = cur && list.find(q => q.id === cur.id) ? cur : list[0];
    const ms = App.store.moduleStat('shenlun');

    root.innerHTML =
      '<div class="view-head"><div><h1>申论写作</h1>' +
      '<div class="sub">在线作答 · AI 五维评分 · 参考答案比对</div></div>' +
      '<div class="flex gap-8"><select class="select" style="width:auto" data-pick>' +
      list.map(q => '<option value="' + q.id + '"' + (q.id === cur.id ? ' selected' : '') + '>' + escapeHtml(q.type) + '</option>').join('') +
      '</select>' +
      '<button class="btn btn-ghost" data-ref>' + icon('eye', 15) + '参考答案</button></div></div>' +
      '<div class="grid grid-main">' +
      '<div class="flex-col gap-16">' +
      '<div class="card" data-qbox></div>' +
      '<div class="card" data-editor></div>' +
      '</div>' +
      '<div class="flex-col gap-16" style="align-self:start">' +
      '<div class="card" data-result></div>' +
      '<div class="card">' + UI.cardHead('写作提分要点', '通用评分标准') +
      '<div class="card-body">' +
      ['要点全：回归材料提炼原词，同义合并，宁多勿漏',
        '结构清：使用"一是、二是"分条，段首句表明观点',
        '语言准：多用规范公文语言，慎用口语与network词汇',
        '篇幅稳：写满字数要求的 90%~100%，不超格',
        '格式对：贯彻执行题注意标题、称谓、落款'].map((t, i) =>
          '<div class="flex gap-8 mb-8"><span class="opt-key" style="width:20px;height:20px;font-size:11px">' + (i + 1) + '</span>' +
          '<span class="flex-1 fs-13 t2">' + escapeHtml(t) + '</span></div>').join('') +
      '</div></div>' +
      '<div class="card">' + UI.cardHead('申论进度', '共 ' + ms.total + ' 篇训练目标') +
      '<div class="card-body">' + UI.progressRow('已完成', ms.done, ms.total, 'g-pink') + '</div></div>' +
      '</div></div>';

    paintQ(); paintEditor(); paintResult(null);
    bind(root);
  }

  function paintQ() {
    U.$('[data-qbox]').innerHTML =
      UI.cardHead(cur.type, '难度 ' + '★'.repeat(cur.difficulty || 3) + ' · ' + cur.id,
        '<span class="tag tag-purple">' + escapeHtml((cur.points || [])[0] || '申论') + '</span>') +
      '<div class="card-body">' +
      (cur.material ? '<div class="qs-material">' + escapeHtml(cur.material) + '</div>' : '') +
      '<div class="qs-stem" style="font-size:14.5px"><b>【作答要求】</b>' + escapeHtml(cur.stem) + '</div></div>';
  }

  function paintEditor() {
    const saved = (App.store.state.essays || {})[cur.id] || '';
    U.$('[data-editor]').innerHTML =
      UI.cardHead('我的作答', '支持自动保存草稿',
        '<span class="fs-12 t3"><span class="mono" data-count>0</span> 字</span>') +
      '<div class="card-body"><textarea class="textarea" data-essay style="min-height:280px" placeholder="在此输入你的作答内容…\n建议先列要点提纲，再展开表述。">' + escapeHtml(saved) + '</textarea>' +
      '<div class="flex justify-between items-center mt-12 flex-wrap gap-8">' +
      '<div class="flex gap-6"><button class="btn btn-ghost btn-sm" data-outline>' + icon('list', 14) + '生成提纲</button>' +
      '<button class="btn btn-ghost btn-sm" data-clear>' + icon('trash', 14) + '清空</button></div>' +
      '<button class="btn btn-ai" data-grade>' + icon('sparkles', 15) + 'AI 智能批改</button>' +
      '</div></div>';
    updateCount();
  }

  function updateCount() {
    const ta = U.$('[data-essay]'); if (!ta) return;
    const c = U.$('[data-count]');
    if (c) c.textContent = ta.value.replace(/\s/g, '').length;
  }

  function paintResult(r) {
    const box = U.$('[data-result]');
    if (!r) {
      box.innerHTML = UI.cardHead('AI 批改结果', '五维评分模型') +
        '<div class="card-body">' + UI.empty('sparkles', '尚未批改', '完成作答后点击「AI 智能批改」') + '</div>';
      return;
    }
    const level = r.total >= 85 ? ['优秀', 'tag-success'] : r.total >= 70 ? ['良好', 'tag-brand'] : r.total >= 55 ? ['中等', 'tag-warning'] : ['待提升', 'tag-danger'];
    box.innerHTML = UI.cardHead('AI 批改结果', '五维评分模型', '<span class="tag ' + level[1] + ' tag-lg">' + level[0] + '</span>') +
      '<div class="card-body">' +
      '<div class="text-center mb-16">' + UI.ring(r.total, 116, 10, r.total >= 70 ? '#16a34a' : '#f59e0b', r.total, '总分 / 100') + '</div>' +
      r.dims.map(d => UI.scoreBar(d.name, d.score, d.full, d.comment)).join('') +
      '<div class="ai-summary mt-12"><h5>' + icon('sparkles', 13) + ' 总评</h5><p>' + escapeHtml(r.summary) + '</p></div>' +
      '<h4 class="fs-13 mt-16 mb-8 c-success">' + icon('check', 14) + ' 亮点</h4>' +
      '<ul class="fs-13 t2" style="line-height:1.9">' + r.highlights.map(h => '<li>' + escapeHtml(h) + '</li>').join('') + '</ul>' +
      '<h4 class="fs-13 mt-12 mb-8 c-warning">' + icon('bulb', 14) + ' 改进建议</h4>' +
      '<ul class="fs-13 t2" style="line-height:1.9">' + r.suggestions.map(h => '<li>' + escapeHtml(h) + '</li>').join('') + '</ul>' +
      '<button class="btn btn-ghost btn-sm btn-block mt-12" data-ref>' + icon('eye', 14) + '对照参考答案</button>' +
      '</div>';
  }

  function bind(root) {
    U.delegate(root, 'input', '[data-essay]', U.debounce(() => {
      updateCount();
      App.store.update(s => { s.essays = s.essays || {}; s.essays[cur.id] = U.$('[data-essay]').value; }, 'essay');
    }, 400));
    U.delegate(root, 'input', '[data-essay]', updateCount);

    U.delegate(root, 'change', '[data-pick]', (e, t) => {
      cur = App.data.byId(t.value);
      paintQ(); paintEditor(); paintResult(null);
    });

    U.delegate(root, 'click', '[data-clear]', () => {
      U.confirmDialog('清空作答？', '当前草稿将被删除，且不可恢复。', () => {
        U.$('[data-essay]').value = '';
        App.store.update(s => { s.essays = s.essays || {}; s.essays[cur.id] = ''; }, 'essay');
        updateCount();
      });
    });

    U.delegate(root, 'click', '[data-outline]', () => {
      const ta = U.$('[data-essay]');
      const tpl = cur.type.indexOf('对策') > -1
        ? '一是……（监管层面）：\n二是……（标准层面）：\n三是……（设施层面）：\n四是……（服务层面）：\n五是……（人才层面）：'
        : '主要做法：\n一是……\n二是……\n三是……\n\n存在问题：\n一是……\n二是……';
      ta.value = ta.value ? ta.value + '\n\n' + tpl : tpl;
      ta.dispatchEvent(new Event('input'));
      U.toast('已插入作答提纲模板', 'success');
    });

    U.delegate(root, 'click', '[data-ref]', () => {
      U.drawer({
        title: '参考答案', desc: cur.type,
        content: '<div class="qs-material">' + escapeHtml(cur.stem) + '</div>' +
          '<div class="ai-summary"><h5>' + icon('check', 13) + ' 参考作答</h5><p>' + escapeHtml(cur.refAnswer || '（暂无）') + '</p></div>' +
          '<h4 class="fs-13 mt-16 mb-8">解题步骤</h4>' +
          cur.steps.map((s, i) => '<div class="flex gap-8 mb-6"><span class="opt-key" style="width:20px;height:20px;font-size:11px">' + (i + 1) + '</span><span class="flex-1 fs-13 t2">' + escapeHtml(s) + '</span></div>').join('') +
          '<div class="ai-summary mt-16"><h5>' + icon('bulb', 13) + ' 阅卷视角</h5><p>' + escapeHtml(cur.analysis) + '</p></div>',
        actions: [{ label: '关闭', kind: 'primary' }]
      });
    });

    U.delegate(root, 'click', '[data-grade]', async (e, btn) => {
      const text = U.$('[data-essay]').value.trim();
      if (text.replace(/\s/g, '').length < 40) { U.toast('作答内容太短，至少写 40 字再批改', 'warn'); return; }
      const old = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> AI 批改中…';
      U.$('[data-result]').innerHTML = UI.cardHead('AI 批改结果', '正在分析…') +
        '<div class="card-body">' + [1, 2, 3, 4].map(() => '<div class="skeleton" style="height:16px;margin-bottom:12px"></div>').join('') + '</div>';
      try {
        const r = await App.ai.gradeEssay(text, cur.stem);
        paintResult(r);
        App.store.update(s => {
          const p = s.progress.shenlun;
          p.done = Math.min(p.total, p.done + 1);
          if (r.total >= 60) p.correct++; else p.wrong++;
          p.minutes += 18;
        }, 'answer');
        App.store.recordAnswer && null;
        U.toast('批改完成，总分 ' + r.total + ' 分', r.total >= 70 ? 'success' : 'warn');
      } catch (err) {
        U.toast('批改失败：' + err.message, 'error');
        paintResult(null);
      } finally { btn.disabled = false; btn.innerHTML = old; }
    });
  }

  App.router.register('shenlun', { render });
})(window);
