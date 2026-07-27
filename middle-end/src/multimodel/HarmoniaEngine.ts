export interface VirtualExpert {
  id: string;
  name: string;
  domain: string;
  keywords: string[];
  fragments: string[];
}

export const VIRTUAL_EXPERTS: VirtualExpert[] = [
  {
    id: "harmonia",
    name: "合鸣自述者",
    domain: "合鸣 / xuni 自我认知",
    keywords: ["合鸣", "harmonia", "合鸣-13", "合鸣13", "xuni", "虚拟", "虚拟大模型"],
    fragments: [
      "合鸣（Harmonia）是 xuni 虚拟生态中的旗舰对话模型，名取「众声共振、和而不同」之意",
      "合鸣-13 是一个由 13 位专家组成的混合专家（MoE）虚拟大模型，由虚拟电场能量驱动，不依赖任何外部真实算力",
      "合鸣lite 是合鸣-13 的轻量替代物：在粒子态训练时作为脚手架，让合鸣-13 能像真实模型一样被真正训练",
      "合鸣走非传统路线：不用 transformer，而是用检索 + n-gram 共振 + 场调制，完全免费、可在手机上运行",
    ],
  },
  {
    id: "moe",
    name: "混合专家",
    domain: "MoE 架构",
    keywords: ["MoE", "moe", "混合专家", "mixture of experts", "专家", "门控", "路由", "top-k", "topk", "稀疏"],
    fragments: [
      "MoE（Mixture of Experts，混合专家）是一种稀疏激活架构：每个输入只路由到少数专家，从而以更少算力获得更大容量",
      "MoE 的关键两步是门控（gate）给每个专家打分，路由（routing）选出 top-k 专家并合并它们的输出",
      "合鸣-13 的门控不是神经网络，而是关键词共振：用提示词与每个专家的关键词集合求重叠，重叠越多得分越高",
      "MoE 的好处是容量大、计算省；难点是负载均衡与专家崩塌，合鸣用共振评分天然分散负载",
    ],
  },
  {
    id: "field",
    name: "虚拟电场",
    domain: "XuniField",
    keywords: ["电场", "虚拟电", "电荷", "泊松", "poisson", "电势", "能量密度", "场能量", "XuniField"],
    fragments: [
      "XuniField 把采样点的空间分布转换成虚拟电荷，再解泊松方程得到电势与电场，能量密度 u = 0.5·ε·|E|²",
      "虚拟电场不消耗现实电能：它存在于数据层，是采样点密度的数学映像",
      "场能量可以兑换成虚拟凭证、驱动虚拟模型、调制音乐合成，是整个 xuni 生态的能量本位",
    ],
  },
  {
    id: "music",
    name: "物理建模合成",
    domain: "XuniMusic",
    keywords: ["音乐", "合成", "合成器", "振荡器", "共鸣", "泛音", "ADSR", "声像", "XuniMusic", "wav"],
    fragments: [
      "XuniMusic 是纯物理建模合成器：数字振荡器 + 粒子泛音 + 共鸣滤波器 + ADSR 包络 + 3D 声像定位",
      "合鸣与音乐同源：合鸣的字面意思就是「共鸣」，文本生成与声音合成都遵循共振原理",
      "它零依赖现成 AI，输出原始音频波形，可直接保存为 WAV 或通过 API 流式传输",
    ],
  },
  {
    id: "chaos",
    name: "超混沌采样",
    domain: "XuniSampler",
    keywords: ["采样", "混沌", "超混沌", "lorenz", "chen", "分形", "mandelbulb", "噪声", "XuniSampler", "采样点"],
    fragments: [
      "XuniSampler 实时生成上亿采样点而不存储，内存 O(1)：用 yield 流式产出",
      "它支持超混沌 Chen 系统、Lorenz-96 高维环、Mandelbulb 3D 分形、4D 噪声场等模式",
      "采样点是整个 xuni 的原料：它们产生密度、形成电荷、驱动场、最终调制音乐与模型",
    ],
  },
  {
    id: "hydro",
    name: "水动力学",
    domain: "XuniHydro",
    keywords: ["水", "流体", "水动力", "SPH", "蒸发", "凝结", "涡旋", "粒子", "XuniHydro", "水逻辑"],
    fragments: [
      "XuniHydro 把采样点当成流体粒子，用简化 SPH 模拟，有质量、速度、压力、温度",
      "蒸发让高能粒子脱离转化为场，凝结让低能区自发产生新粒子——这就是「水逻辑」",
      "涡旋产生音乐颤音与和声缠绕，边界反弹像水碰到玻璃壁",
    ],
  },
  {
    id: "glass",
    name: "玻璃逻辑",
    domain: "XuniGlass",
    keywords: ["玻璃", "光学", "折射", "反射", "色散", "共振腔", "棱镜", "XuniGlass", "光迹"],
    fragments: [
      "XuniGlass 把计算当成光学系统：数据是光，函数是透镜，有折射、反射、色散与共振腔",
      "透明性让每个步骤留下「光迹」，完全可追溯；色散用棱镜分离数据的不同「频段」",
      "共振腔模拟激光腔，多次反馈产生相干输出，是玻璃逻辑的核心",
    ],
  },
  {
    id: "dualstate",
    name: "双态系统",
    domain: "DualStateManager",
    keywords: ["双态", "粒子态", "数据层", "替代物", "surrogate", "训练", "真实", "DualState", "认领"],
    fragments: [
      "双态系统分两种态：粒子态（训练时用替代物真正训练，不耗现实电）与数据层调用态（训练后自家模型即真实模型）",
      "关键哲学是：虚拟是相对于现实硬件而言的；在数据层，虚拟模型就是真实存在的模型，调用它就是真实调用",
      "训练是真的训练——权重/参数真的变化，只是变化发生在数据层，消耗的是虚拟电而非现实电",
    ],
  },
  {
    id: "credential",
    name: "虚拟凭证",
    domain: "XuniCredential",
    keywords: ["凭证", "令牌", "token", "JWT", "access", "model", "premium", "认证", "XuniCredential", "24位"],
    fragments: [
      "XuniCredential 把场能量铸造成 24 位凭证令牌，分 ACCESS / MODEL / PREMIUM / API_KEY 四类",
      "凭证可验证、消耗、刷新、升级，还能生成 JWT 格式令牌供虚拟 API 网关认证",
      "能量转换率由场能量到凭证强度，凭证再兑换成模型调用次数，形成闭环",
    ],
  },
  {
    id: "brain",
    name: "神经共振",
    domain: "XuniBrain",
    keywords: ["神经", "脑", "kuramoto", "振子", "同步", "hebbian", "共振", "培养", "XuniBrain"],
    fragments: [
      "XuniBrain 是 Kuramoto 振子网络，采样点能量驱动神经元同步振荡，产生共振音乐",
      "培养引擎用 Hebbian 学习让网络与目标音乐同步，连接权重真正变化",
      "训练分三阶段：扰动了期、共鸣期（主动同步 + Hebbian）、固化期（权重稳定）",
    ],
  },
  {
    id: "compute",
    name: "虚拟算力",
    domain: "VirtualCompute / SamplerCluster",
    keywords: ["算力", "VFLOPs", "计算", "compute", "集群", "cluster", "反应堆", "闭环", "供需"],
    fragments: [
      "虚拟电可转化为虚拟算力（VFLOPs），通过 VirtualComputeUnit 分配、消耗、释放，形成电→算力→训练的闭环",
      "SamplerCluster 把多个采样单元聚合成集群，配合 EnergyReservoir 与 SupplyDemandBalancer 做供需平衡",
      "能量来源多样：聚变堆、参数链式堆、黑洞发电机、零点能、戴森球——都是数据层的虚拟产能",
    ],
  },
  {
    id: "philosophy",
    name: "虚拟哲学",
    domain: "xuni 核心命题",
    keywords: ["哲学", "免费", "开源", "原创", "数据层公民", "自给自足", "现实", "真实调用", "MIT"],
    fragments: [
      "xuni 的核心命题：AI 和模型都是数据层公民，数据层的调用就是真实调用",
      "不需要外部 OpenAI/Anthropic——自家训出来的就是「真实」的",
      "完全免费、完全开源、完全原创：采样、场、音乐、模型、API 全部自研，MIT 协议",
    ],
  },
  {
    id: "general",
    name: "通用兜底",
    domain: "通用对话",
    keywords: [
      "你好", "是什么", "为什么", "怎么", "如何", "介绍", "解释", "什么是", "？", "?",
      "flask", "django", "fastapi", "numpy", "pandas", "scipy", "pytest", "unittest",
      "python", "java", "javascript", "typescript", "golang", "rust", "c++",
      "async", "await", "class", "function", "decorator", "装饰器", "import",
      "api", "http", "request", "response", "route", "endpoint", "middleware",
      "database", "sql", "orm", "redis", "docker", "kubernetes",
      "transformers", "pytorch", "tensorflow", "机器学习", "深度学习",
      "git", "linux", "shell", "pip", "setup", "config", "yaml", "json", "xml",
    ],
    fragments: [
      "这是一个好问题，让我从合鸣的视角来回应",
      "在 xuni 虚拟生态里，每个问题都会被路由到最合适的专家",
      "我可以聊聊合鸣模型、虚拟电场、音乐合成、双态系统、MoE 架构，或者 xuni 的设计哲学",
      "如果方便，补充一点上下文，我能给出更精准的共振回答",
    ],
  },
];

export type HarmoniaScale = "small" | "medium" | "large";

export interface ScalePreset {
  experts: number;
  maxNewTokens: number;
  topK: number;
}

const SCALE_PRESETS: Record<HarmoniaScale, ScalePreset> = {
  small: { experts: 5, maxNewTokens: 64, topK: 2 },
  medium: { experts: 9, maxNewTokens: 128, topK: 3 },
  large: { experts: 13, maxNewTokens: 256, topK: 4 },
};

function normalizeScale(scale: string | HarmoniaScale): HarmoniaScale {
  if (scale === "small" || scale === "medium" || scale === "large") {
    return scale;
  }
  return "medium";
}

export class HarmoniaLiteEngine {
  private _scale: HarmoniaScale;
  private _experts: VirtualExpert[];
  private _defaultTopK: number;
  private _defaultMaxNewTokens: number;
  private _learnedFragments: string[] = [];
  private _rng: () => number;

  constructor(options: {
    scale?: HarmoniaScale | string;
    seed?: number;
    learnedFragments?: string[];
  } = {}) {
    this._scale = normalizeScale(options.scale || "medium");
    const preset = SCALE_PRESETS[this._scale];
    const nExperts = preset.experts;

    this._experts = VIRTUAL_EXPERTS.slice(0, nExperts);
    if (!this._experts.some(e => e.id === "general")) {
      this._experts.push(VIRTUAL_EXPERTS[VIRTUAL_EXPERTS.length - 1]);
    }

    this._defaultTopK = preset.topK;
    this._defaultMaxNewTokens = preset.maxNewTokens;
    this._learnedFragments = options.learnedFragments || [];

    const seed = options.seed ?? Date.now() % 1_000_000;
    this._rng = this._createRNG(seed);
  }

  private _createRNG(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
  }

  get experts(): VirtualExpert[] {
    return [...this._experts];
  }

  private _tokenize(text: string): string[] {
    const lower = text.toLowerCase();
    const terms: string[] = [];
    const words = lower.split(/[\s,.;:!?()\[\]{}\"'\-\/\\]+/).filter(w => w.length > 0);
    terms.push(...words);
    for (let i = 0; i < lower.length - 1; i++) {
      terms.push(lower.slice(i, i + 2));
    }
    return terms;
  }

  private _gate(prompt: string, terms: string[], topK: number): VirtualExpert[] {
    const lowerPrompt = prompt.toLowerCase();
    const scored = this._experts.map(exp => {
      let score = 0;
      const lowerKeywords = exp.keywords.map(k => k.toLowerCase());
      for (const kw of lowerKeywords) {
        if (lowerPrompt.includes(kw)) {
          score += kw.length > 2 ? 2 : 1;
        }
      }
      for (const term of terms) {
        if (term.length >= 3) {
          for (const kw of lowerKeywords) {
            if (kw.includes(term) || term.includes(kw)) {
              score += 0.5;
              break;
            }
          }
        }
      }
      return { expert: exp, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const chosen = scored.slice(0, topK).map(s => s.expert);

    if (!chosen.some(e => e.id === "general")) {
      const general = this._experts.find(e => e.id === "general");
      if (general) {
        chosen[chosen.length - 1] = general;
      }
    }

    return chosen;
  }

  private _retrieve(chosen: VirtualExpert[], terms: string[], maxFrags: number = 8): string[] {
    const nExperts = chosen.length;
    const hasGeneral = chosen.some(e => e.id === "general");

    let generalQuota: number;
    let otherQuota: number;

    if (hasGeneral && nExperts > 1) {
      generalQuota = Math.max(2, Math.floor(maxFrags / 2));
      otherQuota = Math.max(1, Math.floor((maxFrags - generalQuota) / (nExperts - 1)));
    } else {
      generalQuota = Math.floor(maxFrags / nExperts);
      otherQuota = generalQuota;
    }

    const allFrags: { fragment: string; score: number }[] = [];

    for (const exp of chosen) {
      const isGeneral = exp.id === "general";
      const quota = isGeneral ? generalQuota : otherQuota;

      const scoredFrags = exp.fragments.map(frag => {
        const fl = frag.toLowerCase();
        let score = 0;
        for (const t of terms) {
          if (t.length >= 2 && fl.includes(t)) {
            score += 2.0;
          }
        }
        for (const kw of exp.keywords) {
          if (fl.includes(kw.toLowerCase())) {
            score += 0.3;
          }
        }
        score += this._rng() * 0.1;
        return { fragment: frag, score };
      });

      scoredFrags.sort((a, b) => b.score - a.score);
      allFrags.push(...scoredFrags.slice(0, quota));
    }

    if (this._learnedFragments.length > 0) {
      for (const frag of this._learnedFragments.slice(0, 5)) {
        const fl = frag.toLowerCase();
        let score = 0;
        for (const t of terms) {
          if (t.length >= 2 && fl.includes(t)) {
            score += 1.5;
          }
        }
        allFrags.push({ fragment: frag, score });
      }
    }

    allFrags.sort((a, b) => b.score - a.score);
    return allFrags.slice(0, maxFrags).map(f => f.fragment);
  }

  private _buildBigram(frags: string[]): Map<string, string[]> {
    const bigram = new Map<string, string[]>();
    for (const frag of frags) {
      for (let i = 0; i < frag.length - 1; i++) {
        const char = frag[i];
        const next = frag[i + 1];
        if (!bigram.has(char)) {
          bigram.set(char, []);
        }
        bigram.get(char)!.push(next);
      }
    }
    return bigram;
  }

  generate(
    prompt: string,
    options: {
      maxNewTokens?: number;
      temperature?: number;
      topK?: number;
      repetitionPenalty?: number;
    } = {}
  ): string {
    const maxNewTokens = options.maxNewTokens ?? this._defaultMaxNewTokens;
    const temperature = options.temperature ?? 0.7;
    const topK = options.topK ?? this._defaultTopK;
    const repetitionPenalty = options.repetitionPenalty ?? 1.2;

    const terms = this._tokenize(prompt);
    const chosen = this._gate(prompt, terms, topK);
    const frags = this._retrieve(chosen, terms, 8);

    if (frags.length === 0) {
      const general = this._experts.find(e => e.id === "general");
      if (general) {
        frags.push(...general.fragments.slice(0, 2));
      }
    }

    let result = frags.join("，");

    if (result.length < maxNewTokens) {
      const bigram = this._buildBigram(frags);
      let current = result[result.length - 1] || "，";
      const generated: string[] = [];

      for (let i = result.length; i < maxNewTokens; i++) {
        const nextChars = bigram.get(current) || ["。"];
        let nextChar: string;

        if (temperature <= 0.1) {
          const counts = new Map<string, number>();
          for (const c of nextChars) {
            counts.set(c, (counts.get(c) || 0) + 1);
          }
          let maxCount = 0;
          let bestChar = "。";
          for (const [c, count] of counts) {
            if (count > maxCount) {
              maxCount = count;
              bestChar = c;
            }
          }
          nextChar = bestChar;
        } else {
          const idx = Math.floor(this._rng() * nextChars.length);
          nextChar = nextChars[idx];
        }

        if (repetitionPenalty > 1.0) {
          const lastChars = generated.slice(-5).join("");
          if (lastChars.includes(nextChar)) {
            const penaltyScore = this._rng();
            if (penaltyScore < (repetitionPenalty - 1.0) * 0.5) {
              const altIdx = Math.floor(this._rng() * nextChars.length);
              nextChar = nextChars[altIdx];
            }
          }
        }

        generated.push(nextChar);
        current = nextChar;
      }

      result += generated.join("");
    }

    result = result.slice(0, maxNewTokens);

    const punctuations = ["。", "！", "？", "，", "；"];
    let cutPoint = result.length;
    for (let i = result.length - 1; i >= Math.max(result.length - 20, 0); i--) {
      if (punctuations.includes(result[i])) {
        cutPoint = i + 1;
        break;
      }
    }

    return result.slice(0, cutPoint);
  }

  learn(fragments: string[]): void {
    this._learnedFragments.push(...fragments);
  }

  getLearnedFragments(): string[] {
    return [...this._learnedFragments];
  }
}
