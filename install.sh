#!/usr/bin/env bash
# Install the starter kit into Claude Code (~/.claude). Copies files; never overwrites your own skills.
set -euo pipefail
usage() { echo "Usage: ./install.sh --claude [--dry-run] [--no-hooks] | --uninstall [--dry-run]"; exit "${1:-1}"; }
mode=""; dry=0; hooks=1
for a in "$@"; do case "$a" in
  --claude) mode=install ;; --uninstall) mode=uninstall ;;
  --dry-run) dry=1 ;; --no-hooks) hooks=0 ;; -h|--help) usage 0 ;; *) usage ;;
esac; done
[ -n "$mode" ] || usage
command -v jq >/dev/null || { echo "jq is required: brew install jq (macOS) or apt install jq"; exit 1; }

kit=$(cd "$(dirname "$0")" && pwd)
c="$HOME/.claude"; hookdir="$c/hooks/agent-starter-kit"; settings="$c/settings.json"
run() { if [ "$dry" = 1 ]; then echo "  would run: $*"; else "$@"; fi; }
tag='agent-starter-kit/'

if [ "$mode" = install ]; then
  run mkdir -p "$c/skills"
  for s in "$kit"/skills/*/; do
    n=$(basename "$s")
    if [ -e "$c/skills/$n" ]; then echo "skip skill $n: $c/skills/$n already exists"
    else run cp -R "${s%/}" "$c/skills/$n"; [ "$dry" = 1 ] || echo "skill $n: installed"; fi
  done
  [ "$hooks" = 1 ] || { echo "Done (no hooks)."; exit 0; }
  run mkdir -p "$hookdir"
  run cp "$kit"/hooks/claude/*.sh "$hookdir/"
  [ "$dry" = 1 ] || echo "hooks: copied to $hookdir"
  if [ -f "$settings" ] && jq -e --arg t "$tag" '[.. | .command? // empty | select(contains($t))] | length > 0' "$settings" >/dev/null; then
    echo "settings.json: kit hooks already registered, left unchanged"
  else
    [ -f "$settings" ] || run sh -c "echo '{}' > '$settings'"
    run cp "$settings" "$settings.bak-$(date +%Y%m%d%H%M%S)" 2>/dev/null || true
    if [ "$dry" = 1 ]; then echo "  would merge hooks into $settings"
    else
      jq -s '.[1].hooks as $s | .[0] | .hooks = (reduce ($s|keys[]) as $k ((.hooks // {}); .[$k] = ((.[$k] // []) + $s[$k])))' \
        "$settings" "$kit/hooks/claude/settings-hooks.json" > "$settings.tmp" && mv "$settings.tmp" "$settings"
      echo "settings.json: kit hooks added (backup saved next to it)"
    fi
  fi
  echo "Done. Start a new Claude Code session to load the skills."
  exit 0
fi

# uninstall: remove only what the kit installed, and only if unchanged
for s in "$kit"/skills/*/; do
  n=$(basename "$s"); t="$c/skills/$n"
  [ -d "$t" ] || continue
  if diff -rq "${s%/}" "$t" >/dev/null; then run rm -rf "$t"; echo "skill $n: removed"
  else echo "skill $n: kept (differs from the kit version)"; fi
done
[ -d "$hookdir" ] && run rm -rf "$hookdir" && echo "hooks: removed"
if [ -f "$settings" ]; then
  if [ "$dry" = 1 ]; then echo "  would remove kit hooks from $settings"
  else
    cp "$settings" "$settings.bak-$(date +%Y%m%d%H%M%S)"
    jq --arg t "$tag" 'if .hooks then .hooks |= (with_entries(.value |= (map(.hooks |= map(select((.command // "") | contains($t) | not))) | map(select(.hooks | length > 0)))) | with_entries(select(.value | length > 0))) else . end' \
      "$settings" > "$settings.tmp" && mv "$settings.tmp" "$settings"
    echo "settings.json: kit hooks removed (backup saved next to it)"
  fi
fi
