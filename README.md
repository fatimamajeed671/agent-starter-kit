# agent-starter-kit

A small, readable set of skills and rules to make an AI coding agent clearer, cheaper and safer to work with. Built for Claude Code beginners; the rules also work in Codex and other agents that read `AGENTS.md`.

Everything here is plain Markdown and short shell scripts. Read it before you install it: skills and hooks run with your permissions.

## Quick setup with Claude

Paste this into Claude Code:

```
Set up https://github.com/fatimamajeed671/agent-starter-kit for me. Follow its SETUP.md.
```

Claude clones the repo, lists the skills and asks which ones you want, shows a dry run, and installs after you agree. Run the same line again later to update.

## What's inside

Skills are grouped in segment folders (`skills/<segment>/<name>`) and installed flat (`~/.claude/skills/<name>`).

| Item | Segment | What it does | Works in |
|---|---|---|---|
| `skills/content/anti-ai-slop-writing` | content | Rules for prose that reads like a person wrote it. | Claude Code |
| `skills/content/headline-writing` | content | Headlines and taglines: patterns, checks and sources. | Claude Code |
| `skills/design/ui-ux-design` | design | Cited UX, layout and accessibility rules for pages and apps. See its `SOURCES.md`. | Claude Code |
| `skills/web-app/web-app-standards` | web-app | Security headers, QA checklist, deploy-by-hash, browser testing gotchas, two audit scripts. | Claude Code |
| `skills/agent-workflow/agent-workflow-practices` | agent-workflow | Roles by model tier, short reports, batching, handoff files for multi-agent work. | Claude Code |
| `skills/agent-workflow/improve-prompt` | agent-workflow | Checks a prompt for a missing target, goal or success check and asks up to 3 questions before work starts. | Claude Code (`/improve-prompt`) |
| `skills/agent-workflow/token-diet` | agent-workflow | Shorter replies, smaller reads, fewer turns, same correctness. | Claude Code |
| `hooks/claude/` | Optional nudges in one script: loads token-diet and the subagent model rules at session start, warns before reading a huge file whole, flags a bloated memory folder, warns when the context grows large, suggests `/clear` after 40 prompts. | Claude Code |
| `AGENTS.md` | The same core rules as a single file. | Codex and other `AGENTS.md` agents |
| `sync/sync.sh` | Optional: keep your skills identical on several machines through a private git repo. | Any machine with git |
| `skills/sales/cold-email` | sales | B2B cold outbound: emails, follow-ups, sending setup, LinkedIn, multichannel cadence, reply handling. Unmodified MIT copy, see its `SOURCES.md`. | Claude Code |
| `skills/sales/sales-enablement` | sales | Decks, one-pagers, objection docs, battle cards, demo and call scripts, win-loss analysis. Unmodified MIT copy, see its `SOURCES.md`. | Claude Code |
| `skills/sales/objection-handling` | sales | Surface the real objection behind the stated one, resolve it with evidence, re-ask. Unmodified MIT copy, see its `SOURCES.md`. | Claude Code |
| `skills/sales/cold-outreach-sequence` | sales | Researched LinkedIn and email outreach sequences with a pipeline tracker. Unmodified MIT copy, see its `SOURCES.md` and `NOTICE.md`. | Claude Code |

## Install

### Claude Code

```sh
git clone https://github.com/fatimamajeed671/agent-starter-kit.git
cd agent-starter-kit
./install.sh --list                                         # see the skills
./install.sh --claude --skills improve-prompt,token-diet --dry-run
./install.sh --claude --skills improve-prompt,token-diet     # omit --skills for all; add --no-hooks for skills only
./install.sh --claude --segment content,design --dry-run     # every skill in those segment folders
```

The installer copies the skills into `~/.claude/skills/` and the hooks into `~/.claude/hooks/agent-starter-kit/`, then adds the hooks to `~/.claude/settings.json` after saving a backup. Running it again after `git pull` updates the kit's skills, except ones you've changed, which it skips. It never overwrites a skill you already had. It needs `jq`. Start a new Claude Code session afterwards.

Skills must be real folders in `~/.claude/skills`; Claude Code does not load symlinked skill folders, so the installer copies.

### Codex and other agents

There is no skills folder to install into. Copy `AGENTS.md` into your project root (or merge it into the one you have). To use a skill's rules, paste its `SKILL.md` text into `AGENTS.md`. See [docs/codex.md](docs/codex.md).

### Manual

Copy any `skills/<segment>/<name>` folder into `~/.claude/skills/<name>` (flat, no segment folder). Hooks are optional; see [docs/claude-code.md](docs/claude-code.md).

## The hooks

| Event | Effect |
|---|---|
| SessionStart | Loads `token-diet/activation.md` and `agent-workflow-practices/activation.md` (installed under `~/.claude/skills/`, source `skills/agent-workflow/`) into every session. Silent otherwise unless Claude's memory index passes 50 lines, a memory file passes 3 KB, or one is 60 days old (it never deletes). |
| Before Read | Suggests searching first when a file over 200 KB is read whole, and when the same file is read whole twice. |
| Each prompt | One nudge when the context passes about 100k tokens, a stronger one past 150k, and one after 40 prompts to check the session is still one task. |

All three events run one script, `hooks/claude/guard.sh`.

The hook only adds a note for the agent. It never blocks a tool or edits files. To disable it, delete its entries from the `hooks` section of `~/.claude/settings.json`; to drop one nudge, delete that block in the script.

## Uninstall

```sh
./install.sh --uninstall --dry-run
./install.sh --uninstall
```

It removes the kit's hooks and their `settings.json` entries, and removes each kit skill only if you have not edited it.

## Sync across machines (optional, only if you want it)

`sync/sync.sh` commits your `~/.claude/skills` and `~/.claude/hooks` to a private repo, pulls the other machine's changes and pushes, when you run it. No scheduler, no AI. It refuses to commit likely secrets or a mass deletion. Setup: [docs/sync.md](docs/sync.md).

## Credits

- `skills/agent-workflow/token-diet` is a shortened adaptation of [Kulaxyz/token-diet](https://github.com/Kulaxyz/token-diet).
- `skills/content/anti-ai-slop-writing` is a shortened adaptation of [jalaalrd/anti-ai-slop-writing](https://github.com/jalaalrd/anti-ai-slop-writing).
- `skills/design/ui-ux-design` credits its sources and licences in its own `SOURCES.md` and `NOTICE` files.
- `skills/sales/cold-email` and `skills/sales/sales-enablement` are unmodified copies from [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) (MIT, Corey Haines).
- `skills/sales/objection-handling` is an unmodified copy from [deciqAI/knowledge-skills](https://github.com/deciqAI/knowledge-skills) (MIT, deciqAI).
- `skills/sales/cold-outreach-sequence` is an unmodified copy from [brianrwagner/ai-marketing-claude-code-skills](https://github.com/brianrwagner/ai-marketing-claude-code-skills) (MIT per the author's README; no LICENSE file, see its `NOTICE.md`).

Neither source repo publishes a licence, so those two folders are not covered by this repo's licence; rights stay with their authors. Authors: open an issue and they will be credited differently or removed.

## Licence

MIT for everything except the two adapted skills above. The four `skills/sales` copies keep their own upstream MIT licences (a `LICENSE` file in each folder, or a `NOTICE.md` quoting the README where upstream has none). See [LICENSE](LICENSE).
