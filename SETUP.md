# Setup guide for AI agents

A user has given you this repo's link and asked you to set it up. Follow these steps in order. Ask before anything that changes their machine, and report plainly what you did.

## Claude Code

1. **Check tools.** `git`, `bash` and `jq` must be installed. If `jq` is missing, tell the user the install command (`brew install jq` on macOS, `sudo apt install jq` on Debian/Ubuntu) and wait. Don't install anything without asking.
2. **Get the repo.** If `~/agent-starter-kit` exists, run `git -C ~/agent-starter-kit pull`. Otherwise run `git clone https://github.com/fatimamajeed671/agent-starter-kit.git ~/agent-starter-kit`.
3. **Explain and ask.** In three lines, tell the user what the skills and hooks do (the README table). Ask: skills and hooks (recommended), or skills only?
4. **Dry run.** `~/agent-starter-kit/install.sh --claude --dry-run` (add `--no-hooks` for skills only). Show the user the output and ask to go ahead.
5. **Install.** Run the same command without `--dry-run`. Report each skill as installed, updated, up to date or skipped. A skipped skill means the user already has their own version; leave it alone and say so.
6. **Verify.**
   - `ls ~/.claude/skills` shows the kit's skills.
   - `jq -e . ~/.claude/settings.json` succeeds.
   - With hooks: `bash ~/.claude/hooks/agent-starter-kit/session-rules.sh | jq .` prints JSON.
7. **Finish.** Tell the user to start a new Claude Code session so the skills load, and that `/improve-prompt` is a good first one to try.
8. **Optional: sync across machines.** Only if the user says they use more than one computer and wants their skills the same on each: point them to `docs/sync.md` and offer to walk through it. It needs a private GitHub repo of their own. Otherwise skip this step.

## Updating later

`git -C ~/agent-starter-kit pull && ~/agent-starter-kit/install.sh --claude`. Kit skills the user hasn't changed are updated; changed ones are skipped.

## Codex and other agents

There is no skills folder. Copy `AGENTS.md` into the user's project root, or merge it into their existing one, and offer to paste in the text of any skill they want (see `docs/codex.md`). Skip the hooks; they are for Claude Code only.

## Rules

- Never overwrite or delete a skill the user already has.
- Change `~/.claude/settings.json` only through `install.sh`, which backs it up first.
- Never commit or push to this repo. To suggest a change, see CONTRIBUTING.md.
