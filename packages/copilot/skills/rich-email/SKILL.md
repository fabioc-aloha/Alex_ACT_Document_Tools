---
name: rich-email
description: "Create and validate polished HTML email drafts from Markdown, then open an unsent New Outlook draft on Windows. Use for rich stakeholder updates, executive summaries, or formatted email requests; do not use for automated, transactional, or bulk delivery."
lastReviewed: 2026-08-11
---

# Rich Email

Create a reviewable, email-safe HTML message and open it as an unsent New Outlook draft. This skill composes with the existing [md-to-eml](../md-to-eml/SKILL.md) converter and adds only draft composition, validation, and Outlook opening.

## When to Use

Use for:

- Rich stakeholder or executive updates
- Research or release summary emails
- Emails with headings, callouts, tables, or evidence links
- Reformatting a plain-text message into a professional draft

Do not use for automated newsletters, transactional mail, SMTP, Graph, SendGrid, or bulk delivery. Those require a separately governed delivery system and compliance flow.

## Draft Boundary

The workflow creates and opens an unsent draft only. Never send automatically. Before opening the draft, show or summarize the exact recipients, subject, requested action, and body. A later send requires explicit approval of that exact message.

Outlook supplies the default signature. Do not add a generated signoff or sender name. The helper inserts two blank lines before the rich content so the user can remove or reposition the signature.

## Procedure

1. Confirm the audience, recipients, purpose, requested action, tone, and whether the user wants a draft or a send.
2. Copy [the email template](./assets/rich-email-template.md) to a temporary file outside the repository and adapt it using [the style guide](./references/style-guide.md).
3. Keep `to`, `from`, and `subject` frontmatter values unquoted. The converter copies those values into EML headers verbatim.
4. Use the existing `md-to-eml` converter without `--inline-images`. This first Outlook helper accepts single-part `text/html` EML and rejects multipart output rather than risking attachment corruption.
5. Validate the EML:

```powershell
node .github/skills/rich-email/scripts/open-rich-outlook-draft.cjs `
  "$env:TEMP\message.eml" --validate-only
```

6. Inspect the validation output and decoded HTML. Confirm recipients, subject, readable headings, compact tables, correct links, no raw Markdown, no signoff, and no secrets.
7. On Windows with New Outlook installed, open the unsent draft:

```powershell
node .github/skills/rich-email/scripts/open-rich-outlook-draft.cjs `
  "$env:TEMP\message.eml"
```

The helper requires `olk.exe` or `outlook.exe`. Validation-only mode remains available on other hosts; it does not claim that a generic file opener proves New Outlook opened.

8. In New Outlook, verify the signature order, two blank lines, recipients, subject, links, tables, and absence of unexpected attachments. Ask the user to confirm the draft before any separate send action.
9. Delete temporary Markdown, EML, decoded HTML, and screenshots after the draft is saved or discarded. Confirm no email artifacts remain in the repository and preserve no recipients or body text in persistent memory.

## Content Rules

- Use one literal subject, ideally under 60 characters.
- Lead with the outcome, decision, or request.
- Use one executive-summary callout for messages over 250 words.
- Use at most two compact tables.
- Use descriptive links instead of raw URLs.
- Separate evidence from recommendation.
- Do not include secrets, credentials, unnecessary personal data, or clinical intake content.

## Failure Handling

| Signal | Action |
| --- | --- |
| Pandoc or `md-to-eml` unavailable | Stop and report the prerequisite; do not install it without approval. |
| Multipart EML or inline-image output | Stop with the helper's clear unsupported-format message; do not open a partial draft. |
| Missing or malformed headers | Fix Markdown frontmatter and reconvert. |
| New Outlook launcher unavailable | Use `--validate-only` and report that opening the draft requires Windows New Outlook. |
| Draft does not open | Keep the EML for diagnosis and do not claim that a draft opened. |
| User requests sending | Reconfirm the exact message and obtain explicit send authorization. |

## Validation Commands

```powershell
node --test scripts/test-rich-email.cjs
node .github/skills/rich-email/scripts/open-rich-outlook-draft.cjs message.eml --validate-only
git status --short
```

## Would Revise If

Revisit by **2026-11-11** if multipart email is required by two real workflows, New Outlook cannot be opened reliably on supported Windows hosts, any draft is sent without explicit authorization, or the capability proves unrelated to Document Tools ownership.
