# Changelog

All notable changes to Alex ACT Document Tools will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2026-08-06

### Fixed

- Preserved content inside variable-length Markdown fences across every
  preprocessing path.
- Rejected executable raw HTML before standalone HTML generation and required
  production email `from`, `to`, and `subject` headers.
- Preserved custom reference-document footers and defaults, implemented Letter,
  A4, and 6x9 section sizes with matching image bounds, and removed Word dry-run
  filesystem side effects.
- Removed implicit `npx` package acquisition from Mermaid and SVG rendering;
  approved tools must already be installed.
- Reconciled HTML import options, Document Tools fallback ownership, runtime
  defaults, print claims, and script labels.
- Removed the unused data-URI runtime, replaced obsolete Mall include/count
  metadata with origin delivery, and added isolated delivered-shape tests plus
  standalone CI.

### Changed

- README: the 100-file figure is now stated as this constellation's own
  packaging convention rather than an observed Copilot CLI Windows ceiling, in
  both the extraction rationale and the test-suite description. The extraction
  argument stands on optional-capability grounds independently of the number.

## [1.0.0] - 2026-08-06

### Added

- Added real HTML-to-Markdown import and Markdown-to-text export regression
  fixtures with semantic-content assertions.

### Changed

- Became the sole source owner for the six document converter skill names and
  their four shared runtime modules; Core retains a namespaced command redirect
  only.

## [0.1.0] - 2026-08-03

### Added

- Local `alex-act-document-tools` plugin scaffold.
- Six document converter skills and the `/convert` prompt, ported from
  `Alex_ACT_Core` commit `47ef71ccab23b5e43a0170cb0449708c5f91629b`.
- Shared converter runtime for process execution, Markdown preprocessing,
  Mermaid handling, and data-URI support.
- Contract tests covering inventory, payload capacity, phantom components, and
  startup behavior.
- Explicit Mall include mapping for the shared runtime, verified through a
  temporary 22-file packaged payload.

### Changed

- Replaced Core-relative Markdown links with optional cross-plugin composition
  guidance so the extracted plugin has no broken local dependencies.

### Distribution

- Published through the Alex ACT Mall as
  `alex-act-document-tools@alex-mall`.
- Core converter removal remains a separate compatibility release.
