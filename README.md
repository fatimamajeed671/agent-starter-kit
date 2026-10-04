# agent-starter-kit

A small, readable set of skills and rules to make an AI coding agent clearer, cheaper and safer to work with. Built for Claude Code beginners; the rules also work in Codex and other agents that read `AGENTS.md`.

Everything here is plain Markdown and short shell scripts. Read it before you install it: skills and hooks run with your permissions.

## What's inside

| Item | What it does | Works in |
|---|---|---|
| `skills/improve-prompt` | Checks a prompt for a missing target, goal or success check and asks up to 3 questions before work starts. | Claude Code (`/improve-prompt`) |
| `skills/token-diet` | Shorter replies, smaller reads, fewer turns, same correctness. | Claude Code |
| `skills/anti-ai-slop-writing` | Rules for prose that reads like a person wrote it. | Claude Code |
| `hooks/claude/` | Optional nudges: loads token-diet at session start, warns before reading a huge file whole, flags a bloated memory folder, suggests `/clear` after 40 prompts. | Claude Code |
| `AGENTS.md` | The same core rules as a single file. | Codex and other `AGENTS.md` agents |
| `sync/sync.sh` | Optional: keep your skills identical on several machines through a private git repo. | Any machine with git |

## Install

### Claude Code

```sh
git clone https://github.com/fatimamajeed671/agent-starter-kit.git
cd agent-starter-kit
./install.sh --claude --dry-run   # see what would change
./install.sh --claude             # or add --no-hooks for skills only
```

The installer copies the skills into `~/.claude/skills/` and the hooks into `~/.claude/hooks/agent-starter-kit/`, then adds the hooks to `~/.claude/settings.json` after saving a backup. It never overwrites a skill you already have, and running it twice changes nothing. It needs `jq`. Start a new Claude Code session afterwards.

Skills must be real folders in `~/.claude/skills`; Claude Code does not load symlinked skill folders, so the installer copies.

### Codex and other agents

There is no skills folder to install into. Copy `AGENTS.md` into your project root (or merge it into the one you have). To use a skill's rules, paste its `SKILL.md` text into `AGENTS.md`. See [docs/codex.md](docs/codex.md).

### Manual

Copy any `skills/<name>` folder into `~/.claude/skills/`. Hooks are optional; see [docs/claude-code.md](docs/claude-code.md).

## The hooks

| Hook | Event | Effect |
|---|---|---|
| `session-rules.sh` | SessionStart | Loads `skills/token-diet/activation.md` into every session. Remove it to make it opt-in. |
| `big-read-guard.sh` | Before Read | Suggests searching first when a file over 200 KB is read whole. |
| `memory-check.sh` | SessionStart | Silent unless Claude's memory index passes 50 lines, a memory file passes 3 KB, or one is 60 days old. Never deletes. |
| `session-length.sh` | Each prompt | One nudge after 40 prompts to check the session is still one task. |

All hooks only add a note for the agent. None blocks a tool or edits files. To disable one, delete its entry from the `hooks` section of `~/.claude/settings.json`.

## Uninstall

```sh
./install.sh --uninstall --dry-run
./install.sh --uninstall
```

It removes the kit's hooks and their `settings.json` entries, and removes each kit skill only if you have not edited it.

## Sync across machines (optional)

`sync/sync.sh` commits your `~/.claude/skills` and `~/.claude/hooks` to a private repo, pulls the other machine's changes and pushes, when you run it. No scheduler, no AI. It refuses to commit likely secrets or a mass deletion. Setup: [docs/sync.md](docs/sync.md).

## Contributing

A new skill needs a `SKILL.md` with `name` and `description`, must be your own work or carry a compatible licence, and must contain no personal paths or secrets. Keep it short.

## Credits

- `skills/token-diet` is a shortened adaptation of [Kulaxyz/token-diet](https://github.com/Kulaxyz/token-diet).
- `skills/anti-ai-slop-writing` is a shortened adaptation of [jalaalrd/anti-ai-slop-writing](https://github.com/jalaalrd/anti-ai-slop-writing).

Neither source repo publishes a licence, so those two folders are not covered by this repo's licence; rights stay with their authors. Authors: open an issue and they will be credited differently or removed.

## Licence

MIT for everything except the two adapted skills above. See [LICENSE](LICENSE).
