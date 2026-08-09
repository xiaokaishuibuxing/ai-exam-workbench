/* ==========================================================================
   ai.js — AI 能力门面（Facade）
   真实模式走 api.js 的 HTTP 通道；mock 模式走本地规则引擎。
   业务层只调用 App.ai.xxx()，不关心实现。
   ========================================================================== */
(function (global) {
  'use strict';
  const App = global.App = global.App || {};
  const U = App.utils;
  const AI = App.ai = App.ai || {};
  const H = AI._http;

  const SYSTEM = '你是一名资深公务员考试（国考/省考）辅导专家，精通行测五大模块与申论。回答务必条理清晰、给出可操作方法，必要时分步骤说明。';

  /* ------------------------------------------------------------------ *
   * MOCK 规则引擎
   * ------------------------------------------------------------------ */
  const MOCK_STEMS = [
    { module: 'data', text: '2025 年某市规模以上工业增加值同比增长 6.8%，其中高技术制造业增加值增长 12.4%，占规模以上工业的比重为 18.6%。\n问：2024 年高技术制造业增加值占规模以上工业的比重约为多少？\nA. 17.2%   B. 17.7%   C. 18.6%   D. 19.5%' },
    { module: 'logic', text: '所有参加培训的员工都通过了考核，小李通过了考核。\n由此可以推出：\nA. 小李参加了培训\nB. 小李可能没有参加培训\nC. 没有通过考核的人都没参加培训\nD. 参加培训就一定通过考核' },
    { module: 'math', text: '甲、乙两人分别从 A、B 两地同时出发相向而行，甲速度 5 km/h，乙速度 4 km/h，2 小时后两人相遇。A、B 两地相距多少公里？\nA. 16   B. 18   C. 20   D. 22' },
    { module: 'verbal', text: '基层治理的关键在于把矛盾化解在萌芽状态。______，才能真正提升群众的获得感。\n填入横线部分最恰当的一项是：\nA. 只有畅通诉求表达渠道\nB. 只要加大执法力度\nC. 除非增加财政投入\nD. 无论采取何种方式' },
    { module: 'common', text: '下列关于我国二十四节气的说法，错误的是：\nA. 立春是二十四节气之首\nB. 夏至这天北半球白昼最长\nC. 冬至之后进入数九寒天\nD. 秋分这天太阳直射南回归线' }
  ];

  const TYPE_RULES = [
    { module: 'data',   type: '资料分析 · 增长率与比重', kw: ['增长', '比重', '同比', '占比', '亿元', '万元', '增速', '百分点'], points: ['基期量公式', '比重变化', '截位直除'] },
    { module: 'logic',  type: '逻辑推理 · 论证与翻译',   kw: ['推出', '削弱', '加强', '假设', '只有', '如果', '所有', '前提'], points: ['充分必要条件', '逆否规则', '论证结构'] },
    { module: 'math',   type: '数量关系 · 应用题',       kw: ['多少', '公里', '速度', '相遇', '工程', '概率', '几种', '利润'], points: ['方程法', '特值法', '正难则反'] },
    { module: 'verbal', type: '言语理解 · 片段阅读',     kw: ['意在', '主旨', '填入', '横线', '这段文字', '排序', '标题'], points: ['转折重点', '语境呼应', '行文脉络'] },
    { module: 'common', type: '常识判断 · 综合知识',     kw: ['下列', '正确的是', '错误的是', '宪法', '节气', '历史', '物理'], points: ['识记积累', '排除法', '生活常识'] }
  ];

  function guessType(text) {
    let best = TYPE_RULES[4], score = 0;
    TYPE_RULES.forEach(r => {
      let s = 0;
      r.kw.forEach(k => { if (text.indexOf(k) > -1) s++; });
      if (s > score) { score = s; best = r; }
    });
    return { module: best.module, type: best.type, points: best.points, difficulty: U.clamp(2 + (text.length % 3), 1, 5) };
  }

  function optionKeys(text) {
    const keys = [];
    ['A', 'B', 'C', 'D'].forEach(k => { if (new RegExp('(^|\\s)' + k + '[.、．]').test(text)) keys.push(k); });
    return keys.length ? keys : ['A', 'B', 'C', 'D'];
  }

  /* ------------------------------------------------------------------ *
   * 1) OCR —— 图片转文字
   * ------------------------------------------------------------------ */
  AI.ocr = async function (dataUrl, onProgress) {
    const t0 = Date.now();
    if (H.isReal()) {
      const text = await H.vision(dataUrl, '请完整识别这张图片中的考试题目文字（含题干、选项、材料），只输出原文，不要解答、不要额外说明。');
      return { text: (text || '').trim(), confidence: 0.97, ms: Date.now() - t0, engine: 'vision-model' };
    }
    // mock：模拟分段识别
    const sample = U.pick(MOCK_STEMS);
    if (onProgress) {
      const chunks = sample.text.split('\n');
      let acc = '';
      for (let i = 0; i < chunks.length; i++) {
        await U.sleep(230);
        acc += (i ? '\n' : '') + chunks[i];
        onProgress(acc, Math.round((i + 1) / chunks.length * 100));
      }
    } else { await U.sleep(700); }
    return { text: sample.text, confidence: 0.93 + Math.random() * .05, ms: Date.now() - t0, engine: 'mock-ocr', hintModule: sample.module };
  };

  /* ------------------------------------------------------------------ *
   * 2) 题型识别
   * ------------------------------------------------------------------ */
  AI.classify = async function (text) {
    if (H.isReal()) {
      const raw = await H.chat([
        { role: 'system', content: SYSTEM },
        { role: 'user', content: '判断下面公考题目的模块与题型，用 JSON 返回：{"module":"data|logic|math|verbal|common|shenlun","type":"中文题型名","difficulty":1-5,"points":["知识点"]}。\n题目：\n' + text }
      ], { json: true });
      return H.parseJSON(raw, guessType(text));
    }
    await U.sleep(520);
    return guessType(text);
  };

  /* ------------------------------------------------------------------ *
   * 3) 解题 —— 答案 / 步骤 / 解析 / 知识点 / 相似题
   * ------------------------------------------------------------------ */
  AI.solve = async function (text, meta) {
    meta = meta || {};
    if (H.isReal()) {
      const raw = await H.chat([
        { role: 'system', content: SYSTEM },
        {
          role: 'user', content: '请解答下面的公考题目，并用 JSON 返回：' +
            '{"answer":"选项字母或简答","steps":["分步骤解题过程"],"analysis":"考点解析与易错提醒","points":["知识点"],"confidence":0-1}\n题目：\n' + text
        }
      ], { json: true });
      const r = H.parseJSON(raw, null);
      if (r) { r.similar = similarFrom(meta.module || 'data'); return r; }
    }
    await U.sleep(900);
    return mockSolve(text, meta);
  };

  function similarFrom(module) {
    const list = (App.data.byModule ? App.data.byModule(module) : []).slice(0, 3);
    return list.map(q => ({ id: q.id, title: (q.stem || '').slice(0, 34).replace(/\n/g, ' ') + '…', type: q.type, difficulty: q.difficulty }));
  }

  function mockSolve(text, meta) {
    const g = meta.module ? { module: meta.module, type: meta.type || '', points: [] } : guessType(text);
    const keys = optionKeys(text);
    const answer = keys[(text.length + keys.length) % keys.length];
    const byModule = {
      data: {
        steps: [
          '① 审题定位：题目问的是「基期比重」，属于资料分析两期比重题型。',
          '② 选择公式：基期比重 = 现期比重 × (1 + 整体增速) ÷ (1 + 部分增速)。',
          '③ 代入数据：18.6% × (1 + 6.8%) ÷ (1 + 12.4%)。',
          '④ 估算求解：18.6% × 1.068 ÷ 1.124 ≈ 17.7%，锁定选项。',
          '⑤ 复核：部分增速 > 整体增速，比重应上升，基期必小于 18.6%，结论自洽。'
        ],
        analysis: '本题核心在于分清「现期比重」与「基期比重」。由于高技术制造业增速（12.4%）高于整体（6.8%），其比重必然是上升的，因此基期比重一定小于 18.6%，可先排除 C、D 两项，再在 A、B 之间精算即可。',
        points: ['两期比重公式', '定性判断优先', '截位直除速算']
      },
      logic: {
        steps: [
          '① 翻译题干：参加培训 → 通过考核。',
          '② 已知小李通过考核，属于「肯定后件」。',
          '③ 肯定后件无法推出前件，因此不能确定小李是否参加培训。',
          '④ 逐项验证：A 项肯后件错误；C 项为逆否命题变形，需谨慎核对；B 项表述与推理一致。',
          '⑤ 结论：选择与「无法确定」一致的选项。'
        ],
        analysis: '条件推理四大规则：肯前必肯后、否后必否前、否前无必然、肯后无必然。本题正是「肯后件」的典型陷阱，考生极易误选 A。',
        points: ['充分必要条件', '逆否等价', '肯后件陷阱']
      },
      math: {
        steps: [
          '① 判断模型：相向而行的相遇问题。',
          '② 公式：路程和 = 速度和 × 相遇时间。',
          '③ 速度和 = 5 + 4 = 9 km/h。',
          '④ 路程 = 9 × 2 = 18 公里。',
          '⑤ 验证：甲行 10 公里，乙行 8 公里，合计 18 公里，成立。'
        ],
        analysis: '行程问题三大模型：相遇（速度和）、追及（速度差）、流水（顺逆水）。先判断模型再套公式，能避免绝大多数错误。',
        points: ['相遇问题', '速度和', '公式建模']
      },
      verbal: {
        steps: [
          '① 分析横线位置：位于结论句前，需与后文「才能」搭配。',
          '② 锁定关联词：「只有……才……」构成必要条件关系。',
          '③ 呼应前文「化解在萌芽状态」，应选择与诉求表达、源头治理相关的表述。',
          '④ 排除：B 项「加大执法力度」与化解矛盾在萌芽状态方向不符；C、D 关联词搭配错误。',
          '⑤ 得出答案。'
        ],
        analysis: '语句填空题优先看空缺位置的上下文逻辑关系，尤其是关联词的固定搭配（只有…才…、不但…而且…、虽然…但是…），这往往能直接排除半数选项。',
        points: ['关联词搭配', '语境呼应', '句间关系']
      },
      common: {
        steps: [
          '① 明确设问：本题为「选非题」，要求找出错误项。',
          '② 逐项核查基础知识点。',
          '③ 秋分时太阳直射赤道，直射南回归线的是冬至，故该项错误。',
          '④ 其余选项均为常识正确表述。',
          '⑤ 选出错误项作为答案。'
        ],
        analysis: '常识判断要特别注意「选非」题干。二十四节气高频考点：春分/秋分直射赤道，夏至直射北回归线，冬至直射南回归线。',
        points: ['二十四节气', '天文地理', '选非题审题']
      }
    };
    const b = byModule[g.module] || byModule.common;
    return {
      answer: answer,
      confidence: 0.9 + Math.random() * .08,
      steps: b.steps,
      analysis: b.analysis,
      points: b.points,
      similar: similarFrom(g.module)
    };
  }

  AI._mock = { guessType, similarFrom, MOCK_STEMS, SYSTEM };
})(window);
