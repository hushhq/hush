#!/usr/bin/env bash
# Bootstrap a Hush development workspace.
#
# Clones every public component repository as a sibling of this one
# (so paths match what hush-server's docker-compose expects) and then
# delegates to that compose file. Re-runnable: existing clones are
# left untouched.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PARENT_DIR="$(cd "$ROOT_DIR/.." && pwd)"

REPOS=(
  "hush-web"
  "hush-server"
  "hush-crypto"
  "hush-desktop"
  "hush-mobile"
  "hush-directory"
)

cd "$PARENT_DIR"

for repo in "${REPOS[@]}"; do
  if [ -d "$repo/.git" ]; then
    echo "[bootstrap] $repo already cloned, skipping"
  else
    echo "[bootstrap] cloning $repo"
    git clone --depth=1 "https://github.com/hushhq/$repo.git" "$repo"
  fi
done

echo
echo "[bootstrap] all components ready under $PARENT_DIR"
echo "[bootstrap] starting the stack via hush-server/docker-compose.yml"
echo

cd "$PARENT_DIR/hush-server"
exec docker compose up "$@"
