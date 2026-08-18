# md-to-word Version History and Acceptance Table

Reference material consulted on demand. Core conversion behavior lives in
[`SKILL.md`](../SKILL.md).

## Version History

| Version | Changes |
|---------|---------|
| **5.5.0** | Tighter table styling (header 10pt→9pt, data 9pt→8.5pt, cell margins 2pt/4pt → 1pt/3pt). `[toc]` marker in source now strips the line but does **not** auto-enable TOC — warning logged instead, requires explicit `--toc` to generate. Coverage smoke test corpus added at `docs/testing/md-to-word-coverage.md`. |
| **5.4.0** | Diagram-type-aware Mermaid palette injection (sequence/state get themeVariables, flowcharts respect classDef), `--no-default-palette` opt-out, lint warnings for unstyled diagrams, sizing constants documented |
| **5.3.0** | Style presets (professional, academic, course, creative), --cover, --toc |
| **5.0.0** | SVG auto-conversion via svgexport, watch mode, recursive processing |
| **4.0.0** | OOXML post-processing: page numbers, hyperlinks, code block styling |
| **3.0.0** | Markdown preprocessing, heading colors, caption formatting |
| **2.1.0** | Table pagination (cantSplit, keepWithNext) prevents orphan headers |
| **2.0.0** | 90% H+V coverage, actual PNG dimension reading |
| **1.0.0** | Initial: pandoc + mermaid + table formatting |

## Conversion Acceptance Decision Table

| Condition | Verdict | Action |
|-----------|---------|--------|
| All headings use correct Word styles (Heading 1-6) | Accept | Verify TOC generates from styles |
| Headings are bold plain text instead of styled | Reject | Check pandoc heading-style mapping |
| Tables render with borders and header row formatting | Accept | Spot-check alignment |
| Tables overflow page width or lose column alignment | Reject | Adjust column widths or split wide tables |
| Images embedded at correct resolution | Accept | Verify no placeholder boxes |
| Images missing or show `[image]` placeholder | Reject | Check image paths resolve; pandoc `--resource-path` |
| Mermaid diagrams converted to PNG and embedded | Accept | Verify labels readable at print size |
| Mermaid diagrams missing entirely | Reject | Pre-render with mermaid-cli before pandoc |
| Code blocks use monospace font with syntax coloring | Accept | Verify long lines don't overflow |
| Code blocks use body font or lose indentation | Warning | Check pandoc `--highlight-style` setting |
| Page breaks at expected section boundaries | Accept | Required for multi-section documents |
| Headers/footers match brand template | Accept | Verify reference.docx applied correctly |
| File opens without macro warnings | Accept | Required — no macros in output |
| File size >10MB for text-only document | Warning | Check for uncompressed embedded images |
