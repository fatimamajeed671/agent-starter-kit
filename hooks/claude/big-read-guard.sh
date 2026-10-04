#!/usr/bin/env bash
# PreToolUse(Read): warn when a whole large file is read with no offset/limit.
. "$(dirname "$0")/lib.sh"
input=$(cat)
path=$(jq -r '.tool_input.file_path // empty' <<<"$input")
lim=$(jq -r '.tool_input.limit // .tool_input.offset // empty' <<<"$input")
{ [ -z "$path" ] || [ -n "$lim" ] || [ ! -f "$path" ]; } && exit 0
size=$(fsize "$path")
[ "${size:-0}" -lt 200000 ] && exit 0
emit PreToolUse "'$path' is $((size/1024)) KB. Search for the lines you need, then Read with offset and limit instead of the whole file."
