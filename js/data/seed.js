/* ==========================================================================
   seed.js — 初始化种子数据（今日任务 / AI 能力卡 / 知识库示例 / 提示词）
   ========================================================================== */
(function (global) {
  'use strict';
  const App = global.App = global.App || {};
  App.data = App.data || {};

  /* AI 能力展示卡片 */
  App.data.aiCards = [
    { key: 'photo',  route: '#/photo',     icon: 'camera',   color: '#2f6bed', bg: '#eef4ff', title: 'AI 拍照解题', desc: '拍照上传题目，OCR 识别 + 题型判断 + 分步解析一步到位', cta: '立即拍题' },
    { key: 'grade',  route: '#/shenlun',   icon: 'pen',      color: '#e0559a', bg: '#fdeef6', title: '申论智能批改', desc: '五维评分模型，逐段点评立意、结构、论证与语言', cta: '开始写作' },
    { key: 'reason', route: '#/mistakes',  icon: 'target',   color: '#f59e0b', bg: '#fff5e6', title: '错题归因分析', desc: '自动聚类错因，定位知识盲区并生成专项练习', cta: '查看错题' },
    { key: 'kb',     route: '#/knowledge', icon: 'book',     color: '#7c5cf5', bg: '#f3efff', title: '知识库问答', desc: '上传讲义真题，AI 自动摘要打标，支持全库检索', cta: '管理资料' },
    { key: 'plan',   route: '#/assistant', icon: 'sparkles', color: '#0ea5b7', bg: '#e6f7fa', title: '学习规划助手', desc: '根据进度与正确率动态生成每日任务与冲刺计划', cta: '生成计划' },
    { key: 'stats',  route: '#/stats',     icon: 'chart',    color: '#16a34a', bg: '#e8f8ef', title: '学情数据洞察', desc: '模块能力雷达、趋势曲线与提分优先级推荐', cta: '查看学情' }
  ];

  /* 默认今日任务 */
  App.data.defaultTasks = function (U) {
    const d = U.todayStr();
    return [
      { id: U.uid('t'), title: '资料分析 15 题限时训练', module: 'data',   minutes: 25, done: false, date: d, from: 'AI 规划' },
      { id: U.uid('t'), title: '逻辑推理 · 削弱加强专项', module: 'logic',  minutes: 20, done: false, date: d, from: 'AI 规划' },
      { id: U.uid('t'), title: '言语理解 中心理解 10 题',  module: 'verbal', minutes: 15, done: false, date: d, from: 'AI 规划' },
      { id: U.uid('t'), title: '错题本复盘（昨日错题）',   module: 'review', minutes: 15, done: false, date: d, from: 'AI 规划' },
      { id: U.uid('t'), title: '申论归纳概括 1 篇',        module: 'shenlun',minutes: 30, done: false, date: d, from: 'AI 规划' }
    ];
  };

  /* 知识库分类 */
  App.data.kbCategories = [
    { key: 'all',     name: '全部资料', icon: 'layers',     color: '#4b5670' },
    { key: 'xingce',  name: '行测',     icon: 'grid',       color: '#2f6bed' },
    { key: 'shenlun', name: '申论',     icon: 'pen',        color: '#e0559a' },
    { key: 'zhenti',  name: '真题',     icon: 'file',       color: '#f59e0b' },
    { key: 'jiqiao',  name: '技巧',     icon: 'bulb',       color: '#7c5cf5' },
    { key: 'cuoti',   name: '错题',     icon: 'alert',      color: '#e5484d' }
  ];

  /* 知识库示例文档（首次进入自动写入，帮助理解产品） */
  App.data.sampleDocs = function (U) {
    const now = Date.now();
    return [
      {
        id: U.uid('doc'), name: '资料分析核心公式速记.md', ext: 'md', size: 4820,
        category: 'xingce', tags: ['公式', '速算', '高频'], starred: true, created: now - 86400000 * 3,
        text: '一、基期量 = 现期量 ÷ (1 + 增长率)\n二、增长量 = 现期量 × 增长率 ÷ (1 + 增长率)\n三、比重 = 部分 ÷ 整体；两期比重变化 = 现期比重 × (部分增速 - 整体增速) ÷ (1 + 部分增速)\n四、平均数增长率 = (总量增速 - 份数增速) ÷ (1 + 份数增速)\n五、年均增长率 ≈ (末期 ÷ 初期)^(1/n) - 1\n速算技巧：截位直除、分数比较、特征数字法（如 1/7≈14.3%，1/8=12.5%）。',
        summary: '系统梳理资料分析五大核心公式与三种速算技巧，覆盖基期量、增长量、比重变化、平均数增长率与年均增长率，适合考前每日晨读。',
        keypoints: ['基期量与增长量互推关系', '两期比重变化的定性判断优先', '常见分数与百分数对应表需背熟'],
        blobKey: ''
      },
      {
        id: U.uid('doc'), name: '2025国考申论（省部级）真题.pdf', ext: 'pdf', size: 1862400,
        category: 'zhenti', tags: ['国考', '省部级', '2025'], starred: false, created: now - 86400000 * 8,
        text: '',
        summary: '2025 年国考省部级申论试卷，主题聚焦基层治理现代化，共 4 题：归纳概括、综合分析、贯彻执行（调研报告提纲）、大作文（"治理的温度"）。',
        keypoints: ['大作文立意应扣"以人民为中心"', '贯彻执行注意格式与对象', '综合分析题需先解释后延伸'],
        blobKey: ''
      },
      {
        id: U.uid('doc'), name: '申论万能开头结尾模板.docx', ext: 'docx', size: 42800,
        category: 'shenlun', tags: ['模板', '大作文', '语言'], starred: true, created: now - 86400000 * 5,
        text: '',
        summary: '整理 12 组申论大作文开头与结尾写法，包含引言式、案例式、数据式、对比式四类范式，并附政策金句 40 条。',
        keypoints: ['开头控制在 150 字以内', '结尾回扣总论点，避免出现新观点', '慎用生僻典故，优先政策表述'],
        blobKey: ''
      },
      {
        id: U.uid('doc'), name: '逻辑判断错题归纳.txt', ext: 'txt', size: 3120,
        category: 'cuoti', tags: ['逻辑', '削弱加强', '复盘'], starred: false, created: now - 86400000 * 2,
        text: '错题 1：混淆充分必要条件（"只有…才…"翻译错误）\n错题 2：削弱题误选无关项，未识别论点因果结构\n错题 3：真假话未先找矛盾，浪费时间\n错题 4：类比推理定义关系不够精确\n改进：每道逻辑题先写出题干逻辑式，再动手。',
        summary: '近两周逻辑判断错题的四类典型错因归纳，核心问题集中在条件关系翻译与论证结构识别。',
        keypoints: ['"只有 A 才 B" 应翻译为 B → A', '削弱优先找他因', '真假话先找矛盾关系'],
        blobKey: ''
      }
    ];
  };

  /* AI 助手快捷提示词 */
  App.data.prompts = [
    '帮我制定本周备考计划',
    '资料分析怎么提速？',
    '讲讲削弱型题目的解题套路',
    '申论大作文如何立意',
    '分析我的薄弱模块',
    '常识判断有什么记忆方法'
  ];

  /* 知识点标签库（供知识库自动打标使用） */
  App.data.tagPool = [
    '基期量', '增长率', '比重', '速算', '削弱加强', '翻译推理', '真假话',
    '中心理解', '逻辑填空', '语句排序', '工程问题', '行程问题', '排列组合',
    '宪法', '经济', '科技', '人文', '归纳概括', '对策建议', '贯彻执行', '大作文'
  ];
})(window);
