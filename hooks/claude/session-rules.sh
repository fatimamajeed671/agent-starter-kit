#!/usr/bin/env bash
# SessionStart: load the token-diet rules into every session. Delete this hook to make them opt-in.
f="$HOME/.claude/skills/token-diet/activation.md"
[ -f "$f" ] || exit 0
. "$(dirname "$0")/lib.sh"
emit SessionStart "$(cat "$f")"
