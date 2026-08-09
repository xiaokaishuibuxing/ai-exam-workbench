/* ==========================================================================
   views/photo.js — AI 拍照解题
   流程：图片上传 → OCR 识别文字 → AI 分析题型 → 返回答案 → 生成详细解析
   ========================================================================== */
(function (global) {
  'use strict';
  const App = global.App;
  const U = App.utils, UI = App.ui;
  const { icon, escapeHtml } = U;

  const STEPS = [
    { key: 'upload', title: '图片上传', desc: '读取并压缩图片，准备送入识别引擎' },
    { key: 'ocr', title: 'OCR 文字识别', desc: '提取题干、选项与材料文本' },
    { key: 'classify', title: 'AI 题型分析', desc: '判断所属模块、题型与难度' },
    { key: 'answer', title: '生成答案', desc: '推理并给出最优选项' },
    { key: 'analysis', title: '生成详细解析', desc: '输出分步解题过程与知识点' }
  ];

  let state = null;
  let pasteHandler = null;

  function render(root) {
    state = { dataUrl: '', fileName: '', stepIdx: -1, ocrText: '', cls: null, sol: null, running: false };

    root.innerHTML =
      '<div class="view-head"><div><h1>AI 拍照解题</h1>' +
      '<div class="sub">上传题目照片，自动完成识别 → 判题型 → 出答案 → 给解析全流程</div></div>' +
      '<div class="flex gap-8">' +
      '<span class="tag ' + (App.ai._http.isReal() ? 'tag-success' : 'tag-warning') + ' tag-lg">' +
      '<span class="dot-live"></span> ' + (App.ai._http.isReal() ? '真实模型已接入' : '模拟接口演示中') + '</span>' +
      '<button class="btn btn-ghost" data-history>' + icon('clock', 15) + '识别历史</button></div></div>' +

      '<div class="grid grid-split">' +
      /* 左：上传区 */
      '<div class="flex-col gap-16" style="align-self:start">' +
      '<div class="card">' + UI.cardHead('题目图片', '支持 JPG / PNG / WEBP，可直接 Ctrl+V 粘贴') +
      '<div class="card-body"><div data-upload-area></div>' +
      '<div class="flex gap-8 mt-12">' +
      '<button class="btn btn-primary flex-1" data-run disabled>' + icon('scan', 15) + '开始识别解题</button>' +
      '<button class="btn btn-ghost" data-sample title="生成一张示例题目图片">' + icon('image', 15) + '示例</button>' +
      '</div>' +
      '<input type="file" accept="image/*" style="display:none" data-file></div></div>' +

      '<div class="card">' + UI.cardHead('处理流程', '实时状态') +
      '<div class="card-body"><div class="pipeline" data-pipeline></div></div></div>' +

      '<div class="card">' + UI.cardHead('识别历史', '最近 6 次') +
      '<div class="card-body tight" data-history-list></div></div>' +
      '</div>' +

      /* 右：结果区 */
      '<div class="flex-col gap-16" data-result></div>' +
      '</div>';

    paintUpload(); paintPipeline(); paintHistory(); paintResult();
    bind(root);

    // 支持粘贴上传
    pasteHandler = async (e) => {
      const items = (e.clipboardData || {}).items || [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') === 0) {
          const f = items[i].getAsFile();
          await loadFile(f);
          U.toast('已粘贴图片', 'success');
          break;
        }
      }
    };
    document.addEventListener('paste', pasteHandler);
  }

  function unmount() { if (pasteHandler) document.removeEventListener('paste', pasteHandler); pasteHandler = null; }

  /* ---------------- 上传区 ---------------- */
  function paintUpload() {
    const box = U.$('[data-upload-area]');
    if (!state.dataUrl) {
      box.innerHTML = '<div class="dropzone" data-dz>' +
        '<div class="dz-ico">' + icon('camera', 24) + '</div>' +
        '<div class="dz-title">点击上传 / 拖拽图片到此处</div>' +
        '<div class="dz-sub">支持手机拍照、截图，也可以按 Ctrl+V 直接粘贴</div>' +
        '<div class="flex gap-6 justify-center mt-12"><span class="tag">JPG</span><span class="tag">PNG</span><span class="tag">WEBP</span><span class="tag">≤ 8MB</span></div>' +
        '</div>';
    } else {
      box.innerHTML = '<div class="preview-wrap" data-preview>' +
        '<img src="' + state.dataUrl + '" alt="题目图片">' +
        (state.running && state.stepIdx <= 1 ? '<div class="scan-line"></div>' : '') +
        '<div class="preview-tools">' +
        '<button data-replace title="更换图片">' + icon('refresh', 15) + '</button>' +
        '<button data-remove title="移除">' + icon('trash', 15) + '</button></div></div>' +
        '<div class="flex justify-between items-center mt-8 fs-12 t3">' +
        '<span class="ellipsis" style="max-width:60%">' + escapeHtml(state.fileName || '粘贴的图片') + '</span>' +
        '<span>' + (state.running ? '处理中…' : '就绪') + '</span></div>';
    }
  }

  /* ---------------- 流水线 ---------------- */
  function paintPipeline() {
    const box = U.$('[data-pipeline]');
    box.innerHTML = STEPS.map((s, i) => {
      const done = i < state.stepIdx;
      const active = i === state.stepIdx;
      return '<div class="pipe-step' + (done ? ' done' : active ? ' active' : '') + '">' +
        '<div class="pipe-rail"><div class="pipe-dot">' + (done ? icon('check', 12, 3) : (i + 1)) + '</div>' +
        (i < STEPS.length - 1 ? '<div class="pipe-line"></div>' : '') + '</div>' +
        '<div class="pipe-body"><div class="pipe-title">' + escapeHtml(s.title) +
        (active ? ' <span class="typing"><i></i><i></i><i></i></span>' : '') + '</div>' +
        '<div class="pipe-desc">' + escapeHtml(s.desc) + '</div></div></div>';
    }).join('');
  }

  /* ---------------- 结果区 ---------------- */
  function paintResult() {
    const box = U.$('[data-result]');
    if (!state.ocrText && !state.running) {
      box.innerHTML = '<div class="card"><div class="card-body">' +
        UI.empty('scan', '等待上传题目图片', '左侧上传后点击「开始识别解题」，结果将在此展示') +
        '</div></div>' + capabilityCard();
      return;
    }

    let html = '';

    /* 1. 题目内容 */
    html += '<div class="card">' +
      UI.cardHead('题目内容', 'OCR 识别结果（可手动修正后重新解题）',
        state.ocrText ? '<div class="flex gap-6"><span class="tag tag-success">置信度 ' + Math.round((state.ocrConf || .95) * 100) + '%</span>' +
          '<button class="btn btn-ghost btn-sm" data-copy>' + icon('copy', 13) + '复制</button></div>' : '') +
      '<div class="card-body">' +
      (state.ocrText
        ? '<textarea class="textarea" data-ocr style="min-height:130px;font-size:13.5px">' + escapeHtml(state.ocrText) + '</textarea>' +
        '<div class="flex justify-end mt-8"><button class="btn btn-soft btn-sm" data-resolve>' + icon('refresh', 13) + '按修正后的文本重新解题</button></div>'
        : '<div class="skeleton" style="height:100px"></div>') +
      '</div></div>';

    /* 2. 题型分类 + 答案 */
    html += '<div class="grid grid-2">';
    html += '<div class="card"><div class="card-body">' +
      '<div class="kpi-label mb-8">题型分类</div>' +
      (state.cls
        ? '<div class="fs-18 fw-7 mb-8">' + escapeHtml(state.cls.type || '') + '</div>' +
        '<div class="flex gap-6 flex-wrap"><span class="tag tag-brand">' + escapeHtml((App.store.MODULE_MAP[state.cls.module] || {}).name || state.cls.module) + '</span>' +
        '<span class="tag tag-warning">难度 ' + '★'.repeat(state.cls.difficulty || 3) + '</span></div>'
        : '<div class="skeleton" style="height:52px"></div>') +
      '</div></div>';
    html += '<div class="card"><div class="card-body">' +
      '<div class="kpi-label mb-8">正确答案</div>' +
      (state.sol
        ? '<div class="flex items-center gap-12"><span class="opt-key" style="width:46px;height:46px;font-size:22px;background:var(--success-500);color:#fff">' +
        escapeHtml(String(state.sol.answer).slice(0, 2)) + '</span>' +
        '<div><div class="fs-13 t2">AI 置信度</div><div class="bar mt-4" style="width:120px"><i class="g-green" style="width:' +
        Math.round((state.sol.confidence || .92) * 100) + '%"></i></div>' +
        '<div class="fs-12 t3 mt-4">' + Math.round((state.sol.confidence || .92) * 100) + '%</div></div></div>'
        : '<div class="skeleton" style="height:52px"></div>') +
      '</div></div></div>';

    /* 3. 解题步骤 */
    html += '<div class="card">' + UI.cardHead('解题步骤', '分步推导过程') + '<div class="card-body">' +
      (state.sol
        ? state.sol.steps.map((s, i) =>
          '<div class="flex gap-10 mb-10 anim-fade-up" style="animation-delay:' + (i * 60) + 'ms">' +
          '<span class="opt-key" style="width:24px;height:24px;background:var(--brand-50);color:var(--brand-600)">' + (i + 1) + '</span>' +
          '<span class="flex-1 fs-13.5" style="line-height:1.85">' + escapeHtml(s) + '</span></div>').join('')
        : [1, 2, 3].map(() => '<div class="skeleton" style="height:16px;margin-bottom:12px"></div>').join('')) +
      (state.sol ? '<div class="analysis-box"><h4>' + icon('sparkles', 14) + ' 考点解析与易错提醒</h4><p>' + escapeHtml(state.sol.analysis) + '</p></div>' : '') +
      '</div></div>';

    /* 4. 知识点 + 相似题 */
    html += '<div class="grid grid-2">';
    html += '<div class="card">' + UI.cardHead('涉及知识点', '点击可加入知识库') + '<div class="card-body">' +
      (state.sol
        ? '<div class="flex gap-8 flex-wrap">' + (state.sol.points || []).map(p =>
          '<span class="tag tag-purple tag-lg pointer" data-point="' + escapeHtml(p) + '">' + icon('tag', 12) + escapeHtml(p) + '</span>').join('') + '</div>' +
        '<button class="btn btn-ghost btn-sm btn-block mt-12" data-save-kb>' + icon('book', 14) + '整题保存到知识库</button>'
        : '<div class="skeleton" style="height:40px"></div>') +
      '</div></div>';

    html += '<div class="card">' + UI.cardHead('相似题推荐', '同类考点强化') + '<div class="card-body tight">' +
      (state.sol
        ? ((state.sol.similar || []).length
          ? state.sol.similar.map(s => '<div class="list-item pointer" data-sim="' + s.id + '">' +
            '<span class="kpi-ico" style="width:30px;height:30px;background:var(--brand-50);color:var(--brand-500)">' + icon('file', 15) + '</span>' +
            '<span class="flex-1" style="min-width:0"><div class="fs-13 fw-5 ellipsis">' + escapeHtml(s.title) + '</div>' +
            '<div class="t3 fs-12">' + escapeHtml(s.type) + ' · 难度 ' + '★'.repeat(s.difficulty || 3) + '</div></span>' +
            icon('chevronRight', 15) + '</div>').join('')
          : '<div class="t3 fs-13">暂无匹配的相似题</div>')
        : '<div class="skeleton" style="height:60px"></div>') +
      '</div></div></div>';

    box.innerHTML = html;
  }

  function capabilityCard() {
    return '<div class="card"><div class="card-body">' +
      '<h3 class="fs-15 mb-12">模块能力说明</h3>' +
      '<div class="grid grid-2 gap-12">' +
      [['scan', 'OCR 文字识别', '支持印刷体题干、选项与图表说明文字提取'],
      ['brain', '题型智能判断', '自动归类到行测五大模块与细分题型'],
      ['target', '答案推理', '给出最优选项并输出置信度'],
      ['bulb', '分步解析', '拆解解题步骤、标注知识点与易错陷阱']].map(x =>
        '<div class="flex gap-10"><span class="kpi-ico" style="background:var(--brand-50);color:var(--brand-500)">' + icon(x[0], 17) + '</span>' +
        '<div><div class="fs-13 fw-6">' + x[1] + '</div><div class="t3 fs-12">' + x[2] + '</div></div></div>').join('') +
      '</div>' +
      '<div class="ai-summary mt-16"><h5>' + icon('key', 13) + ' 接入真实 AI</h5>' +
      '<p>当前为模拟接口演示。在「设置 → AI 接口」填入任意 OpenAI 兼容服务的 Key（OpenAI / DeepSeek / 通义 / 智谱 / 本地 Ollama 均可），即可切换为真实多模态识别，业务代码零改动。</p></div>' +
      '</div></div>';
  }

  /* ---------------- 历史 ---------------- */
  function paintHistory() {
    const box = U.$('[data-history-list]');
    const list = App.store.state.photos.slice(0, 6);
    if (!list.length) { box.innerHTML = '<div class="t3 fs-13 text-center" style="padding:14px 0">暂无识别记录</div>'; return; }
    box.innerHTML = list.map(p => '<div class="list-item pointer" data-hid="' + p.id + '">' +
      '<img src="' + p.thumb + '" style="width:38px;height:38px;object-fit:cover;border-radius:8px;flex:none">' +
      '<span class="flex-1" style="min-width:0"><div class="fs-13 fw-5 ellipsis">' + escapeHtml((p.result && p.result.type) || '题目识别') + '</div>' +
      '<div class="t3 fs-12">' + U.relTime(p.created) + ' · 答案 ' + escapeHtml((p.result && p.result.answer) || '-') + '</div></span>' +
      '<button class="icon-btn" style="width:26px;height:26px" data-hdel="' + p.id + '">' + icon('x', 14) + '</button></div>').join('');
  }

  /* ---------------- 文件加载 ---------------- */
  async function loadFile(file) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { U.toast('图片过大，请压缩到 8MB 以内', 'warn'); return; }
    const dataUrl = await U.readFileAs(file, 'dataurl');
    state.dataUrl = dataUrl;
    state.fileName = file.name || '粘贴图片.png';
    state.stepIdx = -1; state.ocrText = ''; state.cls = null; state.sol = null;
    paintUpload(); paintPipeline(); paintResult();
    const btn = U.$('[data-run]'); if (btn) btn.disabled = false;
  }

  /** 生成一张示例题目图片（Canvas 绘制，便于无素材时体验） */
  function makeSampleImage() {
    const lines = U.pick(App.ai._mock.MOCK_STEMS).text.split('\n');
    const w = 720, lh = 34, h = 90 + lines.length * lh;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = '#fbfbf7'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8e8e0'; g.fillRect(0, 0, w, 46);
    g.fillStyle = '#6b7280'; g.font = '15px "PingFang SC", sans-serif';
    g.fillText('· 模拟试卷 · 第 ' + U.rand(11, 68) + ' 题', 24, 29);
    g.fillStyle = '#1a1a1a'; g.font = '17px "PingFang SC", sans-serif';
    lines.forEach((t, i) => {
      // 简单换行处理
      const maxChars = 40;
      const chunks = t.match(new RegExp('.{1,' + maxChars + '}', 'g')) || [''];
      chunks.forEach((ck, j) => g.fillText(ck, 26, 80 + (i + j) * lh));
    });
    g.strokeStyle = '#d8d8d0'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
    return c.toDataURL('image/jpeg', .92);
  }

  /* ---------------- 主流程 ---------------- */
  async function runPipeline(forceText) {
    if (state.running) return;
    if (!state.dataUrl) { U.toast('请先上传题目图片', 'warn'); return; }
    state.running = true;
    const runBtn = U.$('[data-run]');
    if (runBtn) { runBtn.disabled = true; runBtn.innerHTML = '<span class="spinner"></span> 处理中…'; }

    try {
      /* Step 1 上传 */
      state.stepIdx = 0; paintPipeline(); paintUpload(); paintResult();
      await U.sleep(420);

      /* Step 2 OCR */
      state.stepIdx = 1; paintPipeline(); paintUpload();
      if (forceText) {
        state.ocrText = forceText; state.ocrConf = 1;
      } else {
        const ocr = await App.ai.ocr(state.dataUrl, (partial) => {
          state.ocrText = partial; paintResult();
        });
        state.ocrText = ocr.text; state.ocrConf = ocr.confidence;
      }
      paintResult();

      /* Step 3 题型分析 */
      state.stepIdx = 2; paintPipeline(); paintUpload();
      state.cls = await App.ai.classify(state.ocrText);
      paintResult();

      /* Step 4 + 5 答案与解析 */
      state.stepIdx = 3; paintPipeline();
      const sol = await App.ai.solve(state.ocrText, state.cls);
      state.sol = sol;
      paintResult();

      state.stepIdx = 4; paintPipeline();
      await U.sleep(420);
      state.stepIdx = 5; paintPipeline();

      /* 存历史 */
      const thumb = await U.makeThumb(state.dataUrl, 180, .55);
      App.store.update(s => {
        s.photos.unshift({
          id: U.uid('p'), thumb, created: Date.now(),
          result: { type: state.cls.type, module: state.cls.module, answer: sol.answer, text: state.ocrText.slice(0, 400), steps: sol.steps, analysis: sol.analysis, points: sol.points }
        });
        s.photos = s.photos.slice(0, 12);
      }, 'photo');
      paintHistory();
      U.toast('解析完成，答案：' + sol.answer, 'success');
    } catch (e) {
      console.error(e);
      U.toast('处理失败：' + e.message, 'error');
      state.stepIdx = -1; paintPipeline();
    } finally {
      state.running = false;
      paintUpload();
      if (runBtn) { runBtn.disabled = false; runBtn.innerHTML = icon('scan', 15) + '重新识别解题'; }
    }
  }

  /* ---------------- 事件 ---------------- */
  function bind(root) {
    const fileInput = U.$('[data-file]', root);

    U.delegate(root, 'click', '[data-dz]', () => fileInput.click());
    U.delegate(root, 'click', '[data-replace]', () => fileInput.click());
    fileInput.addEventListener('change', e => { loadFile(e.target.files[0]); e.target.value = ''; });

    U.delegate(root, 'click', '[data-remove]', () => {
      state = { dataUrl: '', fileName: '', stepIdx: -1, ocrText: '', cls: null, sol: null, running: false };
      paintUpload(); paintPipeline(); paintResult();
      U.$('[data-run]').disabled = true;
    });

    // 拖拽
    const area = U.$('[data-upload-area]', root);
    ['dragenter', 'dragover'].forEach(ev => area.addEventListener(ev, e => {
      e.preventDefault(); const dz = U.$('[data-dz]', area); dz && dz.classList.add('dragover');
    }));
    ['dragleave', 'drop'].forEach(ev => area.addEventListener(ev, e => {
      e.preventDefault(); const dz = U.$('[data-dz]', area); dz && dz.classList.remove('dragover');
    }));
    area.addEventListener('drop', e => {
      e.preventDefault();
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f && f.type.indexOf('image') === 0) loadFile(f);
      else U.toast('请拖入图片文件', 'warn');
    });

    U.delegate(root, 'click', '[data-sample]', () => {
      state.dataUrl = makeSampleImage();
      state.fileName = '示例题目.jpg';
      state.stepIdx = -1; state.ocrText = ''; state.cls = null; state.sol = null;
      paintUpload(); paintPipeline(); paintResult();
      U.$('[data-run]').disabled = false;
      U.toast('已生成示例题目图片，点击「开始识别解题」体验', 'success');
    });

    U.delegate(root, 'click', '[data-run]', () => runPipeline());
    U.delegate(root, 'click', '[data-resolve]', () => {
      const t = U.$('[data-ocr]').value.trim();
      if (!t) { U.toast('题目内容不能为空', 'warn'); return; }
      runPipeline(t);
    });
    U.delegate(root, 'click', '[data-copy]', () => U.copyText(state.ocrText));

    U.delegate(root, 'click', '[data-save-kb]', () => {
      App.store.update(s => {
        s.docs.unshift({
          id: U.uid('doc'), name: '[拍照解题] ' + (state.cls.type || '题目') + '.txt', ext: 'txt',
          size: state.ocrText.length * 2, category: 'cuoti', tags: (state.sol.points || []).slice(0, 3),
          starred: false, created: Date.now(),
          text: state.ocrText + '\n\n答案：' + state.sol.answer + '\n\n解题步骤：\n' + state.sol.steps.join('\n') + '\n\n解析：' + state.sol.analysis,
          summary: state.sol.analysis.slice(0, 100), keypoints: state.sol.steps.slice(0, 3), blobKey: ''
        });
      }, 'docs');
      U.toast('已保存到知识库', 'success');
    });

    U.delegate(root, 'click', '[data-point]', (e, t) => {
      const p = t.getAttribute('data-point');
      App.router.go('#/knowledge');
      setTimeout(() => { const b = U.$('[data-kb-search]'); if (b) { b.value = p; b.dispatchEvent(new Event('input')); } }, 140);
    });

    U.delegate(root, 'click', '[data-sim]', (e, t) => {
      const q = App.data.byId(t.getAttribute('data-sim'));
      if (q) App.router.go('#/practice/' + q.module);
    });

    U.delegate(root, 'click', '[data-hid]', (e, t) => {
      if (e.target.closest('[data-hdel]')) return;
      const p = App.store.state.photos.find(x => x.id === t.getAttribute('data-hid'));
      if (!p) return;
      U.drawer({
        title: '历史识别结果', desc: U.fmtDate(p.created, true),
        content: '<img src="' + p.thumb + '" style="width:100%;border-radius:12px;margin-bottom:16px">' +
          '<div class="qs-material">' + escapeHtml(p.result.text || '') + '</div>' +
          '<div class="flex gap-8 mb-12"><span class="tag tag-brand tag-lg">' + escapeHtml(p.result.type || '') + '</span>' +
          '<span class="tag tag-success tag-lg">答案 ' + escapeHtml(p.result.answer || '') + '</span></div>' +
          '<h4 class="fs-14 mb-8">解题步骤</h4>' +
          (p.result.steps || []).map((s, i) => '<div class="flex gap-8 mb-6"><span class="opt-key" style="width:20px;height:20px;font-size:11px">' + (i + 1) + '</span><span class="flex-1 fs-13">' + escapeHtml(s) + '</span></div>').join('') +
          '<div class="ai-summary mt-12"><h5>' + icon('sparkles', 13) + ' 解析</h5><p>' + escapeHtml(p.result.analysis || '') + '</p></div>',
        actions: [{ label: '关闭', kind: 'primary' }]
      });
    });

    U.delegate(root, 'click', '[data-hdel]', (e, t) => {
      e.stopPropagation();
      const id = t.getAttribute('data-hdel');
      App.store.update(s => { s.photos = s.photos.filter(x => x.id !== id); }, 'photo');
      paintHistory();
    });

    U.delegate(root, 'click', '[data-history]', () => {
      const list = App.store.state.photos;
      U.drawer({
        title: '识别历史', desc: '共 ' + list.length + ' 条记录',
        content: list.length ? list.map(p => '<div class="list-item">' +
          '<img src="' + p.thumb + '" style="width:44px;height:44px;object-fit:cover;border-radius:8px">' +
          '<span class="flex-1" style="min-width:0"><div class="fs-13 fw-6 ellipsis">' + escapeHtml(p.result.type || '') + '</div>' +
          '<div class="t3 fs-12">' + U.fmtDate(p.created, true) + ' · 答案 ' + escapeHtml(p.result.answer || '') + '</div></span></div>').join('')
          : UI.empty('camera', '暂无识别记录', '上传一张题目图片试试'),
        actions: [{
          label: '清空历史', kind: 'danger', onClick: () => {
            App.store.update(s => { s.photos = []; }, 'photo'); paintHistory(); U.toast('已清空', 'success');
          }
        }, { label: '关闭', kind: 'primary' }]
      });
    });
  }

  App.router.register('photo', { render, unmount });
})(window);
