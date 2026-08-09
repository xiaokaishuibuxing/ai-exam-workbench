/* ==========================================================================
   views/settings.js — 系统设置（账号 / AI 接口 / 数据管理）
   ========================================================================== */
(function (global) {
  'use strict';
  const App = global.App;
  const U = App.utils, UI = App.ui;
  const { icon, escapeHtml } = U;

  function render(root) {
    const s = App.store.state;
    const ai = s.settings.ai;
    const real = ai.provider !== 'mock';

    root.innerHTML =
      '<div class="view-head"><div><h1>系统设置</h1>' +
      '<div class="sub">配置备考资料、接入真实 AI 模型、管理本地数据</div></div></div>' +

      '<div class="grid grid-split">' +
      /* 左：账号 */
      '<div class="flex-col gap-16">' +
      '<div class="card">' + UI.cardHead('考生信息', '用于工作台个性化展示') + '<div class="card-body">' +
      field('姓名 / 昵称', '<input class="input" data-name value="' + escapeHtml(s.profile.name) + '">') +
      field('报考目标', '<input class="input" data-target value="' + escapeHtml(s.profile.target) + '">') +
      '<div class="flex gap-10">' +
      '<div class="flex-1">' + field('考试日期', '<input class="input" data-exam type="date" value="' + escapeHtml(s.profile.examDate) + '">') + '</div>' +
      '<div class="flex-1">' + field('加入时间', '<input class="input" value="' + U.fmtDate(s.profile.joined) + '" disabled>') + '</div></div>' +
      '<button class="btn btn-primary btn-block mt-12" data-save-profile>' + icon('check', 15) + ' 保存考生信息</button>' +
      '</div></div>' +

      '<div class="card">' + UI.cardHead('数据管理', '数据保存在本地浏览器，不上传服务器') + '<div class="card-body">' +
      '<div class="flex gap-8 flex-wrap">' +
      '<button class="btn btn-soft" data-export>' + icon('download', 15) + '导出全部数据</button>' +
      '<button class="btn btn-soft" data-import>' + icon('upload', 15) + '导入备份</button>' +
      '<button class="btn btn-soft" data-reset>' + icon('trash', 15) + '清空本地数据</button></div>' +
      '<div class="ai-summary mt-12"><h5>' + icon('key', 13) + ' 数据安全</h5>' +
      '<p>所有刷题记录、错题、知识库文件均为本地存储（localStorage + IndexedDB）。清空后无法恢复，建议定期导出备份。备份文件为 JSON，可在本机或其他设备导入。</p></div>' +
      '</div></div>' +
      '</div>' +

      /* 右：AI 接口 */
      '<div class="flex-col gap-16">' +
      '<div class="card">' + UI.cardHead('AI 接口', '支持任意 OpenAI 兼容服务') + '<div class="card-body">' +
      '<div class="kpi-label mb-8">运行模式</div>' +
      '<div class="segmented mb-16" data-mode>' +
      '<button data-m="mock" class="' + (!real ? 'active' : '') + '">' + icon('sparkles', 14) + ' 模拟演示</button>' +
      '<button data-m="openai" class="' + (real ? 'active' : '') + '">' + icon('key', 14) + ' 真实模型</button></div>' +
      '<div class="ai-summary mb-14" style="' + (real ? 'display:none' : '') + '" data-mock-tip><h5>' + icon('sparkles', 13) + ' 模拟模式</h5>' +
      '<p>当前使用内置规则引擎演示 AI 能力。在「真实模型」中填入 API Key 后，拍照解题、知识库摘要、对话与批改将调用真实大模型，业务代码零改动。</p></div>' +
      '<div data-real-fields style="' + (real ? '' : 'display:none') + '">' +
      field('API Base URL', '<input class="input" data-base placeholder="https://api.openai.com/v1" value="' + escapeHtml(ai.baseURL) + '">') +
      field('API Key', '<input class="input" data-key type="password" placeholder="sk-..." value="' + escapeHtml(ai.apiKey) + '">') +
      '<div class="flex gap-10">' +
      '<div class="flex-1">' + field('对话模型', '<input class="input" data-model placeholder="gpt-4o-mini" value="' + escapeHtml(ai.model) + '">') + '</div>' +
      '<div class="flex-1">' + field('视觉/多模态模型', '<input class="input" data-vmodel placeholder="gpt-4o-mini" value="' + escapeHtml(ai.visionModel) + '">') + '</div></div>' +
      field('Temperature', '<input class="input" data-temp type="number" step="0.1" min="0" max="1" value="' + (ai.temperature !== undefined ? ai.temperature : .4) + '">') +
      '<div class="flex gap-8 mt-4">' +
      '<button class="btn btn-soft" data-test>' + icon('zap', 15) + ' 测试连接</button>' +
      '<button class="btn btn-primary" data-save-ai>' + icon('check', 15) + ' 保存 AI 配置</button></div>' +
      '</div>' +
      '<div class="t3 fs-12 mt-12">兼容：OpenAI · DeepSeek · 通义千问 · 智谱 GLM · Moonshot · 本地 Ollama（填 /v1 地址即可）</div>' +
      '</div></div>' +

      '<div class="card">' + UI.cardHead('关于', 'AI 公考智能训练工作台') + '<div class="card-body">' +
      '<div class="flex items-center gap-12 mb-10"><span class="kpi-ico" style="background:linear-gradient(135deg,var(--purple-500),var(--brand-500));color:#fff;font-weight:800">AI</span>' +
      '<div><div class="fw-6 fs-14">AI 公考智能训练工作台</div><div class="t3 fs-12">纯前端 SaaS 风格 · 组件化架构 · 可部署 GitHub Pages</div></div></div>' +
      '<p class="t3 fs-12" style="line-height:1.8">本工作台为纯前端原型，所有数据保存在浏览器本地。AI 能力默认由内置规则引擎模拟，填入 OpenAI 兼容接口后可切换为真实大模型。代码采用 组件化结构（core / data / components / views），未来接入自有 AI 服务时只需替换 <code>js/core/api.js</code> 中的通道实现。</p>' +
      '</div></div>' +
      '</div>' +
      '</div>' +

      '<input type="file" accept="application/json" style="display:none" data-import-file>';

    bind(root);
  }

  function field(label, control) {
    return '<div class="mb-12"><div class="kpi-label mb-6">' + escapeHtml(label) + '</div>' + control + '</div>';
  }

  function bind(root) {
    // 模式切换
    U.delegate(root, 'click', '[data-m]', (e, t) => {
      const m = t.getAttribute('data-m');
      U.$$('[data-m]', root).forEach(b => b.classList.toggle('active', b.getAttribute('data-m') === m));
      const real = m !== 'mock';
      const tip = U.$('[data-mock-tip]', root), fields = U.$('[data-real-fields]', root);
      if (tip) tip.style.display = real ? 'none' : '';
      if (fields) fields.style.display = real ? '' : 'none';
      App.store.update(s => { s.settings.ai.provider = m; }, 'ui');
    });

    // 保存 AI 配置
    U.delegate(root, 'click', '[data-save-ai]', () => {
      const get = sel => { const el = U.$(sel, root); return el ? el.value.trim() : ''; };
      App.store.update(s => {
        const a = s.settings.ai;
        a.provider = U.$('[data-m="openai"]', root).classList.contains('active') ? 'openai' : 'mock';
        a.baseURL = get('[data-base]'); a.apiKey = get('[data-key]');
        a.model = get('[data-model]'); a.visionModel = get('[data-vmodel]') || get('[data-model]');
        a.temperature = parseFloat(get('[data-temp]')) || .4;
      }, 'ui');
      U.toast('AI 配置已保存', 'success');
    });

    // 测试连接
    U.delegate(root, 'click', '[data-test]', async () => {
      const get = sel => { const el = U.$(sel, root); return el ? el.value.trim() : ''; };
      const base = get('[data-base]'), key = get('[data-key]'), model = get('[data-model]') || 'gpt-4o-mini';
      if (!base || !key) { U.toast('请先填写 Base URL 和 API Key', 'warn'); return; }
      U.toast('正在测试连接…', 'info');
      try {
        const r = await App.ai._http.chat([{ role: 'user', content: 'ping，只回复 ok' }], { model, json: false });
        U.toast('连接成功：' + (r || 'ok').slice(0, 40), 'success');
      } catch (e) {
        U.toast('连接失败：' + (e && e.message || e).slice(0, 80), 'error');
      }
    });

    // 保存考生信息
    U.delegate(root, 'click', '[data-save-profile]', () => {
      const name = U.$('[data-name]', root).value.trim() || '备考同学';
      const target = U.$('[data-target]', root).value.trim();
      const exam = U.$('[data-exam]', root).value;
      App.store.update(s => { s.profile.name = name; if (target) s.profile.target = target; if (exam) s.profile.examDate = exam; }, 'ui');
      U.toast('考生信息已保存', 'success');
    });

    // 导出
    U.delegate(root, 'click', '[data-export]', () => {
      U.download('公考工作台备份_' + U.todayStr() + '.json', App.store.exportJSON());
      U.toast('已导出完整备份', 'success');
    });

    // 导入
    U.delegate(root, 'click', '[data-import]', () => U.$('[data-import-file]', root).click());
    U.$('[data-import-file]', root).addEventListener('change', e => {
      const f = e.target.files[0]; if (!f) return;
      U.readFileAs(f, 'text').then(txt => {
        try { App.store.importJSON(txt); U.toast('导入成功，正在刷新…', 'success'); setTimeout(() => App.router.go('#/dashboard'), 200); }
        catch (err) { U.toast('文件解析失败，不是有效的备份', 'error'); }
      }).catch(() => U.toast('读取文件失败', 'error'));
      e.target.value = '';
    });

    // 清空
    U.delegate(root, 'click', '[data-reset]', () => {
      U.confirmDialog('清空本地数据', '将删除全部刷题记录、错题、知识库与聊天记录，且无法恢复。确定继续？', () => {
        App.store.reset();
        U.toast('已清空，正在重新初始化…', 'success');
        setTimeout(() => App.router.go('#/dashboard'), 200);
      });
    });
  }

  App.router.register('settings', { render });
})(window);
