/* ==========================================================================
   views/knowledge.js — AI 知识库（Notion 风格）
   支持上传 PDF/Word/TXT/图片；文件列表 / 知识分类 / 搜索 / 知识标签 / AI 总结
   ========================================================================== */
(function (global) {
  'use strict';
  const App = global.App;
  const U = App.utils, UI = App.ui;
  const { icon, escapeHtml } = U;

  const CATS = App.data.kbCategories;
  const catName = (k) => { const c = CATS.find(x => x.key === k); return c ? c.name : k; };
  const catColor = (k) => { const c = CATS.find(x => x.key === k); return c ? c.color : '#4b5670'; };

  let state = { filter: 'all', q: '', view: 'grid', busy: false };

  function render(root) {
    const s = App.store.state;
    state.view = (s.settings.ui.kbView === 'list') ? 'list' : 'grid';

    root.innerHTML =
      '<div class="view-head"><div><h1>知识库</h1>' +
      '<div class="sub">上传讲义 / 真题 / 笔记，AI 自动摘要打标，全库秒级检索</div></div>' +
      '<div class="flex gap-8">' +
      '<span class="tag ' + (App.ai._http.isReal() ? 'tag-success' : 'tag-warning') + ' tag-lg">' +
      '<span class="dot-live"></span> ' + (App.ai._http.isReal() ? '真实模型已接入' : '模拟接口演示中') + '</span>' +
      '<button class="btn btn-ghost" data-export>' + icon('download', 15) + '导出</button>' +
      '<button class="btn btn-primary" data-new>' + icon('plus', 15) + '新建</button>' +
      '<button class="btn btn-primary" data-upload>' + icon('upload', 15) + '上传资料</button></div></div>' +

      '<div class="kb-layout">' +
      /* 左侧分类 */
      '<aside class="kb-side"><div class="card card-pad">' +
      '<div class="kpi-label mb-8">知识分类</div>' +
      '<div data-cats></div>' +
      '<button class="btn btn-ghost btn-block mt-12" data-upload-2>' + icon('upload', 14) + '拖拽 / 点击上传</button>' +
      '</div></aside>' +

      /* 右侧主区 */
      '<div>' +
      '<div class="card card-pad mb-16">' +
      '<div class="flex gap-10" style="align-items:center">' +
      '<div class="topbar-search" style="flex:1"><span class="t3">' + icon('search', 15) + '</span>' +
      '<input placeholder="搜索文件名、内容或标签…" data-kb-search><kbd>↵</kbd></div>' +
      '<div class="segmented" data-view-toggle>' +
      '<button data-v="grid" class="' + (state.view === 'grid' ? 'active' : '') + '">' + icon('grid', 14) + ' 卡片</button>' +
      '<button data-v="list" class="' + (state.view === 'list' ? 'active' : '') + '">' + icon('list', 14) + ' 列表</button>' +
      '</div></div></div>' +
      '<div data-list></div>' +
      '</div></div>' +

      '<input type="file" accept=".pdf,.doc,.docx,.txt,.md,.markdown,.png,.jpg,.jpeg,.webp,.gif" multiple style="display:none" data-file>';

    // 首次进入写入示例文档
    if (!s.seeded) {
      App.store.update(st => {
        st.docs = App.data.sampleDocs(U);
        st.seeded = true;
      }, 'seed');
    }

    paintCats(); paintList(); bind(root);
  }

  /* ---------------- 分类侧栏 ---------------- */
  function paintCats() {
    const box = U.$('[data-cats]');
    const docs = App.store.state.docs;
    const cnt = (k) => k === 'all' ? docs.length : docs.filter(d => d.category === k).length;
    box.innerHTML = CATS.map(c =>
      '<button class="kb-cat' + (state.filter === c.key ? ' active' : '') + '" data-cat="' + c.key + '">' +
      '<span class="nav-icon" style="color:' + c.color + '">' + icon(c.icon, 16) + '</span>' +
      '<span>' + escapeHtml(c.name) + '</span><span class="cnt">' + cnt(c.key) + '</span></button>'
    ).join('');
  }

  /* ---------------- 列表 ---------------- */
  function filtered() {
    const q = state.q.trim().toLowerCase();
    return App.store.state.docs
      .filter(d => state.filter === 'all' || d.category === state.filter)
      .filter(d => {
        if (!q) return true;
        const hay = [d.name, d.summary, d.text, (d.tags || []).join(' ')].join(' ').toLowerCase();
        return hay.indexOf(q) > -1;
      })
      .sort((a, b) => b.created - a.created);
  }

  function paintList() {
    const box = U.$('[data-list]');
    const list = filtered();
    if (!list.length) {
      box.innerHTML = '<div class="card"><div class="card-body">' +
        UI.empty('book', state.q ? '没有匹配的资料' : '知识库还是空的',
          state.q ? '换个关键词试试' : '点击右上角「上传资料」或「新建」开始积累你的备考资料',
          '<button class="btn btn-primary" data-upload>' + icon('upload', 14) + ' 上传资料</button>') +
        '</div></div>';
      return;
    }
    if (state.view === 'grid') {
      box.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px';
      box.innerHTML = list.map(docCard).join('');
    } else {
      box.style.cssText = 'display:flex;flex-direction:column;gap:10px';
      box.innerHTML = list.map(docRow).join('');
    }
  }

  function docCard(d) {
    const fi = UI.fileIconClass(d.ext);
    return '<div class="doc-card" data-doc="' + d.id + '">' +
      '<button class="doc-star' + (d.starred ? ' on' : '') + '" data-star="' + d.id + '" title="收藏">' + icon('star', 15) + '</button>' +
      '<div class="flex items-center gap-10">' +
      '<div class="file-ico ' + fi[0] + '">' + fi[1] + '</div>' +
      '<div style="min-width:0" class="flex-1">' +
      '<div class="fs-13 fw-6 ellipsis">' + escapeHtml(d.name) + '</div>' +
      '<div class="t3 fs-12">' + U.fmtSize(d.size) + ' · ' + U.relTime(d.created) + '</div></div></div>' +
      '<div class="t3 fs-12" style="overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;min-height:32px">' +
      escapeHtml(d.summary || '尚未生成摘要') + '</div>' +
      (d.tags && d.tags.length ? '<div class="flex gap-6 flex-wrap">' + UI.tags(d.tags, 'tag-outline') + '</div>' : '') +
      '<div class="flex items-center justify-between" style="margin-top:auto">' +
      '<span class="tag" style="background:' + hexA(catColor(d.category), .12) + ';color:' + catColor(d.category) + '">' + escapeHtml(catName(d.category)) + '</span>' +
      '</div></div>';
  }

  function docRow(d) {
    const fi = UI.fileIconClass(d.ext);
    return '<div class="doc-card" data-doc="' + d.id + '" style="flex-direction:row;align-items:center;gap:14px;padding:12px 14px">' +
      '<button class="doc-star' + (d.starred ? ' on' : '') + '" data-star="' + d.id + '" title="收藏" style="position:static;opacity:1">' + icon('star', 15) + '</button>' +
      '<div class="file-ico ' + fi[0] + '" style="width:42px;height:42px">' + fi[1] + '</div>' +
      '<div style="min-width:0" class="flex-1">' +
      '<div class="fw-6 fs-13 ellipsis">' + escapeHtml(d.name) + '</div>' +
      '<div class="t3 fs-12 ellipsis" style="margin-top:2px">' + escapeHtml(d.summary || '尚未生成摘要') + '</div></div>' +
      (d.tags && d.tags.length ? '<div class="flex gap-5 flex-wrap" style="max-width:240px;justify-content:flex-end">' + d.tags.slice(0, 3).map(t => '<span class="tag tag-outline">' + escapeHtml(t) + '</span>').join('') + '</div>' : '') +
      '<span class="tag" style="background:' + hexA(catColor(d.category), .12) + ';color:' + catColor(d.category) + '">' + escapeHtml(catName(d.category)) + '</span>' +
      '<span class="t4 fs-11" style="white-space:nowrap">' + U.fmtSize(d.size) + '</span></div>';
  }

  /* ---------------- 上传 / 新建 ---------------- */
  async function handleFiles(files) {
    if (!files || !files.length) return;
    const list = Array.prototype.slice.call(files);
    let ok = 0;
    for (const f of list) {
      const name = f.name || '未命名文件';
      const ext = (name.split('.').pop() || 'bin').toLowerCase();
      const id = U.uid('doc');
      const blobKey = 'blob_' + id;
      const isText = ['txt', 'md', 'markdown'].indexOf(ext) > -1;
      let text = '';
      if (isText) {
        try { text = await U.readFileAs(f, 'text'); } catch (e) { text = ''; }
      } else if (f.type.indexOf('image') === 0) {
        try { text = ''; } catch (e) {}
      }
      // 存原始文件到 IndexedDB（非文本）
      if (!isText) { try { await App.db.put(blobKey, f); } catch (e) {} }

      const meta = {
        id, name, ext, size: f.size, category: 'xingce', tags: [],
        summary: '', keypoints: [], text, created: Date.now(), starred: false, blobKey: isText ? '' : blobKey
      };
      App.store.update(s => s.docs.unshift(meta), 'docs');
      ok++;
      U.toast('已添加「' + name + '」，正在生成 AI 摘要…', 'success');

      // 调 AI 摘要（异步，不阻塞其余文件）
      (async () => {
        try {
          const r = await App.ai.summarizeDoc(text, name, ext);
          App.store.update(s => {
            const d = s.docs.find(x => x.id === id);
            if (d) {
              if (r.summary) d.summary = r.summary;
              if (r.keypoints && r.keypoints.length) d.keypoints = r.keypoints;
              if (r.tags && r.tags.length) d.tags = r.tags;
              if (r.category) d.category = r.category;
            }
          }, 'docs');
          paintCats(); paintList();
        } catch (e) { console.warn('摘要失败', e); }
      })();
    }
    paintCats(); paintList();
  }

  /* ---------------- 详情抽屉 ---------------- */
  async function openDoc(id) {
    const d = App.store.state.docs.find(x => x.id === id);
    if (!d) return;
    const fi = UI.fileIconClass(d.ext);
    let preview = '';
    const isImg = ['png', 'jpg', 'jpeg', 'webp', 'gif'].indexOf(d.ext) > -1;
    const isTextFl = ['txt', 'md', 'markdown'].indexOf(d.ext) > -1;

    if (isImg && d.blobKey) {
      const blob = await App.db.get(d.blobKey);
      if (blob) {
        const url = URL.createObjectURL(blob);
        preview = '<div class="flex justify-center"><img src="' + url + '" style="max-width:100%;max-height:300px;border-radius:10px"></div>';
      }
    } else if (isTextFl && d.text) {
      preview = '<pre class="doc-text">' + escapeHtml(d.text) + '</pre>';
    } else if (d.blobKey) {
      preview = '<div class="t3 fs-13 mb-10">该文件为 ' + d.ext.toUpperCase() + ' 二进制格式，浏览器内可直接下载查看：</div>';
    } else if (d.text) {
      preview = '<pre class="doc-text">' + escapeHtml(d.text) + '</pre>';
    }

    const content = '<div class="flex items-center gap-12 mb-14">' +
      '<div class="file-ico ' + fi[0] + '" style="width:48px;height:48px;font-size:13px">' + fi[1] + '</div>' +
      '<div style="min-width:0"><div class="fs-16 fw-7 ellipsis">' + escapeHtml(d.name) + '</div>' +
      '<div class="t3 fs-12">' + U.fmtSize(d.size) + ' · 上传于 ' + U.fmtDate(d.created, true) + '</div></div>' +
      (d.starred ? '<button class="icon-btn" data-star-in="' + d.id + '" style="margin-left:auto;color:var(--warning-500)">' + icon('star', 17) + '</button>' :
        '<button class="icon-btn" data-star-in="' + d.id + '" style="margin-left:auto">' + icon('star', 17) + '</button>') + '</div>' +

      (preview ? '<div class="mb-14">' + preview + '</div>' : '') +

      (d.blobKey ? '<div class="flex gap-8 mb-14"><button class="btn btn-soft btn-sm" data-open="' + d.id + '">' + icon('eye', 14) + ' 打开 / 下载</button></div>' : '') +

      '<div class="ai-summary mb-14"><h5>' + icon('sparkles', 13) + ' AI 摘要</h5>' +
      '<p>' + escapeHtml(d.summary || '（暂无，可点击下方按钮生成）') + '</p></div>' +

      (d.keypoints && d.keypoints.length ? '<div class="mb-14"><div class="kpi-label mb-8">核心要点</div>' +
        '<div class="flex gap-8 flex-col" style="gap:8px">' + d.keypoints.map(k =>
          '<div class="flex gap-8"><span class="opt-key" style="width:18px;height:18px;font-size:10px;background:var(--brand-50);color:var(--brand-600)">·</span><span class="flex-1 fs-13">' + escapeHtml(k) + '</span></div>').join('') + '</div></div>' : '') +

      '<div class="mb-12"><div class="kpi-label mb-8">知识分类</div>' +
      '<select class="input" data-cat-in="' + d.id + '">' + CATS.filter(c => c.key !== 'all').map(c =>
        '<option value="' + c.key + '"' + (d.category === c.key ? ' selected' : '') + '>' + escapeHtml(c.name) + '</option>').join('') + '</select></div>' +

      '<div class="mb-6"><div class="kpi-label mb-8">知识标签</div>' +
      '<div class="flex gap-6 flex-wrap" data-tags-in="' + d.id + '">' +
      (d.tags || []).map((t, i) => '<span class="tag tag-purple">' + escapeHtml(t) + '<button class="tag-x" data-rmtag="' + i + '" style="margin-left:4px;border:none;background:none;cursor:pointer;color:inherit;font-size:12px">×</button></span>').join('') +
      '</div>' +
      '<div class="flex gap-6 mt-8"><input class="input flex-1" placeholder="输入标签后回车" data-tagin="' + d.id + '" style="height:32px"><button class="btn btn-soft btn-sm" data-addtag="' + d.id + '">添加</button></div></div>';

    U.drawer({
      title: '资料详情', desc: d.ext.toUpperCase() + ' · ' + catName(d.category),
      content,
      actions: [
        { label: '重新生成 AI 总结', kind: 'soft', icon: 'refresh', onClick: () => { reSummarize(d.id); return false; } },
        { label: '删除', kind: 'danger', icon: 'trash', onClick: () => { removeDoc(d.id); } },
        { label: '完成', kind: 'primary' }
      ]
    });

    // 抽屉内事件（drawer 内容已是 DOM，直接绑定）
    const body = document.querySelector('.drawer-body');
    if (body) {
      U.delegate(body, 'click', '[data-star-in]', (e, t) => {
        const did = t.getAttribute('data-star-in');
        App.store.update(s => { const x = s.docs.find(d => d.id === did); if (x) x.starred = !x.starred; }, 'docs');
        paintCats(); paintList(); openDoc(did);
      });
      U.delegate(body, 'change', '[data-cat-in]', (e, t) => {
        const did = t.getAttribute('data-cat-in');
        App.store.update(s => { const x = s.docs.find(d => d.id === did); if (x) x.category = t.value; }, 'docs');
        paintCats();
      });
      U.delegate(body, 'click', '[data-rmtag]', (e, t) => {
        const wrap = t.closest('[data-tags-in]'); const did = wrap && wrap.getAttribute('data-tags-in');
        const idx = +t.getAttribute('data-rmtag');
        App.store.update(s => { const x = s.docs.find(d => d.id === did); if (x) x.tags.splice(idx, 1); }, 'docs');
        openDoc(did);
      });
      U.delegate(body, 'click', '[data-addtag]', (e, t) => {
        const did = t.getAttribute('data-addtag');
        const inp = U.$('[data-tagin="' + did + '"]', body);
        const v = inp.value.trim();
        if (!v) return;
        App.store.update(s => { const x = s.docs.find(d => d.id === did); if (x && x.tags.indexOf(v) < 0) x.tags.push(v); }, 'docs');
        openDoc(did);
      });
      U.delegate(body, 'keydown', '[data-tagin]', (e, t) => {
        if (e.key === 'Enter') { e.preventDefault(); const add = U.$('[data-addtag="' + t.getAttribute('data-tagin') + '"]', body); add && add.click(); }
      });
      U.delegate(body, 'click', '[data-open]', (e, t) => {
        const did = t.getAttribute('data-open');
        const x = App.store.state.docs.find(d => d.id === did);
        if (x && x.blobKey) {
          App.db.get(x.blobKey).then(b => {
            if (b) { const url = URL.createObjectURL(b); const a = U.el('a', { href: url, download: x.name }); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); }
          });
        }
      });
    }
  }

  async function reSummarize(id) {
    const d = App.store.state.docs.find(x => x.id === id);
    if (!d) return;
    U.toast('正在重新生成 AI 摘要…', 'info');
    try {
      const r = await App.ai.summarizeDoc(d.text || '', d.name, d.ext);
      App.store.update(s => { const x = s.docs.find(d => d.id === id); if (x) { if (r.summary) x.summary = r.summary; if (r.keypoints) x.keypoints = r.keypoints; if (r.tags) x.tags = r.tags; if (r.category) x.category = r.category; } }, 'docs');
      paintCats(); paintList();
      U.toast('摘要已更新', 'success');
      openDoc(id);
    } catch (e) { U.toast('生成失败', 'error'); }
  }

  function removeDoc(id) {
    const d = App.store.state.docs.find(x => x.id === id);
    U.confirmDialog('删除资料', '确定删除「' + (d ? d.name : '') + '」？该操作不可撤销。', () => {
      App.store.update(s => {
        s.docs = s.docs.filter(x => x.id !== id);
      }, 'docs');
      if (d && d.blobKey) App.db.del(d.blobKey).catch(() => {});
      paintCats(); paintList();
      U.toast('已删除', 'success');
    });
  }

  function newDoc() {
    const nameIn = U.el('input', { class: 'input', placeholder: '例如：图形推理规律总结.md' });
    const catSel = U.el('select', { class: 'input' });
    CATS.filter(c => c.key !== 'all').forEach(c => { const o = U.el('option', { value: c.key }); o.textContent = c.name; catSel.appendChild(o); });
    const txt = U.el('textarea', { class: 'textarea', placeholder: '粘贴或输入资料正文…支持 Markdown', style: { minHeight: '160px' } });
    const wrap = U.el('div', {}, [
      U.el('div', { class: 'kpi-label mb-8', text: '资料名称' }), nameIn,
      U.el('div', { class: 'kpi-label mb-8 mt-12', text: '知识分类' }), catSel,
      U.el('div', { class: 'kpi-label mb-8 mt-12', text: '正文内容' }), txt
    ]);
    U.modal({
      title: '新建资料', desc: '可记录笔记、整理错题或粘贴范文',
      content: wrap,
      actions: [{
        label: '创建并生成摘要', kind: 'primary', onClick: () => {
          const name = nameIn.value.trim() || '未命名资料.md';
          const ext = (name.split('.').pop() || 'md').toLowerCase();
          const text = txt.value;
          const id = U.uid('doc');
          App.store.update(s => s.docs.unshift({
            id, name, ext, size: text.length * 2, category: catSel.value, tags: [],
            summary: '', keypoints: [], text, created: Date.now(), starred: false, blobKey: ''
          }), 'docs');
          paintCats(); paintList();
          U.toast('已创建，正在生成 AI 摘要…', 'success');
          App.ai.summarizeDoc(text, name, ext).then(r => {
            App.store.update(s => { const d = s.docs.find(x => x.id === id); if (d) { if (r.summary) d.summary = r.summary; if (r.keypoints) d.keypoints = r.keypoints; if (r.tags) d.tags = r.tags; if (r.category) d.category = r.category; } }, 'docs');
            paintCats(); paintList();
          }).catch(() => {});
        }
      }, { label: '取消', kind: 'ghost' }]
    });
  }

  /* ---------------- 事件 ---------------- */
  function bind(root) {
    const fileInput = U.$('[data-file]', root);
    U.delegate(root, 'click', '[data-upload],[data-upload-2]', () => fileInput.click());
    fileInput.addEventListener('change', e => { handleFiles(e.target.files); e.target.value = ''; });

    // 拖拽到整个列表区
    const listWrap = U.$('[data-list]', root);
    const dzCls = 'kb-dragging';
    root.addEventListener('dragover', e => { if (e.dataTransfer && Array.from(e.dataTransfer.types).indexOf('Files') > -1) { e.preventDefault(); listWrap && listWrap.classList.add(dzCls); } });
    root.addEventListener('dragleave', e => { if (e.target === listWrap) listWrap && listWrap.classList.remove(dzCls); });
    root.addEventListener('drop', e => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        e.preventDefault(); listWrap && listWrap.classList.remove(dzCls); handleFiles(e.dataTransfer.files);
      }
    });

    U.delegate(root, 'click', '[data-cat]', (e, t) => { state.filter = t.getAttribute('data-cat'); paintCats(); paintList(); });
    U.delegate(root, 'click', '[data-doc]', (e, t) => { if (e.target.closest('[data-star]')) return; openDoc(t.getAttribute('data-doc')); });
    U.delegate(root, 'click', '[data-star]', (e, t) => {
      e.stopPropagation();
      const id = t.getAttribute('data-star');
      App.store.update(s => { const d = s.docs.find(x => x.id === id); if (d) d.starred = !d.starred; }, 'docs');
      paintCats(); paintList();
    });
    U.delegate(root, 'click', '[data-new]', newDoc);
    U.delegate(root, 'click', '[data-export]', () => {
      const data = { exportedAt: Date.now(), docs: App.store.state.docs.map(d => { const { text, ...rest } = d; return rest; }) };
      U.download('知识库清单_' + U.todayStr() + '.json', JSON.stringify(data, null, 2));
      U.toast('已导出资料清单', 'success');
    });

    U.delegate(root, 'click', '[data-v]', (e, t) => {
      state.view = t.getAttribute('data-v');
      App.store.update(s => { s.settings.ui.kbView = state.view; }, 'ui');
      U.$$('[data-v]', root).forEach(b => b.classList.toggle('active', b.getAttribute('data-v') === state.view));
      paintList();
    });

    const search = U.$('[data-kb-search]', root);
    if (search) search.addEventListener('input', U.debounce(e => { state.q = e.target.value; paintList(); }, 160));
  }

  function hexA(hex, a) {
    const h = (hex || '#4b5670').replace('#', '');
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  App.router.register('knowledge', { render });
})(window);
