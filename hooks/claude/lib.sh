#!/usr/bin/env bash
# Shared helpers for the hooks. Portable across macOS and Linux.
fsize() { wc -c < "$1" 2>/dev/null | tr -d ' ' || echo 0; }
fmtime() { stat -f %m "$1" 2>/dev/null || stat -c %Y "$1" 2>/dev/null || echo 0; }
emit() { jq -n --arg e "$1" --arg m "$2" '{hookSpecificOutput:{hookEventName:$e,additionalContext:$m}}'; }
