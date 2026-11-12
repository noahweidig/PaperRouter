---
icon: lucide/layers
tags:
  - Batch
  - Undo
  - Ranking
---

# Batch mode and undo

## Batch mode

1. Select several papers. ++ctrl+a++ / ++cmd+a++ selects a whole collection.
2. Click the PaperRouter toolbar button.
3. One window lists every paper with its top 5 suggestions as toggle chips. The best match is pre-selected.
4. Toggle what you want and confirm.

Everything is filed in one transaction. Batch mode only **adds** memberships; it never removes one, except the inbox option below.

Ranking 100 papers against 300 collections took about 0.3 s in a mock test. Auto-picks you turn off still feed the per-item blacklist.

### Inbox triage

If a selected paper sits in an inbox-style collection (see **Ignore collections** in [Settings](settings.md)), the option **Remove from inbox when filed** takes it out of the inbox once it has been filed somewhere. It is on by default. While it is on, inbox memberships do not count toward the per-paper collection limit.

## Undo

Right-click an item → **Undo last PaperRouter filing**. The entry appears only when there is something to undo.

It reverses additions and removals together, in one transaction, and survives a Zotero restart. It works for batch and single-paper filing, and it undoes the **last** filing only.
