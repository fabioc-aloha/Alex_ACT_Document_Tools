---
name: "html-to-md"
description: "Convert HTML documents to clean Markdown via pandoc. Use when the user asks to convert HTML to markdown or import a .html file into markdown."
lastReviewed: 2026-05-26
---



# Html To Md

Convert HTML documents to clean Markdown. Strips inline styles, scripts, and tracking pixels while preserving semantic structure.

## Quick Start

```bash
node .github/skills/html-to-md/scripts/html-to-md.cjs page.html page.md
```

## What's preserved

- Headings, paragraphs, lists, blockquotes
- Tables (when structure is regular)
- Links and inline code
- Image references (URLs kept as-is)
- Emphasis (bold, italic, strikethrough)

## What's dropped

- Inline `style` attributes
- `<script>` and `<style>` blocks
- Tracking pixels and analytics tags
- Most `<div>`/`<span>` wrappers (semantic content preserved)

## Optional flags

| Flag | Effect |
|---|---|
| `--extract-images` | Copy referenced local images to an `images/` folder; remote URLs remain unchanged |
| `--no-extract-images` | Preserve original local and remote image references |
| `--wrap N` | Line wrap width (default: 0, no wrapping) |

## Post-conversion

- Run the project's Markdown linter over the output to fix heading hierarchy and list spacing. When Core is installed, use its `lint-clean-markdown` skill.
- HTML often has multiple `<h1>` tags; Markdown wants exactly one.

## Related

- [docx-to-md](../docx-to-md/SKILL.md) — Word source
- Markdown linting — clean up the result with the project's linter or Core's `lint-clean-markdown` skill

## Would Revise If

Revisit this skill by **2026-11-06** or sooner if Pandoc changes html-to-md flag semantics, local image extraction fails on a supported source, or remote image download becomes a required capability rather than an explicit non-feature.
