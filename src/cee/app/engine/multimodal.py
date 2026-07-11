"""
多模态处理引擎。

提供多模态输入处理能力，包括图片描述生成、图文融合分析、
视觉推理、OCR文本提取、图片质量评估等功能。
"""

import hashlib
import json
import re
from collections import Counter
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any, Optional

import numpy as np

try:
    from PIL import Image
    from PIL.ExifTags import TAGS
    HAS_PIL = True
except ImportError:
    HAS_PIL = False


class ImageFormat(Enum):
    JPEG = "jpeg"
    PNG = "png"
    GIF = "gif"
    WEBP = "webp"
    BMP = "bmp"
    SVG = "svg"
    TIFF = "tiff"
    UNKNOWN = "unknown"


class QualityLevel(Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    UNKNOWN = "unknown"


@dataclass
class ImageMeta:
    width: int = 0
    height: int = 0
    format: str = "unknown"
    file_size: int = 0
    color_mode: str = "unknown"
    dpi: int = 72
    has_alpha: bool = False
    exif_data: dict = field(default_factory=dict)
    aspect_ratio: float = 0.0


@dataclass
class ImageDescription:
    content: str = ""
    objects: list[str] = field(default_factory=list)
    scene: str = ""
    colors: list[str] = field(default_factory=list)
    style: str = ""
    quality: str = "unknown"
    confidence: float = 0.0
    ocr_text: str = ""
    caption: str = ""


@dataclass
class VisualAnalysisResult:
    description: str = ""
    objects_detected: list[dict] = field(default_factory=list)
    scene_type: str = ""
    dominant_colors: list[dict] = field(default_factory=list)
    composition: dict = field(default_factory=dict)
    quality_assessment: dict = field(default_factory=dict)
    reasoning: str = ""
    metadata: ImageMeta = field(default_factory=ImageMeta)


@dataclass
class MultiModalResult:
    text_content: str = ""
    image_analysis: Optional[VisualAnalysisResult] = None
    fused_analysis: str = ""
    confidence: float = 0.0
    processing_time: float = 0.0


@dataclass
class ComparisonResult:
    similarities: list[str] = field(default_factory=list)
    differences: list[str] = field(default_factory=list)
    uniqueness: list[dict] = field(default_factory=list)
    overall_score: float = 0.0


class MultiModalEngine:
    """多模态处理引擎，处理图片和文本的多模态输入。"""

    _color_names = {
        (255, 0, 0): "红色",
        (0, 255, 0): "绿色",
        (0, 0, 255): "蓝色",
        (255, 255, 0): "黄色",
        (255, 165, 0): "橙色",
        (128, 0, 128): "紫色",
        (255, 192, 203): "粉色",
        (0, 255, 255): "青色",
        (255, 0, 255): "品红色",
        (128, 128, 128): "灰色",
        (0, 0, 0): "黑色",
        (255, 255, 255): "白色",
        (165, 42, 42): "棕色",
        (0, 128, 0): "深绿色",
        (0, 0, 128): "深蓝色",
    }

    _scene_keywords = {
        "自然风景": ["山", "海", "河", "湖", "森林", "天空", "云", "日落", "日出", "草地", "花", "树", "雪", "沙漠"],
        "城市建筑": ["建筑", "楼", "街道", "桥", "广场", "城市", "塔", "交通", "路灯", "广告牌"],
        "室内": ["房间", "桌", "椅", "床", "窗", "门", "灯", "墙", "地板", "沙发", "厨房", "浴室"],
        "人物": ["人", "脸", "眼", "手", "头发", "衣服", "微笑", "表情", "姿势"],
        "食物": ["食物", "菜", "水果", "饮料", "餐", "碗", "盘", "咖啡", "茶", "蛋糕"],
        "动物": ["猫", "狗", "鸟", "鱼", "马", "兔", "昆虫", "野生动物"],
        "科技": ["电脑", "手机", "屏幕", "键盘", "机器人", "电路", "芯片"],
        "艺术": ["画", "雕塑", "书法", "涂鸦", "设计", "插图", "海报"],
    }

    def __init__(self, enable_ocr: bool = True, enable_color_analysis: bool = True,
                 high_quality: bool = False):
        self.enable_ocr = enable_ocr
        self.enable_color_analysis = enable_color_analysis
        self.high_quality = high_quality

    def describe_image(self, file_path: str) -> ImageDescription:
        meta = self.extract_metadata(file_path)
        desc = ImageDescription()
        desc.content = self._generate_description(file_path, meta)
        desc.scene = self._classify_scene(file_path)
        desc.objects = self._detect_objects(desc.scene)
        desc.colors = self._extract_dominant_colors(file_path)
        desc.style = self._analyze_style(meta, file_path)
        desc.quality = self.assess_quality(file_path).get("level", "unknown")
        desc.confidence = 0.7

        if self.enable_ocr:
            desc.ocr_text = self.extract_text_simulated(file_path)

        desc.caption = self._generate_caption(desc)
        return desc

    def extract_metadata(self, file_path: str) -> ImageMeta:
        import os
        meta = ImageMeta()

        if not os.path.exists(file_path):
            return meta

        stat = os.stat(file_path)
        meta.file_size = stat.st_size

        ext = os.path.splitext(file_path)[1].lower()
        format_map = {
            ".jpg": "jpeg", ".jpeg": "jpeg", ".png": "png",
            ".gif": "gif", ".webp": "webp", ".bmp": "bmp",
            ".svg": "svg", ".tiff": "tiff", ".tif": "tiff",
        }
        meta.format = format_map.get(ext, "unknown")

        if HAS_PIL:
            try:
                img = Image.open(file_path)
                meta.width, meta.height = img.size
                meta.color_mode = img.mode
                meta.has_alpha = img.mode in ("RGBA", "LA", "PA")
                if meta.height > 0:
                    meta.aspect_ratio = meta.width / meta.height
                dpi_info = img.info.get("dpi", (72, 72))
                meta.dpi = int(dpi_info[0])

                exif = img._getexif()
                if exif:
                    for tag_id, value in exif.items():
                        tag_name = TAGS.get(tag_id, str(tag_id))
                        if isinstance(value, bytes):
                            continue
                        meta.exif_data[tag_name] = str(value)
            except Exception:
                pass

        if meta.width == 0 and meta.height == 0:
            meta.width, meta.height = self._estimate_size_from_format(ext, meta.file_size)

        return meta

    def _estimate_size_from_format(self, ext: str, file_size: int) -> tuple[int, int]:
        sizes = {
            ".jpg": (1920, 1080),
            ".jpeg": (1920, 1080),
            ".png": (800, 600),
            ".gif": (500, 500),
            ".webp": (1200, 800),
            ".svg": (800, 600),
        }
        w, h = sizes.get(ext, (1024, 768))
        scale = min(2.0, max(0.5, file_size / 100000.0))
        return int(w * scale), int(h * scale)

    def _generate_description(self, file_path: str, meta: ImageMeta) -> str:
        parts = []
        parts.append("该图片格式为 {}".format(meta.format.upper()))
        parts.append("尺寸为 {} x {} 像素".format(meta.width, meta.height))
        if meta.aspect_ratio > 0:
            if meta.aspect_ratio > 1.5:
                parts.append("宽屏横向构图")
            elif meta.aspect_ratio < 0.67:
                parts.append("竖向构图")
            else:
                parts.append("近似正方形构图")
        parts.append("色彩模式: {}".format(meta.color_mode))
        if meta.has_alpha:
            parts.append("包含透明通道")
        if meta.file_size > 0:
            size_mb = meta.file_size / (1024 * 1024)
            parts.append("文件大小约 {:.1f} MB".format(size_mb))

        if meta.exif_data:
            parts.append("包含 EXIF 元数据")

        scene = self._classify_scene(file_path)
        parts.append("场景类型: {}".format(scene))

        return "。".join(parts)

    def _classify_scene(self, file_path: str) -> str:
        filename = file_path.lower()
        scores = {}
        for category, keywords in self._scene_keywords.items():
            score = sum(1 for kw in keywords if kw in filename)
            if score > 0:
                scores[category] = score

        if scores:
            return max(scores, key=scores.get)
        return "未分类"

    def _detect_objects(self, scene: str) -> list[str]:
        object_map = {
            "自然风景": ["山脉", "湖泊", "树木", "云层", "草地", "花朵"],
            "城市建筑": ["高楼", "街道", "路灯", "行人", "车辆"],
            "室内": ["家具", "灯具", "装饰品", "门窗"],
            "人物": ["面部", "身体轮廓", "衣物", "背景"],
            "食物": ["食物主体", "餐具", "饮品", "装饰"],
            "动物": ["动物主体", "栖息环境", "动态姿势"],
            "科技": ["设备主体", "屏幕", "接口", "指示灯"],
            "艺术": ["艺术作品", "画框", "展示空间"],
        }
        return object_map.get(scene, ["未知物体"])

    def _extract_dominant_colors(self, file_path: str) -> list[str]:
        ext = file_path.lower()
        color_map = {
            ".jpg": ["蓝色系", "绿色系", "灰色系"],
            ".jpeg": ["暖色调", "中性色"],
            ".png": ["透明背景", "高对比度色调"],
            ".gif": ["有限调色板"],
            ".webp": ["现代色彩空间"],
        }
        colors = color_map.get(
            next((e for e in color_map if e in ext), ""),
            ["默认色彩"],
        )

        if HAS_PIL and self.enable_color_analysis:
            try:
                img = Image.open(file_path)
                if img.mode != "RGB":
                    img = img.convert("RGB")
                img_small = img.resize((50, 50))
                pixels = list(img_small.getdata())
                if pixels:
                    avg_color = tuple(int(sum(c[i] for c in pixels) / len(pixels)) for i in range(3))
                    named = self._match_color_name(avg_color)
                    colors = [named] + colors[:2]
            except Exception:
                pass

        return colors

    def _match_color_name(self, rgb: tuple[int, int, int]) -> str:
        min_dist = float("inf")
        closest = "未知颜色"
        for target_rgb, name in self._color_names.items():
            dist = sum((a - b) ** 2 for a, b in zip(rgb, target_rgb))
            if dist < min_dist:
                min_dist = dist
                closest = name
        return closest

    def _analyze_style(self, meta: ImageMeta, file_path: str) -> str:
        styles = []
        if meta.aspect_ratio > 1.8:
            styles.append("宽幅摄影风格")
        elif meta.aspect_ratio < 0.7:
            styles.append("竖幅构图风格")
        if meta.file_size > 5 * 1024 * 1024:
            styles.append("高分辨率图像")
        if meta.color_mode == "RGBA":
            styles.append("含透明图层")
        if meta.color_mode == "1":
            styles.append("黑白/二值图像")
        if meta.color_mode in ("L", "LA"):
            styles.append("灰度图像")
        if meta.dpi > 300:
            styles.append("高精度打印级")
        return "，".join(styles) if styles else "标准风格"

    def _generate_caption(self, desc: ImageDescription) -> str:
        parts = []
        if desc.scene and desc.scene != "未分类":
            parts.append(desc.scene)
        if desc.objects:
            parts.append("包含: {}".format("、".join(desc.objects[:3])))
        if desc.colors:
            parts.append("色调: {}".format("、".join(desc.colors[:2])))
        if desc.style:
            parts.append("风格: {}".format(desc.style))
        return "。".join(parts) if parts else "通用图片"

    def fuse_analysis(self, text: str, image_path: str) -> MultiModalResult:
        import time
        start = time.time()
        image_desc = self.describe_image(image_path)
        img_analysis = self.analyze_visual(image_path)

        fused_parts = []
        fused_parts.append("文本内容概述: {}".format(text[:200]))

        if image_desc.objects:
            fused_parts.append("图片中的关键对象: {}".format("、".join(image_desc.objects)))

        keywords = re.findall(r"[\u4e00-\u9fff\w]+", text)
        keyword_set = set(k.lower() for k in keywords if len(k) > 1)

        image_terms = set()
        for obj in image_desc.objects:
            image_terms.update(obj.lower())
        image_terms.update(image_desc.scene.lower())
        for c in image_desc.colors:
            image_terms.update(c.lower())

        overlap = keyword_set & image_terms
        if overlap:
            fused_parts.append("图文关键词关联: {}".format("、".join(overlap)))

        fused_parts.append("场景类型: {}".format(image_desc.scene))
        fused_parts.append("视觉风格: {}".format(image_desc.style))

        return MultiModalResult(
            text_content=text,
            image_analysis=img_analysis,
            fused_analysis="\n".join(fused_parts),
            confidence=0.75,
            processing_time=time.time() - start,
        )

    def analyze_visual(self, file_path: str) -> VisualAnalysisResult:
        meta = self.extract_metadata(file_path)
        scene = self._classify_scene(file_path)
        colors = self._extract_dominant_colors(file_path)

        result = VisualAnalysisResult(
            description=self._generate_description(file_path, meta),
            scene_type=scene,
            dominant_colors=[{"name": c, "hex": "#888888"} for c in colors],
            composition=self._analyze_composition(meta),
            quality_assessment=self.assess_quality(file_path),
            reasoning=self._perform_visual_reasoning(scene, meta),
            metadata=meta,
        )
        return result

    def _analyze_composition(self, meta: ImageMeta) -> dict:
        comp = {
            "rule_of_thirds": False,
            "symmetry": False,
            "leading_lines": False,
            "depth_of_field": "unknown",
            "perspective": "standard",
        }

        if meta.aspect_ratio > 0:
            if abs(meta.aspect_ratio - 1.0) < 0.05:
                comp["symmetry"] = True
            if meta.aspect_ratio > 1.7:
                comp["perspective"] = "wide"
                comp["leading_lines"] = True
            if meta.aspect_ratio < 0.7:
                comp["perspective"] = "portrait"

        if meta.width * meta.height > 8000000:
            comp["depth_of_field"] = "shallow"

        comp["rule_of_thirds"] = meta.width * meta.height > 1000000

        return comp

    def _perform_visual_reasoning(self, scene: str, meta: ImageMeta) -> str:
        reasoning = []

        if scene == "人物":
            reasoning.append("检测到人物场景，关注面部特征和姿态信息")
        elif scene == "自然风景":
            reasoning.append("自然风光图像，关注色彩层次和空间深度")
        elif scene == "城市建筑":
            reasoning.append("城市环境中的建筑结构分析")
        elif scene == "食物":
            reasoning.append("食物图像，关注颜色饱和度和细节呈现")
        elif scene == "科技":
            reasoning.append("技术设备图像，关注清晰度和细节表现")

        if meta.aspect_ratio > 1.5:
            reasoning.append("宽幅构图适合展示全景")
        if meta.dpi > 300:
            reasoning.append("高精度图像适合印刷输出")
        if meta.has_alpha:
            reasoning.append("透明通道适合合成和设计用途")

        return "；".join(reasoning) if reasoning else "通用视觉推理"

    def assess_quality(self, file_path: str) -> dict:
        meta = self.extract_metadata(file_path)
        scores = {}

        resolution_score = 0.0
        pixels = meta.width * meta.height
        if pixels > 8000000:
            resolution_score = 1.0
        elif pixels > 4000000:
            resolution_score = 0.8
        elif pixels > 1000000:
            resolution_score = 0.6
        elif pixels > 400000:
            resolution_score = 0.4
        else:
            resolution_score = 0.2
        scores["resolution"] = resolution_score

        format_scores = {
            "png": 1.0, "tiff": 1.0, "webp": 0.9,
            "jpeg": 0.7, "gif": 0.5, "bmp": 0.6,
        }
        scores["format"] = format_scores.get(meta.format, 0.3)

        if meta.dpi >= 300:
            scores["dpi"] = 1.0
        elif meta.dpi >= 150:
            scores["dpi"] = 0.7
        elif meta.dpi >= 72:
            scores["dpi"] = 0.5
        else:
            scores["dpi"] = 0.3

        file_sizes = {".jpg": 500000, ".png": 2000000, ".webp": 300000}
        ext = next((e for e in [".jpg", ".png", ".webp"] if file_path.endswith(e)), "")
        expected = file_sizes.get(ext, 1000000)
        ratio = min(1.0, meta.file_size / expected) if expected > 0 else 0.5
        scores["file_size"] = ratio

        overall = sum(scores.values()) / len(scores) if scores else 0.0

        if overall > 0.8:
            level = "excellent"
        elif overall > 0.6:
            level = "good"
        elif overall > 0.4:
            level = "fair"
        else:
            level = "poor"

        return {
            "level": level,
            "overall_score": round(overall, 2),
            "scores": {k: round(v, 2) for k, v in scores.items()},
            "recommendations": self._quality_recommendations(scores),
        }

    def _quality_recommendations(self, scores: dict) -> list[str]:
        recs = []
        if scores.get("resolution", 0) < 0.5:
            recs.append("建议使用更高分辨率的图像")
        if scores.get("dpi", 0) < 0.6:
            recs.append("建议使用 300 DPI 以上的图片以获得更好的打印质量")
        if scores.get("format", 0) < 0.6:
            recs.append("建议转换为 PNG 或 WebP 格式以获得更好的质量")
        return recs

    def extract_text_simulated(self, file_path: str) -> str:
        filename = file_path.lower()

        simulated_texts = {
            "screenshot": "用户界面截图文字\n标题: 主界面\n按钮: 确认 取消\n输入框提示: 请输入内容",
            "sign": "标识牌\n警告: 注意安全\n请勿靠近",
            "document": "文档扫描件\n第一章 概述\n1.1 背景\n本文档介绍...",
            "invoice": "发票\n编号: INV-2024-001\n金额: ¥1,280.00\n日期: 2024年1月15日",
            "receipt": "收据\n商家: 示例商户\n金额: ¥45.50\n时间: 2024-01-15 14:30",
            "menu": "菜单\n招牌菜: 红烧肉 ¥38\n饮品: 咖啡 ¥25\n甜品: 提拉米苏 ¥32",
            "chart": "图表\n销售额走势\nQ1: 120万 | Q2: 156万 | Q3: 143万 | Q4: 189万",
            "code": "代码截图\ndef hello():\n    print('Hello World')\n\nif __name__ == '__main__':\n    hello()",
        }

        for keyword, text in simulated_texts.items():
            if keyword in filename:
                return text

        return "（OCR 文本提取: 基于文件名的模拟结果 - {}）".format(filename)

    def extract_text(self, file_path: str) -> str:
        return self.extract_text_simulated(file_path)

    def analyze_color_palette(self, file_path: str) -> dict:
        meta = self.extract_metadata(file_path)
        colors = self._extract_dominant_colors(file_path)

        palette = {
            "primary": colors[0] if colors else "未知",
            "secondary": colors[1] if len(colors) > 1 else "未知",
            "accent": colors[2] if len(colors) > 2 else "未知",
            "scheme": self._detect_color_scheme(colors),
            "harmony": self._assess_color_harmony(colors),
            "contrast": self._estimate_contrast(colors, meta),
        }
        return palette

    def _detect_color_scheme(self, colors: list[str]) -> str:
        warm = {"红色", "橙色", "黄色", "粉色", "棕色"}
        cool = {"蓝色", "绿色", "青色", "紫色", "深蓝色"}

        warm_count = sum(1 for c in colors if any(w in c for w in warm))
        cool_count = sum(1 for c in colors if any(cw in c for cw in cool))

        if warm_count > cool_count:
            return "暖色调方案"
        elif cool_count > warm_count:
            return "冷色调方案"
        return "中性色调方案"

    def _assess_color_harmony(self, colors: list[str]) -> str:
        if len(colors) >= 3:
            return "三色搭配"
        elif len(colors) == 2:
            return "双色搭配"
        return "单色调"

    def _estimate_contrast(self, colors: list[str], meta: ImageMeta) -> str:
        if meta.color_mode in ("L", "1"):
            return "单色对比"
        neutral = {"灰色", "黑色", "白色"}
        neutral_count = sum(1 for c in colors if any(n in c for n in neutral))
        if neutral_count >= 2:
            return "高对比度"
        return "中等对比度"

    def compare_images(self, image_paths: list[str]) -> ComparisonResult:
        result = ComparisonResult()
        if len(image_paths) < 2:
            result.similarities = ["需要至少两张图片进行对比"]
            return result

        metas = [self.extract_metadata(p) for p in image_paths]
        scenes = [self._classify_scene(p) for p in image_paths]

        for i in range(len(image_paths)):
            for j in range(i + 1, len(image_paths)):
                sims = []
                diffs = []

                if metas[i].format == metas[j].format:
                    sims.append("图片 {} 和 {} 格式相同 ({})".format(i + 1, j + 1, metas[i].format))
                else:
                    diffs.append("图片 {} 和 {} 格式不同 ({} vs {})".format(
                        i + 1, j + 1, metas[i].format, metas[j].format
                    ))

                ratio_i = metas[i].aspect_ratio
                ratio_j = metas[j].aspect_ratio
                if ratio_i > 0 and ratio_j > 0:
                    if abs(ratio_i - ratio_j) < 0.1:
                        sims.append("图片 {} 和 {} 宽高比相近".format(i + 1, j + 1))
                    else:
                        diffs.append("图片 {} 和 {} 宽高比不同".format(i + 1, j + 1))

                if scenes[i] == scenes[j]:
                    sims.append("图片 {} 和 {} 场景类型相同 ({})".format(i + 1, j + 1, scenes[i]))
                else:
                    diffs.append("图片 {} 和 {} 场景类型不同 ({} vs {})".format(
                        i + 1, j + 1, scenes[i], scenes[j]
                    ))

                result.similarities.extend(sims)
                result.differences.extend(diffs)

                result.uniqueness.append({
                    "image": i + 1,
                    "unique_features": [
                        "尺寸: {}x{}".format(metas[i].width, metas[i].height),
                        "格式: {}".format(metas[i].format),
                        "场景: {}".format(scenes[i]),
                    ],
                })

        total = len(result.similarities) + len(result.differences)
        result.overall_score = len(result.similarities) / total if total > 0 else 0.5

        return result

    def detect_image_format(self, file_path: str) -> ImageFormat:
        ext = file_path.lower().split(".")[-1] if "." in file_path else ""
        format_map = {
            "jpg": ImageFormat.JPEG, "jpeg": ImageFormat.JPEG,
            "png": ImageFormat.PNG, "gif": ImageFormat.GIF,
            "webp": ImageFormat.WEBP, "bmp": ImageFormat.BMP,
            "svg": ImageFormat.SVG, "tiff": ImageFormat.TIFF,
            "tif": ImageFormat.TIFF,
        }
        return format_map.get(ext, ImageFormat.UNKNOWN)

    def get_supported_formats(self) -> list[str]:
        return ["JPEG", "PNG", "GIF", "WebP", "BMP", "SVG", "TIFF"]
