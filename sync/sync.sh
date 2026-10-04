#!/usr/bin/env bash
# Optional: keep your skills and hooks identical across machines through a private git repo.
# Run by hand; nothing runs in the background. Setup: see docs/sync.md.
set -u
export GIT_DIR="${SKILLS_GIT_DIR:-$HOME/.skills-sync.git}" GIT_WORK_TREE="${SKILLS_WORK_TREE:-$HOME/.claude}"
read -r -a paths <<< "${SKILLS_SYNC_PATHS:-skills hooks}"
cd "$GIT_WORK_TREE" || exit 1
[ -d "$GIT_DIR" ] || { echo "No repo at $GIT_DIR. See docs/sync.md."; exit 1; }

if [ -d "$GIT_DIR/rebase-merge" ] || [ -d "$GIT_DIR/rebase-apply" ]; then
  echo "A rebase is in progress. Finish it with: git --git-dir=$GIT_DIR --work-tree=$GIT_WORK_TREE rebase --continue (or --abort)"
  exit 1
fi
git remote get-url origin >/dev/null 2>&1 || { echo "No origin remote yet: git --git-dir=$GIT_DIR remote add origin <url>"; exit 1; }
[ -n "$(git config user.email)" ] || { echo "Set git user.name and user.email first."; exit 1; }
branch=$(git symbolic-ref --short HEAD)

secret_re='((api[_-]?key|secret|token|passw(or)?d)["'"'"']?[[:space:]]*[:=][[:space:]]*["'"'"']?[A-Za-z0-9_/+=.-]{20,})|-----BEGIN [A-Z ]*PRIVATE KEY|sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16}'

git add -A -- "${paths[@]}"
if hits=$(git grep --cached -nIiE "$secret_re" 2>/dev/null); then
  echo "Possible secrets, nothing committed (file:line):"
  echo "$hits" | cut -d: -f1,2 | sed 's/^/  /'
  git reset -q; exit 1
fi

# Guard against mass deletion, e.g. a machine whose checkout failed and left files missing.
dels=$(git diff --cached --name-only --diff-filter=D)
ndel=$(printf '%s' "$dels" | grep -c .)
if [ "$ndel" -gt 3 ] && [ "${SKILLS_SYNC_ALLOW_DELETE:-}" != 1 ]; then
  echo "This sync would delete $ndel files, nothing committed:"; echo "$dels" | sed 's/^/  /'
  echo "If that is intended: SKILLS_SYNC_ALLOW_DELETE=1 $0"
  git reset -q; exit 1
fi

git diff --cached --quiet || git commit -qm "sync: $(date '+%F %H:%M')"

if git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1; then
  if ! git pull --rebase -q origin "$branch"; then
    echo "Conflict in:"; git diff --name-only --diff-filter=U | sed 's/^/  /'
    echo "Fix the files, git add them, then rebase --continue and run this again. Or rebase --abort."
    exit 1
  fi
fi
git push -q -u origin "$branch" && echo "Synced."
