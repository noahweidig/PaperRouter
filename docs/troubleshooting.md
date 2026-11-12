---
icon: lucide/life-buoy
tags:
  - Help
---

# Troubleshooting

??? question "No menu entry or toolbar button"

    Open Tools → Plugins. PaperRouter should be listed and enabled. If it says it is incompatible, [install the latest release](https://github.com/noahweidig/PaperRouter/releases/latest). Supported: Zotero 7 to 10.0.x.

??? question "Duplicate menus"

    The Tidy Up plugin it was based on is also installed. Uninstall it in Tools → Plugins.

??? question "An inbox collection is suggested for everything"

    Add its name, or a word in it, to **Ignore collections** in [Settings](settings.md). The default is `inbox`.

??? question "Suggestions look wrong for a small library"

    Offline mode learns from papers already filed. Collections with few or no papers have little to match on. File some papers by hand first, or try an embedding or LLM provider.

??? question "Test fails or says the base URL is not set"

    Check the provider, key and base URL in [Settings](settings.md). OpenAI and Ollama fall back to their default URL when it is empty; other providers need one.

??? question "Several small popups during an LLM batch"

    Update to 0.6.1 or later. Concurrent LLM calls now share one popup.

??? question "The progress dialog is unreadable in dark mode"

    Fixed in 0.6.1. Update.

??? question "Undo is missing"

    It shows only when there is a last filing to reverse, and only the last one is kept.

Still stuck? [Open an issue](https://github.com/noahweidig/PaperRouter/issues).
