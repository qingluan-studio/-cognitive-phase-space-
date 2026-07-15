"""
多数投票融合算法

对多个模型的响应进行投票，选择最多模型认同的答案。
适用于有明确正确答案的任务（如选择题、事实问答）。
"""

from __future__ import annotations

import hashlib
from collections import Counter
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..core.model_collector import ModelResponse


class MajorityVoteFusion:
    """
    多数投票融合器
    
    工作原理：
    1. 对每个响应进行语义哈希（提取关键特征）
    2. 统计相同/相似答案出现的次数
    3. 选择获得最多支持的答案
    
    适用于：事实问答、判断题、选择题等"客观"任务
    """
    
    def __init__(self, similarity_threshold: float = 0.8):
        self.similarity_threshold = similarity_threshold
    
    def _semantic_hash(self, text: str) -> str:
        """
        生成语义哈希
        
        简化版的语义相似度：
        - 提取关键词
        - 排序后哈希
        """
        # 简单实现：取前50个字符的哈希 + 关键词计数
        normalized = text.lower().strip()[:100]
        # 移除常见停用词和标点
        stop_words = {"的", "了", "是", "在", "和", "the", "a", "an", "is", "are", "was", "were"}
        words = [w for w in normalized.split() if w not in stop_words and len(w) > 1]
        
        # 按字母排序后哈希
        sorted_words = sorted(set(words))[:20]
        hash_input = " ".join(sorted_words)
        return hashlib.md5(hash_input.encode()).hexdigest()[:8]
    
    def _extract_answer(self, response: str) -> str:
        """提取核心答案（去除模型标识和解释）"""
        lines = response.strip().split("\n")
        # 去除空行和模型标识行
        content_lines = []
        for line in lines:
            stripped = line.strip()
            if stripped and not stripped.startswith("[") and not stripped.startswith("//"):
                content_lines.append(stripped)
        
        return " ".join(content_lines[:5])  # 取前5行作为核心答案
    
    def fuse(self, responses: list[ModelResponse], assessments=None) -> str:
        """
        执行多数投票融合
        
        Returns:
            融合后的最佳答案
        """
        if not responses:
            return ""
        
        if len(responses) == 1:
            return responses[0].output
        
        # 生成语义哈希
        votes = []
        for resp in responses:
            answer = self._extract_answer(resp.output)
            hash_val = self._semantic_hash(answer)
            votes.append({
                "model": resp.model_name,
                "hash": hash_val,
                "output": resp.output,
                "answer": answer,
            })
        
        # 统计投票
        hash_counter = Counter(v["hash"] for v in votes)
        most_common = hash_counter.most_common(1)[0]
        winner_hash, winner_count = most_common
        
        # 找到获得最多投票的完整输出（选最长的作为代表）
        winner_outputs = [v["output"] for v in votes if v["hash"] == winner_hash]
        best_output = max(winner_outputs, key=len)
        
        # 添加融合元数据注释
        total = len(responses)
        confidence = winner_count / total
        
        fusion_note = f"""
<!-- 融合信息: 多数投票 -->
<!-- 总响应数: {total} -->
<!-- 获胜答案得票: {winner_count}/{total} (置信度: {confidence:.1%}) -->
<!-- 参与模型: {', '.join(v['model'] for v in votes)} -->
"""
        
        return best_output + fusion_note
    
    def get_vote_distribution(self, responses: list[ModelResponse]) -> dict[str, int]:
        """获取投票分布"""
        votes = []
        for resp in responses:
            answer = self._extract_answer(resp.output)
            hash_val = self._semantic_hash(answer)
            votes.append(hash_val)
        
        return dict(Counter(votes))
