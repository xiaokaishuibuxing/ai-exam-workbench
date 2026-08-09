/* ==========================================================================
   api.js — AI 能力适配层（Adapter）
   --------------------------------------------------------------------------
   所有 AI 调用统一从这里出入，业务视图不关心底层是 mock 还是真实模型。
   切换真实接口只需两步：
     1) 在「设置」里把 provider 改为 openai，填 baseURL / apiKey / model；
     2) 无需改动任何视图代码。
   支持任意 OpenAI 兼容网关（OpenAI / DeepSeek / 通义 / 智谱 / Moonshot / 本地 Ollama 等）。
   --------------------------------------------------------------------------
   对外方法：
     AI.ocr(dataUrl)                 -> { text, confidence, ms }
     AI.classify(text)               -> { module, type, difficulty, points[] }
     AI.solve(text, meta)            -> { answer, steps[], analysis, points[], similar[] }
     AI.chat(messages, {onToken})    -> string
     AI.gradeEssay(text, prompt)     -> { total, dims[], comments[], highlights[], suggestions[] }
     AI.summarizeDoc(text, name)     -> { summary, keypoints[], tags[], category }
     AI.explainMistake(question, my) -> { reason, fix, drill[] }
     AI.makePlan(stats)              -> [ {title, module, minutes} ]
   ========================================================================== */
(function (global) {
  'use strict';
  const App = global.App = global.App || {};
  const U = App.utils;

  /* ------------------------------------------------------------------ *
   * 1. 配置
   * ------------------------------------------------------------------ */
  function cfg() {
    return (App.store && App.store.state.settings.ai) || {
      provider: 'mock', baseURL: '', apiKey: '', model: '', visionModel: '', temperature: .4
    };
  }
  function isReal() {
    const c = cfg();
    return c.provider !== 'mock' && !!c.apiKey && !!c.baseURL;
  }

  /* ------------------------------------------------------------------ *
   * 2. 真实接口通道（OpenAI 兼容 /chat/completions）
   *    —— 已写好完整实现，填入 apiKey 即刻可用
   * ------------------------------------------------------------------ */
  async function httpChat(messages, opts) {
    const c = cfg();
    opts = opts || {};
    const body = {
      model: opts.model || c.model,
      messages: messages,
      temperature: opts.temperature !== undefined ? opts.temperature : Number(c.temperature || .4),
      stream: !!opts.onToken
    };
    if (opts.json) body.response_format = { type: 'json_object' };

    const res = await fetch(c.baseURL.replace(/\/$/, '') + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + c.apiKey },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('AI 接口错误 ' + res.status + '：' + (await res.text()).slice(0, 200));

    // 流式
    if (opts.onToken && res.body && res.body.getReader) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buf = '', full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          const s = line.trim();
          if (!s.startsWith('data:')) continue;
          const payload = s.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const j = JSON.parse(payload);
            const delta = j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content;
            if (delta) { full += delta; opts.onToken(delta, full); }
          } catch (e) { /* 忽略非法分片 */ }
        }
      }
      return full;
    }

    const data = await res.json();
    return (data.choices && data.choices[0] && data.choices[0].message.content) || '';
  }

  /** 多模态：图片 + 文本（用于 OCR / 拍照解题） */
  async function httpVision(dataUrl, prompt) {
    const c = cfg();
    return httpChat([{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: dataUrl } }
      ]
    }], { model: c.visionModel || c.model });
  }

  /** 尝试从模型返回中解析 JSON（容错 ```json 包裹） */
  function parseJSON(str, fallback) {
    if (!str) return fallback;
    try { return JSON.parse(str); } catch (e) { /* next */ }
    const m = str.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch (e) { /* next */ } }
    return fallback;
  }

  App.ai = App.ai || {};
  App.ai._http = { chat: httpChat, vision: httpVision, parseJSON, isReal, cfg };
})(window);
