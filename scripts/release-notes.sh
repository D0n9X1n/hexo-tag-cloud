#!/usr/bin/env bash
# Generate GitHub Release notes for an npm release: resolved issues proven by
# commit/PR provenance (release-issues.py) plus every commit since the previous tag.
set -euo pipefail

TAG="${1:-${GITHUB_REF_NAME:-}}"
if [[ -z "$TAG" ]]; then
  echo "usage: $0 <tag>" >&2
  exit 2
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ "$(git rev-parse --is-shallow-repository)" != false ]]; then
  echo "release notes require complete history; shallow repositories are not supported" >&2
  exit 2
fi
HEAD_COMMIT="$(git rev-parse --verify --end-of-options "${TAG}^{commit}")"
if [[ "${RELEASE_FIRST:-0}" == 1 && "${PREVIOUS_TAG+x}" == x ]]; then
  echo "RELEASE_FIRST=1 conflicts with PREVIOUS_TAG" >&2
  exit 2
fi
PREVIOUS_TAG="${PREVIOUS_TAG:-}"
if [[ "${RELEASE_FIRST:-0}" != 1 && -z "$PREVIOUS_TAG" ]]; then
  if ! PREVIOUS_TAG="$(git describe --tags --abbrev=0 --match 'v[0-9]*' "${HEAD_COMMIT}^")"; then
    echo "release predecessor lookup failed; fetch complete tags or explicitly set RELEASE_FIRST=1 for the first release" >&2
    exit 2
  fi
fi
VERSION="${TAG#v}"
REPO="${GITHUB_REPOSITORY:-D0n9X1n/hexo-tag-cloud}"
# Complete all metadata lookups before emitting notes; an API error is not an empty release.
ISSUES="$(python3 "$ROOT/release-issues.py" \
  --repo "$REPO" \
  --head "$HEAD_COMMIT" --base "$PREVIOUS_TAG")"

echo "# hexo-tag-cloud ${TAG}"
echo
echo "## Install"
echo
echo '```bash'
echo "npm install hexo-tag-cloud@${VERSION} --save"
echo '```'
echo
echo "- npm: <https://www.npmjs.com/package/hexo-tag-cloud/v/${VERSION}> (published with provenance)."
echo "- Changelog: <https://github.com/${REPO}/blob/${TAG}/CHANGELOG.md>."
echo

printf '%s\n\n' "$ISSUES"

if [[ -n "$PREVIOUS_TAG" ]]; then
  echo "## Changes since ${PREVIOUS_TAG}"
  echo
  git log --no-merges --pretty=format:'- %s (%h)' "${PREVIOUS_TAG}..${HEAD_COMMIT}"
  echo
  echo
  echo "**Full diff**: <https://github.com/${REPO}/compare/${PREVIOUS_TAG}...${TAG}>"
else
  echo "## Changes"
  echo
  git log --no-merges --max-count=200 --pretty=format:'- %s (%h)' "$HEAD_COMMIT"
  echo
fi

echo
echo "## Verification"
echo
echo "- The release commit is on \`master\` and its exact Tests run passed (lint, 100% coverage server tests, Playwright e2e)."
echo "- The workflow checks that the tag, \`package.json\` version, and dated \`CHANGELOG.md\` entry agree."
echo "- \`build/verify-pack.js\` checks the npm tarball contents before publication."
