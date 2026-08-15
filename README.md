# Alex ACT Document Tools

![Alex ACT Document Tools](https://raw.githubusercontent.com/fabioc-aloha/Alex_ACT_Document_Tools/main/assets/banner.svg)

[Core](https://github.com/fabioc-aloha/Alex_ACT_Core) · [Illustrator](https://github.com/fabioc-aloha/Alex_ACT_Illustrator_Plugin) · [Document Tools](https://github.com/fabioc-aloha/Alex_ACT_Document_Tools) · [Enterprise](https://github.com/fabioc-aloha/alex-act-enterprise)

Alex ACT Document Tools keeps document production tested and optional instead of spending Core's permanent payload budget on infrequent format work. Seven skills share one runtime for Markdown, Word, HTML, email, and plain text, with a separate draft-only New Outlook workflow.

## Status

**Latest published release: `v1.1.0`.** This MINOR release adds the approved
draft-only rich-email workflow while preserving the six converter contracts.
Source:
[`fabioc-aloha/Alex_ACT_Document_Tools`](https://github.com/fabioc-aloha/Alex_ACT_Document_Tools).
Install from the Alex ACT Mall as `alex-act-document-tools@alex-mall`.

## Install

```powershell
copilot plugin marketplace add fabioc-aloha/Alex_Skill_Mall
copilot plugin install alex-act-document-tools@alex-mall
```

Reload the host, then invoke `/alex-act-document-tools convert` or
`/alex-act-document-tools rich-email`.

## Why This Plugin Exists

The published Core payload reached this constellation's own 100-file packaging
convention. Document conversion is useful but optional executable capability,
not baseline reasoning or lifecycle maintenance. Extracting it preserves the
tested converters while returning 17 payload slots to Core. Approved Core
source no longer declares these skill names or their shared runtime; published
Core 2.0.0 keeps only thin namespaced redirects.

| Component | Responsibility |
| --- | --- |
| Core | Runtime identity, ACT reasoning, safety, and frequent baseline skills |
| Copilot CLI | Install, list, update, and remove plugins |
| Document Tools | Convert documents and validate generated artifacts |
| Illustrator | Author or verify visual assets embedded in documents |
| Mall | Publish the approved plugin payload after release |

## What Ships

| Skill | Conversion |
| --- | --- |
| `docx-to-md` | Word to clean Markdown with extracted images |
| `html-to-md` | HTML to clean Markdown |
| `md-to-eml` | Markdown to RFC 5322 email with inline CSS and CID images |
| `md-to-html` | Markdown to standalone HTML with diagrams and embedded assets |
| `md-to-txt` | Markdown to plain text |
| `md-to-word` | Markdown to professional Word with diagrams and formatting |
| `rich-email` | Compose and validate a draft-only New Outlook email from Markdown |

The `/convert` prompt routes conversion requests to the matching skill. The
`/rich-email` prompt composes with `md-to-eml`, validates a single-part HTML EML,
and opens an unsent New Outlook draft on Windows. Four modules under
`.github/scripts/shared/` provide process execution, Markdown preprocessing,
Mermaid handling, and data-URI support.

Mall packaging must include that directory explicitly as `scripts/shared`.
Without the mapping, structural packaging passes while every converter loses
its runtime dependency. The source manifest records the required include.

## Runtime Prerequisites

| Tool | Requirement | Used by |
| --- | --- | --- |
| Node.js 24+ | Required | All converter scripts |
| Pandoc 2.19+ | Required | All six converters |
| Mermaid CLI | Optional | PNG diagrams in HTML and Word |
| JSZip | Optional | Word OOXML post-processing |
| svgexport | Optional | SVG rasterization |

Missing optional tools reduce output capability and must produce explicit
diagnostics. The plugin does not silently install external dependencies.

## Development

Run the source contract and startup tests:

```powershell
npm test
```

The source test suite verifies component inventory, the 100-file packaging
convention, phantom component prevention, all seven converter paths, the
draft-only Outlook helper, and real
HTML-to-Markdown import plus Markdown-to-text export. Steward's integration
suite also packages a temporary origin-shaped payload and executes all seven
converters from that packaged location. Disposable cross-owner comparisons
produced byte-identical output against the former Core implementations in both
real-conversion directions.

## Provenance

The converter scripts and shared runtime were ported byte-for-byte from
`Alex_ACT_Core` commit `47ef71ccab23b5e43a0170cb0449708c5f91629b` on
2026-08-03. Skill bodies were then adapted only to replace broken
Core-relative links with explicit optional composition guidance. The source
inventory is recorded in `manifest.json`.

Existing individual Mall converter entries are not the source for this plugin.
Four overlap by name but have drifted from current Core, and two formats have no
same-named Mall entry. Reconciliation and deprecation require a later Mall
publication proposal.

## Governance

`Alex_ACT_Steward` owns architecture, approval, release coordination, and
cross-repository coherence. Changes to converter or draft behavior require
evidence, tests, and an approved Steward proposal. Core converter removal remains a
separate compatibility release and installed-state transition.

## Would Revise If

Revisit by **2026-11-05** or sooner if real output loses semantic parity, a
clean session resolves a converter skill to Core, the bundle duplicates
maintained Mall converters without a retirement path, or runtime dependencies
make installation materially less reliable than prior Core delivery.
