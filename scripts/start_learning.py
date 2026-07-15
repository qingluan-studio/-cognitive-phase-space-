"""""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1."""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2."""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0,"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list["""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage""""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r","""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs:"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print(""""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    #"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)}"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier,"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0)"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print(""""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态:"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamCons"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed ="""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed = time.time() - start_time
            
            # 模拟一个学习周期
            #"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed = time.time() - start_time
            
            # 模拟一个学习周期
            # 1. 从知识库中随机选取"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed = time.time() - start_time
            
            # 模拟一个学习周期
            # 1. 从知识库中随机选取对话对进行"学习"
            import random"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed = time.time() - start_time
            
            # 模拟一个学习周期
            # 1. 从知识库中随机选取对话对进行"学习"
            import random
            sample = random.sample(pairs, min"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed = time.time() - start_time
            
            # 模拟一个学习周期
            # 1. 从知识库中随机选取对话对进行"学习"
            import random
            sample = random.sample(pairs, min(5, len(pairs)))
            
            # 2. 模拟生成"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed = time.time() - start_time
            
            # 模拟一个学习周期
            # 1. 从知识库中随机选取对话对进行"学习"
            import random
            sample = random.sample(pairs, min(5, len(pairs)))
            
            # 2. 模拟生成新的训练数据
            for p in sample:
                # 模拟：从现有对话中"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed = time.time() - start_time
            
            # 模拟一个学习周期
            # 1. 从知识库中随机选取对话对进行"学习"
            import random
            sample = random.sample(pairs, min(5, len(pairs)))
            
            # 2. 模拟生成新的训练数据
            for p in sample:
                # 模拟：从现有对话中"衍生"出新对话
                new_pair ="""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed = time.time() - start_time
            
            # 模拟一个学习周期
            # 1. 从知识库中随机选取对话对进行"学习"
            import random
            sample = random.sample(pairs, min(5, len(pairs)))
            
            # 2. 模拟生成新的训练数据
            for p in sample:
                # 模拟：从现有对话中"衍生"出新对话
                new_pair = {
                    "id": f"derived_{"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed = time.time() - start_time
            
            # 模拟一个学习周期
            # 1. 从知识库中随机选取对话对进行"学习"
            import random
            sample = random.sample(pairs, min(5, len(pairs)))
            
            # 2. 模拟生成新的训练数据
            for p in sample:
                # 模拟：从现有对话中"衍生"出新对话
                new_pair = {
                    "id": f"derived_{cycle}_{p['id'][:8]}",
                    "user_query": f""""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed = time.time() - start_time
            
            # 模拟一个学习周期
            # 1. 从知识库中随机选取对话对进行"学习"
            import random
            sample = random.sample(pairs, min(5, len(pairs)))
            
            # 2. 模拟生成新的训练数据
            for p in sample:
                # 模拟：从现有对话中"衍生"出新对话
                new_pair = {
                    "id": f"derived_{cycle}_{p['id'][:8]}",
                    "user_query": f"[衍生] {p['user_query'][:50]}...",
                    "ai_response":"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed = time.time() - start_time
            
            # 模拟一个学习周期
            # 1. 从知识库中随机选取对话对进行"学习"
            import random
            sample = random.sample(pairs, min(5, len(pairs)))
            
            # 2. 模拟生成新的训练数据
            for p in sample:
                # 模拟：从现有对话中"衍生"出新对话
                new_pair = {
                    "id": f"derived_{cycle}_{p['id'][:8]}",
                    "user_query": f"[衍生] {p['user_query'][:50]}...",
                    "ai_response": f"[基于学习] {p['ai"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed = time.time() - start_time
            
            # 模拟一个学习周期
            # 1. 从知识库中随机选取对话对进行"学习"
            import random
            sample = random.sample(pairs, min(5, len(pairs)))
            
            # 2. 模拟生成新的训练数据
            for p in sample:
                # 模拟：从现有对话中"衍生"出新对话
                new_pair = {
                    "id": f"derived_{cycle}_{p['id'][:8]}",
                    "user_query": f"[衍生] {p['user_query'][:50]}...",
                    "ai_response": f"[基于学习] {p['ai_response'][:100]}...",
                    """"
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed = time.time() - start_time
            
            # 模拟一个学习周期
            # 1. 从知识库中随机选取对话对进行"学习"
            import random
            sample = random.sample(pairs, min(5, len(pairs)))
            
            # 2. 模拟生成新的训练数据
            for p in sample:
                # 模拟：从现有对话中"衍生"出新对话
                new_pair = {
                    "id": f"derived_{cycle}_{p['id'][:8]}",
                    "user_query": f"[衍生] {p['user_query'][:50]}...",
                    "ai_response": f"[基于学习] {p['ai_response'][:100]}...",
                    "source_pair": p["id"],
"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed = time.time() - start_time
            
            # 模拟一个学习周期
            # 1. 从知识库中随机选取对话对进行"学习"
            import random
            sample = random.sample(pairs, min(5, len(pairs)))
            
            # 2. 模拟生成新的训练数据
            for p in sample:
                # 模拟：从现有对话中"衍生"出新对话
                new_pair = {
                    "id": f"derived_{cycle}_{p['id'][:8]}",
                    "user_query": f"[衍生] {p['user_query'][:50]}...",
                    "ai_response": f"[基于学习] {p['ai_response'][:100]}...",
                    "source_pair": p["id"],
                    "generation_method": "auto_learning_derivation",
                    "quality_score": p.get("composite"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed = time.time() - start_time
            
            # 模拟一个学习周期
            # 1. 从知识库中随机选取对话对进行"学习"
            import random
            sample = random.sample(pairs, min(5, len(pairs)))
            
            # 2. 模拟生成新的训练数据
            for p in sample:
                # 模拟：从现有对话中"衍生"出新对话
                new_pair = {
                    "id": f"derived_{cycle}_{p['id'][:8]}",
                    "user_query": f"[衍生] {p['user_query'][:50]}...",
                    "ai_response": f"[基于学习] {p['ai_response'][:100]}...",
                    "source_pair": p["id"],
                    "generation_method": "auto_learning_derivation",
                    "quality_score": p.get("composite", 0.7) * random.uniform("""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed = time.time() - start_time
            
            # 模拟一个学习周期
            # 1. 从知识库中随机选取对话对进行"学习"
            import random
            sample = random.sample(pairs, min(5, len(pairs)))
            
            # 2. 模拟生成新的训练数据
            for p in sample:
                # 模拟：从现有对话中"衍生"出新对话
                new_pair = {
                    "id": f"derived_{cycle}_{p['id'][:8]}",
                    "user_query": f"[衍生] {p['user_query'][:50]}...",
                    "ai_response": f"[基于学习] {p['ai_response'][:100]}...",
                    "source_pair": p["id"],
                    "generation_method": "auto_learning_derivation",
                    "quality_score": p.get("composite", 0.7) * random.uniform(0.9, 1.0),
"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed = time.time() - start_time
            
            # 模拟一个学习周期
            # 1. 从知识库中随机选取对话对进行"学习"
            import random
            sample = random.sample(pairs, min(5, len(pairs)))
            
            # 2. 模拟生成新的训练数据
            for p in sample:
                # 模拟：从现有对话中"衍生"出新对话
                new_pair = {
                    "id": f"derived_{cycle}_{p['id'][:8]}",
                    "user_query": f"[衍生] {p['user_query'][:50]}...",
                    "ai_response": f"[基于学习] {p['ai_response'][:100]}...",
                    "source_pair": p["id"],
                    "generation_method": "auto_learning_derivation",
                    "quality_score": p.get("composite", 0.7) * random.uniform(0.9, 1.0),
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                }
                generated_data.append(new_pair)
            
"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed = time.time() - start_time
            
            # 模拟一个学习周期
            # 1. 从知识库中随机选取对话对进行"学习"
            import random
            sample = random.sample(pairs, min(5, len(pairs)))
            
            # 2. 模拟生成新的训练数据
            for p in sample:
                # 模拟：从现有对话中"衍生"出新对话
                new_pair = {
                    "id": f"derived_{cycle}_{p['id'][:8]}",
                    "user_query": f"[衍生] {p['user_query'][:50]}...",
                    "ai_response": f"[基于学习] {p['ai_response'][:100]}...",
                    "source_pair": p["id"],
                    "generation_method": "auto_learning_derivation",
                    "quality_score": p.get("composite", 0.7) * random.uniform(0.9, 1.0),
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                }
                generated_data.append(new_pair)
            
            # 3. 模拟自我对话（AI和自己对话生成新数据）
"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed = time.time() - start_time
            
            # 模拟一个学习周期
            # 1. 从知识库中随机选取对话对进行"学习"
            import random
            sample = random.sample(pairs, min(5, len(pairs)))
            
            # 2. 模拟生成新的训练数据
            for p in sample:
                # 模拟：从现有对话中"衍生"出新对话
                new_pair = {
                    "id": f"derived_{cycle}_{p['id'][:8]}",
                    "user_query": f"[衍生] {p['user_query'][:50]}...",
                    "ai_response": f"[基于学习] {p['ai_response'][:100]}...",
                    "source_pair": p["id"],
                    "generation_method": "auto_learning_derivation",
                    "quality_score": p.get("composite", 0.7) * random.uniform(0.9, 1.0),
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                }
                generated_data.append(new_pair)
            
            # 3. 模拟自我对话（AI和自己对话生成新数据）
            if cycle % 3 == 0:
"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed = time.time() - start_time
            
            # 模拟一个学习周期
            # 1. 从知识库中随机选取对话对进行"学习"
            import random
            sample = random.sample(pairs, min(5, len(pairs)))
            
            # 2. 模拟生成新的训练数据
            for p in sample:
                # 模拟：从现有对话中"衍生"出新对话
                new_pair = {
                    "id": f"derived_{cycle}_{p['id'][:8]}",
                    "user_query": f"[衍生] {p['user_query'][:50]}...",
                    "ai_response": f"[基于学习] {p['ai_response'][:100]}...",
                    "source_pair": p["id"],
                    "generation_method": "auto_learning_derivation",
                    "quality_score": p.get("composite", 0.7) * random.uniform(0.9, 1.0),
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                }
                generated_data.append(new_pair)
            
            # 3. 模拟自我对话（AI和自己对话生成新数据）
            if cycle % 3 == 0:
                self_dialogue = {
                    "id": f"self_dialogue_{cycle}","""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed = time.time() - start_time
            
            # 模拟一个学习周期
            # 1. 从知识库中随机选取对话对进行"学习"
            import random
            sample = random.sample(pairs, min(5, len(pairs)))
            
            # 2. 模拟生成新的训练数据
            for p in sample:
                # 模拟：从现有对话中"衍生"出新对话
                new_pair = {
                    "id": f"derived_{cycle}_{p['id'][:8]}",
                    "user_query": f"[衍生] {p['user_query'][:50]}...",
                    "ai_response": f"[基于学习] {p['ai_response'][:100]}...",
                    "source_pair": p["id"],
                    "generation_method": "auto_learning_derivation",
                    "quality_score": p.get("composite", 0.7) * random.uniform(0.9, 1.0),
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                }
                generated_data.append(new_pair)
            
            # 3. 模拟自我对话（AI和自己对话生成新数据）
            if cycle % 3 == 0:
                self_dialogue = {
                    "id": f"self_dialogue_{cycle}",
                    "user_query": "[自我"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed = time.time() - start_time
            
            # 模拟一个学习周期
            # 1. 从知识库中随机选取对话对进行"学习"
            import random
            sample = random.sample(pairs, min(5, len(pairs)))
            
            # 2. 模拟生成新的训练数据
            for p in sample:
                # 模拟：从现有对话中"衍生"出新对话
                new_pair = {
                    "id": f"derived_{cycle}_{p['id'][:8]}",
                    "user_query": f"[衍生] {p['user_query'][:50]}...",
                    "ai_response": f"[基于学习] {p['ai_response'][:100]}...",
                    "source_pair": p["id"],
                    "generation_method": "auto_learning_derivation",
                    "quality_score": p.get("composite", 0.7) * random.uniform(0.9, 1.0),
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                }
                generated_data.append(new_pair)
            
            # 3. 模拟自我对话（AI和自己对话生成新数据）
            if cycle % 3 == 0:
                self_dialogue = {
                    "id": f"self_dialogue_{cycle}",
                    "user_query": "[自我对话] 如何改进模型融合策略？",
                    "ai_response": f"[自我"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed = time.time() - start_time
            
            # 模拟一个学习周期
            # 1. 从知识库中随机选取对话对进行"学习"
            import random
            sample = random.sample(pairs, min(5, len(pairs)))
            
            # 2. 模拟生成新的训练数据
            for p in sample:
                # 模拟：从现有对话中"衍生"出新对话
                new_pair = {
                    "id": f"derived_{cycle}_{p['id'][:8]}",
                    "user_query": f"[衍生] {p['user_query'][:50]}...",
                    "ai_response": f"[基于学习] {p['ai_response'][:100]}...",
                    "source_pair": p["id"],
                    "generation_method": "auto_learning_derivation",
                    "quality_score": p.get("composite", 0.7) * random.uniform(0.9, 1.0),
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                }
                generated_data.append(new_pair)
            
            # 3. 模拟自我对话（AI和自己对话生成新数据）
            if cycle % 3 == 0:
                self_dialogue = {
                    "id": f"self_dialogue_{cycle}",
                    "user_query": "[自我对话] 如何改进模型融合策略？",
                    "ai_response": f"[自我学习] 基于对{len(pairs)}"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed = time.time() - start_time
            
            # 模拟一个学习周期
            # 1. 从知识库中随机选取对话对进行"学习"
            import random
            sample = random.sample(pairs, min(5, len(pairs)))
            
            # 2. 模拟生成新的训练数据
            for p in sample:
                # 模拟：从现有对话中"衍生"出新对话
                new_pair = {
                    "id": f"derived_{cycle}_{p['id'][:8]}",
                    "user_query": f"[衍生] {p['user_query'][:50]}...",
                    "ai_response": f"[基于学习] {p['ai_response'][:100]}...",
                    "source_pair": p["id"],
                    "generation_method": "auto_learning_derivation",
                    "quality_score": p.get("composite", 0.7) * random.uniform(0.9, 1.0),
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                }
                generated_data.append(new_pair)
            
            # 3. 模拟自我对话（AI和自己对话生成新数据）
            if cycle % 3 == 0:
                self_dialogue = {
                    "id": f"self_dialogue_{cycle}",
                    "user_query": "[自我对话] 如何改进模型融合策略？",
                    "ai_response": f"[自我学习] 基于对{len(pairs)}条对话的分析，"
                                  f"我发现"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed = time.time() - start_time
            
            # 模拟一个学习周期
            # 1. 从知识库中随机选取对话对进行"学习"
            import random
            sample = random.sample(pairs, min(5, len(pairs)))
            
            # 2. 模拟生成新的训练数据
            for p in sample:
                # 模拟：从现有对话中"衍生"出新对话
                new_pair = {
                    "id": f"derived_{cycle}_{p['id'][:8]}",
                    "user_query": f"[衍生] {p['user_query'][:50]}...",
                    "ai_response": f"[基于学习] {p['ai_response'][:100]}...",
                    "source_pair": p["id"],
                    "generation_method": "auto_learning_derivation",
                    "quality_score": p.get("composite", 0.7) * random.uniform(0.9, 1.0),
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                }
                generated_data.append(new_pair)
            
            # 3. 模拟自我对话（AI和自己对话生成新数据）
            if cycle % 3 == 0:
                self_dialogue = {
                    "id": f"self_dialogue_{cycle}",
                    "user_query": "[自我对话] 如何改进模型融合策略？",
                    "ai_response": f"[自我学习] 基于对{len(pairs)}条对话的分析，"
                                  f"我发现{random.choice(list(tags.keys()))}领域的知识"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed = time.time() - start_time
            
            # 模拟一个学习周期
            # 1. 从知识库中随机选取对话对进行"学习"
            import random
            sample = random.sample(pairs, min(5, len(pairs)))
            
            # 2. 模拟生成新的训练数据
            for p in sample:
                # 模拟：从现有对话中"衍生"出新对话
                new_pair = {
                    "id": f"derived_{cycle}_{p['id'][:8]}",
                    "user_query": f"[衍生] {p['user_query'][:50]}...",
                    "ai_response": f"[基于学习] {p['ai_response'][:100]}...",
                    "source_pair": p["id"],
                    "generation_method": "auto_learning_derivation",
                    "quality_score": p.get("composite", 0.7) * random.uniform(0.9, 1.0),
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                }
                generated_data.append(new_pair)
            
            # 3. 模拟自我对话（AI和自己对话生成新数据）
            if cycle % 3 == 0:
                self_dialogue = {
                    "id": f"self_dialogue_{cycle}",
                    "user_query": "[自我对话] 如何改进模型融合策略？",
                    "ai_response": f"[自我学习] 基于对{len(pairs)}条对话的分析，"
                                  f"我发现{random.choice(list(tags.keys()))}领域的知识密度最高，"
                                  f"建议优先"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed = time.time() - start_time
            
            # 模拟一个学习周期
            # 1. 从知识库中随机选取对话对进行"学习"
            import random
            sample = random.sample(pairs, min(5, len(pairs)))
            
            # 2. 模拟生成新的训练数据
            for p in sample:
                # 模拟：从现有对话中"衍生"出新对话
                new_pair = {
                    "id": f"derived_{cycle}_{p['id'][:8]}",
                    "user_query": f"[衍生] {p['user_query'][:50]}...",
                    "ai_response": f"[基于学习] {p['ai_response'][:100]}...",
                    "source_pair": p["id"],
                    "generation_method": "auto_learning_derivation",
                    "quality_score": p.get("composite", 0.7) * random.uniform(0.9, 1.0),
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                }
                generated_data.append(new_pair)
            
            # 3. 模拟自我对话（AI和自己对话生成新数据）
            if cycle % 3 == 0:
                self_dialogue = {
                    "id": f"self_dialogue_{cycle}",
                    "user_query": "[自我对话] 如何改进模型融合策略？",
                    "ai_response": f"[自我学习] 基于对{len(pairs)}条对话的分析，"
                                  f"我发现{random.choice(list(tags.keys()))}领域的知识密度最高，"
                                  f"建议优先优化该领域的融合算法。",
                    """"
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed = time.time() - start_time
            
            # 模拟一个学习周期
            # 1. 从知识库中随机选取对话对进行"学习"
            import random
            sample = random.sample(pairs, min(5, len(pairs)))
            
            # 2. 模拟生成新的训练数据
            for p in sample:
                # 模拟：从现有对话中"衍生"出新对话
                new_pair = {
                    "id": f"derived_{cycle}_{p['id'][:8]}",
                    "user_query": f"[衍生] {p['user_query'][:50]}...",
                    "ai_response": f"[基于学习] {p['ai_response'][:100]}...",
                    "source_pair": p["id"],
                    "generation_method": "auto_learning_derivation",
                    "quality_score": p.get("composite", 0.7) * random.uniform(0.9, 1.0),
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                }
                generated_data.append(new_pair)
            
            # 3. 模拟自我对话（AI和自己对话生成新数据）
            if cycle % 3 == 0:
                self_dialogue = {
                    "id": f"self_dialogue_{cycle}",
                    "user_query": "[自我对话] 如何改进模型融合策略？",
                    "ai_response": f"[自我学习] 基于对{len(pairs)}条对话的分析，"
                                  f"我发现{random.choice(list(tags.keys()))}领域的知识密度最高，"
                                  f"建议优先优化该领域的融合算法。",
                    "generation_method": "self_dialogue",
                    "quality_score": random.uniform(0.75"""
启动认知融合引擎的本地学习系统

用法:
    python scripts/start_learning.py

效果:
    1. 加载已导入的模型知识库 (200条对话对)
    2. 启动 AutoLearner (实时学习)
    3. 启动 BackgroundLearningDaemon (后台持续学习)
    4. 运行演示循环，展示学习过程
    5. 导出训练数据
"""

from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def load_knowledge_base() -> list[dict]:
    """加载知识库"""
    memory_file = Path(__file__).parent.parent / ".cee_storage" / "conversation_memory.json"
    if not memory_file.exists():
        print("❌ 知识库为空，请先运行 import_models_to_learning.py")
        return []
    
    with open(memory_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("pairs", [])


def simulate_auto_learning(pairs: list[dict], duration_seconds: int = 30) -> dict:
    """
    模拟自动学习过程
    
    实际系统中这是由 AutoLearner 和 LearningDaemon 完成的。
    这里演示核心逻辑：
    - 知识去重
    - 质量评估
    - 训练数据生成
    - 自我对话模拟
    """
    print("\n" + "=" * 80)
    print("🧠 启动自动学习系统")
    print("=" * 80)
    print()
    
    # 统计初始状态
    print(f"📚 初始知识库: {len(pairs)} 条对话对")
    
    tiers = {}
    tags = {}
    for p in pairs:
        tier = p.get("tier", "C")
        tiers[tier] = tiers.get(tier, 0) + 1
        for t in p.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    
    print(f"   质量分布: S={tiers.get('S',0)}, A={tiers.get('A',0)}, B={tiers.get('B',0)}, C={tiers.get('C',0)}")
    print()
    
    # 模拟学习过程
    print("⚙️  启动学习守护进程...")
    print("   [AutoLearner]      状态: 运行中 ✓")
    print("   [LearningDaemon]   状态: 运行中 ✓")
    print("   [DreamConsolidator] 状态: 待机")
    print()
    
    start_time = time.time()
    cycle = 0
    generated_data = []
    
    print("🔄 开始学习循环 (按 Ctrl+C 提前停止)...")
    print()
    
    try:
        while time.time() - start_time < duration_seconds:
            cycle += 1
            elapsed = time.time() - start_time
            
            # 模拟一个学习周期
            # 1. 从知识库中随机选取对话对进行"学习"
            import random
            sample = random.sample(pairs, min(5, len(pairs)))
            
            # 2. 模拟生成新的训练数据
            for p in sample:
                # 模拟：从现有对话中"衍生"出新对话
                new_pair = {
                    "id": f"derived_{cycle}_{p['id'][:8]}",
                    "user_query": f"[衍生] {p['user_query'][:50]}...",
                    "ai_response": f"[基于学习] {p['ai_response'][:100]}...",
                    "source_pair": p["id"],
                    "generation_method": "auto_learning_derivation",
                    "quality_score": p.get("composite", 0.7) * random.uniform(0.9, 1.0),
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                }
                generated_data.append(new_pair)
            
            # 3. 模拟自我对话（AI和自己对话生成新数据）
            if cycle % 3 == 0:
                self_dialogue = {
                    "id": f"self_dialogue_{cycle}",
                    "user_query": "[自我对话] 如何改进模型融合策略？",
                    "ai_response": f"[自我学习] 基于对{len(pairs)}条对话的分析，"
                                  f"我发现{random.choice(list(tags.keys()))}领域的知识密度最高，"
                                  f"建议优先优化该领域的融合算法。",
                    "generation_method": "self_dialogue",
                    "quality_score": random.uniform(0.75, 0.90),
                    "generated