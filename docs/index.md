---
icon: lucide/folder-down
hide:
  - navigation
  - toc
  - tags
---

<div class="pr-hero" markdown>

<div class="pr-hero__badge" markdown>:lucide-folder-down:</div>

# Where does this paper go?<br>One right-click.

<p class="pr-hero__lede">PaperRouter ranks the collections in your Zotero library for each paper, with a confidence score, and files a whole batch at once. It works offline with no API key.</p>

[:lucide-download: Download the .xpi](https://github.com/noahweidig/PaperRouter/releases/latest){ .md-button .md-button--primary }
[:lucide-book-open: Install guide](install.md){ .md-button }
[:octicons-mark-github-16: GitHub](https://github.com/noahweidig/PaperRouter){ .md-button }

<div class="pr-stats">
  <div><strong>0</strong><small>API keys needed</small></div>
  <div><strong>3</strong><small>ranking modes</small></div>
  <div><strong>1</strong><small>click to undo</small></div>
</div>

<div class="pr-chips">
  <span>Offline</span><span>OpenAI</span><span>Anthropic</span><span>Gemini</span><span>OpenRouter</span><span>Cohere</span><span>Any OpenAI-compatible endpoint</span>
</div>

</div>

<div class="grid cards" markdown>

- :lucide-list-ordered:{ .lg .middle } **Ranked suggestions**

    ---

    Right-click a paper and get your collections ordered by fit, each with a High, Medium or Low confidence. Hover a row to see why it was suggested.

    [:lucide-arrow-right: Use it](usage.md)

- :lucide-layers:{ .lg .middle } **Batch mode**

    ---

    Select many papers. One window lists each with its top 5 suggestions as toggle chips, best match pre-selected. Filing is one transaction and only adds.

    [:lucide-arrow-right: Batch mode and undo](batch.md)

- :lucide-undo-2:{ .lg .middle } **Undo**

    ---

    Right-click, **Undo last PaperRouter filing**. It reverses additions and removals together and survives a Zotero restart.

    [:lucide-arrow-right: Undo](batch.md#undo)

- :lucide-brain:{ .lg .middle } **Learns from your library**

    ---

    Offline mode profiles each collection from the titles, abstracts, tags and venues of the papers already in it. Collections you reject are down-ranked next time.

    [:lucide-arrow-right: How it works](how-it-works.md)

- :lucide-plug:{ .lg .middle } **Bring your own model**

    ---

    Optional embedding similarity or LLM zero-shot ranking through OpenAI, Anthropic, Gemini, OpenRouter, Cohere or any OpenAI-compatible endpoint.

    [:lucide-arrow-right: Providers](providers.md)

- :lucide-lock:{ .lg .middle } **Private by default**

    ---

    Offline mode sends nothing anywhere. Embedding and LLM modes send only what you enable, to the provider you choose.

    [:lucide-arrow-right: Privacy](privacy.md)

</div>

## The ranking pipeline

```mermaid
flowchart LR
  A[Paper] --> B{Mode}
  B -->|default| C[Offline index]
  B -->|optional| D[Embeddings]
  B -->|optional| E[LLM zero-shot]
  C --> F[Filters]
  D --> F
  E --> F
  F --> G[Confidence tiers]
  G --> H[Pick and file]
  H --> I[Undo]
```

Requires Zotero 7 to 10.0.x on macOS, Windows or Linux. Free and open source.
