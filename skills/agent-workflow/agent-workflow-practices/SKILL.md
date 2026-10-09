---
name: agent-workflow-practices
description: Use when a task has several steps and you delegate to subagents (build, review, check). Covers who does what by model tier, short reports, batching tool calls, handoff files and keeping approved decisions locked.
---

# Agent workflow practices

Rules for multi-step work where one lead agent plans and subagents do the work. Cuts tokens and rework.

## Roles

| Role | Model tier | Does | Never |
|---|---|---|---|
| Lead / planner | strongest | plans, decides, writes the spec | edits files, runs audits, takes screenshots |
| Builder | mid | edits from the lead's spec | reviews its own work |
| Reviewer | mid | checks the result, reports pass/fail with measurements | edits, even to fix a small thing |
| Scripted worker | cheapest | runs scripts, uploads, hash checks, file listings, refreshing saved copies | judges anything visual |

Why: the cheapest tier misses visual issues, and a redo costs more than using the mid tier once. The builder is never the reviewer. One reviewer per release.

## When to delegate

- Delegate whenever subagents give a better or cheaper result: broad searches, independent parallel work, long mechanical runs, and anything that would flood the lead's context.
- Keep small, sequential or judgement-heavy steps inline.
- A fresh reviewer beats self-review.

## Reports

- Every subagent replies in 5 lines or fewer. Details go to a REPORT.md next to the work.
- Reviewer format: per check pass/fail plus the measurement, paths of evidence (crops, logs), errors, 15 lines at most.
- Reuse an agent for follow-ups (SendMessage) instead of spawning a new one. Ignore duplicate reports.

## Verify, do not assume

- A builder report may never arrive. Check the spec file or send a reviewer to measure; never assume a change landed.
- Verify a deploy or upload by checksum (curl and sha256), not by screenshot.

## Batch calls

- One batch per mechanical sequence (for example navigate, find input, upload, confirm), with no screenshots in between.
- For design work: design everything first, then one build, one deploy, one live check. Fix only what the check names.
- Run independent steps in parallel, dependent steps in order. Give parallel processes random ports and kill strays when done.

## Handoff and memory

- Keep a HANDOFF file with a "RESUME HERE" block (state, next step, open questions) so a new session does not re-derive anything.
- Keep a DECISIONS file as the build spec: approved choices with the values.
- Point the memory entry at the handoff file.

## Locked decisions

- Approved means fixed. Do not reopen, redesign or propose merges for an approved piece. Later work only aligns values (spacing, type, colour) to the shared system.
- New pages or parts keep their own structure; "align" means the visual system only.

## Skill hygiene

- A skill holds process and open bugs only. No change history; keep the open-bugs list current by removing fixed items.

## Writing skills

A skill holds process and the current list of open bugs only. No change logs, "fixed on <date>" notes or deploy history: remove a bug entry once it is fixed and deployed, and phrase lessons from a fix as timeless gotchas. History belongs in work-folder reports.
