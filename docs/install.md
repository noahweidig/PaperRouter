---
icon: lucide/download
tags:
  - Getting started
  - Zotero
---

# Install

1. **Download** `paperrouter-<version>.xpi` from the [latest release](https://github.com/noahweidig/PaperRouter/releases/latest).

    !!! tip "Firefox"

        Right-click the link and choose **Save Link As…**. A plain click makes Firefox try to install it as a Firefox add-on.

2. In Zotero, open **Tools → Plugins**.
3. **Drag the .xpi into that window**, or click the gear :lucide-settings: → **Install Plugin From File…** and pick it.

Zotero checks for new versions automatically and installs them in place.

PaperRouter works as soon as it is installed. Offline ranking needs no key; add a provider later in [Settings](settings.md) if you want embedding or LLM ranking.

!!! note

    PaperRouter is based on the Tidy Up plugin. If Tidy Up is also installed, uninstall it first to avoid duplicate menus.

## Build from source

```bash
git clone https://github.com/noahweidig/PaperRouter.git
cd PaperRouter
npm ci
npm test
./scripts/build-xpi.sh   # writes dist/paperrouter-<version>.xpi
```
