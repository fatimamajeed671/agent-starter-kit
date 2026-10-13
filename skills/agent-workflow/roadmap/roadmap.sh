#!/usr/bin/env bash
# roadmap.sh [next|list [segment]|done ID] — plain bash, no AI. Reads and ticks ~/.claude/roadmap.md (override: ROADMAP_FILE).
# A segment is a "## " heading; `next` prints the first open step of each segment.
f="${ROADMAP_FILE:-$HOME/.claude/roadmap.md}"
[ -f "$f" ] || { echo "no roadmap at $f"; exit 1; }
case "${1:-next}" in
  next) awk '/^## /{seg=substr($0,4)} /^- \[ \] /{ if(!(seg in s)){s[seg]=1; print seg ": " substr($0,7)} }' "$f" ;;
  list) awk -v q="${2:-}" 'BEGIN{q=tolower(q)} /^## /{on=(q==""||index(tolower($0),q)); if(on) print "\n" substr($0,4)} on&&/^- \[/{print}' "$f" ;;
  done) [ -n "${2:-}" ] || { echo "usage: roadmap.sh done ID"; exit 1; }
        grep -q "^- \[ \] $2 " "$f" || { echo "no open step $2"; exit 1; }
        sed -i.bak "s/^- \[ \] $2 /- [x] $2 /" "$f" && rm -f "$f.bak" && { echo "ticked $2. next per segment:"; "$0" next; } ;;
  *) echo "usage: roadmap.sh [next|list [segment]|done ID]"; exit 1 ;;
esac
