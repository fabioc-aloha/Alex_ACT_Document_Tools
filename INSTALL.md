# Install the Alex ACT Constellation

This guide installs and activates Core for an end user. Core is self-sufficient
for identity, ACT discipline, project bootstrap, and baseline skills. Other
plugins are independent optional capabilities selected according to the work.

## Published Versions

Last verified: 2026-08-18.

| Component | Version | Distribution |
| --- | --- | --- |
| Core | `3.1.2` | `alex-act-core@alex-mall` |
| Illustrator | `2.3.1` | `alex-act-illustrator-plugin@alex-mall` |
| Document Tools | `1.1.1` | `alex-act-document-tools@alex-mall` |
| Enterprise | `1.1.1` | `alex-act-enterprise@alex-mall` |
| MSFT | `1.1.4` | `fabioc_microsoft/alex-act-msft`, managed-source access required |

## Supported Platforms

Windows and macOS are both supported. Every `copilot` command in this guide is
identical on both platforms; only the one-time CLI installation differs. Core
resolves its user instruction directory from the current home directory, so it
activates at `%USERPROFILE%\.copilot\instructions` on Windows and
`~/.copilot/instructions` on macOS. Run the commands in PowerShell on Windows
and in your default shell on macOS.

## Prerequisites

- Copilot CLI `1.0.75` or newer.
- Git available on `PATH`.
- VS Code with GitHub Copilot Chat, or another Copilot CLI host.
- A Microsoft enterprise-managed GitHub identity with access to private
  `fabioc_microsoft/alex-act-msft` when installing MSFT.
- Microsoft corporate identity and network access when installing MSFT.

Install the Copilot CLI with the route for your platform:

| Platform | Command |
| --- | --- |
| Windows | `winget install --id GitHub.Copilot` |
| macOS | `brew install --cask copilot-cli` |
| Any platform with Node.js 22 or newer | `npm install -g @github/copilot` |

Check the tools:

```powershell
copilot --version
git --version
gh auth status
```

## 1. Register the Alex ACT Mall

Register the public marketplace once per machine:

```powershell
copilot plugin marketplace add fabioc-aloha/Alex_Skill_Mall
copilot plugin marketplace update alex-mall
```

## 2. Install Core

Install the baseline runtime:

```powershell
copilot plugin install alex-act-core@alex-mall
copilot plugin list
```

The list must show Core at its published version. If it is absent, refresh
`alex-mall` and investigate before continuing.

## 3. Activate Core's Instruction Layer

Reload your host, start a new Copilot Chat conversation, and invoke:

```text
/alex-act-core bootstrap-core
```

Review the exact 16-file plan, machine-wide user scope, overlap report, and Core
receipt action. Apply only after explicit consent. Reload the host after the
instruction files are written.

Core's receipt is
`~/.copilot/instructions/.alex-act-core-bootstrap.json`. It owns only Core's 16
instruction files. A second preview must report only preserve actions.

## 4. Install Optional Specializations

Install only the capabilities needed for the current work:

| Component | Choose it when |
| --- | --- |
| Illustrator | You author charts, figures, imagery, visual reports, or documentation shells. |
| Document Tools | You convert Markdown, HTML, Word, email, or plain-text documents. |
| Enterprise | Your projects use the public Azure, Fabric, Power BI, or Microsoft 365 plugin ecosystem. |
| MSFT | You are a Microsoft employee on the corporate network and need internal Agency, WorkIQ, or organization-reporting capability. |

MSFT is private and currently source-only. Confirm Microsoft employment,
corporate-network access, and managed-source access before installing it.

Use `copilot plugin install <plugin>@<marketplace>` for public specializations
and `copilot plugin install fabioc_microsoft/alex-act-msft` for MSFT, then use
`copilot plugin list` for verification. Each specialization's namespaced setup
command owns its downstream configuration.

## 5. Verify Core Activation

Core verification uses `copilot plugin list` plus a second
`/alex-act-core bootstrap-core` preview.

Confirm each plane independently:

| Plane | Expected evidence |
| --- | --- |
| `installed` | Plugin files and `plugin.json` report the published version. |
| `enabled` | The exact plugin key is enabled at the intended scope. |
| `instruction-loaded` | The Core receipt owns 16 files whose version and hashes match canonical Core sources. |
| `skill-invokable` | The namespaced command runs, or reports `host-limited` with a healthy installed-file fallback. |
| `project` | `/alex-act-core bootstrap-project` preserves local files and reports CSS parity. |

If plugin files are current but the instruction receipt or hashes drifted,
invoke `/alex-act-core bootstrap-core` again and apply the reported repair.

## 6. Configure Optional Workloads

Use the installed namespaced commands for the workloads you selected:

```text
/alex-act-core bootstrap-project
/alex-act-document-tools convert
/alex-act-illustrator-plugin install-visual-companions
/alex-act-enterprise setup-enterprise
/alex-act-msft setup-msft
```

- Core's `bootstrap-project` previews project-scoped Markdown, settings,
  repository guidance, and handoff files before asking to apply them.
- Document Tools owns format detection, conversion execution, and output validation.
- Illustrator companions are optional and individually consented.
- Enterprise defaults its downstream Microsoft plugins to repository scope.
- MSFT setup is user-scoped and must fail closed off Microsoft's corporate
  network.
- Agency project skills are not runnable merely because the plugin is
  installed. Run `agency config get profiles`; a missing `profiles` key means
  `installed-unconfigured`, and each configured profile still needs a harmless
  MCP/auth smoke check.

## 7. Keep the Constellation Current

Use native Copilot CLI lifecycle commands:

```powershell
copilot plugin list
copilot plugin update alex-act-core
copilot plugin uninstall <plugin-name>
```

After a Core update, invoke `/alex-act-core bootstrap-core` so the user-scope
receipt and hashes are checked against the newly installed Core.

## VS Code 1.131 Skill Resolver Workaround

VS Code 1.131 advertises plugin skills that its generic resolver cannot load.
Preserve Agent Skills while disabling only that broken resolver in user
settings:

```jsonc
{
  "chat.useAgentSkills": true,
  "github.copilot.chat.skillTool.enabled": false
}
```

This is a temporary workaround for [microsoft/vscode#314772](https://github.com/microsoft/vscode/issues/314772).
Reload VS Code or start a new Agent chat after changing the setting. Namespaced
commands remain the fallback when a generic skill call is unavailable.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| `os error 5` or `os error 32` during a plugin write | Windows only: close all VS Code windows and retry from a standalone terminal. macOS does not lock loaded plugin files. |
| A public plugin version is stale | Run `copilot plugin marketplace update alex-mall`, then retry the targeted install or update. |
| Core skills exist but ACT instructions do not fire | Invoke `/alex-act-core bootstrap-core` and approve Core instruction activation. |
| Workspace CSS differs from the bundled stylesheet | Preview `--refresh-css`, then use `--apply` only if replacement is intended. |
| A generic skill call fails while the namespaced command exists | Use the namespaced command; report the generic bridge as `host-limited`, not missing. |
| MSFT installs but internal tools fail | Confirm Microsoft corporate identity and network access, then run `/alex-act-msft setup-msft` in audit mode. |

## Expected End State

- [ ] Core is installed from `alex-mall` at the published version.
- [ ] Selected specialization plugins are installed and enabled.
- [ ] The 16-file Core-owned instruction activation is verified or explicitly
  declined.
- [ ] If project bootstrap is selected, the current workspace preserves its settings and reports CSS parity.
- [ ] Repeated project work is kept local through a reviewed project skill or script; cross-platform work remains optional.
- [ ] Optional workload configuration is limited to the projects that need it.
