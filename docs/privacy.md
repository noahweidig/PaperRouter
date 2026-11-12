---
icon: lucide/lock
tags:
  - Privacy
  - Providers
---

# Privacy and data

Your library is read locally. There are no accounts and no analytics.

| Mode | Leaves your computer | Goes to |
| --- | --- | --- |
| **Offline** (default) | Nothing | nowhere |
| **Embedding** | Paper title, and for each collection its name plus the titles and abstracts (first 100 characters) of papers in it | The embedding provider you configured |
| **LLM zero-shot** | Paper title and abstract, and your collection names | The LLM provider you configured |

With a **Custom** endpoint on your own machine, such as Ollama, requests stay local.

API keys are stored in Zotero's preferences on your computer and sent only to the provider they belong to.

Filing history for [undo](batch.md#undo) is stored locally.

!!! tip

    Stay fully offline by leaving both provider sections empty.
