#!/usr/bin/env bash
# SessionStart: silent unless Claude's auto-memory folder crosses a limit. Never deletes anything.
# Override the folder with MEMORY_DIR.
. "$(dirname "$0")/lib.sh"
dir="${MEMORY_DIR:-$HOME/.claude/projects/$(echo "$HOME" | tr / -)/memory}"
[ -d "$dir" ] || exit 0
msgs=()
lines=$(wc -l < "$dir/MEMORY.md" 2>/dev/null | tr -d ' ')
[ "${lines:-0}" -gt 50 ] && msgs+=("MEMORY.md has $lines lines (limit 50): merge or delete entries.")
for f in "$dir"/*.md; do
  [ -f "$f" ] || continue
  [ "$(basename "$f")" = MEMORY.md ] && continue
  size=$(fsize "$f"); age=$(( ( $(date +%s) - $(fmtime "$f") ) / 86400 ))
  [ "$size" -gt 3072 ] && msgs+=("$(basename "$f") is $((size/1024)) KB (limit 3 KB): trim it.")
  [ "$age" -gt 60 ] && msgs+=("$(basename "$f") untouched for $age days: ask the user if it is still true; delete only if they confirm.")
done
[ ${#msgs[@]} -eq 0 ] && exit 0
emit SessionStart "Memory check: $(printf '%s ' "${msgs[@]}")"
