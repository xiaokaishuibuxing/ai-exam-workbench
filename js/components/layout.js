/* ==========================================================================
   layout.js — 顶栏 + 左侧导航（组件化，可独立复用）
   ========================================================================== */
(function (global) {
  'use strict';
  const App = global.App;
  const U = App.utils;
  const { el, icon, escapeHtml } = U;

  /* 导航配置：改这里即可增删菜单 */
  const NAV = [
    {
      group: '概览', items: [
        { key: 'dashboard', route: '#/dashboard', icon: 'dashboard', name: '工作台' }
      ]
    },
    {
      group: '公考项目', items: [
        {
          key: 'xingce', icon: 'grid', name: '行测', expandable: true, children: [
            { key: 'data', route: '#/practice/data', name: '资料分析', dot: '#2f6bed' },
            { key: 'logic', route: '#/practice/logic', name: '逻辑推理', dot: '#7c5cf5' },
            { key: 'math', route: '#/practice/math', name: '数量关系', dot: '#f59e0b' },
            { key: 'verbal', route: '#/practice/verbal', name: '言语理解', dot: '#16a34a' },
            { key: 'common', route: '#/practice/common', name: '常识判断', dot: '#0ea5b7' }
          ]
        },
        { key: 'shenlun', route: '#/shenlun', icon: 'pen', name: '申论' },
        { key: 'mistakes', route: '#/mistakes', icon: 'alert', name: '错题中心', badgeKey: 'mistakes', badgeClass: 'hot' }
      ]
    },
    {
      group: 'AI 智能中心', items: [
        { key: 'photo', route: '#/photo', icon: 'camera', name: 'AI 拍照解题', badgeText: 'NEW', badgeClass: 'ai' },
        { key: 'assistant', route: '#/assistant', icon: 'brain', name: 'AI 助手' },
        { key: 'knowledge', route: '#/knowledge', icon: 'book', name: '知识库', badgeKey: 'docs' },
        { key: 'stats', route: '#/stats', icon: 'chart', name: '学习数据' }
      ]
    }
  ];

  const TITLES = {
    dashboard: ['工作台', '你的备考全景视图'],
    practice: ['专项练习', '行测五大模块智能刷题'],
    shenlun: ['申论写作', '在线写作与 AI 五维批改'],
    mistakes: ['错题中心', '错因归类与二次巩固'],
    photo: ['AI 拍照解题', 'OCR 识别 · 题型判断 · 分步解析'],
    assistant: ['AI 助手', '备考问答与学习规划'],
    knowledge: ['知识库', '资料上传 · 智能摘要 · 全库检索'],
    stats: ['学习数据', '能力雷达与趋势洞察'],
    settings: ['系统设置', '账号、AI 接口与数据管理']
  };

  /* ------------------------------------------------------------------ */
  function renderSidebar(root) {
    const s = App.store.state;
    const stats = App.store.stats();
    const open = s.settings.ui.sidebarOpenGroups || [];
    const cur = App.router.parse();
    const activeKey = cur.name === 'practice' ? cur.params[0] : cur.name;

    let html = '<div class="sidebar-brand-mobile">' +
      '<div class="brand-logo">AI</div>' +
      '<div><div class="brand-name">AI 公考智能训练工作台</div>' +
      '<div class="brand-sub">SMART EXAM WORKBENCH</div></div></div>' +
      '<div class="sidebar-scroll">';

    NAV.forEach(g => {
      html += '<div class="nav-group-label">' + escapeHtml(g.group) + '</div>';
      g.items.forEach(it => {
        const badgeVal = it.badgeKey ? stats[it.badgeKey] : null;
        const badge = it.badgeText
          ? '<span class="nav-badge ' + (it.badgeClass || '') + '">' + it.badgeText + '</span>'
          : (badgeVal ? '<span class="nav-badge ' + (it.badgeClass || '') + '">' + badgeVal + '</span>' : '');

        if (it.expandable) {
          const isOpen = open.indexOf(it.key) > -1;
          const childActive = it.children.some(c => c.key === activeKey);
          html += '<button class="nav-item' + (isOpen ? ' expanded' : '') + (childActive && !isOpen ? ' active' : '') +
            '" data-toggle="' + it.key + '">' +
            '<span class="nav-icon">' + icon(it.icon, 17) + '</span>' +
            '<span class="nav-text">' + it.name + '</span>' +
            '<span class="nav-caret">' + icon('chevronRight', 14) + '</span></button>';
          html += '<div class="nav-children' + (isOpen ? ' open' : '') + '" data-children="' + it.key + '">';
          it.children.forEach(c => {
            const st = App.store.moduleStat(c.key);
            html += '<button class="nav-child' + (activeKey === c.key ? ' active' : '') + '" data-route="' + c.route + '">' +
              '<span class="nav-dot" style="background:' + c.dot + '"></span>' +
              '<span class="nav-text">' + c.name + '</span>' +
              (st.done ? '<span class="nav-badge">' + st.done + '</span>' : '') +
              '</button>';
          });
          html += '</div>';
        } else {
          html += '<button class="nav-item' + (activeKey === it.key ? ' active' : '') + '" data-route="' + it.route + '">' +
            '<span class="nav-icon">' + icon(it.icon, 17) + '</span>' +
            '<span class="nav-text">' + it.name + '</span>' + badge + '</button>';
        }
      });
    });

    html += '</div><div class="sidebar-footer"><div class="study-mini">' +
      '<h4>今日已学 ' + Math.round((s.timeline[U.todayStr()] || {}).minutes || 0) + ' 分钟</h4>' +
      '<p>连续打卡 ' + stats.streak + ' 天 · 累计 ' + stats.done + ' 题</p>' +
      '<button class="mini-btn" data-route="#/assistant">让 AI 规划今日任务</button>' +
      '</div></div>';

    root.innerHTML = html;
  }

  function renderTopbar(root) {
    const s = App.store.state;
    const days = U.daysUntil(s.profile.examDate);
    const cur = App.router.parse();
    const t = TITLES[cur.name] || TITLES.dashboard;
    const name = s.profile.name || '考生';

    root.innerHTML =
      '<button class="icon-btn hamburger" data-hamburger>' + icon('menu', 19) + '</button>' +
      '<div class="topbar-title" style="min-width:0"><div class="ellipsis">' + escapeHtml(t[0]) + '</div><small class="ellipsis">' + escapeHtml(t[1]) + '</small></div>' +
      '<div style="flex:1"></div>' +
      '<div class="topbar-search"><span class="t3">' + icon('search', 15) + '</span>' +
      '<input placeholder="搜索题目、资料、知识点…" data-global-search><kbd>Enter</kbd></div>' +
      '<div class="exam-countdown">' + icon('calendar', 15) + '<span>距考试</span><b>' + (days > 0 ? days : 0) + '</b><span>天</span></div>' +
      '<button class="icon-btn" title="AI 拍照解题" data-route="#/photo">' + icon('camera', 18) + '</button>' +
      '<button class="icon-btn" title="通知" data-notify>' + icon('bell', 18) + '<i class="dot"></i></button>' +
      '<button class="icon-btn" title="设置" data-route="#/settings">' + icon('settings', 18) + '</button>' +
      '<div class="divider-v" style="height:22px;align-self:center"></div>' +
      '<button class="user-chip" data-route="#/settings">' +
      '<span class="avatar">' + escapeHtml(name.slice(0, 1)) + '</span>' +
      '<span class="user-chip-info text-left"><span class="user-chip-name" style="display:block">' + escapeHtml(name) + '</span>' +
      '<span class="user-chip-sub">' + escapeHtml(s.profile.target) + '</span></span></button>';
  }

  /* ------------------------------------------------------------------ */
  function mount() {
    const sidebar = U.$('#sidebar');
    const topbar = U.$('#topbar');
    const scrim = U.$('#scrim');

    const refresh = () => { renderSidebar(sidebar); renderTopbar(topbar); };
    refresh();

    // 路由跳转（事件委托，全局生效）
    U.delegate(document.body, 'click', '[data-route]', (e, t) => {
      e.preventDefault();
      App.router.go(t.getAttribute('data-route'));
      closeDrawer();
    });

    // 折叠分组
    U.delegate(sidebar, 'click', '[data-toggle]', (e, t) => {
      const key = t.getAttribute('data-toggle');
      App.store.update(st => {
        const arr = st.settings.ui.sidebarOpenGroups;
        const i = arr.indexOf(key);
        i > -1 ? arr.splice(i, 1) : arr.push(key);
      }, 'ui');
      renderSidebar(sidebar);
    });

    // 移动端抽屉
    const openDrawer = () => { sidebar.classList.add('open'); scrim.classList.add('show'); };
    const closeDrawer = () => { sidebar.classList.remove('open'); scrim.classList.remove('show'); };
    U.delegate(document.body, 'click', '[data-hamburger]', openDrawer);
    scrim.addEventListener('click', closeDrawer);

    // 通知
    U.delegate(document.body, 'click', '[data-notify]', () => {
      U.modal({
        title: '消息通知', desc: '共 3 条未读',
        content: '<div class="list-item"><span class="kpi-ico" style="background:var(--brand-50);color:var(--brand-500)">' + icon('sparkles', 17) + '</span>' +
          '<div class="flex-1"><div class="fw-6 fs-13">今日 AI 学习计划已生成</div><div class="t3 fs-12">共 5 项任务，预计 110 分钟</div></div><span class="t4 fs-12">刚刚</span></div>' +
          '<div class="list-item"><span class="kpi-ico" style="background:var(--danger-50);color:var(--danger-500)">' + icon('alert', 17) + '</span>' +
          '<div class="flex-1"><div class="fw-6 fs-13">错题本待复盘</div><div class="t3 fs-12">有 ' + App.store.stats().mistakes + ' 道错题超过 3 天未巩固</div></div><span class="t4 fs-12">1 小时前</span></div>' +
          '<div class="list-item"><span class="kpi-ico" style="background:var(--warning-50);color:var(--warning-500)">' + icon('calendar', 17) + '</span>' +
          '<div class="flex-1"><div class="fw-6 fs-13">距离考试还有 ' + U.daysUntil(App.store.state.profile.examDate) + ' 天</div><div class="t3 fs-12">建议启动套卷模考训练</div></div><span class="t4 fs-12">今天</span></div>',
        actions: [{ label: '知道了', kind: 'primary' }]
      });
    });

    // 全局搜索
    U.delegate(topbar, 'keydown', '[data-global-search]', (e, t) => {
      if (e.key === 'Enter' && t.value.trim()) {
        App.router.go('#/knowledge');
        setTimeout(() => {
          const box = U.$('[data-kb-search]');
          if (box) { box.value = t.value.trim(); box.dispatchEvent(new Event('input')); }
        }, 120);
      }
    });

    // 状态变化 / 路由变化时刷新导航
    App.store.subscribe(U.debounce(refresh, 90));
    App.router.onChange(refresh);

    return { refresh };
  }

  App.layout = { mount, NAV, TITLES };
})(window);
