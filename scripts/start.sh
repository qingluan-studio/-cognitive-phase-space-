#!/bin/bash
# CEE 认知涌现引擎 — 一键启动脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "============================================"
echo "  CEE 认知涌现引擎 v1.0.0"
echo "  Cognitive Emergence Engine"
echo "============================================"
echo ""

cd "$PROJECT_DIR"

if [ ! -d ".venv" ]; then
    echo "[1/3] Creating virtual environment..."
    python3 -m venv .venv
fi

echo "[2/3] Installing dependencies..."
.venv/bin/pip install -e ".[all]" -q

echo "[3/3] Starting CEE server on port 8899..."
echo ""
echo "  API:     http://localhost:8899/api/v1"
echo "  Health:  http://localhost:8899/api/v1/health"
echo "  Docs:    http://localhost:8899/docs"
echo ""

.venv/bin/cee-serve
