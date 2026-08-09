/* ==========================================================================
   router.js — 极简 hash 路由
   路由表：#/dashboard  #/practice/:module  #/shenlun  #/mistakes
           #/photo  #/assistant  #/knowledge  #/stats  #/settings
   ========================================================================== */
(function (global) {
  'use strict';
  const App = global.App = global.App || {};

  const routes = {};
  let current = null;
  let container = null;
  const hooks = [];

  function register(name, view) { routes[name] = view; }

  function parse() {
    const raw = (location.hash || '#/dashboard').replace(/^#\/?/, '');
    const parts = raw.split('/').filter(Boolean);
    return { name: parts[0] || 'dashboard', params: parts.slice(1) };
  }

  function go(path) {
    const target = path.charAt(0) === '#' ? path : '#/' + path.replace(/^\//, '');
    if (location.hash === target) render();
    else location.hash = target;
  }

  async function render() {
    const { name, params } = parse();
    const view = routes[name] || routes.dashboard;
    if (current && current.unmount) { try { current.unmount(); } catch (e) { console.warn(e); } }
    container.innerHTML = '';
    container.scrollTop = 0;
    current = view;
    const node = document.createElement('div');
    node.className = 'view anim-fade-up';
    container.appendChild(node);
    try {
      await view.render(node, params);
    } catch (e) {
      console.error('[router] 视图渲染失败', e);
      node.innerHTML = '<div class="card card-pad"><h3 class="c-danger">页面渲染出错</h3><pre class="fs-12 t3" style="white-space:pre-wrap">' +
        String(e && e.stack || e) + '</pre></div>';
    }
    hooks.forEach(fn => fn(name, params, view));
  }

  function onChange(fn) { hooks.push(fn); }

  function start(el) {
    container = el;
    global.addEventListener('hashchange', render);
    if (!location.hash) location.hash = '#/dashboard';
    render();
  }

  App.router = { register, go, start, parse, onChange, get routes() { return routes; } };
})(window);
