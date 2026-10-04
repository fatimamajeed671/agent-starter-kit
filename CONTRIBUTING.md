# Contributing

Anyone can suggest a change. Only the owner can merge it, and every pull request is reviewed first.

## How to suggest a change

1. Click **Fork** on GitHub to get your own copy.
2. Make the change in your copy (on GitHub, or clone it and push).
3. Open a **pull request** to this repo and say what it changes and why.
4. The owner reviews it and merges it, asks for changes, or closes it.

## Rules for skills

- One folder per skill under `skills/`, with a `SKILL.md` that has `name` and `description` in its header.
- Your own work, or under a licence that allows sharing. Credit the source.
- Short and general: no personal paths, names, accounts or secrets.
- Test it in Claude Code before opening the pull request.

## Rules for hooks

- Only add a note for the agent; never block tools or edit files.
- Portable bash (macOS and Linux) with `jq`, and an entry in `hooks/claude/settings-hooks.json`.
