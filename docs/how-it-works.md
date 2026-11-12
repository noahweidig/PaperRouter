---
icon: lucide/workflow
tags:
  - Ranking
  - Internals
---

# How it works

PaperRouter scores every collection for the selected paper, adjusts the scores, and shows the best.

## Offline ranking (default)

No key, no network. Each collection is profiled from the **titles, abstracts, tags and venues** of the papers already filed in it. A new paper is scored by:

- TF-IDF similarity to those profiles,
- its nearest already-filed neighbours, and
- a match against the collection name.

Matching is word-based with stopwords and light stemming. Chinese text is matched on character pairs. The paper's own tags, abstract and venue are used, not just its title, and its own entry is excluded when you re-classify an already-filed paper.

The index is cached, refreshed when items, tags or collections change, and warmed up shortly after startup.

## Embedding similarity (optional)

Calls an embedding API for the paper and for each collection, scores by vector angle, and applies IDF weighting and a depth and specificity penalty. Collection embeddings are cached; the cache can be refreshed or cleared in [Settings](settings.md).

## LLM zero-shot (optional)

Sends the paper's title and abstract plus your collection names in one prompt and parses the ranked answer with confidence scores.

If the offline ranker fails, the older similarity is used as a fallback.

## Adjustments

| Adjustment | Effect |
| --- | --- |
| **Ignore collections** | Collections whose name contains a listed word (default `inbox`) are never suggested, and papers filed only there are not used as evidence. |
| **Size damping** | Scores of collections far larger than the typical one are reduced, so a catch-all collection cannot win on size alone. |
| **Hierarchy** | A child collection is not suggested when its parent is already a strong match. |
| **Rejections** | Collections you reject for an item are blacklisted and down-ranked next time. |

## Confidence

Scores are relative to your library, so they are shown as High, Medium or Low rather than a percentage. The number stays in the tooltip.
