/* ==========================================================================
   ai2.js — AI 门面（续）：对话 / 申论批改 / 文档摘要 / 错题归因 / 学习规划
   ========================================================================== */
(function (global) {
  'use strict';
  const App = global.App;
  const U = App.utils;
  const AI = App.ai;
  const H = AI._http;
  const SYSTEM = AI._mock.SYSTEM;

  /* ------------------------------------------------------------------ *
   * 4) 对话（支持流式回调 onToken）
   * ------------------------------------------------------------------ */
  const KB_REPLIES = [
    {
      kw: ['计划', '规划', '安排', '时间表'],
      text: '结合你目前的学情，我建议这样安排本周（每天 2.5 小时）：\n\n【周一 / 周三 / 周五】\n· 资料分析 20 题限时（35 分钟，要求 45 秒/题）\n· 言语理解 15 题（20 分钟）\n· 错题复盘（20 分钟，只看错因不重做）\n\n【周二 / 周四】\n· 判断推理专项 25 题（40 分钟）\n· 数量关系 8 题（挑工程、行程、排列组合三类高频）\n· 申论归纳概括 1 题（30 分钟，严格计时）\n\n【周六】\n· 完整套卷模考（120 分钟）+ 复盘（60 分钟）\n\n【周日】\n· 常识判断刷题 + 时政积累（40 分钟）\n· 本周错题二次清算\n\n关键提醒：资料分析是性价比最高的模块，建议把正确率先稳定到 85% 以上再攻数量关系。'
    },
    {
      kw: ['资料分析', '提速', '速算'],
      text: '资料分析提速的四个抓手：\n\n1. 公式必须形成肌肉记忆\n   基期量 = 现期 ÷ (1+r)；增长量 = 现期 × r/(1+r)；比重变化方向看增速大小。\n\n2. 练"截位直除"\n   分母保留三位有效数字，分子保留四位，多数题目首位即可锁定选项。\n\n3. 背特征数字\n   1/7≈14.3%、1/8=12.5%、1/9≈11.1%、1/11≈9.1%、1/13≈7.7%。\n\n4. 先看问题再读材料\n   带着问题定位数据，避免通读浪费 1-2 分钟。\n\n训练节奏建议：一篇材料 5 题控制在 6 分钟以内，先保正确率（85%+）再压时间。'
    },
    {
      kw: ['削弱', '加强', '论证'],
      text: '论证类题目的通用流程：\n\n第一步：找论点（结论）\n通常在"因此/可见/说明/研究者认为"之后。\n\n第二步：找论据\n实验、数据、案例。\n\n第三步：判断论证结构\n· 因果型：A 导致 B\n· 类比型：A 与 B 相似\n· 归纳型：样本推整体\n\n第四步：对症下药\n削弱因果 → 因果倒置 / 另有他因 / 切断联系\n加强因果 → 排除他因 / 补充中间环节 / 增加相似案例\n削弱归纳 → 指出样本不具代表性\n\n力度排序：必然性 > 可能性；直接 > 间接；本质 > 现象。'
    },
    {
      kw: ['申论', '大作文', '立意', '作文'],
      text: '申论大作文立意四步法：\n\n1. 审题干\n圈出关键词、限定范围（结合材料/自选角度）、文体要求。\n\n2. 找题眼\n题干中的核心词往往就是总论点的主语，例如"治理的温度"，题眼是"温度"，需要解释为"以人民为中心的服务意识"。\n\n3. 回材料验证\n用材料中的高频表述、政策语言校准立意方向，避免自说自话。\n\n4. 搭分论点\n常用结构：\n· 是什么 + 为什么 + 怎么办\n· 三个维度并列（如：理念、机制、能力）\n· 主体并列（政府、市场、社会）\n\n写作提示：开头 150 字内，分论点句放段首且句式工整，结尾回扣总论点、不出现新观点。'
    },
    {
      kw: ['薄弱', '分析', '学情', '数据'],
      text: null // 动态生成
    },
    {
      kw: ['常识', '记忆', '背'],
      text: '常识判断的正确打开方式：\n\n· 不要指望全会。常识 20 题，能稳定拿 12-14 分即为优秀。\n· 按模块建卡：法律（宪法、民法、刑法常识）、时政（近一年重要会议与文件）、科技（生活物理化学）、人文（成语典故、朝代顺序）、地理（之最、气候、资源）。\n· 用"排除法 + 生活经验"，遇到完全陌生的题目 20 秒内果断猜测，不纠缠。\n· 每天 15 分钟碎片时间刷题，重在长期积累而非集中突击。\n· 时政务必看官方表述原文，避免二手材料的错误改写。'
    }
  ];

  function localReply(text) {
    const s = App.store.stats();
    const hit = KB_REPLIES.find(r => r.kw.some(k => text.indexOf(k) > -1));
    if (hit && hit.text) return hit.text;
    if (hit && !hit.text) {
      const mods = App.store.MODULES.map(m => Object.assign({ name: m.name }, App.store.moduleStat(m.key)))
        .filter(m => m.done > 0).sort((a, b) => a.accuracy - b.accuracy);
      if (!mods.length) return '你目前还没有练习记录，先去「行测」任一模块刷 10 题，我就能给出针对性的学情分析了。建议从「资料分析」开始，这是提分性价比最高的模块。';
      const weak = mods[0], strong = mods[mods.length - 1];
      return '基于你已完成的 ' + s.done + ' 道题（整体正确率 ' + s.accuracy + '%），我的分析如下：\n\n【最薄弱】' + weak.name + '：正确率 ' + weak.accuracy + '%，已练 ' + weak.done + ' 题\n建议：这是你当前的提分洼地，接下来一周把每日刷题量的 40% 投在这里，并且必须做错题二次复盘。\n\n【最稳定】' + strong.name + '：正确率 ' + strong.accuracy + '%\n建议：保持每天少量维持训练即可，不必过度投入。\n\n【待清理】错题本还有 ' + s.mistakes + ' 道未标记掌握，建议今天先清 10 道。\n\n【连续打卡】' + s.streak + ' 天，节奏不错，继续保持。';
    }
    return '关于「' + text.slice(0, 24) + '」，我的建议是：\n\n1. 先明确这属于哪个模块的问题，行测重技巧与速度，申论重结构与表达。\n2. 如果是题目本身，可以直接把题干发我，或者用「AI 拍照解题」上传图片，我会给出分步解析。\n3. 如果是备考策略问题，告诉我你的考试时间与目前每日可投入时长，我来生成具体计划。\n\n（当前为本地演示模式，在「设置 → AI 接口」中填入 API Key 后，将由真实大模型作答。）';
  }

  AI.chat = async function (messages, opts) {
    opts = opts || {};
    const last = messages[messages.length - 1];
    if (H.isReal()) {
      return H.chat([{ role: 'system', content: SYSTEM }].concat(messages), { onToken: opts.onToken });
    }
    const reply = localReply(last.content || '');
    if (opts.onToken) {
      await U.sleep(360);
      let acc = '';
      const step = 2;
      for (let i = 0; i < reply.length; i += step) {
        acc += reply.slice(i, i + step);
        opts.onToken(reply.slice(i, i + step), acc);
        await U.sleep(9);
      }
    } else { await U.sleep(600); }
    return reply;
  };

  /* ------------------------------------------------------------------ *
   * 5) 申论批改
   * ------------------------------------------------------------------ */
  AI.gradeEssay = async function (text, question) {
    if (H.isReal()) {
      const raw = await H.chat([
        { role: 'system', content: SYSTEM },
        {
          role: 'user', content: '请批改下面的申论作答，用 JSON 返回：' +
            '{"total":0-100,"dims":[{"name":"维度","score":0-20,"full":20,"comment":"点评"}],' +
            '"highlights":["亮点"],"suggestions":["改进建议"],"summary":"总评"}\n\n【题目】' + (question || '') + '\n\n【作答】\n' + text
        }
      ], { json: true });
      const r = H.parseJSON(raw, null);
      if (r) return r;
    }
    await U.sleep(1200);
    const len = text.replace(/\s/g, '').length;
    const hasStruct = /(一是|二是|首先|其次|第一|1[.、])/.test(text);
    const hasPolicy = /(以人民为中心|高质量发展|治理|机制|长效|统筹|协同)/.test(text);
    const paragraphs = text.split(/\n+/).filter(s => s.trim()).length;

    const dims = [
      { name: '要点覆盖', full: 25, score: U.clamp(Math.round(len / 24) + (hasStruct ? 5 : 0), 8, 25), comment: hasStruct ? '要点分条呈现，采分点识别度较高。' : '要点缺乏分条，阅卷时不易快速找点，建议使用"一是、二是"结构。' },
      { name: '结构逻辑', full: 20, score: U.clamp((hasStruct ? 16 : 10) + (paragraphs >= 3 ? 3 : 0), 7, 20), comment: paragraphs >= 3 ? '层次划分清楚，段落之间过渡自然。' : '段落偏少，建议按"做法—问题—对策"或"总—分"进一步拆分。' },
      { name: '论证深度', full: 20, score: U.clamp(Math.round(len / 34) + (hasPolicy ? 4 : 0), 6, 20), comment: hasPolicy ? '能结合政策语言展开，论证有一定纵深。' : '论证停留在现象描述，建议补充原因分析与影响判断。' },
      { name: '语言表达', full: 20, score: U.clamp(13 + (hasPolicy ? 4 : 0) + (len > 300 ? 2 : 0), 8, 20), comment: '整体表述规范，注意压缩口语化表达，多用规范的公文语言。' },
      { name: '规范与字数', full: 15, score: len < 120 ? 6 : len > 1200 ? 10 : 13, comment: len < 120 ? '字数明显不足，采分点难以铺开。' : len > 1200 ? '篇幅偏长，注意控制在题目要求范围内。' : '字数适中，符合题目要求。' }
    ];
    const total = dims.reduce((a, d) => a + d.score, 0);
    return {
      total,
      dims,
      highlights: [
        hasStruct ? '使用了分条表述，采分意识良好' : '整体行文流畅，表达完整',
        hasPolicy ? '恰当引用了政策话语，贴合命题导向' : '能够围绕材料展开，未出现明显跑题'
      ],
      suggestions: [
        '归纳概括题务必"抄材料关键词 + 同义合并"，不要过度自我发挥。',
        '每条要点建议采用"要点词 + 简要解释"的格式，先给结论后给说明。',
        '对策题要写清主体、手段与目标，避免"加强、重视、提高"式的空泛表述。',
        '控制在规定字数的 90%-100%，写满但不超格。'
      ],
      summary: '本次作答总分 ' + total + ' 分（满分 100）。' + (total >= 80 ? '整体水平较高，继续保持要点意识，注意语言凝练。' : total >= 65 ? '基础扎实但要点覆盖仍有提升空间，建议加强回归材料的训练。' : '当前主要问题是要点不全与结构松散，建议先按模板练习分条作答。')
    };
  };

  /* ------------------------------------------------------------------ *
   * 6) 文档摘要 / 自动打标
   * ------------------------------------------------------------------ */
  AI.summarizeDoc = async function (text, name, ext) {
    if (H.isReal() && text) {
      const raw = await H.chat([
        { role: 'system', content: SYSTEM },
        {
          role: 'user', content: '为下面这份公考备考资料生成结构化摘要，用 JSON 返回：' +
            '{"summary":"120字以内摘要","keypoints":["核心要点"],"tags":["3-5个标签"],"category":"xingce|shenlun|zhenti|jiqiao|cuoti"}\n' +
            '文件名：' + name + '\n内容：\n' + text.slice(0, 6000)
        }
      ], { json: true });
      const r = H.parseJSON(raw, null);
      if (r) return r;
    }
    await U.sleep(1100);
    const n = (name || '').toLowerCase();
    let category = 'xingce';
    if (/真题|试卷|卷|zhenti/.test(n)) category = 'zhenti';
    else if (/申论|作文|范文/.test(n)) category = 'shenlun';
    else if (/技巧|方法|公式|速记|笔记/.test(n)) category = 'jiqiao';
    else if (/错题|复盘|归纳/.test(n)) category = 'cuoti';

    const clean = (text || '').replace(/\s+/g, ' ').trim();
    const sentences = clean.split(/[。；\n]/).filter(s => s.length > 8);
    const tags = App.data.tagPool.filter(t => clean.indexOf(t) > -1).slice(0, 4);
    if (!tags.length) tags.push(ext ? ext.toUpperCase() : '资料', '待整理');

    const summary = clean
      ? (sentences.slice(0, 2).join('。') + '。').slice(0, 130)
      : '该文件为 ' + (ext || '未知').toUpperCase() + ' 格式，暂未提取到文本内容。接入真实 AI 接口（含 OCR / 文档解析）后可自动生成完整摘要与要点。';
    const keypoints = sentences.length
      ? sentences.slice(0, 3).map(s => s.trim().slice(0, 46))
      : ['建议补充关键词标签，便于后续全库检索', '可在详情页手动补写要点', '接入 AI 接口后自动生成结构化笔记'];

    return { summary, keypoints, tags, category };
  };

  /* ------------------------------------------------------------------ *
   * 7) 错题归因
   * ------------------------------------------------------------------ */
  AI.explainMistake = async function (q, myAnswer) {
    if (H.isReal()) {
      const raw = await H.chat([
        { role: 'system', content: SYSTEM },
        {
          role: 'user', content: '考生做错了下面这道题，正确答案 ' + q.answer + '，考生选了 ' + myAnswer +
            '。请分析错因，用 JSON 返回：{"reason":"错因分析","fix":"纠正方法","drill":["针对性训练建议"]}\n题目：\n' + q.stem
        }
      ], { json: true });
      const r = H.parseJSON(raw, null);
      if (r) return r;
    }
    await U.sleep(900);
    const reasons = {
      data: { reason: '错选 ' + myAnswer + ' 通常源于两类问题：一是公式用错（把基期量的除法做成了减法），二是估算精度不够导致相邻选项混淆。', fix: '解题前先在草稿纸写下公式再代数；相邻选项差距小于 5% 时，把有效数字保留到第三位。', drill: ['基期量专项 15 题', '截位直除限时训练', '两期比重定性判断 10 题'] },
      logic: { reason: '错选 ' + myAnswer + ' 反映出条件关系翻译不牢，容易把"肯定后件"当作有效推理，或把"只有…才…"翻译反。', fix: '养成"先写逻辑式再看选项"的习惯：A → B，只有 A 才 B 写作 B → A。', drill: ['翻译推理 20 题', '真假话矛盾关系专项', '削弱加强力度比较训练'] },
      math: { reason: '错选 ' + myAnswer + ' 多为模型判断失误或计算失误，未先识别题型就直接列式。', fix: '数量关系必须"先判模型（工程/行程/利润/排列组合），再选方法（方程/特值/正难则反）"。', drill: ['工程问题特值法 10 题', '行程问题三大模型', '排列组合逆向思维专项'] },
      verbal: { reason: '错选 ' + myAnswer + ' 常见于忽略转折词后的文段重心，或被表述片面的选项迷惑。', fix: '读题时用笔圈出"但是/然而/其实/关键在于"，转折之后即为重点；选项要覆盖文段落脚点。', drill: ['中心理解 15 题', '转折文段专项', '意图判断与对策项辨析'] },
      common: { reason: '错选 ' + myAnswer + ' 属于知识点识记不牢，或未看清"选非"设问。', fix: '建立分类记忆卡片，每天 15 分钟碎片复习；审题时先圈出"正确/错误"二字。', drill: ['宪法与国家机构 20 题', '生活科技常识专项', '成语典故人物对应'] },
      shenlun: { reason: '申论失分主要在要点不全与结构松散。', fix: '严格回归材料提炼原词，分条呈现。', drill: ['归纳概括 3 篇', '对策题 2 篇'] }
    };
    return reasons[q.module] || reasons.common;
  };

  /* ------------------------------------------------------------------ *
   * 8) 学习计划生成
   * ------------------------------------------------------------------ */
  AI.makePlan = async function () {
    if (H.isReal()) {
      const s = App.store.stats();
      const detail = App.store.MODULES.map(m => m.name + ' 正确率 ' + App.store.moduleStat(m.key).accuracy + '%').join('，');
      const raw = await H.chat([
        { role: 'system', content: SYSTEM },
        { role: 'user', content: '考生整体正确率 ' + s.accuracy + '%，' + detail + '，错题 ' + s.mistakes + ' 道。请生成今日 5 条学习任务，用 JSON 返回：{"tasks":[{"title":"","module":"data|logic|math|verbal|common|shenlun|review","minutes":20}]}' }
      ], { json: true });
      const r = H.parseJSON(raw, null);
      if (r && r.tasks) return r.tasks;
    }
    await U.sleep(1000);
    const ranked = App.store.MODULES
      .map(m => Object.assign({ key: m.key, name: m.name }, App.store.moduleStat(m.key)))
      .sort((a, b) => (a.done ? a.accuracy : 50) - (b.done ? b.accuracy : 50));
    const weak = ranked.slice(0, 2);
    const tasks = [
      { title: weak[0].name + ' 强化训练 15 题（当前正确率 ' + (weak[0].done ? weak[0].accuracy + '%' : '未测') + '）', module: weak[0].key, minutes: 25 },
      { title: weak[1].name + ' 专项突破 12 题', module: weak[1].key, minutes: 20 },
      { title: '错题本清理 10 道（优先 3 天内错题）', module: 'review', minutes: 20 },
      { title: '资料分析速算 · 截位直除限时', module: 'data', minutes: 15 },
      { title: '申论素材积累 + 归纳概括 1 题', module: 'shenlun', minutes: 30 }
    ];
    return tasks;
  };
})(window);
