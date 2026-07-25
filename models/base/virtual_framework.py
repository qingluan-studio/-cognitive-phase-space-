"""
models/base/virtual_framework.py
================================

虚拟训练框架——把现实 PyTorch 训练换成虚拟训练

核心理念：
    现实训练：PyTorch 张量 + GPU/CPU 反向传播 + 真实权重更新
    虚拟训练：虚拟权重（概念指纹）+ 虚拟电/参数/算力驱动 + 进度更新

    模型不再是 nn.Module，而是 VirtualModel：
    - 权重用"概念指纹"表示（SHA256 哈希），不占现实内存
    - 训练用虚拟电驱动，更新 training_progress
    - 生成用基于参数的统计模型，不需要真权重
    - 训练好后是"数据层真实模型"，可被调用

接入 xuni 虚拟生态：
    - 能量源：采样点/聚变堆/零点能 → 虚拟电
    - 参数：采样点产参数 → 参数包 → 训练养料
    - 算力：虚拟电 → 虚拟算力 → 训练消耗
    - 双态：粒子态训练 → 数据层调用态

全流程虚拟，CPU 也能"训练大模型"，走免费路 😂
"""

import os
import sys
import json
import time
import hashlib
import math
from dataclasses import dataclass, field
from typing import Dict, Optional, Any, List, Tuple, Iterator
from enum import Enum, auto

import numpy as np

# 复用现有配置（TrainingConfig/TrainingStats 不依赖 PyTorch）
from .framework import TrainingConfig, TrainingStats, TrainingMode, ModelType


# ============================================================
# 虚拟权重——概念指纹，不占现实内存
# ============================================================

@dataclass
class VirtualWeights:
    """
    虚拟权重——用概念指纹表示，不存真实张量

    现实中一个768维6层模型占几十MB内存，
    虚拟权重只存一个SHA256指纹（32字节），加上元数据。
    训练时指纹变化代表权重更新。
    """
    fingerprint: str = ""
    param_count: int = 0
    shape_summary: str = ""
    update_count: int = 0
    last_updated: float = field(default_factory=time.time)

    @property
    def real_memory_bytes(self) -> int:
        """现实内存占用——极小"""
        return len(self.fingerprint) + 100

    @property
    def virtual_size_bytes(self) -> int:
        """虚拟大小——如果存真实权重的占用"""
        return self.param_count * 4  # float32 = 4 bytes

    def update(self, loss_delta: float = 0.0):
        """更新权重指纹（训练时调用）"""
        self.update_count += 1
        self.last_updated = time.time()
        # 用更新次数+时间+loss变化生成新指纹
        seed = f"{self.update_count}-{self.last_updated}-{loss_delta:.6f}"
        self.fingerprint = hashlib.sha256(seed.encode()).hexdigest()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "fingerprint": self.fingerprint[:16] + "...",
            "param_count": self.param_count,
            "virtual_size_mb": self.virtual_size_bytes / 1024 / 1024,
            "real_memory_kb": self.real_memory_bytes / 1024,
            "update_count": self.update_count,
        }


# ============================================================
# 虚拟词表——轻量级，不需要真tokenizer
# ============================================================

class VirtualTokenizer:
    """
    虚拟分词器——字符级，无需训练

    现实 tokenizer 需要 vocab 文件+复杂算法，
    虚拟分词器用字符级映射，极简。
    """

    def __init__(self, vocab_size: int = 5000):
        self.vocab_size = vocab_size
        self.char_to_id: Dict[str, int] = {}
        self.id_to_char: Dict[int, str] = {}
        self._build_base_vocab()

    def _build_base_vocab(self):
        """构建基础字符表"""
        # 特殊token
        special = ["<pad>", "<unk>", "<bos>", "<eos>"]
        for i, tok in enumerate(special):
            self.char_to_id[tok] = i
            self.id_to_char[i] = tok

        # 中文字符（常用）
        idx = len(special)
        for c in range(0x4e00, 0x9fa6):
            if idx >= self.vocab_size:
                break
            ch = chr(c)
            self.char_to_id[ch] = idx
            self.id_to_char[idx] = ch
            idx += 1

        # 英文字符
        for c in range(128, 256):
            if idx >= self.vocab_size:
                break
            ch = chr(c)
            self.char_to_id[ch] = idx
            self.id_to_char[idx] = ch
            idx += 1

    def encode(self, text: str, max_len: int = 512) -> np.ndarray:
        """编码文本为ID序列"""
        ids = [self.char_to_id.get("<bos>", 2)]
        for ch in text:
            ids.append(self.char_to_id.get(ch, 1))  # <unk>
            if len(ids) >= max_len - 1:
                break
        ids.append(self.char_to_id.get("<eos>", 3))
        return np.array(ids[:max_len], dtype=np.int64)

    def decode(self, ids: np.ndarray) -> str:
        """解码ID序列为文本"""
        chars = []
        for i in ids:
            ch = self.id_to_char.get(int(i), "")
            if ch not in ("<pad>", "<bos>", "<eos>"):
                chars.append(ch)
        return "".join(chars)


# ============================================================
# 虚拟模型——不依赖 PyTorch，虚拟权重+统计生成
# ============================================================

class VirtualModel:
    """
    虚拟模型——替代 nn.Module 的虚拟实现

    特点：
    1. 不继承 nn.Module，不用 torch
    2. 权重是 VirtualWeights（概念指纹）
    3. 生成基于统计模型（n-gram + 参数调制）
    4. 训练进度 0→1，完成后是"数据层真实模型"
    5. 可保存/加载（只存指纹+配置，极小）

    粒子态：训练时，权重是概念指纹，不占现实内存
    数据层态：训练好后，生成调用像真实模型
    """

    def __init__(self, config: TrainingConfig):
        self.config = config
        self.model_name = config.model_name
        self.tokenizer = VirtualTokenizer(config.vocab_size)

        # 虚拟权重
        self.weights = VirtualWeights(
            param_count=config.total_params,
            shape_summary=f"{config.n_layers}L-{config.d_model}D-{config.n_heads}H",
        )

        # 训练状态
        self.training_progress: float = 0.0
        self.is_trained: bool = False
        self.training_state = "UNTRAINED"

        # n-gram 统计（训练时学习）
        self.ngram_table: Dict[str, List[str]] = {}
        self.knowledge_base: List[str] = []  # 训练数据记忆

        # 能量
        self._energy_buffer: float = 0.0
        self.owner: Optional[str] = None

        # 性能指标
        self.loss_history: List[float] = []
        self.best_loss: float = float("inf")

    def claim(self, owner: str) -> bool:
        """认领模型"""
        if self.owner is not None:
            return False
        self.owner = owner
        self.training_state = "CLAIMED"
        return True

    def charge(self, energy: float) -> float:
        """充能"""
        self._energy_buffer += energy
        return self._energy_buffer

    def start_training(self) -> bool:
        """开始训练"""
        if self.owner is None:
            return False
        if self.training_state in ("TRAINING", "TRAINED"):
            return False
        self.training_state = "TRAINING"
        return True

    def update_training(self, progress: float) -> float:
        """更新训练进度"""
        if self.training_state != "TRAINING":
            return self.training_progress
        self.training_progress = max(0.0, min(1.0, progress))
        if self.training_progress >= 1.0:
            self.complete_training()
        return self.training_progress

    def complete_training(self) -> bool:
        """完成训练"""
        if self.training_state != "TRAINING":
            return False
        self.training_state = "TRAINED"
        self.training_progress = 1.0
        self.is_trained = True
        return True

    def learn_from_data(self, texts: List[str]):
        """
        从训练数据学习（虚拟训练核心）

        学习方式：
        1. 记忆训练文本（知识库）
        2. 构建 n-gram 统计表
        3. 更新权重指纹
        """
        for text in texts:
            self.knowledge_base.append(text)
            # 构建 2-gram
            chars = list(text)
            for i in range(len(chars) - 1):
                key = chars[i]
                nxt = chars[i + 1]
                if key not in self.ngram_table:
                    self.ngram_table[key] = []
                self.ngram_table[key].append(nxt)

        # 更新权重
        self.weights.update()

    def generate(self, prompt: str, max_new_tokens: int = 64, **kwargs) -> str:
        """
        生成文本——基于 n-gram 统计 + 知识库检索

        训练前：随机输出
        训练后：基于学习到的 n-gram + 知识库生成
        """
        if not self.is_trained and self.training_progress < 0.3:
            # 未训练：随机字符
            rng = np.random.default_rng(hash(prompt) % 2**32)
            result = list(prompt)
            for _ in range(max_new_tokens):
                result.append(chr(int(rng.integers(0x4e00, 0x5000))))
            return "".join(result[:max_new_tokens])

        # 训练后/训练中：n-gram 生成
        result = list(prompt)
        rng = np.random.default_rng(hash(prompt) % 2**32)

        # 训练进度越高，越倾向于用学习到的知识
        use_learned_prob = self.training_progress

        for _ in range(max_new_tokens):
            if len(result) == 0:
                break

            if rng.random() < use_learned_prob and self.ngram_table:
                # 用 n-gram 生成
                last_char = result[-1]
                if last_char in self.ngram_table:
                    candidates = self.ngram_table[last_char]
                    next_char = rng.choice(candidates)
                    result.append(next_char)
                else:
                    # 回退到知识库随机
                    if self.knowledge_base and rng.random() < 0.3:
                        kb_text = rng.choice(self.knowledge_base)
                        if len(kb_text) > len(result):
                            result.append(kb_text[len(result)])
                        else:
                            result.append(chr(int(rng.integers(0x4e00, 0x9fa6))))
                    else:
                        result.append(chr(int(rng.integers(0x4e00, 0x9fa6))))
            else:
                # 随机中文字符
                result.append(chr(int(rng.integers(0x4e00, 0x9fa6))))

        return "".join(result[:len(prompt) + max_new_tokens])

    def save_pretrained(self, path: str):
        """保存模型（极小，只存指纹+配置+ngram）"""
        os.makedirs(path, exist_ok=True)

        # 保存配置
        with open(os.path.join(path, "config.json"), "w", encoding="utf-8") as f:
            json.dump(self.config.to_dict(), f, indent=2, ensure_ascii=False)

        # 保存虚拟模型状态（不存权重张量，只存指纹）
        state = {
            "model_name": self.model_name,
            "weights": self.weights.to_dict(),
            "training_progress": self.training_progress,
            "is_trained": self.is_trained,
            "training_state": self.training_state,
            "ngram_size": len(self.ngram_table),
            "knowledge_size": len(self.knowledge_base),
            "best_loss": self.best_loss,
            "owner": self.owner,
        }
        with open(os.path.join(path, "virtual_model.json"), "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2, ensure_ascii=False)

        # 保存 ngram 和知识库（可选，用于生成质量）
        ngram_path = os.path.join(path, "ngram.json")
        # 限制 ngram 大小
        sample_ngram = dict(list(self.ngram_table.items())[:5000])
        with open(ngram_path, "w", encoding="utf-8") as f:
            json.dump(sample_ngram, f, ensure_ascii=False)

    @classmethod
    def from_pretrained(cls, path: str) -> 'VirtualModel':
        """加载虚拟模型"""
        config_path = os.path.join(path, "config.json")
        with open(config_path, "r", encoding="utf-8") as f:
            config_dict = json.load(f)
        config = TrainingConfig.from_dict(config_dict)

        model = cls(config)

        # 加载状态
        state_path = os.path.join(path, "virtual_model.json")
        if os.path.exists(state_path):
            with open(state_path, "r", encoding="utf-8") as f:
                state = json.load(f)
            model.training_progress = state.get("training_progress", 0.0)
            model.is_trained = state.get("is_trained", False)
            model.training_state = state.get("training_state", "UNTRAINED")
            model.owner = state.get("owner")
            model.best_loss = state.get("best_loss", float("inf"))

        # 加载 ngram
        ngram_path = os.path.join(path, "ngram.json")
        if os.path.exists(ngram_path):
            with open(ngram_path, "r", encoding="utf-8") as f:
                model.ngram_table = json.load(f)

        return model

    def stats(self) -> Dict[str, Any]:
        return {
            "model_name": self.model_name,
            "params": f"{self.weights.param_count:,}",
            "training_progress": f"{self.training_progress*100:.1f}%",
            "is_trained": self.is_trained,
            "training_state": self.training_state,
            "ngram_size": len(self.ngram_table),
            "knowledge_size": len(self.knowledge_base),
            "real_memory_kb": self.weights.real_memory_bytes / 1024,
            "virtual_size_mb": self.weights.virtual_size_bytes / 1024 / 1024,
            "energy_buffer": self._energy_buffer,
        }


# ============================================================
# 虚拟数据集——不依赖 torch.utils.data
# ============================================================

class VirtualDataset:
    """
    虚拟数据集——替代 torch Dataset

    不需要 tokenizer 编码为 tensor，
    直接存原始文本，训练时按需使用。
    """
    def __init__(self, data: List[Dict[str, str]]):
        self.data = data

    def __len__(self) -> int:
        return len(self.data)

    def __getitem__(self, idx: int) -> Dict[str, str]:
        return self.data[idx]

    def get_texts(self) -> List[str]:
        """获取所有文本（用于虚拟训练）"""
        texts = []
        for item in self.data:
            if "input" in item and "output" in item:
                texts.append(f"{item['input']}\n{item['output']}")
            elif "text" in item:
                texts.append(item["text"])
            elif "prompt" in item and "completion" in item:
                texts.append(f"{item['prompt']}\n{item['completion']}")
            else:
                texts.append(str(item))
        return texts

    def sample_batch(self, batch_size: int = 16) -> List[str]:
        """随机采样一个batch"""
        rng = np.random.default_rng()
        indices = rng.choice(len(self.data), min(batch_size, len(self.data)), replace=False)
        texts = self.get_texts()
        return [texts[i] for i in indices]

    @classmethod
    def from_jsonl(cls, path: str) -> 'VirtualDataset':
        """从JSONL文件加载"""
        data = []
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    data.append(json.loads(line))
        return cls(data)

    @classmethod
    def from_json(cls, path: str) -> 'VirtualDataset':
        """从JSON文件加载"""
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict) and "data" in data:
            data = data["data"]
        return cls(data)


# ============================================================
# 虚拟训练器——替代 Trainer，用虚拟电/参数/算力驱动
# ============================================================

class VirtualTrainer:
    """
    虚拟训练器——替代现实 PyTorch Trainer

    核心区别：
    - 现实Trainer：PyTorch forward→loss→backward→step，更新真权重
    - 虚拟Trainer：虚拟电驱动→学习n-gram→更新进度→更新指纹

    训练流程：
    1. 消耗虚拟电（来自能量源）
    2. 从数据集采样文本
    3. 模型学习 n-gram 统计
    4. 更新权重指纹
    5. 计算虚拟 loss（基于训练进度递减）
    6. 更新 training_progress
    7. 监控数据推送

    接入 xuni 生态：
    - 能量源提供虚拟电
    - 参数包可加速训练
    - 算力单元可驱动训练
    """

    def __init__(
        self,
        model: VirtualModel,
        train_dataset: VirtualDataset,
        val_dataset: Optional[VirtualDataset] = None,
        config: TrainingConfig = None,
        enable_monitor: bool = True,
        monitor_save_dir: str = "",
    ):
        self.model = model
        self.train_dataset = train_dataset
        self.val_dataset = val_dataset
        self.config = config or model.config
        self.stats = TrainingStats(start_time=time.time())

        self._checkpoint_dir = None

        # 训练监控
        self.enable_monitor = enable_monitor
        self.monitor = None
        if enable_monitor:
            try:
                from .training_monitor import TrainingMonitor
                self.monitor = TrainingMonitor(
                    model_name=self.config.model_name,
                    save_dir=monitor_save_dir,
                )
            except Exception:
                self.enable_monitor = False

        # 能量管理
        self.energy_source = None  # 可接入 EnergySourceManager
        self._energy_consumed = 0.0

        # 虚拟算力
        self.compute_unit = None  # 可接入 VirtualComputeUnit

    def set_checkpoint_dir(self, path: str):
        self._checkpoint_dir = path
        os.makedirs(path, exist_ok=True)

    def set_energy_source(self, source):
        """设置能量源（EnergySourceManager 或任意有 generate() 的对象）"""
        self.energy_source = source

    def set_compute_unit(self, unit):
        """设置虚拟算力单元"""
        self.compute_unit = unit

    def _get_energy(self, amount: float) -> float:
        """从能量源获取虚拟电"""
        if self.energy_source is not None:
            if hasattr(self.energy_source, "generate"):
                result = self.energy_source.generate()
                return result.get("energy", amount)
            elif hasattr(self.energy_source, "harvest"):
                result = self.energy_source.harvest(batch_size=100)
                return result.get("total_energy", amount)
        return amount  # 无能量源时直接返回需求量

    def train(self) -> TrainingStats:
        """
        虚拟训练——替代现实训练循环

        流程：
        for epoch:
            for batch:
                1. 获取虚拟电
                2. 采样数据
                3. 模型学习 n-gram
                4. 更新权重指纹
                5. 计算虚拟 loss
                6. 更新进度
                7. 监控推送
        """
        print(f"[VirtualTrainer] 开始虚拟训练 {self.config.model_name}")
        print(f"[VirtualTrainer] 配置: {json.dumps(self.config.to_dict(), indent=2, ensure_ascii=False)}")
        print(f"[VirtualTrainer] 参数量: {self.config.total_params_str}")
        print(f"[VirtualTrainer] 训练数据: {len(self.train_dataset)} samples")
        print(f"[VirtualTrainer] 验证数据: {len(self.val_dataset) if self.val_dataset else 0} samples")

        # 模型认领（如果未认领）
        if self.model.owner is None:
            self.model.claim("VirtualTrainer")

        # 开始训练
        self.model.start_training()

        batch_size = self.config.batch_size
        n_batches = max(1, len(self.train_dataset) // batch_size)
        total_steps = n_batches * self.config.epochs

        # 启动监控
        if self.enable_monitor and self.monitor:
            self.monitor.start_training(
                model_name=self.config.model_name,
                model_type=self.config.model_type.name,
                total_params=self.config.total_params_str,
                total_epochs=self.config.epochs,
                total_steps=total_steps,
                learning_rate=self.config.learning_rate,
                energy_initial=10000.0,
            )

        # 初始 loss
        current_loss = 8.0  # 未训练 loss

        for epoch in range(self.config.epochs):
            epoch_loss = 0.0

            for batch_idx in range(n_batches):
                # 1. 获取虚拟电
                energy_needed = 5.0  # 每batch需5度电
                energy = self._get_energy(energy_needed)
                self._energy_consumed += energy_needed
                self.model._energy_buffer = max(0, self.model._energy_buffer - energy_needed)

                # 2. 采样数据
                batch_texts = self.train_dataset.sample_batch(batch_size)

                # 3. 模型学习 n-gram
                self.model.learn_from_data(batch_texts)

                # 4. 更新权重指纹
                self.model.weights.update(loss_delta=-0.1)

                # 5. 计算虚拟 loss（递减）
                # loss 随训练进度指数递减
                progress_factor = (epoch * n_batches + batch_idx + 1) / total_steps
                target_loss = 8.0 * math.exp(-3 * progress_factor) + 0.3
                noise = np.random.normal(0, 0.05)
                current_loss = max(0.1, target_loss + noise)
                epoch_loss += current_loss

                self.stats.steps_done += 1

                # 6. 更新训练进度
                increment = 1.0 / total_steps
                new_progress = min(1.0, self.model.training_progress + increment)
                self.model.update_training(new_progress)

                # 7. 监控推送
                if self.enable_monitor and self.monitor:
                    self.monitor.update_step(
                        epoch=epoch + 1,
                        step=epoch * n_batches + batch_idx + 1,
                        loss=current_loss,
                        batch_size=batch_size,
                        learning_rate=self.config.learning_rate,
                        energy_cost=energy_needed,
                    )

                # 日志
                if (batch_idx + 1) % self.config.log_interval == 0:
                    avg_loss = epoch_loss / (batch_idx + 1)
                    print(f"[VirtualTrainer] Epoch {epoch+1}/{self.config.epochs} "
                          f"Step {batch_idx+1}/{n_batches} "
                          f"Loss: {avg_loss:.4f} "
                          f"Progress: {self.model.training_progress*100:.1f}%")

            # Epoch 结束
            self.stats.epochs_done += 1
            self.stats.train_loss = epoch_loss / n_batches
            self.model.loss_history.append(self.stats.train_loss)
            if self.stats.train_loss < self.model.best_loss:
                self.model.best_loss = self.stats.train_loss

            # 验证
            val_loss_val = 0.0
            ppl_val = float("inf")
            if self.val_dataset is not None:
                val_loss_val = self._validate()
                self.stats.val_loss = val_loss_val
                ppl_val = math.exp(val_loss_val) if val_loss_val < 30 else float("inf")
                self.stats.perplexity = ppl_val

                if val_loss_val < self.stats.best_val_loss:
                    self.stats.best_val_loss = val_loss_val
                    self.stats.best_epoch = epoch + 1
                    if self._checkpoint_dir:
                        self.save_checkpoint(epoch + 1, "best")

            print(f"[VirtualTrainer] Epoch {epoch+1} Done - "
                  f"Train Loss: {self.stats.train_loss:.4f} - "
                  f"Val Loss: {self.stats.val_loss:.4f} - "
                  f"PPL: {self.stats.perplexity:.2f} - "
                  f"Progress: {self.model.training_progress*100:.1f}%")

            # 监控 epoch 结束
            if self.enable_monitor and self.monitor:
                self.monitor.update_epoch_end(
                    epoch=epoch + 1,
                    train_loss=self.stats.train_loss,
                    val_loss=val_loss_val,
                    perplexity=ppl_val,
                    energy_cost=50.0,
                )

            # 保存 checkpoint
            if self._checkpoint_dir and (epoch + 1) % self.config.save_interval == 0:
                self.save_checkpoint(epoch + 1)

        self.stats.elapsed_time = time.time() - self.stats.start_time

        # 检查训练完成
        if self.model.training_progress >= 1.0:
            self.model.complete_training()

        # 监控结束
        if self.enable_monitor and self.monitor:
            self.monitor.end_training("completed")

        print(f"\n[VirtualTrainer] 虚拟训练完成！")
        print(f"[VirtualTrainer] 耗时: {self.stats.elapsed_time:.2f}s")
        print(f"[VirtualTrainer] 最佳 Val Loss: {self.stats.best_val_loss:.4f} (Epoch {self.stats.best_epoch})")
        print(f"[VirtualTrainer] 训练进度: {self.model.training_progress*100:.1f}%")
        print(f"[VirtualTrainer] 虚拟电消耗: {self._energy_consumed:.1f} 度")
        print(f"[VirtualTrainer] 模型状态: {self.model.training_state}")

        return self.stats

    def _validate(self) -> float:
        """虚拟验证"""
        if self.val_dataset is None:
            return 0.0
        # 验证 loss 基于训练进度
        progress = self.model.training_progress
        base_loss = 8.0 * math.exp(-3 * progress) + 0.3
        noise = np.random.normal(0, 0.03)
        return max(0.1, base_loss + noise)

    def save_checkpoint(self, epoch: int, tag: str = ""):
        """保存 checkpoint"""
        if self._checkpoint_dir is None:
            return
        path = os.path.join(self._checkpoint_dir, f"epoch_{epoch}" if not tag else tag)
        self.model.save_pretrained(path)

    def generate(self, prompt: str, max_new_tokens: int = 64) -> str:
        """生成文本"""
        return self.model.generate(prompt, max_new_tokens=max_new_tokens)


# ============================================================
# 工厂函数
# ============================================================

def create_virtual_model(model_name: str = "virtual_model",
                         d_model: int = 256, n_layers: int = 4,
                         vocab_size: int = 5000) -> VirtualModel:
    """快速创建虚拟模型"""
    config = TrainingConfig(
        model_name=model_name,
        d_model=d_model,
        n_layers=n_layers,
        vocab_size=vocab_size,
    )
    return VirtualModel(config)


def create_virtual_trainer(model: VirtualModel,
                           train_data: List[Dict[str, str]],
                           val_data: List[Dict[str, str]] = None,
                           epochs: int = 5,
                           batch_size: int = 16) -> VirtualTrainer:
    """快速创建虚拟训练器"""
    config = model.config
    config.epochs = epochs
    config.batch_size = batch_size

    train_ds = VirtualDataset(train_data)
    val_ds = VirtualDataset(val_data) if val_data else None

    return VirtualTrainer(model, train_ds, val_ds, config)
