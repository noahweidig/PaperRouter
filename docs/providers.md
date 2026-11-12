---
icon: lucide/plug
tags:
  - Providers
  - Settings
---

# Providers

Offline ranking needs none of this. Set up a provider only if you want embedding or LLM ranking. The two sides are independent: configure embedding only, LLM only, or both.

Zotero → Edit → Settings → **PaperRouter**.

## Embedding

| Provider | Notes |
| --- | --- |
| OpenAI | Default base URL `https://api.openai.com/v1`. |
| Cohere | |
| Custom | Any OpenAI-compatible endpoint. |

## LLM

| Provider | Notes |
| --- | --- |
| OpenAI | |
| Anthropic (Claude) | |
| Gemini | |
| OpenRouter | |
| Cohere | |
| Custom | Any OpenAI-compatible endpoint. |

!!! tip "Run a model locally"

    Choose **Custom** and set the base URL to your Ollama server, for example `http://localhost:11434/v1`. Nothing then leaves your machine.

## Set up

1. Pick a provider.
2. Paste the API key.
3. Pick or type a model.
4. Click **Test**.
5. Click **Save**.

Each provider's key and model are saved separately, so switching providers does not overwrite what you set for another.
