#!/usr/bin/env bash
# Vyris's own AI server: the same open model Groq serves to Vyris today
# (openai/gpt-oss-120b), behind the same OpenAI-style API, on a GPU we rent.
#
# Needs one 80 GB GPU (H100 or A100 80GB). Env:
#   VYRIS_LLM_API_KEY  required. The key Vyris sends (PYTHON_LLM_API_KEY). Long and random.
#   VYRIS_LLM_MODEL    optional. Default openai/gpt-oss-120b. openai/gpt-oss-20b fits a 24-48 GB GPU.
#   VYRIS_LLM_MAX_LEN  optional. Max tokens per conversation (prompt + reply). Default 32768.
set -euo pipefail

if [ -z "${VYRIS_LLM_API_KEY:-}" ] || [ "${#VYRIS_LLM_API_KEY}" -lt 32 ]; then
  echo "VYRIS_LLM_API_KEY must be set and at least 32 characters. Refusing to start an open server." >&2
  exit 1
fi

MODEL="${VYRIS_LLM_MODEL:-openai/gpt-oss-120b}"

exec vllm serve "$MODEL" \
  --served-model-name "$MODEL" \
  --host 0.0.0.0 \
  --port 8000 \
  --api-key "$VYRIS_LLM_API_KEY" \
  --enable-auto-tool-choice \
  --tool-call-parser openai \
  --max-model-len "${VYRIS_LLM_MAX_LEN:-32768}" \
  --gpu-memory-utilization 0.92
