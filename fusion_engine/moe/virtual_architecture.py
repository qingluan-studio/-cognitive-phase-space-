# -*- coding: utf-8 -*-
"""
moe/virtual_architecture.py
===========================

虚拟 MoE 架构——替代 PyTorch 实现的 MoE

核心理念：
    现实 MoE：Expert(nn.Module) + Gate(nn.Module) + 真实权重张量
    虚拟 MoE：VirtualExpert(指纹) + VirtualGate(特征路由) + n-gram 知识

    每个专家是粒子态——权重用概念指纹表示，不占现实内存。
    门控用文本特征路由，不需要真权重矩阵。
    13个领域专家稀疏激活，协同生成。

合鸣（Harmonia-13）：13个领域专家融合的虚拟统一模型
    - 粒子态：不占内存，虚拟电驱动
    - 数据层：训练好后是真实可调用模型
    - 免费：CPU轻松跑，走免费路 😂
"""

import hashlib
import math
import time
from dataclasses import dataclass, field
from typing import List, Tuple, Optional, Dict, Any
import numpy as np

MODEL_NAME = "Harmonia-13"
MODEL_NAME_CN = "合鸣"

# 13个领域专家定义
EXPERT_DOMAINS = [
    "采样点能量", "虚拟电场", "双态切换", "虚拟凭证",
    "认知相空间", "音乐作曲", "扩散生成", "对话理解",
    "记忆推理", "评估淘汰", "能量经济", "参数市场", "活力涌现",
]


@dataclass
class VirtualWeights:
    """虚拟权重——概念指纹"""
    fingerprint: str = ""
    param_count: int = 0
    update_count: int = 0
    last_updated: float = field(default_factory=time.time)

    @property
    def real_memory_bytes(self) -> int:
        return len(self.fingerprint) + 100

    @property
    def virtual_size_bytes(self) -> int:
        return self.param_count * 4

    def update(self, loss_delta: float = 0.0):
        self.update_count += 1
        self.last_updated = time.time()
        seed = f"{self.update_count}-{self.last_updated}-{loss_delta:.6f}"
        self.fingerprint = hashlib.sha256(seed.encode()).hexdigest()


class VirtualExpert:
    """
    虚拟专家——替代 nn.Module 的 Expert

    每个专家是一个领域专家：
    - 权重：VirtualWeights（概念指纹，不占内存）
    - 知识：n-gram 统计表（领域专用）
    - 训练：学习领域文本，更新指纹
    - 生成：基于 n-gram 生成领域文本
    """

    def __init__(self, expert_id: int, domain: str,
                 d_model: int = 256, d_ff: int = 1024):
        self.expert_id = expert_id
        self.domain = domain
        self.d_model = d_model
        self.d_ff = d_ff

        # 虚拟权重（两层FFN的参数量）
        self.weights = VirtualWeights(
            param_count=2 * d_model * d_ff + 2 * d_ff + 2 * d_model,
        )

        # 领域知识
        self.ngram_table: Dict[str, List[str]] = {}
        self.knowledge_base: List[str] = []
        self.activation_count: int = 0
        self.training_progress: float = 0.0

    def forward(self, x: Any) -> Any:
        """虚拟前向传播——返回输入（粒子态不计算）"""
        self.activation_count += 1
        return x

    def learn(self, texts: List[str]):
        """学习领域文本"""
        for text in texts:
            self.knowledge_base.append(text)
            chars = list(text)
            for i in range(len(chars) - 1):
                key = chars[i]
                if key not in self.ngram_table:
                    self.ngram_table[key] = []
                self.ngram_table[key].append(chars[i + 1])
        self.weights.update()
        self.training_progress = min(1.0, self.training_progress + 0.05)

    def generate(self, prompt: str, max_tokens: int = 32) -> str:
        """基于 n-gram 生成领域文本"""
        result = list(prompt)
        rng = np.random.default_rng(hash(prompt + self.domain) % 2**32)

        for _ in range(max_tokens):
            if not result:
                break
            last = result[-1]
            if last in self.ngram_table and rng.random() < self.training_progress:
                result.append(rng.choice(self.ngram_table[last]))
            elif self.knowledge_base and rng.random() < 0.2:
                kb = rng.choice(self.knowledge_base)
                if len(kb) > len(result):
                    result.append(kb[len(result)])
                else:
                    result.append(chr(int(rng.integers(0x4e00, 0x9fa6))))
            else:
                result.append(chr(int(rng.integers(0x4e00, 0x9fa6))))

        return "".join(result[:len(prompt) + max_tokens])

    def stats(self) -> Dict[str, Any]:
        return {
            "expert_id": self.expert_id,
            "domain": self.domain,
            "params": self.weights.param_count,
            "real_memory_kb": self.weights.real_memory_bytes / 1024,
            "ngram_size": len(self.ngram_table),
            "knowledge_size": len(self.knowledge_base),
            "activations": self.activation_count,
            "training_progress": f"{self.training_progress*100:.0f}%",
        }


class VirtualGate:
    """
    虚拟门控——替代 nn.Module 的 Gate

    现实 Gate：线性层+softmax，选 top-k 专家
    虚拟 Gate：文本特征路由，基于关键词匹配选专家

    路由策略：
    - 提取输入文本的关键词
    - 匹配专家领域
    - 选 top-k 最匹配的专家
    """

    # 领域关键词映射
    DOMAIN_KEYWORDS: Dict[str, List[str]] = {
        "采样点能量": ["采样", "采样点", "产电", "发电", "能量源", "电"],
        "虚拟电场": ["电场", "虚拟电", "电", "能量", "蓄水池"],
        "双态切换": ["双态", "粒子态", "数据层", "切换", "替代物"],
        "虚拟凭证": ["凭证", "token", "JWT", "认证", "权限"],
        "认知相空间": ["认知", "相空间", "几何", "拓扑", "流形", "吸引子"],
        "音乐作曲": ["音乐", "作曲", "旋律", "和声", "节奏", "音色"],
        "扩散生成": ["扩散", "生成", "图像", "去噪"],
        "对话理解": ["对话", "聊天", "问答", "理解"],
        "记忆推理": ["记忆", "推理", "思考", "逻辑"],
        "评估淘汰": ["评估", "淘汰", "质量", "评分", "排名"],
        "能量经济": ["经济", "交易", "买卖", "赚取", "能量经济学"],
        "参数市场": ["参数", "市场", "拍卖", "导入", "导出", "交易"],
        "活力涌现": ["活力", "涌现", "自由能", "聚变", "链式", "黑洞", "零点能", "戴森球"],
    }

    def __init__(self, num_experts: int = 13, top_k: int = 2):
        self.num_experts = num_experts
        self.top_k = min(top_k, num_experts)
        self.routing_history: List[Dict[str, Any]] = []

    def route(self, text: str) -> Tuple[List[int], List[float]]:
        """
        路由——根据文本选 top-k 专家

        Returns: (expert_indices, gate_weights)
        """
        scores = np.zeros(self.num_experts)

        for idx, domain in enumerate(EXPERT_DOMAINS[:self.num_experts]):
            keywords = self.DOMAIN_KEYWORDS.get(domain, [domain])
            for kw in keywords:
                if kw in text:
                    scores[idx] += 1.0

        # 如果没匹配到，随机选
        if scores.sum() == 0:
            rng = np.random.default_rng(hash(text) % 2**32)
            scores = rng.random(self.num_experts)

        # softmax 归一化
        scores = np.exp(scores - scores.max())
        scores = scores / scores.sum()

        # top-k
        top_indices = np.argsort(scores)[-self.top_k:][::-1]
        top_weights = scores[top_indices]
        # 归一化 top-k 权重
        top_weights = top_weights / top_weights.sum()

        self.routing_history.append({
            "text": text[:50],
            "experts": top_indices.tolist(),
            "weights": top_weights.tolist(),
        })

        return top_indices.tolist(), top_weights.tolist()

    def get_routing_stats(self) -> Dict[str, Any]:
        """路由统计"""
        expert_counts = np.zeros(self.num_experts)
        for h in self.routing_history:
            for idx in h["experts"]:
                expert_counts[idx] += 1
        return {
            "total_routes": len(self.routing_history),
            "expert_activation_count": expert_counts.astype(int).tolist(),
            "top_k": self.top_k,
        }


class VirtualMoEModel:
    """
    虚拟 MoE 模型——替代 nn.Module 的 MoEModel

    合鸣（Harmonia-13）：13个领域专家 + 虚拟门控

    特点：
    - 13个 VirtualExpert，每个是领域专家
    - VirtualGate 根据输入路由 top-k 专家
    - 生成时融合多个专家输出
    - 权重全是概念指纹，不占现实内存
    - 虚拟电驱动训练
    """

    def __init__(
        self,
        vocab_size: int = 5000,
        d_model: int = 256,
        n_layers: int = 4,
        num_experts: int = 13,
        top_k: int = 2,
        d_ff: int = 1024,
    ):
        self.vocab_size = vocab_size
        self.d_model = d_model
        self.n_layers = n_layers
        self.num_experts = num_experts
        self.top_k = top_k

        # 创建专家
        self.experts: List[VirtualExpert] = [
            VirtualExpert(i, EXPERT_DOMAINS[i] if i < len(EXPERT_DOMAINS) else f"专家-{i}",
                         d_model=d_model, d_ff=d_ff)
            for i in range(num_experts)
        ]

        # 门控
        self.gate = VirtualGate(num_experts=num_experts, top_k=top_k)

        # 模型级虚拟权重
        self.weights = VirtualWeights(param_count=self.total_params)

        # 训练状态
        self.training_progress: float = 0.0
        self.is_trained: bool = False
        self.training_state = "UNTRAINED"
        self.owner: Optional[str] = None
        self._energy_buffer: float = 0.0
        self.loss_history: List[float] = []

    @property
    def total_params(self) -> int:
        """总参数量"""
        expert_params = sum(e.weights.param_count for e in self.experts)
        # 嵌入层 + 门控 + LM head
        embed_params = self.vocab_size * self.d_model * 2
        gate_params = self.d_model * self.num_experts
        return expert_params + embed_params + gate_params

    @property
    def total_params_str(self) -> str:
        p = self.total_params
        if p >= 1e9:
            return f"{p/1e9:.2f}B"
        elif p >= 1e6:
            return f"{p/1e6:.2f}M"
        return f"{p:,}"

    def claim(self, owner: str) -> bool:
        if self.owner is not None:
            return False
        self.owner = owner
        self.training_state = "CLAIMED"
        return True

    def charge(self, energy: float) -> float:
        self._energy_buffer += energy
        return self._energy_buffer

    def start_training(self) -> bool:
        if self.owner is None or self.training_state in ("TRAINING", "TRAINED"):
            return False
        self.training_state = "TRAINING"
        return True

    def update_training(self, progress: float) -> float:
        if self.training_state != "TRAINING":
            return self.training_progress
        self.training_progress = max(0.0, min(1.0, progress))
        if self.training_progress >= 1.0:
            self.complete_training()
        return self.training_progress

    def complete_training(self) -> bool:
        if self.training_state != "TRAINING":
            return False
        self.training_state = "TRAINED"
        self.training_progress = 1.0
        self.is_trained = True
        return True

    def forward(self, text: str) -> Dict[str, Any]:
        """
        虚拟前向传播——路由+激活专家

        Returns: {logits(模拟), routed_experts, gate_weights, aux_loss}
        """
        expert_indices, gate_weights = self.gate.route(text)

        # 激活选中的专家
        activated = []
        for idx in expert_indices:
            self.experts[idx].forward(text)
            activated.append(self.experts[idx].domain)

        # 模拟 logits（不需要真张量）
        logits_shape = (len(text), self.vocab_size)
        aux_loss = self._compute_aux_loss()

        return {
            "logits_shape": logits_shape,
            "routed_experts": activated,
            "expert_indices": expert_indices,
            "gate_weights": gate_weights,
            "aux_loss": aux_loss,
        }

    def _compute_aux_loss(self) -> float:
        """负载均衡辅助损失（模拟）"""
        counts = np.array([e.activation_count for e in self.experts], dtype=float)
        if counts.sum() == 0:
            return 0.0
        probs = counts / counts.sum()
        uniform = 1.0 / self.num_experts
        return float(np.sum((probs - uniform) ** 2) * self.num_experts)

    def generate(self, prompt: str, max_new_tokens: int = 64) -> str:
        """
        生成文本——融合 top-k 专家输出

        1. 门控路由选专家
        2. 每个专家生成候选
        3. 按门控权重融合
        """
        if not self.is_trained and self.training_progress < 0.2:
            # 未训练：随机
            rng = np.random.default_rng(hash(prompt) % 2**32)
            result = list(prompt)
            for _ in range(max_new_tokens):
                result.append(chr(int(rng.integers(0x4e00, 0x9fa6))))
            return "".join(result[:max_new_tokens])

        # 路由
        expert_indices, gate_weights = self.gate.route(prompt)

        # 每个专家生成
        expert_outputs = []
        for idx, weight in zip(expert_indices, gate_weights):
            expert = self.experts[idx]
            output = expert.generate(prompt, max_tokens=max_new_tokens)
            expert_outputs.append((output, weight))

        # 融合：按权重选择字符
        result = list(prompt)
        rng = np.random.default_rng(hash(prompt) % 2**32)
        total_len = len(prompt) + max_new_tokens

        for i in range(max_new_tokens):
            pos = len(result)
            if pos >= total_len:
                break

            # 按权重选专家
            r = rng.random()
            cumsum = 0.0
            chosen_output = expert_outputs[0][0]
            for output, weight in expert_outputs:
                cumsum += weight
                if r < cumsum:
                    chosen_output = output
                    break

            if pos < len(chosen_output):
                result.append(chosen_output[pos])
            else:
                result.append(chr(int(rng.integers(0x4e00, 0x9fa6))))

        return "".join(result[:total_len])

    def learn_from_data(self, texts: List[str]):
        """从数据学习——路由到专家后分别学习"""
        for text in texts:
            # 路由到 top-k 专家
            expert_indices, _ = self.gate.route(text)
            for idx in expert_indices:
                self.experts[idx].learn([text])

        # 更新模型级权重
        self.weights.update()

    def save_pretrained(self, path: str):
        """保存虚拟模型"""
        import os, json
        os.makedirs(path, exist_ok=True)

        state = {
            "model_name": MODEL_NAME,
            "total_params": self.total_params,
            "training_progress": self.training_progress,
            "is_trained": self.is_trained,
            "training_state": self.training_state,
            "owner": self.owner,
            "num_experts": self.num_experts,
            "top_k": self.top_k,
            "experts": [e.stats() for e in self.experts],
            "gate_stats": self.gate.get_routing_stats(),
            "weights_fingerprint": self.weights.fingerprint[:16] + "...",
        }
        with open(os.path.join(path, "virtual_moe_model.json"), "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2, ensure_ascii=False)

        # 保存专家 n-gram
        for expert in self.experts:
            ep = os.path.join(path, f"expert_{expert.expert_id}")
            os.makedirs(ep, exist_ok=True)
            sample_ngram = dict(list(expert.ngram_table.items())[:3000])
            with open(os.path.join(ep, "ngram.json"), "w", encoding="utf-8") as f:
                json.dump(sample_ngram, f, ensure_ascii=False)

    def stats(self) -> Dict[str, Any]:
        return {
            "model_name": MODEL_NAME,
            "model_name_cn": MODEL_NAME_CN,
            "total_params": self.total_params_str,
            "real_memory_kb": sum(e.weights.real_memory_bytes for e in self.experts) / 1024,
            "training_progress": f"{self.training_progress*100:.1f}%",
            "is_trained": self.is_trained,
            "training_state": self.training_state,
            "num_experts": self.num_experts,
            "top_k": self.top_k,
            "experts": [e.stats() for e in self.experts[:5]],  # 前5个
            "gate": self.gate.get_routing_stats(),
        }


def compute_total_aux_loss(aux_losses: List[float], alpha: float = 0.01) -> float:
    """汇总辅助损失"""
    return sum(aux_losses) * alpha
