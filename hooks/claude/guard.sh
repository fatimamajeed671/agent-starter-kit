#!/usr/bin/env bash
# One hook for every event (SessionStart, UserPromptSubmit, PreToolUse:Read). Reads the event JSON on stdin.
# Only adds a note for the agent: never blocks a tool, never edits or deletes your files. Needs bash and jq (macOS and Linux).
# Counters live in ${TMPDIR:-/tmp}/agent-starter-kit and are pruned at SessionStart.
# To turn a nudge off, delete its block below; to drop the hook, delete its entries from ~/.claude/settings.json.
fsize() { wc -c < "$1" 2>/dev/null | tr -d ' '; }
fmtime() { stat -f %m "$1" 2>/dev/null || stat -c %Y "$1" 2>/dev/null || echo 0; }
input=$(cat)
IFS=$'\x1f' read -r ev sid tool path lim tr < <(jq -r '[.hook_event_name, .session_id, .tool_name, .tool_input.file_path, .tool_input.limit // .tool_input.offset, .transcript_path] | map((. // "") | tostring) | join("\u001f")' <<<"$input")
d="${TMPDIR:-/tmp}/agent-starter-kit"; mkdir -p "$d"
msgs=()
once() { [ -e "$d/$sid.fired.$1" ] && return 1; touch "$d/$sid.fired.$1"; }

case "$ev" in
SessionStart)
  find "$d" -type f -mtime +1 -delete 2>/dev/null
  for act in "$HOME/.claude/skills/token-diet/activation.md" "$HOME/.claude/skills/agent-workflow-practices/activation.md"; do
    [ -f "$act" ] && msgs+=("$(cat "$act")")
  done
  dir="${MEMORY_DIR:-$HOME/.claude/projects/$(echo "$HOME" | tr / -)/memory}"
  if [ -d "$dir" ]; then
    n=$(wc -l < "$dir/MEMORY.md" 2>/dev/null | tr -d ' ')
    [ "${n:-0}" -gt 50 ] && mem+="MEMORY.md has $n lines (limit 50): merge or delete entries. "
    for f in "$dir"/*.md; do
      [ -f "$f" ] || continue
      [ "$(basename "$f")" = MEMORY.md ] && continue
      size=$(fsize "$f"); age=$(( ( $(date +%s) - $(fmtime "$f") ) / 86400 ))
      [ "$size" -gt 3072 ] && mem+="$(basename "$f") is $((size/1024)) KB (limit 3 KB): trim it. "
      [ "$age" -gt 60 ] && mem+="$(basename "$f") untouched for $age days: ask the user if it is still true; delete only if they confirm. "
    done
    [ -n "${mem:-}" ] && msgs+=("Memory check: $mem")
  fi ;;
UserPromptSubmit)
  [ -z "$sid" ] && exit 0
  turns=$(( $(cat "$d/$sid.turns" 2>/dev/null || echo 0) + 1 )); echo "$turns" > "$d/$sid.turns"
  # Context fill = input + cache tokens of the last assistant reply in the transcript.
  tok=$(tail -n 60 "$tr" 2>/dev/null | jq -s 'map(select(.type=="assistant" and .message.usage)) | last | .message.usage
    | ((.input_tokens // 0) + (.cache_creation_input_tokens // 0) + (.cache_read_input_tokens // 0))' 2>/dev/null)
  case "$tok" in ''|*[!0-9]*) tok=0 ;; esac
  if   [ "$tok" -ge 150000 ] && once ctx150; then msgs+=("Context is about $((tok/1000))k tokens. Tell the user to run /compact or /clear before the next task (token-diet).")
  elif [ "$tok" -ge 100000 ] && once ctx100; then msgs+=("Context is about $((tok/1000))k tokens. If the current sub-task is done, suggest /compact now while decisions are fresh.")
  fi
  [ "$turns" -ge 40 ] && once turns40 && msgs+=("This session has $turns prompts. Ask whether it is still one task; suggest /clear if the topic changed.") ;;
PreToolUse)
  [ "$tool" = Read ] && [ -n "$path" ] && [ -z "$lim" ] && [ -f "$path" ] || exit 0
  if grep -qxF "$path" "$d/$sid.reads" 2>/dev/null; then msgs+=("'$path' was already read in full this session. Reuse the earlier content, or grep for the lines you need.")
  else echo "$path" >> "$d/$sid.reads"; fi
  size=$(fsize "$path"); size=${size:-0}
  [ "$size" -ge 200000 ] && msgs+=("'$path' is $((size/1024)) KB. Grep for the lines you need, then Read with offset and limit instead of the whole file.") ;;
esac

[ ${#msgs[@]} -eq 0 ] && exit 0
m=$(printf '%s\n\n' "${msgs[@]}")
jq -n --arg e "$ev" --arg m "$m" '{hookSpecificOutput:{hookEventName:$e,additionalContext:$m}}'
