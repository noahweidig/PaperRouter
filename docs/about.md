---
icon: lucide/scale
tags:
  - Legal
---

# Credits and licenses

PaperRouter is released under the [MPL-2.0](https://github.com/noahweidig/PaperRouter/blob/main/LICENSE). It is a rewrite based on the original Tidy Up plugin by Mike Zhou (Keshen Zhou) and Wight. The documentation site uses [Lucide](https://lucide.dev) icons under ISC and is built with [Zensical](https://zensical.org).

## Contributing

Bug reports and pull requests are welcome in the [issue tracker](https://github.com/noahweidig/PaperRouter/issues).

```bash
npm ci
npm test
```

## Documentation site

The docs are built with Zensical: `zensical.toml` is the config and `docs/*.md` the pages. To preview locally:

```bash
pip install --require-hashes --only-binary=:all: -r docs-requirements.txt
zensical serve          # http://localhost:8000
zensical build --clean  # writes site/
```

The **Docs** workflow publishes to GitHub Pages on every change under `docs/` or `zensical.toml`. Enable it once under Settings → Pages → Source: GitHub Actions.
