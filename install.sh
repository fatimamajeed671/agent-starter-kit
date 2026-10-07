#!/usr/bin/env bash
# Install or update the starter kit in Claude Code (~/.claude). Copies files; never overwrites skills you changed.
# Re-run after `git pull` to update: unchanged kit skills are replaced, edited ones are skipped.
set -euo pipefail
usage() { echo "Usage: ./install.sh --list | --claude [--skills a,b] [--segment content,design] [--dry-run] [--no-hooks] | --uninstall [--dry-run]"; exit "${1:-1}"; }
mode=""; dry=0; hooks=1; pick=""; segs=""
while [ $# -gt 0 ]; do a=$1; shift; case "$a" in
  --claude) mode=install ;; --uninstall) mode=uninstall ;; --list) mode=list ;;
  --skills) pick=$(echo "${1:-}" | tr ',' ' '); shift || true ;;
  --segment) segs=$(echo "${1:-}" | tr ',' ' '); shift || true ;;
  --dry-run) dry=1 ;; --no-hooks) hooks=0 ;; -h|--help) usage 0 ;; *) usage ;;
esac; done
[ -n "$mode" ] || usage
kit=$(cd "$(dirname "$0")" && pwd)
# Skills sit in segment folders (skills/<segment>/<name>); they are installed flat (~/.claude/skills/<name>).
resolve() { for d in "$kit"/skills/*/"$1"; do [ -f "$d/SKILL.md" ] && { echo "$d"; return 0; }; done; return 1; }
all_skills() { for f in "$kit"/skills/*/*/SKILL.md; do basename "$(dirname "$f")"; done; }
if [ "$mode" = list ]; then
  for f in "$kit"/skills/*/*/SKILL.md; do
    printf '%s/%s: %s\n' "$(basename "$(dirname "$(dirname "$f")")")" "$(basename "$(dirname "$f")")" "$(awk '/^description:/{sub(/^description:[ ]*>?-?[ ]*/,""); d=$0; getline; while ($0 ~ /^  /) {sub(/^ +/,""); d=d" "$0; getline} print d; exit}' "$f")"
  done
  exit 0
fi
command -v jq >/dev/null || { echo "jq is required: brew install jq (macOS) or apt install jq"; exit 1; }

c="$HOME/.claude"; hookdir="$c/hooks/agent-starter-kit"; settings="$c/settings.json"
run() { if [ "$dry" = 1 ]; then echo "  would run: $*"; else "$@"; fi; }
tag='agent-starter-kit/'
manifest="$c/.agent-starter-kit-manifest"   # "<skill> <hash>" for each skill the kit installed
st() { if [ "$dry" = 1 ]; then echo "skill $1: would be $2"; else echo "skill $1: $2"; fi; }
dirhash() { (cd "$1" && find . -type f ! -name .DS_Store -print0 | LC_ALL=C sort -z | xargs -0 shasum | shasum | cut -c1-40); }
recorded() { awk -v n="$1" '$1==n {print $2}' "$manifest" 2>/dev/null; }
record() { [ "$dry" = 1 ] && return; { grep -v "^$1 " "$manifest" 2>/dev/null || true; echo "$1 $2"; } > "$manifest.tmp"; mv "$manifest.tmp" "$manifest"; }

if [ "$mode" = install ]; then
  # Which skills: --skills if given; else the ones installed before (update); else all.
  if [ -z "$pick" ] && [ -s "$manifest" ]; then pick=$(awk '{print $1}' "$manifest" | tr '\n' ' '); fi
  if [ -n "$segs" ]; then
    for g in $segs; do [ -d "$kit/skills/$g" ] || { echo "Unknown segment: $g (folders in skills/)"; exit 1; }
      pick="$pick $(for f in "$kit"/skills/"$g"/*/SKILL.md; do basename "$(dirname "$f")"; done | tr '\n' ' ')"; done
  fi
  if [ -z "$pick" ]; then pick=$(all_skills | tr '\n' ' '); fi
  for n in $pick; do resolve "$n" >/dev/null || { echo "Unknown skill: $n (see ./install.sh --list)"; exit 1; }; done
  echo "skills: $pick"
  run mkdir -p "$c/skills"
  for n in $pick; do
    s="$(resolve "$n")/"; t="$c/skills/$n"; new=$(dirhash "${s%/}")
    if [ ! -e "$t" ]; then
      run cp -R "${s%/}" "$t"; record "$n" "$new"; st "$n" installed
    else
      cur=$(dirhash "$t")
      if [ "$cur" = "$new" ]; then record "$n" "$new"; echo "skill $n: up to date"
      elif [ "$cur" = "$(recorded "$n")" ]; then run rm -rf "$t"; run cp -R "${s%/}" "$t"; record "$n" "$new"; st "$n" updated
      else echo "skill $n: skipped, $t has your own changes (or is not from this kit)"; fi
    fi
  done
  [ "$hooks" = 1 ] || { echo "Done (no hooks)."; exit 0; }
  run mkdir -p "$hookdir"
  for old in big-read-guard lib memory-check session-length session-rules; do run rm -f "$hookdir/$old.sh"; done
  run cp "$kit"/hooks/claude/*.sh "$hookdir/"
  [ "$dry" = 1 ] || echo "hooks: copied to $hookdir"
  [ -f "$settings" ] || run sh -c "echo '{}' > '$settings'"
  run cp "$settings" "$settings.bak-$(date +%Y%m%d%H%M%S)" 2>/dev/null || true
  if [ "$dry" = 1 ]; then echo "  would replace kit hooks in $settings"
  else
    # drop earlier kit entries (any version), then add the current ones
    jq --arg t "$tag" '.hooks |= ((. // {}) | with_entries(.value |= map(select([.hooks[]?.command // ""] | any(contains($t)) | not))))' "$settings" > "$settings.tmp" &&
    jq -s '.[1].hooks as $s | .[0] | .hooks = (reduce ($s|keys[]) as $k ((.hooks // {}); .[$k] = ((.[$k] // []) + $s[$k])))' \
      "$settings.tmp" "$kit/hooks/claude/settings-hooks.json" > "$settings.tmp2" && mv "$settings.tmp2" "$settings" && rm -f "$settings.tmp"
    echo "settings.json: kit hooks set to current version (backup saved next to it)"
  fi
  echo "Done. Start a new Claude Code session to load the skills."
  exit 0
fi

# uninstall: remove only what the kit installed, and only if unchanged
for s in "$kit"/skills/*/*/; do
  n=$(basename "$s"); t="$c/skills/$n"
  [ -d "$t" ] || continue
  cur=$(dirhash "$t")
  if [ "$cur" = "$(dirhash "${s%/}")" ] || [ "$cur" = "$(recorded "$n")" ]; then run rm -rf "$t"; echo "skill $n: removed"
  else echo "skill $n: kept (differs from the kit version)"; fi
done
[ -d "$hookdir" ] && run rm -rf "$hookdir" && echo "hooks: removed"
[ "$dry" = 1 ] || rm -f "$manifest"
if [ -f "$settings" ]; then
  if [ "$dry" = 1 ]; then echo "  would remove kit hooks from $settings"
  else
    cp "$settings" "$settings.bak-$(date +%Y%m%d%H%M%S)"
    jq --arg t "$tag" 'if .hooks then .hooks |= (with_entries(.value |= (map(.hooks |= map(select((.command // "") | contains($t) | not))) | map(select(.hooks | length > 0)))) | with_entries(select(.value | length > 0))) else . end' \
      "$settings" > "$settings.tmp" && mv "$settings.tmp" "$settings"
    echo "settings.json: kit hooks removed (backup saved next to it)"
  fi
fi
