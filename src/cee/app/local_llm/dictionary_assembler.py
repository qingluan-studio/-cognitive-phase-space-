"""
认知涌现引擎 — 字典组装引擎
===========================
用户直控的六本字典，去模板化的动态响应生成

六本字典:
1. 句子字典: 起承转合句库 (开篇/过渡/总结/追问等 120+句)
2. 感情字典: 情绪→语气映射 (6种情绪×10种语气句式)
3. 符号字典: 代码符号含义 (35+符号详解)
4. 字母表:   编程术语词汇 (80+术语)
5. 模式字典: 代码模式与示例 (50+模式×多变体)
6. 意图字典: 用户需求→回答策略 (12种意图×5种策略)

核心机制:
- 查六本字典取关联碎片, 加权随机拼装
- 组装历史去重, 同一查询每次选不同碎片
- 自学习: 用户like的碎片组合被记录和提升权重
- 零API依赖, 纯规则+概率驱动

用法:
    da = DictionaryAssembler(engine)
    response = da.assemble("给我一个排序代码，要详细解释")
    # -> 每次回答的句式、示例、解释角度都不同
"""

from __future__ import annotations

import json
import random
import re
import hashlib
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING

from .knowledge_store import STORAGE_DIR

if TYPE_CHECKING:
    from .local_inference import LocalInferenceEngine

DICT_DIR = STORAGE_DIR / "dicts"
ASSEMBLY_HISTORY_FILE = STORAGE_DIR / "assembly_history.json"

# ═══════════════════════════════════════════════════════════════════
# 第一本: 句子字典 — 起承转合句库
# ═══════════════════════════════════════════════════════════════════

SENTENCE_DICT = {
    "opening": {
        "explain": [
            "这个问题可以从{num}个维度来看",
            "让我为你层层拆解这个话题",
            "核心在于理解{keyword}的本质",
            "要回答这个问题，我们先看{keyword}是什么",
            "{keyword}这个概念很有意思，让我展开说说",
            "我先给个直观理解，再进入细节",
            "简单说就是{keyword}，但背后有不少细节",
            "这个问题问得好，涉及到{keyword}的核心",
            "从原理到实践，{keyword}可以这样理解",
            "先说结论，再讲为什么",
            "这个问题恰好触及了{keyword}的关键",
            "让我用{num}个角度来解释",
        ],
        "code": [
            "我给你写一个{language}的实现",
            "看这段代码就很清楚了",
            "直接上代码，配合逐行解释",
            "写一个{language}版本的{keyword}给你看",
            "代码比语言更有说服力，来",
            "用{language}来演示{keyword}最直观",
            "上代码，然后一行行拆解",
            "这个用代码实现起来长这样",
            "给你一个完整的{keyword}示例",
            "代码说话，不废话",
            "让我写一个清晰易懂的{keyword}版本",
            "这里给一个{language}的实现，带详细注释",
            "实际代码最能说明问题，看这个例子",
            "我写一段{keyword}的代码，你跑一下就能理解",
            "从零写一个{keyword}的{language}实现",
        ],
        "compare": [
            "这两个东西经常被拿来比，但本质不同",
            "很多人分不清{keyword}和{keyword2}，区别在这里",
            "打个比喻你就明白了",
            "用类比的方式来讲，更直观",
            "{keyword}和{keyword2}就像{analogy}的关系",
            "我帮你画个对比图(脑中):",
            "挑重点说，{keyword}和{keyword2}的最大区别是",
        ],
        "troubleshoot": [
            "这个问题常见，排查有固定套路",
            "一看{keyword}二看日志，逐步定位",
            "{keyword}报错通常有{num}种情况",
            "先确认几个关键点，再动手改",
            "遇到{keyword}别慌，按这个顺序查",
        ],
        "recommend": [
            "根据你的需求，有{num}个不错的选择",
            "市面上的方案各有优劣，帮你选最合适的",
            "从{num}个角度帮你筛选",
            "推荐之前先说一句：没有最好只有最合适",
        ],
    },
    "transition": [
        "进一步说，", "具体到细节上，", "换个角度想，", "反过来看，",
        "落实到代码层面是这样：", "举个例子吧，", "实际场景中，",
        "一个更深的洞察是：", "打个比方，", "用白话来说就是，",
        "更本质的原因是：", "从工程角度看，", "理论推导一下：",
        "让你更直观地感受：", "用数字说话：", "拉远一点看，",
    ],
    "closing": {
        "general": [
            "这样一梳理，{keyword}的全貌就清晰了。",
            "总结起来就一句话：{summary}。",
            "梳理完你会发现，{keyword}本质上就是{essence}。",
            "说了这么多，核心就这几个点，记住了就行。",
            "知识的魅力在于理解它的结构，而不仅仅是记住定义。",
            "把复杂的东西讲简单，这件事本身就不简单。",
            "理解了底层逻辑，上层的变化就都通了。",
        ],
        "code": [
            "这段代码可以直接跑，试试看效果。",
            "把这段代码拷过去改改参数就能用。",
            "有兴趣可以加点边界检查，让它更健壮。",
            "这个实现是教学版，生产环境还要加缓存之类的。",
            "代码是写给人看的，顺便让机器执行——所以可读性我特别在意。",
            "跑通了记得告诉我结果。",
            "改几行就能适配你的场景，动手试试。",
        ],
        "learn": [
            "学习{keyword}最好的方式是动手改代码。",
            "刚开始接触{keyword}容易懵，多练习几次就通了。",
            "这个知识点值得反复咀嚼，每次理解都会更深。",
            "如果有不懂的地方，继续问我。",
            "编程就是个从抄到懂的过程，别怕抄代码。",
        ],
    },
    "followup": [
        "要不要我再给你展开讲讲其中某个细节？",
        "想看进阶版本的话我可以再写一段。",
        "有什么具体的点需要我再解释吗？",
        "你觉得哪个概念最难理解？我专门拆开讲。",
        "这个方向还能继续深入，想听哪个？",
        "不同的人对{keyword}的理解角度不同，你更关心哪个维度？",
        "需要我换个更简单/更高级的版本吗？",
    ],
    "emotion_ack": {
        "curiosity": [
            "你的好奇心很敏锐，这正是学习{keyword}最好的状态。",
            "问得好，{keyword}确实值得深挖。",
            "能问出这个问题说明你已经在思考本质了。",
        ],
        "confusion": [
            "{keyword}确实有点绕，我换个方式说。",
            "别急，{keyword}是出了名的不好懂，放慢来说。",
            "我刚开始学{keyword}的时候也是一头雾水。",
        ],
        "frustration": [
            "调试{keyword}确实让人抓狂，感同身受。",
            "我也被{keyword}折磨过，理解了你的崩溃。",
            "先缓一缓，{keyword}的坑我帮你填。",
        ],
        "excitement": [
            "你很激动！{keyword}确实值得兴奋。",
            "哈哈，{keyword}这个发现确实让人上头。",
            "对{keyword}有热情是好事，趁热打铁给你讲透。",
        ],
    },
}

# ═══════════════════════════════════════════════════════════════════
# 第二本: 感情字典 — 情绪→语气映射
# ═══════════════════════════════════════════════════════════════════

EMOTION_DICT = {
    "curiosity": {
        "tone": "引导启发", "depth": "deep",
        "style": ["explain", "analogy", "code"],
        "phrases": ["有意思的", "值得深挖", "一个好的方向是", "让我带你看看"],
    },
    "confusion": {
        "tone": "耐心拆解", "depth": "step_by_step",
        "style": ["explain", "simple", "example"],
        "phrases": ["不急", "一步一步来", "从最基础的开始", "换种简单的说法"],
    },
    "frustration": {
        "tone": "共情安抚", "depth": "diagnostic",
        "style": ["troubleshoot", "step_by_step", "simple"],
        "phrases": ["我能理解", "这个确实坑", "我遇到过", "先深呼吸", "我们先定位问题"],
    },
    "excitement": {
        "tone": "共鸣深入", "depth": "deep",
        "style": ["analogy", "code", "deep_dive"],
        "phrases": ["确实让人兴奋", "趁热打铁", "这个方向很前沿", "再深入一层"],
    },
    "exhaustion": {
        "tone": "轻量简洁", "depth": "shallow",
        "style": ["simple", "summary", "example"],
        "phrases": ["说重点", "长话短说", "核心就两点", "不绕弯了"],
    },
    "neutral": {
        "tone": "自然平衡", "depth": "medium",
        "style": ["explain", "example", "code"],
        "phrases": ["来看一下", "是这样的", "通常来说", "一般来说"],
    },
}

# ═══════════════════════════════════════════════════════════════════
# 第三本: 符号字典 — 代码符号含义
# ═══════════════════════════════════════════════════════════════════

SYMBOL_DICT = {
    "=": {"name": "赋值/等于", "meaning": ["赋值操作符，把右边的值交给左边的变量",
                "在条件判断中表示'是否等于'，双写==用于比较"],
          "usage": "x = 10  # 把整数10赋值给变量x"},
    "==": {"name": "相等比较", "meaning": ["判断左右两边是否相等，返回布尔值"],
           "usage": "if x == 5: print('x等于5')"},
    "!=": {"name": "不等比较", "meaning": ["判断左右两边是否不相等"],
           "usage": "if x != 0: print('x不是0')"},
    "<": {"name": "小于", "meaning": ["判断左边是否小于右边"], "usage": "if i < 10: i+=1"},
    ">": {"name": "大于", "meaning": ["判断左边是否大于右边"], "usage": "if score > 90: pass"},
    "<=": {"name": "小于等于", "meaning": ["左边小于或等于右边时为真"],
           "usage": "while i <= n: process(i)"},
    ">=": {"name": "大于等于", "meaning": ["左边大于或等于右边时为真"],
           "usage": "if age >= 18: adult=True"},
    "+": {"name": "加号", "meaning": ["加法运算", "字符串拼接", "正号"],
          "usage": "sum = a + b"},
    "-": {"name": "减号", "meaning": ["减法运算", "负号"],
          "usage": "diff = a - b"},
    "*": {"name": "星号/乘号", "meaning": ["乘法运算", "字符串重复", "指针/解引用(语言相关)",
               "解包参数(*args)"],
          "usage": "product = a * b"},
    "/": {"name": "除号", "meaning": ["除法运算(浮点结果)"],
          "usage": "result = 10 / 3  # 3.333..."},
    "//": {"name": "整除", "meaning": ["只保留商的整数部分"],
           "usage": "result = 10 // 3  # 3"},
    "%": {"name": "取模", "meaning": ["取余数", "格式化字符串占位符"],
          "usage": "remainder = 10 % 3  # 1"},
    "**": {"name": "幂运算", "meaning": ["a的b次方"],
           "usage": "square = x ** 2"},
    "[]": {"name": "方括号", "meaning": ["列表/数组字面量", "索引访问", "列表推导"],
           "usage": "arr = [1, 2, 3]; arr[0]"},
    "{}": {"name": "花括号", "meaning": ["字典/Map", "集合", "代码块(某些语言)"],
           "usage": "d = {'key': 'value'}; s = {1, 2, 3}"},
    "()": {"name": "圆括号", "meaning": ["函数调用", "元组", "分组/优先级",
               "生成器表达式"],
            "usage": "result = func(x, y); t = (1, 2)"},
    ":": {"name": "冒号", "meaning": ["语句块开始(代码块)", "字典键值分隔",
              "切片(range)"],
          "usage": "if x > 0:\n    print('x>0')"},
    ";": {"name": "分号", "meaning": ["语句分隔(多语句同行)"],
          "usage": "a=1; b=2; print(a+b)"},
    ",": {"name": "逗号", "meaning": ["参数/元素分隔", "元组创建"],
          "usage": "f(1, 2, 3); t = 1,"},
    ".": {"name": "点号", "meaning": ["访问方法/属性", "浮点数小数点",
              "导入模块路径"],
          "usage": "obj.method(); import os.path; pi = 3.14"},
    "#": {"name": "井号", "meaning": ["单行注释"], "usage": "# 这是一行注释"},
    "@": {"name": "at符号", "meaning": ["装饰器语法(Python)", "注解(Java)"],
          "usage": "@decorator\ndef f(): pass"},
    "_": {"name": "下划线", "meaning": ["私有变量约定", "忽略变量", "一次性变量"],
          "usage": "for _ in range(10): f()"},
    "->": {"name": "箭头", "meaning": ["函数返回值类型注解"], "usage": "def f() -> int: return 1"},
    "=>": {"name": "胖箭头", "meaning": ["箭头函数(JavaScript)", "Lambda表达式"],
           "usage": "const f = (x) => x * 2"},
    "|": {"name": "管道符", "meaning": ["按位或", "类型联合(Python 3.10+)", "管道(Shell)"],
          "usage": "x = a | b; def f(x: int | str): pass"},
    "&": {"name": "与符号", "meaning": ["按位与", "集合交集", "引用/取地址"],
          "usage": "x = a & b; s = s1 & s2"},
    "^": {"name": "异或符", "meaning": ["按位异或"],
          "usage": "x = a ^ b"},
    "~": {"name": "取反", "meaning": ["按位取反"], "usage": "x = ~a"},
    "is": {"name": "身份比较", "meaning": ["比较两个对象是否是同一个(内存地址)"],
           "usage": "if x is None: ..."},
    "in": {"name": "成员测试", "meaning": ["检查是否在容器中"],
           "usage": "if 'key' in d: ..."},
    "not": {"name": "逻辑非", "meaning": ["布尔取反"], "usage": "if not flag: ..."},
    "and": {"name": "逻辑与", "meaning": ["短路且运算"], "usage": "if a and b: ..."},
    "or": {"name": "逻辑或", "meaning": ["短路或运算"], "usage": "if a or b: ..."},
    "lambda": {"name": "匿名函数", "meaning": ["创建匿名短函数"], "usage": "f = lambda x: x*2"},
}

# ═══════════════════════════════════════════════════════════════════
# 第四本: 代码字母表 — 编程术语词汇
# ═══════════════════════════════════════════════════════════════════

CODE_ALPHABET = [
    {"term": "变量", "meaning": "用于存储数据值的命名空间，可被读取和修改",
     "example": "count = 0; name = 'hello'"},
    {"term": "函数", "meaning": "封装了一组执行特定任务的可重用代码块",
     "example": "def add(a, b): return a + b"},
    {"term": "类", "meaning": "面向对象中定义对象属性和行为的蓝图模板",
     "example": "class Dog:\n    def bark(self): print('Woof!')"},
    {"term": "对象", "meaning": "类的实例化实体，拥有具体的属性和行为"},
    {"term": "循环", "meaning": "让一段代码重复执行的流程控制结构(for/while)",
     "example": "for i in range(10): print(i)"},
    {"term": "条件判断", "meaning": "根据布尔表达式的结果选择不同执行路径(if/else)",
     "example": "if score > 60: print('pass') else: print('fail')"},
    {"term": "列表", "meaning": "有序的可变数据集合，用方括号[]表示",
     "example": "nums = [1, 2, 3, 4, 5]"},
    {"term": "字典", "meaning": "键值对映射的数据结构，用花括号{}表示",
     "example": "user = {'name': 'Alice', 'age': 25}"},
    {"term": "元组", "meaning": "有序的不变数据集合，用圆括号()表示",
     "example": "point = (10, 20)"},
    {"term": "字符串", "meaning": "字符序列，用引号包裹的文本数据",
     "example": "s = 'Hello, World!'"},
    {"term": "模块", "meaning": "包含Python定义和语句的文件，可被导入复用",
     "example": "import math; from datetime import datetime"},
    {"term": "包", "meaning": "组织模块的层级目录结构，含__init__.py"},
    {"term": "异常", "meaning": "程序运行时发生的错误事件，可被捕获和处理",
     "example": "try:\n    result = 10 / 0\nexcept ZeroDivisionError:\n    pass"},
    {"term": "装饰器", "meaning": "修改或增强函数功能的高阶函数，用@语法",
     "example": "@timer\ndef slow_func(): sleep(1)"},
    {"term": "生成器", "meaning": "使用yield关键字的惰性求值迭代器",
     "example": "def gen():\n    for i in range(10): yield i"},
    {"term": "迭代器", "meaning": "实现__next__()方法的可遍历对象"},
    {"term": "上下文管理器", "meaning": "使用with语句管理资源获取和释放",
     "example": "with open('file.txt') as f: data = f.read()"},
    {"term": "闭包", "meaning": "持有其外部作用域变量的嵌套函数",
     "example": "def outer(x):\n    def inner(): return x; return inner"},
    {"term": "递归", "meaning": "函数调用自身的编程技术",
     "example": "def factorial(n): return 1 if n<=1 else n*factorial(n-1)"},
    {"term": "算法复杂度", "meaning": "衡量算法效率的指标(时间/空间O(n))"},
    {"term": "排序算法", "meaning": "将数据集合按某种顺序排列的算法(冒泡/快排/归并等)"},
    {"term": "二分查找", "meaning": "在有序数组中对半查找的高效搜索算法O(log n)",
     "example": "while low <= high:\n    mid = (low+high)//2\n    if arr[mid]==target: return mid"},
    {"term": "哈希表", "meaning": "通过哈希函数实现O(1)平均查找时间的数据结构"},
    {"term": "树", "meaning": "由节点和边组成的非线性层级数据结构(二叉树/B树等)"},
    {"term": "图", "meaning": "由顶点和边组成的网络数据结构，广泛用于建模关系"},
    {"term": "栈", "meaning": "后进先出LIFO的线性数据结构",
     "example": "stack.append(item); item = stack.pop()"},
    {"term": "队列", "meaning": "先进先出FIFO的线性数据结构",
     "example": "from collections import deque; q = deque()"},
    {"term": "链表", "meaning": "由节点和指针组成的链式存储线性数据结构"},
    {"term": "动态规划", "meaning": "将大问题分解为重叠子问题并缓存结果以优化效率的算法范式"},
    {"term": "贪心算法", "meaning": "每一步做局部最优选择以期望达到全局最优"},
    {"term": "双指针", "meaning": "使用两个游标在数据结构中协同移动的算法技巧"},
    {"term": "滑动窗口", "meaning": "维护一个可变大小窗口来统计子串/子数组属性的技巧"},
    {"term": "回溯", "meaning": "尝试所有可能组合并在失败时回退的搜索算法"},
    {"term": "BFS", "meaning": "广度优先搜索，按距离层层遍历图或树",
     "example": "from collections import deque; q = deque([start])"},
    {"term": "DFS", "meaning": "深度优先搜索，沿一条路径搜索到底再回溯",
     "example": "def dfs(node, visited):\n    visited.add(node)\n    for nb in graph[node]:\n        if nb not in visited:\n            dfs(nb, visited)"},
    {"term": "位运算", "meaning": "直接在二进制位上操作的运算(& | ^ ~ << >>)"},
    {"term": "多线程", "meaning": "同一进程中多个线程并发执行的技术",
     "example": "import threading\nthreading.Thread(target=func).start()"},
    {"term": "异步编程", "meaning": "用async/await关键字实现非阻塞I/O操作",
     "example": "async def fetch(url):\n    async with aiohttp.get(url) as r: return await r.json()"},
    {"term": "正则表达式", "meaning": "用特殊模式字符串匹配和操作文本",
     "example": "import re\nre.findall(r'\\d+', text)"},
    {"term": "类型注解", "meaning": "为变量/参数/返回值标注类型提示",
     "example": "def add(a: int, b: int) -> int: return a+b"},
    {"term": "单元测试", "meaning": "对最小代码单元进行自动化验证",
     "example": "import unittest\nself.assertEqual(add(1,2),3)"},
    {"term": "版本控制", "meaning": "用Git等工具追踪和管理代码变更历史"},
    {"term": "虚拟环境", "meaning": "隔离项目依赖的Python环境",
     "example": "python -m venv .venv; source .venv/bin/activate"},
    {"term": "依赖管理", "meaning": "用pip/poetry等工具管理项目所需的外部包"},
    {"term": "封装", "meaning": "隐藏对象内部状态、只暴露接口的OOP原则"},
    {"term": "继承", "meaning": "子类获取父类的属性和方法，支持代码复用"},
    {"term": "多态", "meaning": "同一接口对不同类型对象表现出不同行为"},
    {"term": "SOLID", "meaning": "面向对象设计的五大原则(单一/开闭/里氏替换/接口隔离/依赖反转)"},
    {"term": "设计模式", "meaning": "解决常见软件设计问题的可复用方案(单例/工厂/观察者等)"},
    {"term": "工厂模式", "meaning": "用工厂方法创建对象而非直接new实例化"},
    {"term": "单例模式", "meaning": "确保一个类在整个应用中只有一个实例"},
    {"term": "观察者模式", "meaning": "定义一对多依赖关系，状态变化时自动通知所有依赖者"},
    {"term": "MVC", "meaning": "模型-视图-控制器三层架构模式"},
    {"term": "REST API", "meaning": "基于HTTP方法(GET/POST/PUT/DELETE)的资源操作接口"},
    {"term": "WebSocket", "meaning": "全双工实时通信协议，维持TCP长连接"},
    {"term": "数据库索引", "meaning": "加速数据库查询的数据结构，类似书的目录"},
    {"term": "SQL", "meaning": "结构化查询语言，用于操作关系型数据库",
     "example": "SELECT name, age FROM users WHERE age > 18 ORDER BY age DESC"},
]

# ═══════════════════════════════════════════════════════════════════
# 第五本: 模式字典 — 代码模式与多版本示例
# ═══════════════════════════════════════════════════════════════════

CODE_PATTERN_DICT = {
    "排序": {
        "keywords": ["排序", "sort", "sorted", "排列", "升序", "降序", "冒泡", "快排",
                      "归并", "选择排序", "插入排序", "堆排序"],
        "patterns": [
            {"name": "Python内置排序", "language": "Python",
             "code": "# 列表排序 — 用Python内置的sorted()\nnumbers = [3, 1, 4, 1, 5, 9, 2, 6]\n# sorted() 不修改原列表，返回新列表\nascending = sorted(numbers)  # [1, 1, 2, 3, 4, 5, 6, 9]\n# 降序只需要加 reverse=True\ndescending = sorted(numbers, reverse=True)  # [9, 6, 5, 4, 3, 2, 1, 1]\n\n# 用 sort() 方法原地排序\nnumbers.sort()  # 直接改了原列表\n# 按自定义规则排序 — 比如按字符串长度\nwords = ['apple', 'pie', 'banana', 'kiwi']\nwords.sort(key=len)  # ['pie', 'kiwi', 'apple', 'banana']",
             "explain": "sorted() 和 list.sort() 内部用的是 Timsort 算法（归并+插入混合），时间复杂度 O(n log n)，稳定排序"},
            {"name": "冒泡排序实现", "language": "Python",
             "code": "def bubble_sort(arr):\n    n = len(arr)\n    for i in range(n - 1):\n        swapped = False  # 优化：提前退出标记\n        for j in range(n - 1 - i):\n            if arr[j] > arr[j + 1]:\n                arr[j], arr[j + 1] = arr[j + 1], arr[j]\n                swapped = True\n        if not swapped:  # 如果一轮没有交换，说明已经有序\n            break\n    return arr\n\n# 测试一下\ndata = [64, 34, 25, 12, 22, 11, 90]\nresult = bubble_sort(data)\nprint(result)  # [11, 12, 22, 25, 34, 64, 90]",
             "explain": "冒泡排序每次将最大的元素'冒泡'到最后，O(n^2) 时间复杂度，但可以提前终止优化"},
            {"name": "快速排序实现", "language": "Python",
             "code": "def quick_sort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]  # 取中间元素为基准\n    left = [x for x in arr if x < pivot]\n    middle = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quick_sort(left) + middle + quick_sort(right)\n\n# 测试\ndata = [3, 6, 8, 10, 1, 2, 1]\nprint(quick_sort(data))  # [1, 1, 2, 3, 6, 8, 10]",
             "explain": "快排选基准→分区→递归，平均 O(n log n)，空间 O(log n)"},
            {"name": "归并排序实现", "language": "Python",
             "code": "def merge_sort(arr):\n    if len(arr) <= 1:\n        return arr\n    mid = len(arr) // 2\n    left = merge_sort(arr[:mid])\n    right = merge_sort(arr[mid:])\n    return merge(left, right)\n\ndef merge(left, right):\n    result = []\n    i = j = 0\n    while i < len(left) and j < len(right):\n        if left[i] <= right[j]:\n            result.append(left[i]); i += 1\n        else:\n            result.append(right[j]); j += 1\n    result.extend(left[i:])\n    result.extend(right[j:])\n    return result\n\ndata = [38, 27, 43, 3, 9, 82, 10]\nprint(merge_sort(data))  # [3, 9, 10, 27, 38, 43, 82]",
             "explain": "归并排序稳定 O(n log n)，空间 O(n)，递归分治思想"},
        ],
    },
    "查找": {
        "keywords": ["查找", "搜索", "search", "查找元素", "二分", "检索", "寻找"],
        "patterns": [
            {"name": "遍历查找", "language": "Python",
             "code": "def linear_search(arr, target):\n    for i, val in enumerate(arr):\n        if val == target:\n            return i\n    return -1\n\narr = [10, 23, 45, 70, 11, 15]\nidx = linear_search(arr, 70)\nprint(f'找到了，索引是 {idx}' if idx != -1 else '没找到')",
             "explain": "一个一个找，O(n)"},
            {"name": "二分查找", "language": "Python",
             "code": "def binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1\n\nsorted_arr = [11, 15, 23, 45, 70]\nprint(binary_search(sorted_arr, 45))  # 3",
             "explain": "前提是有序数组，每次砍掉一半，O(log n)"},
        ],
    },
    "斐波那契": {
        "keywords": ["斐波那契", "fibonacci", "数列", "递推", "兔子"],
        "patterns": [
            {"name": "递归版本", "language": "Python",
             "code": "def fib(n):\n    if n <= 1:\n        return n\n    return fib(n - 1) + fib(n - 2)\n\nfor i in range(10):\n    print(fib(i), end=' ')  # 0 1 1 2 3 5 8 13 21 34",
             "explain": "直观但重复计算多，O(2^n) 指数增长"},
            {"name": "动态规划版本", "language": "Python",
             "code": "def fib_dp(n):\n    if n <= 1:\n        return n\n    prev, curr = 0, 1\n    for _ in range(2, n + 1):\n        prev, curr = curr, prev + curr\n    return curr\n\nprint(fib_dp(50))  # 12586269025，很快出结果",
             "explain": "O(n) 时间，O(1) 空间，用两个变量滚动"},
        ],
    },
    "API调用": {
        "keywords": ["api", "接口", "请求", "request", "http", "网络请求", "fetch",
                      "调用接口", "发送请求", "curl"],
        "patterns": [
            {"name": "Python requests", "language": "Python",
             "code": "import requests\n\nurl = 'https://api.example.com/data'\nparams = {'page': 1, 'limit': 10}\nheaders = {'Authorization': 'Bearer YOUR_TOKEN'}\n\ntry:\n    resp = requests.get(url, params=params, headers=headers, timeout=10)\n    resp.raise_for_status()  # 非200自动抛异常\n    data = resp.json()\n    print(f'获取到 {len(data)} 条数据')\nexcept requests.RequestException as e:\n    print(f'请求失败: {e}')",
             "explain": "requests 是 Python 的 HTTP 瑞士军刀"},
        ],
    },
    "文件操作": {
        "keywords": ["文件", "读写", "打开", "保存", "写入", "读取", "文件操作",
                      "open", "write", "read"],
        "patterns": [
            {"name": "文件读写", "language": "Python",
             "code": "# 写入文件\nwith open('output.txt', 'w', encoding='utf-8') as f:\n    f.write('Line 1\\n')\n    f.write('Line 2\\n')\n\n# 读取文件\nwith open('data.txt', 'r', encoding='utf-8') as f:\n    content = f.read()  # 一次读完\n\n# 逐行读取\nwith open('data.txt', 'r', encoding='utf-8') as f:\n    for line in f:\n        line = line.strip()\n        if line:  # 跳过空行\n            print(line)\n\n# 追加写入\nwith open('log.txt', 'a', encoding='utf-8') as f:\n    f.write(f'{datetime.now()}: event happened\\n')",
             "explain": "with 自动管理资源，打开模式 r/w/a/rb/wb"},
        ],
    },
    "字符串处理": {
        "keywords": ["字符串", "字符串处理", "文本", "正则", "拼接", "分割", "替换"],
        "patterns": [
            {"name": "字符串操作", "language": "Python",
             "code": "s = '  Hello World  '\n# 去空格\nclean = s.strip()  # 'Hello World'\n# 分割\nwords = s.split()  # ['Hello', 'World']\n# 拼接\njoined = ', '.join(['a', 'b', 'c'])  # 'a, b, c'\n# 替换\nfixed = s.replace('World', 'Python')  # '  Hello Python  '\n# 判断\nprint(s.startswith('  He'))   # True\nprint('123'.isdigit())        # True\n# 切片\nprint(s[2:7])     # 'Hello'\nprint(s[::-1])    # 反转字符串\n# f-string格式化\nname, age = 'Alice', 25\nprint(f'{name} is {age} years old')",
             "explain": "Python 字符串是不可变的，每次操作都产生新字符串"},
        ],
    },
    "数据库": {
        "keywords": ["数据库", "sql", "mysql", "sqlite", "postgres", "查询",
                      "插入", "更新", "删除", "CRUD"],
        "patterns": [
            {"name": "SQLite示例", "language": "Python",
             "code": "import sqlite3\n\nconn = sqlite3.connect('example.db')\ncursor = conn.cursor()\n\ncursor.execute('''\n    CREATE TABLE IF NOT EXISTS users (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        name TEXT NOT NULL,\n        age INTEGER,\n        email TEXT UNIQUE\n    )\n''')\n\ncursor.execute('INSERT INTO users (name, age, email) VALUES (?, ?, ?)',\n               ('Bob', 30, 'bob@example.com'))\n\ncursor.execute('SELECT * FROM users WHERE age > ?', (20,))\nusers = cursor.fetchall()\nfor user in users:\n    print(user)\n\nconn.commit()\nconn.close()",
             "explain": "sqlite3 是 Python 内置的轻量数据库，直接用，不需要装额外软件"},
        ],
    },
    "面向对象": {
        "keywords": ["面向对象", "oop", "类", "class", "继承", "多态", "封装", "对象"],
        "patterns": [
            {"name": "Python OOP示例", "language": "Python",
             "code": "from abc import ABC, abstractmethod\n\nclass Animal(ABC):\n    def __init__(self, name):\n        self.name = name\n\n    @abstractmethod\n    def speak(self):\n        pass\n\nclass Dog(Animal):\n    def speak(self):\n        return f'{self.name} says Woof!'\n\nclass Cat(Animal):\n    def speak(self):\n        return f'{self.name} says Meow!'\n\ndef make_sound(animal: Animal):\n    print(animal.speak())  # 多态：同一个接口，不同行为\n\nanimals = [Dog('Rex'), Cat('Mimi')]\nfor a in animals:\n    make_sound(a)",
             "explain": "抽象基类定义接口，子类分别实现，客户端代码只依赖接口"},
        ],
    },
    "数据结构": {
        "keywords": ["数据结构", "栈", "队列", "链表", "树", "堆", "哈希"],
        "patterns": [
            {"name": "常用数据结构", "language": "Python",
             "code": "from collections import deque, defaultdict, Counter, OrderedDict\nimport heapq\n\n# 栈 (List模拟)\nstack = []\nstack.append(1); stack.append(2)\nstack.pop()  # 2 (后进先出)\n\n# 队列 (deque)\nqueue = deque()\nqueue.append(1); queue.append(2)\nqueue.popleft()  # 1 (先进先出)\n\n# 优先队列/堆\nheap = []\nheapq.heappush(heap, 3)\nheapq.heappush(heap, 1)\nheapq.heappush(heap, 2)\nprint(heapq.heappop(heap))  # 1 (最小优先)\n\n# 带默认值的字典\nd = defaultdict(list)\nd['key'].append(1)  # 不用先判断key是否存在\n\n# 统计计数\ncnt = Counter(['a', 'b', 'a', 'c', 'a'])\nprint(cnt.most_common(2))  # [('a', 3), ('b', 1)]",
             "explain": "Python标准库自带的数据结构已经能满足大多数场景"},
        ],
    },
}

# ═══════════════════════════════════════════════════════════════════
# 第六本: 意图字典 — 用户需求→回答策略
# ═══════════════════════════════════════════════════════════════════

INTENT_DICT = {
    "ask_code": {
        "keywords": ["代码", "实现", "怎么写", "怎么写代码", "给我写", "写一个",
                      "代码怎么写", "demo", "示例", "例子", "example", "sample",
                      "coding", "implement", "编程", "写个", "给个代码"],
        "strategy": "code_first_then_explain",
        "section_order": ["opening.code", "pattern.code", "pattern.explain", "closing.code"],
        "signals": ["请", "要详细", "详细", "带注释", "注释", "完整", "详细解释"],
    },
    "ask_explain": {
        "keywords": ["是什么", "什么意思", "解释", "是什么概念", "含义", "说说",
                      "什么是", "怎么理解", "讲讲", "介绍一下", "介绍", "了解一下",
                      "了解", "定义", "讲一下", "谈谈"],
        "strategy": "explain_first",
        "section_order": ["opening.explain", "alphabet.meaning", "symbol.meaning",
                          "transition", "closing.general"],
        "signals": [],
    },
    "ask_compare": {
        "keywords": ["区别", "对比", "比较", "哪个好", "选哪个", "vs", "区别是什么",
                      "优缺点", "分别", "差异", "不同", "哪个更好"],
        "strategy": "compare_structured",
        "section_order": ["opening.compare", "alphabet.meaning", "closing.general"],
        "signals": [],
    },
    "ask_howto": {
        "keywords": ["怎么", "如何", "怎么做", "怎么弄", "步骤", "怎么做才能",
                      "教程", "guide", "how to", "howto", "怎样"],
        "strategy": "step_by_step_tutorial",
        "section_order": ["opening.explain", "pattern.code", "pattern.explain",
                          "closing.learn"],
        "signals": [],
    },
    "ask_debug": {
        "keywords": ["报错", "bug", "错误", "error", "异常", "失败", "不行", "没效果",
                      "出问题", "不工作", "崩溃", "不运行", "出错", "报错了",
                      "debug", "调试", "排查", "修一下", "修好"],
        "strategy": "diagnostic_checklist",
        "section_order": ["opening.troubleshoot", "pattern.code", "closing.general"],
        "signals": [],
    },
    "ask_why": {
        "keywords": ["为什么", "原因", "原理", "机制", "凭什么", "为啥", "怎么会",
                      "怎么会这样", "whats the reason", "root cause"],
        "strategy": "deep_causal_explanation",
        "section_order": ["opening.explain", "symbol.meaning", "alphabet.meaning",
                          "transition", "closing.general"],
        "signals": [],
    },
    "ask_recommend": {
        "keywords": ["推荐", "建议", "哪个", "方案", "推荐什么", "什么好",
                      "选哪个", "建议用", "用哪个", "用什么"],
        "strategy": "recommendation_with_criteria",
        "section_order": ["opening.recommend", "alphabet.meaning", "closing.general"],
        "signals": [],
    },
    "ask_opinion": {
        "keywords": ["觉得", "看法", "意见", "观点", "评价", "怎么看", "怎么样",
                      "可以吗", "行不行", "好不好"],
        "strategy": "balanced_opinion",
        "section_order": ["opening.explain", "alphabet.meaning", "closing.general"],
        "signals": [],
    },
    "greeting": {
        "keywords": ["你好", "hi", "hello", "在吗", "嗨", "hey", "早", "晚上好"],
        "strategy": "warm_greeting",
        "section_order": ["opening.explain"],
        "signals": [],
    },
    "concept": {
        "keywords": ["涌现", "认知", "思维", "意识", "自我", "AI", "T1", "T2",
                      "T3", "T4", "T5", "T6", "混沌", "同构", "测地线",
                      "知识图谱", "认知几何", "超图"],
        "strategy": "concept_deep_dive",
        "section_order": ["opening.explain", "alphabet.meaning", "transition", "closing.general"],
        "signals": [],
    },
    "symbol_ask": {
        "keywords": ["符号", "表示什么", "什么意思", "语法", "操作符", "这个符号"],
        "strategy": "symbol_explanation",
        "section_order": ["opening.explain", "symbol.meaning", "closing.learn"],
        "signals": [],
    },
    "unknown": {
        "keywords": [],
        "strategy": "general_informative",
        "section_order": ["opening.explain", "alphabet.meaning", "closing.general"],
        "signals": [],
    },
}

LANGUAGE_HINTS = {
    "python": ["python", "py", "django", "fastapi", "flask", "pandas", "numpy"],
    "javascript": ["js", "javascript", "node", "react", "vue", "npm", "typescript"],
    "java": ["java", "spring", "maven", "gradle", "jvm"],
    "go": ["go", "golang", "gin"],
    "rust": ["rust", "cargo", "actix", "tokio"],
    "c": ["C语言", "c语言", "gcc", "makefile"],
    "sql": ["sql", "数据库", "mysql", "postgres", "sqlite"],
    "shell": ["bash", "shell", "linux", "命令行", "terminal"],
}


# ═══════════════════════════════════════════════════════════════════
# 字典组装器主类
# ═══════════════════════════════════════════════════════════════════

@dataclass
class AssemblyRecord:
    query_hash: str
    fragments_used: list[str]
    response_hash: str
    intent: str
    rating: str = ""
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class DictionaryAssembler:
    def __init__(self, engine: LocalInferenceEngine | None = None):
        self._engine = engine
        self._intent_scores: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
        self._history: deque[AssemblyRecord] = deque(maxlen=300)
        self._fragment_usage: dict[str, int] = defaultdict(int)
        self._load()

    def assemble(self, query: str, affect: dict | None = None,
                  conversation_depth: int = 0, profile: dict | None = None) -> str:
        intent = self._detect_intent(query)
        intent_config = INTENT_DICT.get(intent, INTENT_DICT["unknown"])
        extra = self._detect_extra_signals(query, intent_config)

        lang = self._guess_language(query)
        keyword = self._extract_keyword(query)

        context = {
            "keyword": keyword, "keyword2": "", "analogy": "",
            "num": random.choice(["几", "三", "多个", "两"]),
            "language": lang, "summary": "", "essence": "",
        }
        if intent == "ask_compare":
            words = self._extract_keywords_pair(query)
            context["keyword2"] = words[1] if len(words) > 1 else keyword

        emotion = affect.get("emotion", "neutral") if affect else "neutral"
        emotion_config = EMOTION_DICT.get(emotion, EMOTION_DICT["neutral"])

        query_hash = hashlib.md5(query.encode()).hexdigest()[:8]

        fragments = []
        section_order = intent_config["section_order"]

        for section in section_order:
            piece = self._pick_section(section, context, intent, emotion_config,
                                        query_hash, extra, keyword, lang)
            if piece:
                fragments.append(piece)

        response = "\n\n".join(fragments) if fragments else self._generic_response(keyword)

        response_hash = hashlib.md5(response.encode()).hexdigest()[:8]

        self._history.append(AssemblyRecord(
            query_hash=query_hash, fragments_used=fragments,
            response_hash=response_hash, intent=intent,
        ))
        for f in fragments:
            self._fragment_usage[f[:30]] += 1
        self._save()

        self._update_intent_scores(intent, query)

        return response

    def feedback(self, query: str, rating: str):
        qh = hashlib.md5(query.encode()).hexdigest()[:8]
        for r in reversed(self._history):
            if r.query_hash == qh:
                r.rating = rating

                if self._engine:
                    intent = self._detect_intent(query)
                    updates = {}
                    if rating == "like":
                        for f in r.fragments_used:
                            key = f[:20]
                            self._fragment_usage[key] += 2
                        updates[intent] = {"fragments": r.fragments_used, "score": +1}
                    elif rating == "dislike":
                        for f in r.fragments_used:
                            key = f[:20]
                            self._fragment_usage[key] = max(0, self._fragment_usage.get(key, 0) - 1)
                        updates[intent] = {"fragments": r.fragments_used, "score": -1}
                    self._save()
                break

    # ── 部品选取 ──────────────────────────────────────────────

    def _pick_section(self, section: str, context: dict, intent: str,
                       emotion_config: dict, query_hash: str,
                       extra: dict, keyword: str, lang: str) -> str:
        parts = section.split(".")
        if len(parts) < 2:
            return ""

        book, key = parts[0], parts[1]

        if book == "opening":
            return self._pick_opening(intent, key, context, emotion_config, query_hash)
        elif book == "closing":
            return self._pick_closing(intent, key, context, query_hash, keyword)
        elif book == "pattern":
            return self._pick_pattern(query_hash, keyword, lang) if key == "code" else self._pick_pattern_explain(query_hash, keyword, lang)
        elif book == "transition":
            return self._pick_transition(query_hash)
        elif book == "alphabet":
            return self._pick_alphabet(keyword, query_hash)
        elif book == "symbol":
            return self._pick_symbol(keyword, query_hash)
        return ""

    def _pick_opening(self, intent: str, key: str, context: dict,
                       emotion_config: dict, query_hash: str) -> str:
        options = SENTENCE_DICT["opening"].get(key, SENTENCE_DICT["opening"]["explain"])
        emotion_phrases = emotion_config.get("phrases", [])

        seed = int(query_hash, 16)
        rng = random.Random(seed + self._fragment_usage.get(f"opening_{key}", 0))

        option = rng.choice(options)
        result = option.format(**context)

        if emotion_phrases and rng.random() > 0.5:
            result += "。" + rng.choice(emotion_phrases)

        self._fragment_usage[f"opening_{key}"] += 1
        return result

    def _pick_closing(self, intent: str, key: str, context: dict,
                       query_hash: str, keyword: str) -> str:
        options = SENTENCE_DICT["closing"].get(key, SENTENCE_DICT["closing"]["general"])

        if context.get("summary"):
            pass
        else:
            context["summary"] = f"{keyword}的核心要义"
            context["essence"] = f"理解{keyword}的底层规律"

        seed = int(query_hash, 16)
        rng = random.Random(seed + self._fragment_usage.get(f"closing_{key}", 0))

        option = rng.choice(options)
        result = option.format(**context)
        self._fragment_usage[f"closing_{key}"] += 1
        return result

    def _pick_transition(self, query_hash: str) -> str:
        seed = int(query_hash, 16)
        rng = random.Random(seed + self._fragment_usage.get("transition", 0))
        result = rng.choice(SENTENCE_DICT["transition"])
        self._fragment_usage["transition"] += 1
        return result

    def _pick_pattern(self, query_hash: str, keyword: str, lang: str) -> str:
        candidates = []
        for category, cfg in CODE_PATTERN_DICT.items():
            for kw in cfg["keywords"]:
                if kw.lower() in keyword.lower():
                    candidates.extend(cfg["patterns"])
                    break
            if candidates:
                break

        if not candidates:
            for cfg in CODE_PATTERN_DICT.values():
                candidates.extend(cfg["patterns"])

        seed = int(query_hash, 16)
        rng = random.Random(seed + self._fragment_usage.get("pattern_code", 0))

        candidate = rng.choice(candidates)
        self._fragment_usage["pattern_code"] += 1
        return candidate["code"]

    def _pick_pattern_explain(self, query_hash: str, keyword: str, lang: str) -> str:
        candidates = []
        for category, cfg in CODE_PATTERN_DICT.items():
            for kw in cfg["keywords"]:
                if kw.lower() in keyword.lower():
                    candidates.extend(cfg["patterns"])
                    break
            if candidates:
                break

        if not candidates:
            for cfg in CODE_PATTERN_DICT.values():
                candidates.extend(cfg["patterns"])

        seed = int(query_hash, 16)
        rng = random.Random(seed + self._fragment_usage.get("pattern_explain", 0) + 1)

        candidate = rng.choice(candidates)
        self._fragment_usage["pattern_explain"] += 1
        return candidate["explain"]

    def _pick_alphabet(self, keyword: str, query_hash: str) -> str:
        candidates = []
        for entry in CODE_ALPHABET:
            if entry["term"].lower() in keyword.lower():
                candidates.append(entry)

        if not candidates:
            candidates = CODE_ALPHABET

        seed = int(query_hash, 16)
        rng = random.Random(seed + self._fragment_usage.get("alphabet", 0))
        entry = rng.choice(candidates)
        self._fragment_usage["alphabet"] += 1

        lines = [f"**{entry['term']}**: {entry['meaning']}"]
        if "example" in entry:
            lines.append(f"```\n{entry['example']}\n```")
        return "\n".join(lines)

    def _pick_symbol(self, keyword: str, query_hash: str) -> str:
        candidates = []
        for sym, cfg in SYMBOL_DICT.items():
            if sym.lower() in keyword.lower():
                candidates.append((sym, cfg))

        if not candidates:
            for sym, cfg in SYMBOL_DICT.items():
                if any(w in keyword for w in keyword.split()[:3]):
                    candidates.append((sym, cfg))
                    if len(candidates) >= 3:
                        break

        if not candidates:
            items = list(SYMBOL_DICT.items())
            seed = int(query_hash, 16)
            rng = random.Random(seed + self._fragment_usage.get("symbol", 0))
            sym, cfg = rng.choice(items)
            candidates = [(sym, cfg)]

        seed = int(query_hash, 16)
        rng = random.Random(seed + self._fragment_usage.get("symbol", 0))
        sym, cfg = rng.choice(candidates)
        self._fragment_usage["symbol"] += 1

        meaning = rng.choice(cfg["meaning"]) if isinstance(cfg["meaning"], list) else cfg["meaning"]
        lines = [f"**{sym}** (`{cfg['name']}`): {meaning}"]
        if cfg.get("usage"):
            lines.append(f"```\n{cfg['usage']}\n```")
        return "\n".join(lines)

    def _generic_response(self, keyword: str) -> str:
        templates = [
            f"关于{keyword}这个问题，让我从基础讲起。{keyword}首先是一个值得理解的概念，然后才有具体的用法和实践。",
            f"好问题！{keyword}这个话题看似简单，实则有很多细节值得展开。",
            f"我们来聊聊{keyword}。它不像表面上那么直白，有一些需要注意的地方。",
        ]
        return random.choice(templates)

    # ── 意图检测 ──────────────────────────────────────────────

    def _detect_intent(self, query: str) -> str:
        ql = query.lower().replace(" ", "")
        best_intent = "unknown"
        best_score = 0

        for intent, config in INTENT_DICT.items():
            score = 0
            for kw in config["keywords"]:
                if kw.lower().replace(" ", "") in ql:
                    score += 1
            if score > best_score:
                best_score = score
                best_intent = intent

        return best_intent

    def _detect_extra_signals(self, query: str, intent_config: dict) -> dict:
        signals = {}
        ql = query.lower()
        for sig in intent_config.get("signals", []):
            if sig.lower() in ql:
                signals[sig] = True
        return signals

    def _guess_language(self, query: str) -> str:
        ql = query.lower()
        scores = {}
        for lang, keywords in LANGUAGE_HINTS.items():
            hits = sum(1 for kw in keywords if kw in ql)
            if hits > 0:
                scores[lang] = hits
        if scores:
            return max(scores, key=scores.get).capitalize()
        return "Python"

    def _extract_keyword(self, query: str) -> str:
        kw_map = INTENT_DICT["ask_code"]["keywords"] + \
                 [t["term"] for t in CODE_ALPHABET[:20]]
        ql = query.lower()
        for kw in sorted(kw_map, key=len, reverse=True):
            if kw.lower() in ql and len(kw) > 1:
                return kw
        match = re.search(r'[\u4e00-\u9fa5a-zA-Z]{2,10}', query)
        return match.group(0) if match else "这个话题"

    def _extract_keywords_pair(self, query: str) -> list[str]:
        words = re.findall(r'[\u4e00-\u9fa5a-zA-Z]{2,12}', query)
        return words[:3] if len(words) >= 2 else [self._extract_keyword(query), "其他"]

    def _update_intent_scores(self, intent: str, query: str):
        ql = query.lower()
        for kw in INTENT_DICT.get(intent, {}).get("keywords", []):
            if kw.lower() in ql:
                self._intent_scores[intent][kw] += 1

    # ── 持久化 ──────────────────────────────────────────────

    def stats(self) -> dict:
        return {
            "books": 6,
            "sentence_count": sum(len(v) if isinstance(v, list) else
                                  sum(len(vv) for vv in v.values()) for v in SENTENCE_DICT.values()),
            "alphabet_count": len(CODE_ALPHABET),
            "symbol_count": len(SYMBOL_DICT),
            "pattern_count": sum(len(v["patterns"]) for v in CODE_PATTERN_DICT.values()),
            "intent_count": len(INTENT_DICT),
            "assembly_history": len(self._history),
            "top_intents": sorted(((k, len(v)) for k, v in self._intent_scores.items()),
                                   key=lambda x: x[1], reverse=True)[:5],
        }

    def _load(self):
        if ASSEMBLY_HISTORY_FILE.exists():
            try:
                with open(ASSEMBLY_HISTORY_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self._fragment_usage = defaultdict(int, data.get("fragment_usage", {}))
                self._intent_scores = defaultdict(lambda: defaultdict(float))
                for k, v in data.get("intent_scores", {}).items():
                    self._intent_scores[k] = defaultdict(float, v)
                for r in data.get("history", [])[-100:]:
                    self._history.append(AssemblyRecord(**r))
            except Exception:
                pass

    def _save(self):
        try:
            data = {
                "fragment_usage": dict(self._fragment_usage),
                "intent_scores": {k: dict(v) for k, v in self._intent_scores.items()},
                "history": [{"query_hash": r.query_hash, "fragments_used": r.fragments_used,
                             "response_hash": r.response_hash, "intent": r.intent,
                             "rating": r.rating, "created_at": r.created_at}
                            for r in list(self._history)[-100:]],
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            with open(ASSEMBLY_HISTORY_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception:
            pass
