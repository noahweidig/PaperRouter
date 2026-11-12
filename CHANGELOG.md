# Changelog

## 0.6.2 — 2026-11-12

### Changed

- New add-on icon (folder with arrow on a teal tile). The old one was a dark outline that vanished on dark backgrounds in the Plugins Manager.

## 0.6.1 — 2026-11-12

### Fixed

- The "Ranking…" popup was unreadable in dark mode (white text on white). It now follows the theme.
- Batch LLM calls opened one popup each and stacked off-screen. They now share one popup showing done/total.

## 0.6.0 — 2026-11-12

### Added

- **Inbox triage.** In batch mode, when a selected paper sits in an inbox-style collection (see "Ignore collections"), a "Remove from inbox when filed" option (on by default) takes it out of the inbox once it has been filed somewhere. Inbox memberships no longer count toward the per-paper limit while that option is on.
- **Undo.** Right-click an item, then "Undo last PaperRouter filing" (shown only when there is something to undo). It reverses both additions and removals, in one transaction, and survives a Zotero restart. Works for batch and single-paper filing.
- **Why a collection was suggested.** Hover a row or chip to see the words that matched and the most similar papers already filed there.
- Confidence shown as High / Medium / Low (number kept in the tooltip) instead of a raw percentage, since scores are relative to your library.
- Outline icons in the dialogs and on the item context menu, in the same style as the toolbar icon; they follow the theme color.

## 0.5.1 — 2026-11-12

### Fixed

- **Inbox collections swallowed every suggestion.** A catch-all collection (e.g. "AI Inbox") holds a large share of the library, so it won the nearest-neighbour vote for almost any paper and scored 100%. Two changes:
  - New setting "Ignore collections" (default `inbox`): collections whose name contains any listed word are never suggested, and papers filed only there are not used as evidence.
  - Scores are damped for collections far larger than the typical one, so size alone no longer wins.

## 0.5.0 — 2026-11-12

### Added

- **Offline ranking that learns from your library (no API key).** Each collection is profiled from the titles, abstracts, tags and venues of the papers already filed in it. A new paper is scored by TF-IDF similarity to those profiles, by its nearest already-filed neighbours, and by collection-name match. This replaces the old letter-count comparison against the collection name.
- Word-based matching with stopwords and light stemming; Chinese text is matched on character pairs.
- The new paper's tags, abstract and venue are used, not just its title. Its own entry is excluded when you re-classify an already-filed paper.
- The index is cached, refreshed automatically when items, tags or collections change, and warmed up shortly after startup.

- **Batch mode.** Select several papers and click the button: one window lists every paper with its top 5 suggestions as toggle chips (best match pre-selected). Filing happens in one transaction and only adds, never removes, memberships. Ranking 100 papers against 300 collections takes about 0.3 s in a mock test. Rejected auto-picks still feed the per-item blacklist.

### Changed

- Initial selection is now simply the highest-confidence collections. The internal/external quota that could pick weaker matches is gone (the labels still show).
- The startup notification only appears when an embedding API is configured.
- Embedding and LLM modes are unchanged. If the local ranker fails, the old similarity is used as a fallback.

## 0.4.0 — 2026-11-12

### Changed

- New toolbar icon (folder with an arrow) drawn in the Zotero 20px outline style; uses Zotero's secondary icon color, so it matches the neighbouring buttons in light and dark mode.

### Fixed

- Startup error "can't access property indexOf, baseUrl is null" when an embedding provider and key were set but the base URL was empty. OpenAI and Ollama now fall back to their default URL; other providers get a clear "base URL is not set" message.

## 0.3.0 — 2026-11-12

### Changed

- Redesigned collection picker: theme-aware (follows Zotero dark mode), "Already in" and "Best matches" sections above the tree, confidence bars, live search, selection counter, keyboard shortcuts (Enter, Esc, `/`).
- Faster dialog open: collection types are resolved once in parallel instead of two serial DB reads per collection.
- Saving shows a toast instead of a modal alert.
- Removing an existing collection membership no longer blacklists it; only rejecting an auto-suggestion does.

### Added

- Setting for the default minimum confidence (0 = auto).

### Fixed

- Toolbar icon was black in dark mode; it now follows the theme color.

## 0.2.2 — 2026-09-18

### Changed

- Extend the declared Zotero compatibility range to 10.0.x in the plugin manifest and the new 0.2.2 update entry, keeping Zotero 7 as the minimum version.
- No routing or UI behavior changes. The maintainer reported successful manual testing on Zotero 10.

## 0.2.1 — 2026-05-26

Bug fix.

### Fixed

- **Classifying a sub-item now works.** Selecting a child attachment (Preprint PDF, Snapshot) or note and clicking classify used to give inaccurate suggestions and fail with a foreign-key error (child items can't belong to a collection). The selection now resolves to its top-level paper before classifying and filing, so clicking a sub-item behaves the same as clicking the item itself.

## 0.2.0 — 2026-05-17

First polished release. UI refinements, infrastructure work, and the start of auto-update support.

### New

- **Auto-update channel.** Zotero now checks for new versions automatically. Future releases install in-place from the Add-ons panel without re-downloading the xpi manually.

### Improved

- Suggestion dialog: tighter selection behavior, more predictable timing during the initial recommendation pass.
- README: project rationale, version/license badges, public roadmap.

### Internal

- Test suite runs on every pull request via GitHub Actions.

See [README → Roadmap](README.md#roadmap) for what is planned next.

## 0.0.2 — 2026-05-16

Pre-release audit fixes. **Upgrade from 0.0.1.x.**

- Embedding `baseUrl` no longer defaults to a third-party proxy. New default is `https://api.openai.com/v1`.
- `testMode.enabled` ships off. Previously capped background embedding refresh to 3 collections.

Known limitation: `applications.zotero.update_url` still points at a Zotero CDN sample (kept for Zotero 9 install compatibility); auto-update is not wired up. Will replace with a self-hosted `updates.json` next release.

## 0.0.1.1 — 2026-05-12

Fix Zotero 9 install. The 0.0.1 xpi was missing the
`applications.zotero.update_url` field, which Zotero 9 needs to accept the
install; restoring it makes the plugin install cleanly on 9.

## 0.0.1 — 2026-05-12

First public release. Installs on Zotero 7 and 8; superseded by 0.0.1.1
for Zotero 9.

- Two ranking modes: embedding similarity, LLM zero-shot.
- Confidence score per collection; rejected ones are blacklisted next run.
- Hierarchy-aware. Dialog has a keyword filter and threshold slider.
- Providers: OpenAI, Anthropic, Gemini, OpenRouter, Cohere, OpenAI-compatible.
- UI: English, 简体中文, 繁體中文.
