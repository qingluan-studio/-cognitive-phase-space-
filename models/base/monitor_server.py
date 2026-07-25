# -*- coding: utf-8 -*-
"""
monitor_server.py —— 训练监控 Web 服务器

启动一个轻量级 HTTP 服务器，展示训练监控仪表盘。
纯标准库实现，不需要任何额外依赖。
"""

import os
import sys
import json
import time
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from base.training_monitor import TrainingMonitor, MonitorData


class MonitorHandler(BaseHTTPRequestHandler):
    """HTTP 请求处理器"""

    monitor: TrainingMonitor = None

    def log_message(self, format, *args):
        pass  # 禁用默认日志

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == "/" or parsed.path == "/index.html":
            self._send_html()
        elif parsed.path == "/api/status":
            self._send_json(self.monitor.get_snapshot())
        elif parsed.path == "/api/summary":
            self._send_json(self.monitor.get_summary())
        elif parsed.path == "/api/logs":
            self._send_json({"logs": self.monitor.data.logs})
        else:
            self.send_error(404)

    def _send_html(self):
        html = self._build_dashboard()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(html.encode("utf-8"))

    def _send_json(self, data):
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False, default=str).encode("utf-8"))

    def _build_dashboard(self) -> str:
        return """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🎵 训练监控仪表盘</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
    color: #e0e0e0;
    min-height: 100vh;
    padding: 20px;
}
.header {
    text-align: center;
    margin-bottom: 20px;
}
.header h1 {
    font-size: 28px;
    background: linear-gradient(90deg, #00d2ff, #3a7bd5, #00d2ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}
.status-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    margin-top: 8px;
}
.status-training { background: #10b981; color: #fff; }
.status-paused { background: #f59e0b; color: #fff; }
.status-completed { background: #3b82f6; color: #fff; }
.status-idle { background: #6b7280; color: #fff; }

.grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 16px;
    max-width: 1400px;
    margin: 0 auto;
}
.card {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 20px;
    transition: transform 0.2s;
}
.card:hover { transform: translateY(-2px); }
.card h2 {
    font-size: 14px;
    color: #9ca3af;
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
}
.card .big-number {
    font-size: 36px;
    font-weight: bold;
    background: linear-gradient(135deg, #60a5fa, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}
.card .sub-label { font-size: 12px; color: #6b7280; margin-top: 4px; }

.progress-bar {
    width: 100%;
    height: 20px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    overflow: hidden;
    margin-top: 8px;
}
.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #059669, #10b981);
    border-radius: 10px;
    transition: width 0.5s ease;
    position: relative;
}
.progress-fill::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    animation: shimmer 2s infinite;
}
@keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
}

.chart-container {
    height: 200px;
    position: relative;
    margin-top: 8px;
}
canvas { width: 100%; height: 100%; }

.log-box {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    padding: 12px;
    max-height: 300px;
    overflow-y: auto;
    font-family: monospace;
    font-size: 12px;
    line-height: 1.6;
}
.log-box div { padding: 2px 0; }

.expert-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 8px;
    margin-top: 8px;
}
.expert-item {
    background: rgba(255, 255, 255, 0.05);
    padding: 8px;
    border-radius: 6px;
    text-align: center;
    font-size: 11px;
    transition: all 0.3s;
}
.expert-item.active {
    background: rgba(96, 165, 250, 0.3);
    border: 1px solid #60a5fa;
}
.expert-item .name { font-weight: bold; margin-bottom: 4px; }
.expert-item .weight { font-size: 16px; color: #60a5fa; }

.footer {
    text-align: center;
    margin-top: 20px;
    color: #6b7280;
    font-size: 12px;
}

.two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 8px;
}
.metric-item { text-align: center; }
.metric-item .value { font-size: 20px; font-weight: bold; color: #a78bfa; }
.metric-item .label { font-size: 11px; color: #6b7280; margin-top: 2px; }
</style>
</head>
<body>
<div class="header">
    <h1>🎵 训练监控仪表盘</h1>
    <span class="status-badge status-idle" id="status-badge">等待中</span>
</div>

<div class="grid">
    <div class="card">
        <h2>模型信息</h2>
        <div class="big-number" id="model-name">-</div>
        <div class="sub-label" id="model-params">参数量: -</div>
        <div class="two-col">
            <div class="metric-item">
                <div class="value" id="epoch-info">-</div>
                <div class="label">Epoch</div>
            </div>
            <div class="metric-item">
                <div class="value" id="step-info">-</div>
                <div class="label">Step</div>
            </div>
        </div>
    </div>

    <div class="card">
        <h2>训练进度</h2>
        <div class="big-number" id="progress-text">0%</div>
        <div class="progress-bar">
            <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
        </div>
        <div class="two-col">
            <div class="metric-item">
                <div class="value" id="elapsed">-</div>
                <div class="label">已用时间</div>
            </div>
            <div class="metric-item">
                <div class="value" id="eta">-</div>
                <div class="label">预计剩余</div>
            </div>
        </div>
    </div>

    <div class="card">
        <h2>Loss 曲线</h2>
        <div class="chart-container">
            <canvas id="loss-chart"></canvas>
        </div>
        <div class="two-col">
            <div class="metric-item">
                <div class="value" id="train-loss">-</div>
                <div class="label">Train Loss</div>
            </div>
            <div class="metric-item">
                <div class="value" id="val-loss">-</div>
                <div class="label">Val Loss</div>
            </div>
        </div>
    </div>

    <div class="card">
        <h2>PPL & 速度</h2>
        <div class="chart-container">
            <canvas id="ppl-chart"></canvas>
        </div>
        <div class="two-col">
            <div class="metric-item">
                <div class="value" id="ppl">-</div>
                <div class="label">Perplexity</div>
            </div>
            <div class="metric-item">
                <div class="value" id="speed">-</div>
                <div class="label">samples/s</div>
            </div>
        </div>
    </div>

    <div class="card">
        <h2>⚡ 虚拟能量监控</h2>
        <div class="chart-container">
            <canvas id="energy-chart"></canvas>
        </div>
        <div class="two-col">
            <div class="metric-item">
                <div class="value" id="energy-consumed">-</div>
                <div class="label">已消耗</div>
            </div>
            <div class="metric-item">
                <div class="value" id="energy-remaining">-</div>
                <div class="label">剩余</div>
            </div>
        </div>
    </div>

    <div class="card">
        <h2>🤖 专家激活（MoE）</h2>
        <div class="expert-grid" id="expert-grid">
            <div class="expert-item"><div class="name">加载中...</div></div>
        </div>
    </div>

    <div class="card" style="grid-column: 1 / -1;">
        <h2>📝 训练日志</h2>
        <div class="log-box" id="log-box"></div>
    </div>
</div>

<div class="footer">
    合鸣训练监控 · 虚拟电驱动 · 不花一分钱 🎵
</div>

<script>
let lossData = [];
let pplData = [];
let energyData = [];

async function fetchStatus() {
    try {
        const resp = await fetch('/api/status');
        const data = await resp.json();
        updateDashboard(data);
    } catch(e) {
        console.error('获取数据失败', e);
    }
}

function updateDashboard(d) {
    // 状态
    const badge = document.getElementById('status-badge');
    const statusMap = {
        'training': ['训练中', 'status-training'],
        'paused': ['已暂停', 'status-paused'],
        'completed': ['已完成', 'status-completed'],
        'idle': ['等待中', 'status-idle'],
    };
    const [statusText, statusClass] = statusMap[d.status] || [d.status, 'status-idle'];
    badge.textContent = statusText;
    badge.className = 'status-badge ' + statusClass;

    // 模型信息
    document.getElementById('model-name').textContent = d.model_name || '未命名模型';
    document.getElementById('model-params').textContent = '参数量: ' + (d.total_params || '-');
    document.getElementById('epoch-info').textContent = d.current_epoch + '/' + d.total_epochs;
    document.getElementById('step-info').textContent = d.current_step + '/' + d.total_steps;

    // 进度
    const pct = (d.overall_progress * 100).toFixed(1);
    document.getElementById('progress-text').textContent = pct + '%';
    document.getElementById('progress-fill').style.width = pct + '%';

    // 时间
    document.getElementById('elapsed').textContent = formatTime(d.elapsed_time);
    document.getElementById('eta').textContent = formatTime(d.eta);

    // Loss
    document.getElementById('train-loss').textContent = d.train_loss ? d.train_loss.toFixed(4) : '-';
    document.getElementById('val-loss').textContent = d.val_loss ? d.val_loss.toFixed(4) : '-';

    if (d.loss_history && d.loss_history.length > 0) {
        lossData = d.loss_history.slice(-200);
        drawChart('loss-chart', lossData, '#60a5fa');
    }

    // PPL
    document.getElementById('ppl').textContent = d.perplexity ? d.perplexity.toFixed(2) : '-';
    document.getElementById('speed').textContent = d.samples_per_second ? d.samples_per_second.toFixed(1) : '-';

    if (d.ppl_history && d.ppl_history.length > 0) {
        pplData = d.ppl_history.slice(-200);
        drawChart('ppl-chart', pplData, '#a78bfa');
    }

    // 能量
    document.getElementById('energy-consumed').textContent = d.energy_consumed.toFixed(0);
    document.getElementById('energy-remaining').textContent = d.energy_remaining.toFixed(0);

    if (d.energy_history && d.energy_history.length > 0) {
        energyData = d.energy_history.slice(-200);
        drawChart('energy-chart', energyData, '#fbbf24');
    }

    // 专家激活
    updateExperts(d.gating_stats || {});

    // 日志
    updateLogs(d.logs || []);
}

function updateExperts(gating) {
    const grid = document.getElementById('expert-grid');
    const entries = Object.entries(gating);
    if (entries.length === 0) {
        grid.innerHTML = '<div class="expert-item"><div class="name">暂无数据</div></div>';
        return;
    }

    const maxVal = Math.max(...entries.map(e => e[1]), 1);
    grid.innerHTML = entries
        .sort((a, b) => b[1] - a[1])
        .map(([name, weight]) => {
            const pct = (weight / maxVal * 100).toFixed(0);
            const active = weight > maxVal * 0.3 ? 'active' : '';
            return '<div class="expert-item ' + active + '">' +
                   '<div class="name">' + name + '</div>' +
                   '<div class="weight">' + pct + '%</div>' +
                   '</div>';
        }).join('');
}

function updateLogs(logs) {
    const box = document.getElementById('log-box');
    const current = box.textContent;
    const newLogs = logs.slice(-50).join('\\n');
    box.innerHTML = logs.slice(-50).map(l => '<div>' + l + '</div>').join('');
    box.scrollTop = box.scrollHeight;
}

function drawChart(canvasId, data, color) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.offsetWidth * 2;
    const h = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    const padding = 20;

    if (data.length < 2) return;

    const minVal = Math.min(...data) * 0.9;
    const maxVal = Math.max(...data) * 1.1;
    const range = maxVal - minVal || 1;

    ctx.clearRect(0, 0, width, height);

    // 网格线
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding + (height - padding * 2) * (i / 4);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }

    // 曲线
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const step = (width - padding * 2) / (data.length - 1);
    data.forEach((val, i) => {
        const x = padding + i * step;
        const y = padding + (height - padding * 2) * (1 - (val - minVal) / range);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 渐变填充
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, color + '40');
    gradient.addColorStop(1, color + '00');
    ctx.fillStyle = gradient;
    ctx.lineTo(width - padding, height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();
    ctx.fill();
}

function formatTime(seconds) {
    if (!seconds || seconds <= 0) return '-';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (m > 60) {
        const h = Math.floor(m / 60);
        return h + 'h ' + (m % 60) + 'm';
    }
    return m + 'm ' + s + 's';
}

// 每 2 秒刷新一次
fetchStatus();
setInterval(fetchStatus, 2000);
</script>
</body>
</html>"""


class MonitorServer:
    """监控服务器"""

    def __init__(self, monitor: TrainingMonitor, host: str = "0.0.0.0", port: int = 8080):
        self.monitor = monitor
        self.host = host
        self.port = port
        self._server = None
        self._thread = None

    def start(self):
        """启动服务器（后台线程）"""
        handler = type("MonitorHandler", (MonitorHandler,), {"monitor": self.monitor})
        self._server = HTTPServer((self.host, self.port), handler)
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)
        self._thread.start()
        print(f"[MonitorServer] 监控仪表盘已启动: http://{self.host}:{self.port}")
        return self

    def stop(self):
        """停止服务器"""
        if self._server:
            self._server.shutdown()
            self._server = None

    def wait(self):
        """等待（阻塞模式）"""
        if self._thread:
            self._thread.join()
