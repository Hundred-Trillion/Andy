#!/bin/bash
# ==========================================
# ANDY v1 - Local vLLM Startup Script
# ==========================================
# Optimized for 2× RTX A6000 (96GB total VRAM)
#
# Run this from the project root: ~/Desktop/andy v0/
# Ensure you have conda activated: conda activate vllm-env

# ──────────────────────────────────────────
# MODEL SELECTION (uncomment ONE section)
# ──────────────────────────────────────────

# ── Option A: Qwen 72B GPTQ-Int4 (RECOMMENDED) ──
# Best quality for 96GB. ~36GB weights + ~56GB KV cache headroom.
MODEL_PATH="/home/doaid/vllm_env/LLMMODELS/queen"
MODEL_NAME="qwen72b"
NUM_GPUS=2
MAX_MODEL_LEN=16384    # 16K context — good for complex assemblies
MAX_NUM_SEQS=4         # 4 concurrent requests (CAD copilot is single-user)

# ── Option B: Qwen 9B (lightweight, fast) ──
# Use this if you need fast iteration or are debugging.
# MODEL_PATH="/home/doaid/vllm_env/LLMMODELS/Qwen9B"
# MODEL_NAME="qwen9b"
# NUM_GPUS=1
# MAX_MODEL_LEN=32768
# MAX_NUM_SEQS=8

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

/home/doaid/miniconda3/envs/vllm-env/bin/python -m vllm.entrypoints.openai.api_server \
  --model "$MODEL_PATH" \
  --served-model-name "$MODEL_NAME" \
  --tensor-parallel-size $NUM_GPUS \
  --port $PORT \
  --max-model-len $MAX_MODEL_LEN \
  --max-num-seqs $MAX_NUM_SEQS \
  --gpu-memory-utilization 0.92 \
  --enable-prefix-caching \
  --no-enable-log-requests
