/* ==========================================================================
   views/assistant.js — AI 备考助手（流式对话 + 一键生成今日计划）
   ========================================================================== */
(function (global) {
  'use strict';
  const App = global.App;
  const U = App.utils;
  const { icon, escapeHtml } = U;

  let busy = false;

  function render(root) {
    busy = false;
    const s = App.store.state;
    root.innerHTML =
      '<div class="view-head"><div><h1>AI 助手</h1>' +
      '<div class="sub">你的备考陪练：答疑、规划、学情诊断，支持流式回答</div></div>' +
      '<div class="flex gap-8">' +
      '<span class="tag ' + (App.ai._http.isReal() ? 'tag-success' : 'tag-warning') + ' tag-lg">' +
      '<span class="dot-live"></span> ' + (App.ai._http.isReal() ? '真实模型已接入' : '模拟接口演示中') + '</span>' +
      '<button class="btn btn-primary" data-plan>' + icon('calendar', 15) + '生成今日计划</button>' +
      '</div></div>' +

      '<div class="card" style="overflow:hidden">' +
      '<div class="chat-wrap">' +
      '<div class="chat-scroll" data-scroll></div>' +
      '<div class="prompt-row" data-prompts></div>' +
      '<div class="chat-input-bar"><div class="chat-input">' +
      '<textarea rows="1" placeholder="问我任何备考问题，或把题目发给我…" data-input></textarea>' +
      '<button class="btn btn-primary" data-send>' + icon('send', 16) + '</button>' +
      '</div></div>' +
      '</div></div>';

    paint(); bind(root);
  }

  function paint() {
    const box = U.$('[data-scroll]');
    const chats = App.store.state.chats;
    if (!chats.length) {
      box.innerHTML = welcomeHtml() + '<div class="prompt-row" style="padding:0 4px">' + promptChips() + '</div>';
    } else {
      box.innerHTML = chats.map(msgHtml).join('');
    }
    scrollBottom();
  }

  function welcomeHtml() {
    return '<div class="msg"><div class="msg-ava ai">' + icon('sparkles', 16) + '</div>' +
      '<div class="msg-bubble">你好，我是你的 AI 备考助手 🤖\n\n我可以帮你：\n· 制定每日 / 每周学习计划\n· 讲解行测各模块的解题技巧\n· 分析你的薄弱模块与提分优先级\n· 润色申论大作文立意与结构\n\n直接提问，或试试下面的快捷指令 👇</div></div>';
  }

  function promptChips() {
    return (App.data.prompts || []).map(p => '<button class="prompt-chip" data-prompt="' + escapeHtml(p) + '">' + escapeHtml(p) + '</button>').join('');
  }

  function msgHtml(m) {
    const me = m.role === 'me';
    return '<div class="msg' + (me ? ' me' : '') + '">' +
      '<div class="msg-ava ' + (me ? 'me' : 'ai') + '">' + icon(me ? 'user' : 'sparkles', 16) + '</div>' +
      '<div><div class="msg-bubble">' + escapeHtml(m.content) + '</div>' +
      '<div class="msg-time">' + U.relTime(m.ts) + '</div></div></div>';
  }

  function scrollBottom() { const box = U.$('[data-scroll]'); if (box) box.scrollTop = box.scrollHeight; }

  async function send(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    busy = true;
    const input = U.$('[data-input]'); const sendBtn = U.$('[data-send]');
    if (input) input.value = ''; if (sendBtn) sendBtn.disabled = true;

    // 写入用户消息
    const userMsg = { role: 'me', content: text, ts: Date.now() };
    const conv = App.store.state.chats.slice();
    conv.push(userMsg);
    App.store.update(s => s.chats.push(userMsg), 'chat');
    paint();

    // 创建 AI 流式气泡
    const box = U.$('[data-scroll]');
    const wrap = document.createElement('div');
    wrap.className = 'msg';
    wrap.innerHTML = '<div class="msg-ava ai">' + icon('sparkles', 16) + '</div>' +
      '<div><div class="msg-bubble"><span class="typing"><i></i><i></i><i></i></span></div></div>';
    box.appendChild(wrap);
    const bubble = wrap.querySelector('.msg-bubble');
    scrollBottom();

    const messages = conv.map(m => ({ role: m.role === 'me' ? 'user' : 'assistant', content: m.content }));
    let acc = '';
    try {
      await App.ai.chat(messages, {
        onToken: (chunk, full) => { acc = full; bubble.textContent = acc; scrollBottom(); }
      });
    } catch (e) {
      acc = '抱歉，处理出错了：' + (e && e.message || e);
    }
    if (!acc) acc = '（暂无回复）';
    bubble.textContent = acc;
    const aiMsg = { role: 'ai', content: acc, ts: Date.now() };
    App.store.update(s => s.chats.push(aiMsg), 'chat');
    busy = false; if (sendBtn) sendBtn.disabled = false;
    scrollBottom();
  }

  async function makePlan() {
    if (busy) return;
    busy = true;
    U.toast('AI 正在生成今日计划…', 'info');
    try {
      const tasks = await App.ai.makePlan();
      const d = U.todayStr();
      App.store.update(s => {
        tasks.forEach(t => s.tasks.unshift({ id: U.uid('t'), title: t.title, module: t.module, minutes: t.minutes || 20, done: false, date: d, from: 'AI 规划' }));
      }, 'plan');
      const userMsg = { role: 'me', content: '帮我生成今天的练习计划', ts: Date.now() };
      const aiMsg = { role: 'ai', content: '已为你生成今日 ' + tasks.length + ' 项任务，已加入「工作台 → 今日任务」：\n\n' +
        tasks.map((t, i) => (i + 1) + '. ' + t.title + '（' + (t.minutes || 20) + ' 分钟）').join('\n') +
        '\n\n完成后记得回来打卡，我会根据你的正确率持续优化安排。', ts: Date.now() };
      App.store.update(s => { s.chats.push(userMsg); s.chats.push(aiMsg); }, 'chat');
      paint();
      U.toast('今日计划已生成', 'success');
    } catch (e) { U.toast('生成失败：' + (e && e.message || e), 'error'); }
    busy = false;
  }

  function bind(root) {
    const input = U.$('[data-input]', root);
    if (input) {
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input.value); }
      });
      input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 130) + 'px'; });
    }
    U.delegate(root, 'click', '[data-send]', () => send(input ? input.value : ''));
    U.delegate(root, 'click', '[data-plan]', makePlan);
    U.delegate(root, 'click', '[data-prompt]', (e, t) => send(t.getAttribute('data-prompt')));
  }

  App.router.register('assistant', { render });
})(window);
