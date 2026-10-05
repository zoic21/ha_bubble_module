#!/usr/bin/env bash
set -Eeuo pipefail

# Reset/retry operates only on the workflow's disposable checkout.
if [[ "${GITHUB_ACTIONS:-}" != "true" ]]; then
  echo 'This script is reserved for the GitHub Actions checkout.' >&2
  exit 1
fi
: "${BUILD_BRANCH:?BUILD_BRANCH is required}"
git check-ref-format "refs/heads/$BUILD_BRANCH"

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'

for attempt in 1 2 3; do
  # Always rebuild the current branch tip. A concurrent documentation or source
  # commit must not be overwritten, nor leave an older generated YAML behind.
  git fetch --no-tags origin "refs/heads/$BUILD_BRANCH"
  git reset --hard FETCH_HEAD

  npm ci --ignore-scripts --no-audit --no-fund
  npm run build:modules
  npm run check:modules
  npm test

  git add -- ':(glob)*/dist/*.yaml'
  if git diff --cached --quiet; then
    echo 'Module distributions are already current; no commit needed.'
    exit 0
  fi

  git commit -m 'build: regenerate Bubble module distributions'
  if git push origin "HEAD:refs/heads/$BUILD_BRANCH"; then
    exit 0
  fi
  echo "Push failed (attempt $attempt/3); rebuilding the latest branch tip."
done

echo 'Could not publish generated distributions after three attempts.' >&2
exit 1
