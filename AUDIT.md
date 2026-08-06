# Project Audit

**Audit date:** 2026-08-06
**Scope:** converter correctness, security boundaries, plugin packaging, tests, and living documentation
**Change boundary:** this report is the only project file added by the audit

## Executive Summary

The repository has a coherent six-converter shape, aligned release metadata, a small dependency surface, and a fast contract suite. `npm test` passes all 14 declared tests, including startup checks for every converter and real Pandoc conversions for HTML-to-Markdown and Markdown-to-text.

The suite does not cover several important runtime branches. This audit confirmed three high-severity findings: Markdown preprocessing can silently alter code inside valid long fences, standalone HTML preserves executable scripts from source Markdown, and Word post-processing can overwrite a custom reference document's footer. Additional medium-severity findings affect page sizing, email addressing, optional tool execution, packaging assurance, and documentation accuracy.

No source or configuration files were changed during the audit.

## Method

- Read all converter scripts, shared runtime modules, skill instructions, plugin metadata, and contract tests.
- Ran `npm test` with the repository's configured environment.
- Ran isolated temporary-directory probes for long Markdown fences, Word dry-run behavior, HTML image download behavior, missing email headers, and raw script preservation.
- Compared the source packaging assumptions with the locally installed v1.0.0 artifact.
- Did not perform network calls, install dependencies, publish artifacts, or visually inspect output in Word or email clients.

## Severity Model

| Severity | Meaning |
| --- | --- |
| High | Silent content corruption, executable-content exposure, or loss of user template content |
| Medium | User-visible contract failure, unsafe dependency behavior, or release assurance gap |
| Low | Bounded side effect, dead payload, or maintainability defect |

## Findings

### F-01: Long Markdown fences are parsed incorrectly

**Severity:** High
**Affected code:** [markdown-preprocessor.cjs](.github/scripts/shared/markdown-preprocessor.cjs#L90), [markdown-preprocessor.cjs](.github/scripts/shared/markdown-preprocessor.cjs#L347), [markdown-preprocessor.cjs](.github/scripts/shared/markdown-preprocessor.cjs#L579)

Fence state records either three delimiters or only the delimiter character. A valid four-backtick fence can therefore be closed by an inner three-backtick line. Subsequent fenced content is treated as prose and transformed.

An isolated probe placed an em dash after an inner three-backtick line inside a four-backtick fence. `preprocessMarkdown(..., { format: "txt" })` changed that em dash to a comma, confirming transformation leaked into code content.

**Impact:** source code, examples, and nested Markdown can be silently changed in Word, HTML, email, or text output.

**Recommendation:** track both delimiter character and opening length. Close only on the same character with a delimiter run at least as long as the opener. Apply the same helper to `applyOutsideFences`, `detectTocMarker`, `transformOutsideCodeFences`, and `formatMarkdown`, then add regression cases for three-, four-, and five-character fences.

**Would revise if:** a regression test proves that content after an inner shorter fence remains byte-identical across every preprocessing entry point.

### F-02: Standalone HTML preserves executable scripts

**Severity:** High
**Affected code:** [md-to-html.cjs](.github/skills/md-to-html/scripts/md-to-html.cjs), [md-to-html skill](.github/skills/md-to-html/SKILL.md)

The converter sends Markdown through Pandoc with raw HTML enabled and writes the result into a standalone page without sanitization. A temporary source containing `<script>globalThis.auditMarker=1;</script>` produced exit code 0 and preserved the script verbatim in the output.

This conflicts with the skill's acceptance condition that generated HTML contain no script injection. The current documentation does not establish a trusted-input-only boundary before conversion.

**Impact:** opening output generated from untrusted or externally supplied Markdown can execute embedded JavaScript in the viewer's browser context.

**Recommendation:** either sanitize generated HTML before writing it or reject raw executable elements. If trusted input is an intentional requirement, state that boundary prominently and require the sanitization workflow for external content.

**Would revise if:** a supported sanitizer or Pandoc configuration removes scripts, event-handler attributes, and unsafe URLs in the final file, not only in an intermediate representation.

### F-03: Word post-processing can overwrite reference-document footers

**Severity:** High
**Affected code:** [md-to-word.cjs](.github/skills/md-to-word/scripts/md-to-word.cjs#L673), [md-to-word.cjs](.github/skills/md-to-word/scripts/md-to-word.cjs#L698), [md-to-word.cjs](.github/skills/md-to-word/scripts/md-to-word.cjs#L768)

`addPageNumberFooter` unconditionally writes `word/footer1.xml` and adds a new relationship. Post-processing calls it for every document. A custom `--reference-doc` that already owns `footer1.xml` can therefore lose its branded or compliance footer. Existing default footer references are not reconciled before another one is added.

The same post-processing path replaces the complete `w:docDefaults` block rather than merging only the converter-owned properties, which can also discard reference-document defaults such as language or typography settings.

**Impact:** a successful conversion can silently damage the template content the user explicitly asked to preserve.

**Recommendation:** preserve existing footer parts and relationships by default. Add page numbering to an existing footer only through a structure-aware OOXML edit, or make generated page numbers opt-in when a reference document is supplied. Merge document defaults property by property.

**Would revise if:** a round-trip test with a branded reference document proves its footer XML, relationships, and unrelated document defaults survive conversion.

### F-04: `--page-size` is accepted but has no effect

**Severity:** Medium
**Affected code:** [md-to-word.cjs](.github/skills/md-to-word/scripts/md-to-word.cjs#L834), [md-to-word.cjs](.github/skills/md-to-word/scripts/md-to-word.cjs#L867), [md-to-word.cjs](.github/skills/md-to-word/scripts/md-to-word.cjs#L1236)

The option is parsed, logged, and passed into post-processing, but no code reads `options.pageSize` to change section properties or sizing constants. Image bounds also remain hardcoded for Letter paper.

**Impact:** A4 and 6x9 requests report success while producing Letter-oriented output and image sizing.

**Recommendation:** implement page dimensions and margins in OOXML section properties and derive image bounds from the selected size. If that is not intended, remove the option and its documentation.

**Would revise if:** generated A4 and 6x9 fixtures expose the requested dimensions in `word/document.xml` and show corresponding image constraints.

### F-05: Missing required email headers produce a successful placeholder message

**Severity:** Medium
**Affected code:** [md-to-eml.cjs](.github/skills/md-to-eml/scripts/md-to-eml.cjs#L276), [md-to-eml skill](.github/skills/md-to-eml/SKILL.md)

The skill marks `to`, `from`, and `subject` as required. The converter does not validate them. A Markdown file with no frontmatter exited 0 and generated:

```text
From: sender@example.com
To: recipient@example.com
Subject: No Subject
```

**Impact:** automation receives a success signal for a message that is not ready to send, and a user can open an apparently valid email addressed to placeholders.

**Recommendation:** reject missing production headers with a nonzero exit code. Keep placeholder behavior only behind an explicit preview or fixture option. Add RFC header and MIME-structure tests, including a plain-text alternative if that remains an acceptance criterion.

**Would revise if:** production mode fails before writing output whenever required addressing fields are absent or malformed.

### F-06: Optional render paths can execute unpinned registry packages

**Severity:** Medium
**Affected code:** [mermaid-pipeline.cjs](.github/scripts/shared/mermaid-pipeline.cjs#L231), [mermaid-pipeline.cjs](.github/scripts/shared/mermaid-pipeline.cjs#L280), [mermaid-pipeline.cjs](.github/scripts/shared/mermaid-pipeline.cjs#L299), [md-to-word.cjs](.github/skills/md-to-word/scripts/md-to-word.cjs#L191)

Mermaid and SVG conversion call `npx mmdc` and `npx svgexport`. Modern `npx` can fetch and execute a missing package from the configured registry. The repository does not pin those packages or declare them as local dependencies, while the README says missing optional tools should reduce capability without silently installing external dependencies.

Using the executable name `mmdc` through `npx` also leaves package identity resolution to npm instead of explicitly selecting the documented `@mermaid-js/mermaid-cli` package.

**Impact:** an optional conversion can trigger network access and execute unpinned code, or fail differently across registry configurations.

**Recommendation:** resolve `mmdc` and `svgexport` directly through `tool-runner.cjs` and fail with the documented diagnostic when absent. If local package execution is preferred, pin package identities and versions and prohibit installation during conversion.

**Would revise if:** an offline clean environment proves these calls never download, install, or execute anything beyond a preinstalled approved binary.

### F-07: HTML import documents a flag and behavior that do not exist

**Severity:** Medium
**Affected code:** [html-to-md skill](.github/skills/html-to-md/SKILL.md#L38), [html-to-md.cjs](.github/skills/html-to-md/scripts/html-to-md.cjs)

The skill advertises `--download-images` and says it fetches referenced images. The CLI implements `--extract-images` and `--no-extract-images`, and its extraction logic explicitly skips HTTP and HTTPS sources. Unknown options are silently ignored.

A probe using `--download-images` exited 0, preserved the remote URL, and created no images directory.

**Impact:** the agent can report a successful image-localization workflow that never occurred.

**Recommendation:** align the skill and CLI on one option contract. If remote download is supported, use the shared downloader with URL, redirect, size, and timeout controls. Otherwise document local-copy behavior only and reject unknown options.

**Would revise if:** the documented command downloads a remote image into the stated directory and rewrites the Markdown reference, or the documentation no longer promises that behavior.

### F-08: The generic conversion fallback points to the former owner

**Severity:** Medium
**Affected code:** [convert.prompt.md](.github/prompts/convert.prompt.md#L12), [copilot-instructions.md](.github/copilot-instructions.md)

When the generic skill tool is unavailable, `/convert` tells the agent to resolve the installed Core root. This repository and its README now declare Document Tools the sole owner of the converter skills. The repository instructions also still describe Core's converter ownership as temporary pending release, although v1.0.0 is released.

The normal `.github/skills/...` path exists in the locally installed v1.0.0 artifact, so the primary source path is valid. The defect is the fallback and stale ownership guidance.

**Impact:** the exact recovery path intended for skill-resolution failure can look in a plugin that no longer owns the implementation.

**Recommendation:** resolve the installed `alex-act-document-tools` root and keep ownership language consistent with the released state.

**Would revise if:** a clean host without converter copies in Core can execute the documented fallback successfully.

### F-09: The repository does not test its declared packaged payload

**Severity:** Medium
**Affected code:** [test-plugin-contract.cjs](scripts/test-plugin-contract.cjs#L43), [test-plugin-contract.cjs](scripts/test-plugin-contract.cjs#L90), [manifest.json](manifest.json#L75)

The tests assert that the manifest contains a `mall_includes` mapping and that source installable content has 18 files. They do not construct the declared 22-file payload, assert `expected_payload_files`, or execute converters from that packaged shape. The README says a separate Steward integration suite performs that check, so release assurance depends on another repository rather than this source owner's required `npm test` gate.

The locally installed v1.0.0 artifact preserves `.github/scripts/shared` and does not contain the declared root `scripts/shared` target. Current imports still resolve, but this demonstrates that source assertions are not a substitute for validating the installed shape.

**Impact:** a packaging or include-mapping regression can pass this repository's mandatory test command.

**Recommendation:** add a local temporary-package test that applies the actual include rules, verifies the final inventory, and runs all converter startup paths from the packaged root.

**Would revise if:** the repository's own test command produces and exercises the same payload layout delivered by the Mall.

### F-10: Word dry-run mutates the source directory

**Severity:** Low
**Affected code:** [md-to-word.cjs](.github/skills/md-to-word/scripts/md-to-word.cjs#L927), [md-to-word.cjs](.github/skills/md-to-word/scripts/md-to-word.cjs#L999)

The build creates `images/` before reaching the dry-run return. An isolated probe confirmed exit code 0, no DOCX, and a newly created images directory.

**Recommendation:** defer all output-directory creation until after dry-run validation succeeds and actual rendering begins.

### F-11: `data-uri.cjs` is shipped but has no production consumer

**Severity:** Low
**Affected code:** [data-uri.cjs](.github/scripts/shared/data-uri.cjs), [md-to-html.cjs](.github/skills/md-to-html/scripts/md-to-html.cjs#L55), [manifest.json](manifest.json#L48)

`md-to-html` requires the module into `sharedDataUri` but never reads that variable. No converter calls `encodeToDataUri`, `downloadFile`, or `decodeDataUri`. The module is nevertheless included in the required shared-runtime inventory.

**Recommendation:** either use it as the single image-encoding/download implementation and test it, or remove the unused import and module from the payload contract.

## Documentation Drift

The following lower-risk discrepancies should be corrected with the related runtime fixes:

| Documented behavior | Runtime behavior |
| --- | --- |
| `md-to-word --strip-frontmatter` defaults off | Parser initializes `stripFrontmatter: true` |
| HTML Mermaid PNG mode uses scale 8 and width 2400 | Converter requests scale 3 and width 1200 |
| HTML print CSS adds H1 page breaks and prints link URLs | Generated CSS contains neither rule |
| HTML output provides syntax highlighting | Generated page has generic code styling but no highlighting stylesheet |
| HTML import wraps at 80 by default | CLI initializes wrap to 0 |
| Several skill pages identify v1.2.0 or v5.5.0 scripts as v1.0.0 | Script headers and skill labels disagree |

## Test Assessment

### Passing evidence

- All 14 tests pass.
- Every converter reaches usage without a parser or module-resolution failure.
- Real HTML-to-Markdown and Markdown-to-text fixtures preserve the asserted semantic content.
- Plugin, package, manifest, and changelog release versions align at 1.0.0.
- The installable source remains below the repository's stated 100-file convention.

### Material gaps

- No real DOCX, EML, or standalone HTML output assertions.
- No unit coverage for shared Markdown, Mermaid, data-URI, or OOXML helpers.
- No negative CLI tests for unknown flags, invalid values, missing tools, or required metadata.
- No packaged-layout test in this repository.
- No CI workflow is present in the audited tree, so `npm test` is not repository-enforced on pushes or pull requests.

## Recommended Order

1. Fix fence-state handling and add cross-format regression tests.
2. Establish and enforce the HTML trust boundary.
3. Preserve custom Word template parts and add a reference-document fixture.
4. Implement or remove `--page-size`; validate required email headers.
5. Eliminate implicit `npx` package acquisition.
6. Repair converter options, fallback ownership, and living documentation together.
7. Add packaged-layout and negative-path tests.
8. Remove the dry-run side effect and resolve the dead data-URI module.

## Audit Verdict

**Not release-ready for untrusted HTML input or template-sensitive Word workflows.** The core plugin shape and existing tests are sound as a starting point, but the passing suite currently overstates coverage of the highest-risk runtime behavior. The first three recommendations should be treated as release blockers; the remaining findings are bounded and can be sequenced immediately afterward.
