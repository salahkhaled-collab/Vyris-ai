# Vyris's own AI server

Vyris talks to its AI through one OpenAI-style endpoint, set by three Vercel
environment variables:

| Variable | Today (Groq) | Own server |
|---|---|---|
| `PYTHON_LLM_URL` | `https://api.groq.com/openai/v1/chat/completions` | `https://<pod-id>-8000.proxy.runpod.net/v1/chat/completions` |
| `PYTHON_LLM_API_KEY` | Groq key | the `VYRIS_LLM_API_KEY` you choose below |
| `PYTHON_LLM_MODEL` | `openai/gpt-oss-120b` | `openai/gpt-oss-120b` (same model) |

This folder runs the **same model Groq serves to Vyris** (`openai/gpt-oss-120b`)
on a GPU Vyris rents, with [vLLM](https://docs.vllm.ai) (the open-source
inference server) providing the same API: chat, tool calling (the
assistant's actions), JSON replies, and an API key. No app code changes; you
switch by changing the three variables, and switch back the same way.

What it does **not** copy: Groq's own chips. Replies will be slower than on
Groq (normal GPU speed), still well inside Vyris's 45-second limit.

## Cost (checked November 2026, RunPod)

| GPU | Model | Price | Always on, per month |
|---|---|---|---|
| H100 PCIe 80 GB | `openai/gpt-oss-120b` (same as now) | $2.89/hr | about $2,100 |
| A100 80 GB | `openai/gpt-oss-120b` | $2.09/hr | about $1,500 |
| L40S 48 GB | `openai/gpt-oss-20b` (smaller, weaker) | $1.09/hr | about $800 |

Stopping the pod stops the charge (storage is a few dollars a month), but
while it's stopped Vyris has no AI. Check current prices before starting.

## Set it up (about 30 minutes, most of it the first download)

1. **Make a key.** Long and random, at least 32 characters:
   `openssl rand -hex 32` (or any password generator). This is
   `VYRIS_LLM_API_KEY`. Keep it secret; anyone with it can use your GPU.
2. **RunPod account.** Sign up at runpod.io and add credit.
3. **Network volume** (so restarts don't re-download about 65 GB):
   Storage → New Network Volume, 100 GB, same region as the GPU you'll pick.
4. **Deploy a pod.** Pods → Deploy:
   - GPU: H100 80 GB (or A100 80 GB).
   - Template: *Custom*. Container image: `vllm/vllm-openai:v0.32.0`.
   - Container start command (the image already runs `vllm serve`, so this
     is only its arguments; put your key where it says):

     ```
     openai/gpt-oss-120b --served-model-name openai/gpt-oss-120b --host 0.0.0.0 --port 8000 --api-key <YOUR_KEY> --enable-auto-tool-choice --tool-call-parser openai --max-model-len 32768 --gpu-memory-utilization 0.92
     ```

     The key sits in your RunPod settings, visible only to your account.
     (Alternative: build this folder's `Dockerfile`, push it to a registry,
     and run it with env `VYRIS_LLM_API_KEY`; `start.sh` refuses to start
     without a key of at least 32 characters.)
   - Env: `HF_HOME=/models`. Attach the network volume at `/models`.
   - Expose HTTP port `8000`.
5. **Wait for "Application startup complete"** in the pod logs (first start
   downloads the model: 10–20 minutes).
6. **Test it before Vyris uses it.** From the repo, on your computer:

   ```powershell
   $env:PYTHON_LLM_URL="https://<pod-id>-8000.proxy.runpod.net/v1/chat/completions"
   $env:PYTHON_LLM_API_KEY="<your key>"
   $env:PYTHON_LLM_MODEL="openai/gpt-oss-120b"
   node llm-server/smoke.mjs
   ```

   It checks: a wrong key is rejected, plain replies, tool calls with valid
   arguments, continuing after a tool result, Arabic replies, and JSON
   replies (inbox sorting). **Only switch if every line says PASS.**
7. **Switch Vyris.** Vercel → vyris → Settings → Environment Variables:
   set the three variables from the table above (Production), then
   redeploy. Try the assistant, Summarize on an email, and Re-prioritize.

## Switch back

Put the Groq values back in the three variables and redeploy. Keep the Groq
key saved somewhere for exactly this.

## Notes

- **One key, one server.** vLLM checks a single key. Rotate it by changing the
  pod secret and `PYTHON_LLM_API_KEY` together.
- **Rate limits** are Vyris's own (per user, in the app); the GPU itself has
  no daily cap, only how fast it can answer. One H100 handles many Vyris users
  at once (vLLM batches requests).
- **Inbox sorting never depends on this server:** if it's down, Vyris sorts
  with its built-in rules (PR #46).
- **Privacy:** with this server, email text sent to the AI stays on a machine
  Vyris controls instead of going to Groq.
