---
description: "Create and review a polished Markdown-based email, then open an unsent New Outlook draft on Windows. Use when the user asks for a rich stakeholder update, executive email, or formatted email draft."
lastReviewed: 2026-08-11
---

# /rich-email

Use the `rich-email` skill to create and validate a draft-only HTML email from Markdown, then open it in New Outlook when the supported Windows launcher is available.

## Steps

1. Confirm recipients, purpose, requested action, tone, and whether the user wants a draft or a send.
2. Read `.github/skills/rich-email/SKILL.md` and its template and style guide.
3. Create the temporary Markdown source outside the repository with unquoted email frontmatter.
4. Convert it through `md-to-eml` without `--inline-images`.
5. Run the helper in `--validate-only` mode and repair any header, HTML, recipient, or multipart failure.
6. Summarize the exact recipients, subject, requested action, and validation result.
7. Open the unsent New Outlook draft only after the user confirms the draft boundary.
8. Ask the user to review the compose window; do not send or claim delivery.
9. Remove temporary artifacts after the draft is saved or discarded.

## Would Revise If

Revisit by **2026-11-11** if the prompt routes to a retired skill, opens a sent message, or repeatedly causes users to mistake draft opening for delivery.
