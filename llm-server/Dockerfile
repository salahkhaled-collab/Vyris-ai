# Vyris's own AI server. vLLM's official image, pinned to a stable release.
FROM vllm/vllm-openai:v0.32.0

# Model weights are cached here; mount a volume at this path so restarts
# don't re-download ~65 GB.
ENV HF_HOME=/models
COPY start.sh /usr/local/bin/vyris-llm-start
RUN chmod +x /usr/local/bin/vyris-llm-start

EXPOSE 8000
ENTRYPOINT ["/usr/local/bin/vyris-llm-start"]
