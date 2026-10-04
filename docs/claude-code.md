# Claude Code

- **Skills** live in `~/.claude/skills/<name>/SKILL.md` (all projects) or `.claude/skills/<name>/SKILL.md` (one project). Each folder must be a real folder, not a symlink.
- **Hooks** are registered in `~/.claude/settings.json` under `"hooks"`. The kit's entries are in `hooks/claude/settings-hooks.json` and all point at `~/.claude/hooks/agent-starter-kit/`.
- Run a skill by name, e.g. `/improve-prompt`, or let Claude pick it from its description.
- After installing, start a new session; skills and hooks load at session start.
- Hooks need `bash` and `jq`.

To add the hooks by hand, merge `settings-hooks.json` into your settings, keeping your own entries:

```sh
cd ~/.claude && cp settings.json settings.json.bak
jq -s '.[1].hooks as $s | .[0] | .hooks = (reduce ($s|keys[]) as $k ((.hooks // {}); .[$k] = ((.[$k] // []) + $s[$k])))' \
  settings.json /path/to/agent-starter-kit/hooks/claude/settings-hooks.json > s.tmp && mv s.tmp settings.json
```
