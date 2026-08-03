# Alex ACT Document Tools

This repository is the source for the optional `alex-act-document-tools`
plugin. It owns document conversion behavior, not Alex Finch runtime identity,
ACT governance, plugin lifecycle management, or visual authoring.

## Ownership

- `Alex_ACT_Steward` owns architecture, approval, and release coordination.
- This repository owns six converter skills, `/convert`, and their shared
  runtime.
- `Alex_ACT_Core` retains baseline reasoning and a temporary compatibility route
  until the converter extraction is released and verified.
- `Alex_ACT_Manager` may install, update, or remove this plugin after its own
  implementation is approved.

## Rules

1. Keep converter scripts and their shared runtime together.
2. Never add editorial README files under declared skill or command roots; the
   CLI can reify any Markdown file there as a phantom component.
3. Run `npm test` after every converter or packaging change.
4. Preserve explicit diagnostics for missing Pandoc or optional render tools.
5. Do not add lifecycle, brain migration, chart authoring, or unrelated document
   creation capabilities merely because they are adjacent.
6. Use American English in authored prose.
7. Do not release, publish to the Mall, install, or mutate user scope without a
   separate approval.

## Change Boundary

The initial implementation was ported from `Alex_ACT_Core` commit
`47ef71ccab23b5e43a0170cb0449708c5f91629b`. Future divergence is allowed only
when it is intentional, tested here, and reflected in the changelog and source
inventory.
