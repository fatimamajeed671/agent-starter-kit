#!/usr/bin/env bash
# SessionStart: load the lean-mode rules into every session. Delete this hook to make lean mode opt-in.
f="$HOME/.claude/skills/lean-mode/activation.md"
[ -f "$f" ] || exit 0
. "$(dirname "$0")/lib.sh"
emit SessionStart "$(cat "$f")"
