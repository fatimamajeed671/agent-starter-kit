# Sync skills across machines

`sync/sync.sh` keeps `~/.claude/skills` and `~/.claude/hooks` the same on several machines through a **private** git repo. You run it when you want; nothing runs in the background.

The git data lives outside `~/.claude` (default `~/.skills-sync.git`), with `~/.claude` as the work tree, so `~/.claude` never becomes a repo and only the listed paths are ever committed.

## First machine

```sh
gh auth login && gh auth setup-git
git config --global user.name "..." && git config --global user.email "..."
gh repo create my-skills --private
git init --bare -b main ~/.skills-sync.git
G="git --git-dir=$HOME/.skills-sync.git"
$G config core.bare false
$G config core.worktree "$HOME/.claude"
$G config status.showUntrackedFiles no
$G remote add origin https://github.com/<you>/my-skills.git
printf 'skills/.*\n.DS_Store\n' > ~/.skills-sync.git/info/exclude   # add any skill that must stay local
cp sync/sync.sh ~/.claude/sync-skills.sh
echo "alias skills-sync='~/.claude/sync-skills.sh'" >> ~/.zshrc
skills-sync
```

## Each other machine

```sh
gh auth login && gh auth setup-git      # plus git user.name / user.email
git clone --bare https://github.com/<you>/my-skills.git ~/.skills-sync.git
G="git --git-dir=$HOME/.skills-sync.git"
$G config core.bare false
$G config core.worktree "$HOME/.claude"
$G config status.showUntrackedFiles no
$G config remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'
printf 'skills/.*\n.DS_Store\n' > ~/.skills-sync.git/info/exclude   # before the first sync: exclude skills that stay local
$G --work-tree="$HOME/.claude" checkout main
```

If checkout says files would be overwritten, move those aside and run it again. Do not sync while files are missing; the deletion guard will stop you. Then add the alias and run `skills-sync`.

## Settings

| Variable | Default |
|---|---|
| `SKILLS_GIT_DIR` | `~/.skills-sync.git` |
| `SKILLS_WORK_TREE` | `~/.claude` |
| `SKILLS_SYNC_PATHS` | `skills hooks` |
| `SKILLS_SYNC_ALLOW_DELETE` | unset; set to `1` for an intended bulk delete |

## What it does

Stage the listed paths, refuse likely secrets, refuse more than 3 deletions, commit, `pull --rebase` (stop on conflict), push. Never force-pushes.

`settings.json` is not synced, because it holds machine-specific entries. Register hooks on each machine (see docs/claude-code.md).

Note: this sync is flat (`~/.claude/skills/<name>`) and does not use the kit's segment folders.
