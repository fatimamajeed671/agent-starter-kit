---
name: roadmap
description: Keeps a short task list of steps only the user can do, grouped in segments, and has the agent ask about the next one each session. Use when the user says "start my task list", "set up a roadmap", "what's on my list", or "add/tick a step".
---

A roadmap is `~/.claude/roadmap.md`: segments (`## ` headings), each a short ordered list of steps the **user** must do. Agent work does not belong here; it just happens when asked.

## Format

```markdown
# Roadmap
## <segment: an area of your work>
- [ ] R1 <one line: verb + object, ends with what "done" looks like>
- [x] R2 <ticked>
```

IDs are unique (R1, R2...). Order is priority. The first open step of each segment is shown at session start. A step listed in two segments shares one ID.

## Set up (no file yet)

1. Ask once with `AskUserQuestion` (max 3 questions): which 2-4 areas of work (segments) they want tracked; for each, the 1-3 things only they can do next (decide, approve, supply data, practise); anything they want revisited weekly.
2. Write `~/.claude/roadmap.md` in the format above. Keep each step to one line; split vague ones until they are one sitting.
3. Show `bash ~/.claude/skills/roadmap/roadmap.sh next` and confirm. Show the file before saving if they ask.

## Use

- `roadmap.sh next` shows one open step per segment, `list` shows all, `list <segment>` expands one segment (any part of its name), `done ID` ticks one.
- Adding a step: append a `- [ ] Rn ...` line under its segment; take the next free ID.
- The session-start hook (`hooks/claude/guard.sh`, with `activation.md` from this skill) does the asking; without hooks, run the script yourself at the start of a session and ask the same question.
- Only offer steps; never start one the user did not choose.
