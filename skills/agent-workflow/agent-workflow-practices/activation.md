<!-- agent-workflow:begin -->
SUBAGENT MODEL RULES (set `model` on every Agent call; use the named agent type that fits, else the default):
- Cheapest tier (Haiku): scripted or mechanical work only (run a script, hash check, file listing, upload, refresh a saved copy). Never visual judgement.
- Mid tier (Sonnet): building from a spec and visual review. The builder is never the reviewer.
- Strongest tier (this model): plans and decides; does not edit, audit or screenshot when a subagent can.
- Subagents reply in 5 lines or fewer; details go to a REPORT.md. Reuse an agent via SendMessage for follow-ups. Verify by checksum or measurement, never assume a change landed.
Full rules: agent-workflow-practices SKILL.md.
<!-- agent-workflow:end -->
