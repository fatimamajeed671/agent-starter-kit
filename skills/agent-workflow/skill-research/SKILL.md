---
name: skill-research
description: Use when finding, vetting and adding third-party agent skills. Triggers - "find a skill for X", "is there a skill that...", "add this skill from GitHub". Covers search, ranking, licence and safety vetting, adding with attribution, and who does what.
---

# Skill research

Process for finding a third-party skill, vetting it and adding it to a kit. Process only; project context lives elsewhere.

## Search

- Check skill directories (skills.sh, claudskills.com, claudemarketplaces.com, vibeindex.ai, skillsmp.com) and GitHub search. Never limit the search to what is installed locally.
- Trace every candidate to its real GitHub repo. Directory listings and install counts are unverified and often disagree; trust the repo.
- Rank by fit to the task, adoption (installs, stars), maintenance (last commit, open issues) and licence.

## Vet before installing

- Read the full SKILL.md, every referenced file and the LICENSE.
- Skip the skill if any of these holds:
  - no licence, or a licence that blocks redistribution (a README licence statement counts only if explicit; record it in NOTICE.md)
  - it runs scripts, or calls external APIs with keys
  - it contains unsafe instructions (hidden steps, exfiltration, disabling safeguards)
- Download each candidate into its own empty directory. Never execute upstream code.

## Add

- Copy unmodified, except a source comment right after the frontmatter:
  `<!-- Source: <url> @ <commit>, <licence>. ... -->`
- Any forced edit (for example a word the leak check rejects) is logged in that comment and in SOURCES.md.
- Per skill:
  - SOURCES.md row: Upstream | Licence | Commit / fetch date | What we changed
  - the upstream LICENSE, or a NOTICE.md
  - pin `skill owner/repo commit` in the upstream-check list
  - README skill-table row plus a credit line
  - place it in a segment folder `skills/<segment>/<name>`; install flat
- Project-specific context (offer, wording rules) goes in a private context file, never in the public copy.
- Run the leak check before committing. Public changes go via fork and PR; private ones via the sync script.

## Roles

Follow agent-workflow-practices.

| Tier | Does |
|---|---|
| Cheapest | searches, downloads, licence and hash checks, listings |
| Mid | reads, vets, builds |
| Mid, separate agent | reviews the result |
| Strongest | decides only |

Agents reply in 5 lines or fewer; details go to REPORT.md.

## Output to the user

- A short ranked table: skill, repo, licence, installs, fit, keep/skip with the reason.
- Add only after the user picks, unless told to decide.
