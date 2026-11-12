---
icon: lucide/settings
tags:
  - Settings
  - Providers
---

# Settings

Zotero → Edit → Settings → **PaperRouter**. Every setting has a default.

| Setting | Default | What it does |
| --- | --- | --- |
| **Language** | auto | English, 简体中文 or 繁體中文, or auto-detect. |
| **Embedding provider, key, model, base URL** | none | Enables embedding ranking. See [Providers](providers.md). *Test* checks the connection. |
| **LLM provider, key, model, base URL** | none | Enables LLM ranking. See [Providers](providers.md). |
| **Method** | embedding similarity | Chooses between embedding similarity and LLM zero-shot when both are set up. |
| **Cached embeddings** | | Shows the count. **Refresh** rebuilds it, **Clear** empties it. |
| **Ignore collections** | `inbox` | Collections whose name contains any of them are never suggested and are not used as evidence. |
| **Minimum confidence** | 0 (auto) | Default minimum confidence (0 to 100) in the dialog. |
| **Collections per paper** | 4 | Upper limit on pre-selected collections. |

Settings apply to the next ranking; no restart is needed.
