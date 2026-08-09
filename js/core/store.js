/* ==========================================================================
   store.js — 全局状态 + localStorage 持久化 + 订阅
   数据结构说明见 defaultState()
   ========================================================================== */
(function (global) {
  'use strict';
  const App = global.App = global.App || {};
  const U = App.utils;
  const KEY = 'aigk_state_v1';

  const MODULES = [
    { key: 'data',   name: '资料分析', color: 'g-blue',   hex: '#2f6bed', total: 120, icon: 'chart' },
    { key: 'logic',  name: '逻辑推理', color: 'g-purple', hex: '#7c5cf5', total: 100, icon: 'brain' },
    { key: 'math',   name: '数量关系', color: 'g-orange', hex: '#f59e0b', total: 80,  icon: 'zap' },
    { key: 'verbal', name: '言语理解', color: 'g-green',  hex: '#16a34a', total: 140, icon: 'message' },
    { key: 'common', name: '常识判断', color: 'g-cyan',   hex: '#0ea5b7', total: 90,  icon: 'globe' },
    { key: 'shenlun',name: '申论',     color: 'g-pink',   hex: '#e0559a', total: 30,  icon: 'pen' }
  ];
  const MODULE_MAP = {};
  MODULES.forEach(m => MODULE_MAP[m.key] = m);

  function defaultProgress() {
    const p = {};
    MODULES.forEach(m => { p[m.key] = { done: 0, correct: 0, wrong: 0, total: m.total, minutes: 0 }; });
    return p;
  }

  function defaultState() {
    return {
      version: 1,
      profile: { name: '备考同学', target: '2026 国考 · 省部级', examDate: '2026-11-29', joined: Date.now() },
      settings: {
        ai: { provider: 'mock', baseURL: 'https://api.openai.com/v1', apiKey: '', model: 'gpt-4o-mini', visionModel: 'gpt-4o-mini', temperature: 0.4 },
        ui: { sidebarOpenGroups: ['xingce'], kbView: 'grid' }
      },
      progress: defaultProgress(),
      tasks: [],
      records: [],     // {id, ts, module, qid, correct, seconds}
      mistakes: [],    // {id, qid, module, myAnswer, ts, mastered, note, aiReason}
      chats: [],       // {role:'user'|'ai', content, ts}
      docs: [],        // 知识库元数据 {id, name, ext, size, category, tags[], summary, keypoints[], text, created, starred, blobKey}
      photos: [],      // 拍照解题历史 {id, thumb, created, result}
      timeline: {},    // {'YYYY-MM-DD': {minutes, questions, correct}}
      streak: { days: 0, last: '' },
      seeded: false
    };
  }

  let state = defaultState();
  const listeners = [];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = Object.assign(defaultState(), parsed);
        state.progress = Object.assign(defaultProgress(), parsed.progress || {});
        state.settings = Object.assign(defaultState().settings, parsed.settings || {});
        state.settings.ai = Object.assign(defaultState().settings.ai, (parsed.settings || {}).ai || {});
        state.settings.ui = Object.assign(defaultState().settings.ui, (parsed.settings || {}).ui || {});
      }
    } catch (e) { console.warn('[store] 读取本地数据失败，已重置', e); state = defaultState(); }
    return state;
  }

  let saveTimer = null;
  function save(immediate) {
    const doSave = () => {
      try { localStorage.setItem(KEY, JSON.stringify(state)); }
      catch (e) {
        console.warn('[store] 本地存储写入失败（可能超出配额）', e);
        // 配额溢出降级：裁剪最占空间的历史数据
        try {
          state.photos = state.photos.slice(0, 6);
          state.records = state.records.slice(-300);
          state.docs.forEach(d => { if (d.text && d.text.length > 4000) d.text = d.text.slice(0, 4000); });
          localStorage.setItem(KEY, JSON.stringify(state));
          U.toast('本地空间不足，已自动清理部分历史', 'warn');
        } catch (e2) { U.toast('本地存储已满，请在设置中清理数据', 'error'); }
      }
    };
    if (immediate) { clearTimeout(saveTimer); doSave(); }
    else { clearTimeout(saveTimer); saveTimer = setTimeout(doSave, 220); }
  }

  function emit(reason) { listeners.forEach(fn => { try { fn(state, reason); } catch (e) { console.error(e); } }); }

  /** 修改状态：update(fn, reason) */
  function update(fn, reason) {
    fn(state);
    save();
    emit(reason || 'update');
    return state;
  }

  function subscribe(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); }; }

  /* ---------------- 业务快捷方法 ---------------- */

  function todayEntry() {
    const d = U.todayStr();
    if (!state.timeline[d]) state.timeline[d] = { minutes: 0, questions: 0, correct: 0 };
    return state.timeline[d];
  }

  /** 记录一次答题 */
  function recordAnswer(module, qid, correct, seconds) {
    update(s => {
      s.records.push({ id: U.uid('r'), ts: Date.now(), module, qid, correct: !!correct, seconds: seconds || 0 });
      if (s.records.length > 800) s.records = s.records.slice(-800);
      const p = s.progress[module];
      if (p) {
        p.done++; correct ? p.correct++ : p.wrong++;
        p.minutes += (seconds || 0) / 60;
      }
      const d = U.todayStr();
      if (!s.timeline[d]) s.timeline[d] = { minutes: 0, questions: 0, correct: 0 };
      s.timeline[d].questions++;
      s.timeline[d].minutes += (seconds || 0) / 60;
      if (correct) s.timeline[d].correct++;
      checkin(s);
    }, 'answer');
  }

  function checkin(s) {
    const t = U.todayStr();
    if (s.streak.last === t) return;
    const y = new Date(); y.setDate(y.getDate() - 1);
    s.streak.days = (s.streak.last === U.todayStr(y)) ? s.streak.days + 1 : 1;
    s.streak.last = t;
  }

  function addMistake(qid, module, myAnswer) {
    update(s => {
      const exist = s.mistakes.find(m => m.qid === qid);
      if (exist) { exist.ts = Date.now(); exist.myAnswer = myAnswer; exist.mastered = false; exist.times = (exist.times || 1) + 1; }
      else s.mistakes.unshift({ id: U.uid('m'), qid, module, myAnswer, ts: Date.now(), mastered: false, times: 1, aiReason: '' });
    }, 'mistake');
  }

  function addStudyMinutes(min) {
    update(s => {
      const d = U.todayStr();
      if (!s.timeline[d]) s.timeline[d] = { minutes: 0, questions: 0, correct: 0 };
      s.timeline[d].minutes += min;
    }, 'time');
  }

  /* ---------------- 统计 ---------------- */
  function stats() {
    const p = state.progress;
    let done = 0, correct = 0, total = 0, minutes = 0;
    MODULES.forEach(m => {
      const x = p[m.key] || { done: 0, correct: 0, total: m.total, minutes: 0 };
      done += x.done; correct += x.correct; total += x.total; minutes += x.minutes || 0;
    });
    Object.keys(state.timeline).forEach(k => { minutes = minutes; });
    const timelineMinutes = Object.keys(state.timeline).reduce((a, k) => a + (state.timeline[k].minutes || 0), 0);
    return {
      done, correct, total, wrong: done - correct,
      accuracy: done ? Math.round(correct / done * 100) : 0,
      progressPct: total ? Math.round(done / total * 100) : 0,
      minutes: Math.max(minutes, timelineMinutes),
      streak: state.streak.days,
      mistakes: state.mistakes.filter(m => !m.mastered).length,
      docs: state.docs.length,
      photos: state.photos.length
    };
  }

  function moduleStat(key) {
    const p = state.progress[key] || { done: 0, correct: 0, total: 0 };
    return Object.assign({}, p, {
      accuracy: p.done ? Math.round(p.correct / p.done * 100) : 0,
      pct: p.total ? Math.round(p.done / p.total * 100) : 0
    });
  }

  function reset() {
    localStorage.removeItem(KEY);
    state = defaultState();
    save(true); emit('reset');
  }

  function exportJSON() {
    return JSON.stringify(state, null, 2);
  }

  function importJSON(text) {
    const obj = JSON.parse(text);
    state = Object.assign(defaultState(), obj);
    save(true); emit('import');
  }

  App.store = {
    KEY, MODULES, MODULE_MAP,
    get state() { return state; },
    load, save, update, subscribe, stats, moduleStat,
    recordAnswer, addMistake, addStudyMinutes, todayEntry,
    reset, exportJSON, importJSON, defaultState
  };
})(window);
