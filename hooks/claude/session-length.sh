#!/usr/bin/env bash
# UserPromptSubmit: one nudge per session once it passes 40 prompts.
. "$(dirname "$0")/lib.sh"
sid=$(jq -r '.session_id // empty')
[ -z "$sid" ] && exit 0
d="${TMPDIR:-/tmp}/agent-starter-kit"; mkdir -p "$d"
turns=$(( $(cat "$d/$sid.turns" 2>/dev/null || echo 0) + 1 )); echo "$turns" > "$d/$sid.turns"
[ "$turns" -lt 40 ] || [ -e "$d/$sid.nudged" ] && exit 0
touch "$d/$sid.nudged"
emit UserPromptSubmit "This session has $turns prompts. Ask whether it is still one task; suggest /clear if the topic changed."
