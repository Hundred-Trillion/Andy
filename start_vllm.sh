#!/bin/bash
# ==========================================
# ANDY v1 - Local vLLM Startup Script
# ==========================================
# Optimized for 2× RTX A6000 (96GB total VRAM)
#
# Run this from the project root: ~/Desktop/andy v0/
# Ensure you have conda activated: conda activate vllm-env

# ──────────────────────────────────────────
# LOAD CONFIG FROM .env
# ──────────────────────────────────────────
if [ -f .env ]; then
  VLLM_MODEL_PATH=$(grep -E "^VLLM_MODEL_PATH=" .env | cut -d'=' -f2-)
  VLLM_PYTHON_PATH=$(grep -E "^VLLM_PYTHON_PATH=" .env | cut -d'=' -f2-)
fi

# ──────────────────────────────────────────
# MODEL SELECTION (uncomment ONE section)
# ──────────────────────────────────────────

# ── Option A: Qwen 72B GPTQ-Int4 (RECOMMENDED) ──
# Best quality for 96GB. ~36GB weights + ~56GB KV cache headroom.
MODEL_PATH="${VLLM_MODEL_PATH:-/path/to/your/Qwen2.5-72B-Instruct-GPTQ-Int4}"
MODEL_NAME="qwen72b"
NUM_GPUS=2
MAX_MODEL_LEN=16384    # 16K context — good for complex assemblies
MAX_NUM_SEQS=4         # 4 concurrent requests (CAD copilot is single-user)

# ── Option B: Qwen 9B (lightweight, fast) ──
# Use this if you need fast iteration or are debugging.
# MODEL_PATH="${VLLM_MODEL_PATH:-/path/to/your/Qwen2.5-14B-Instruct-GPTQ-Int4}"
# MODEL_NAME="qwen9b"
# NUM_GPUS=1
# MAX_MODEL_LEN=32768
# MAX_NUM_SEQS=8

PYTHON_EXEC="${VLLM_PYTHON_PATH:-python}"

# ──────────────────────────────────────────
# vLLM SERVER CONFIGURATION
# ──────────────────────────────────────────
PORT=8080

echo "╔══════════════════════════════════════════════╗"
echo "║  ANDY v1 — vLLM Server                      ║"
echo "╠══════════════════════════════════════════════╣"
echo "║  Model:     $MODEL_NAME"
echo "║  Path:      $MODEL_PATH"
echo "║  GPUs:      $NUM_GPUS × A6000 (96GB total)"
echo "║  Context:   $MAX_MODEL_LEN tokens"
echo "║  Concur:    $MAX_NUM_SEQS sequences"
echo "║  Port:      $PORT"
echo "╚══════════════════════════════════════════════╝"
echo ""

export VLLM_USE_V1=0

"$PYTHON_EXEC" -m vllm.entrypoints.openai.api_server \
  --model "$MODEL_PATH" \
  --served-model-name "$MODEL_NAME" \
  --tensor-parallel-size $NUM_GPUS \
  --port $PORT \
  --max-model-len $MAX_MODEL_LEN \
  --max-num-seqs $MAX_NUM_SEQS \
  --gpu-memory-utilization 0.92 \
  --enable-prefix-caching \
  --no-enable-log-requests
