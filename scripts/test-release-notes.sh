#!/usr/bin/env bash
# Unit test for scripts/release-notes.sh. Uses a temporary git repository.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/htc-release-notes.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT

# Keep the shell byte-for-byte unchanged and inject a fake gh transport through
# its sibling helper, so the production selection logic still runs.
mkdir "$TMP/scripts"
cp "$ROOT/scripts/release-notes.sh" "$TMP/scripts/release-notes.sh"
export HTC_RELEASE_ISSUES_SOURCE
HTC_RELEASE_ISSUES_SOURCE="$(python3 -c 'import pathlib,sys; print(pathlib.Path(sys.argv[1]).resolve())' "$ROOT/scripts/release-issues.py")"
cat > "$TMP/scripts/release-issues.py" <<'PY'
import argparse
import importlib.util
import os
from pathlib import Path
import re
import subprocess
import sys

spec = importlib.util.spec_from_file_location("release_issues", os.environ["HTC_RELEASE_ISSUES_SOURCE"])
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)
parser = argparse.ArgumentParser()
parser.add_argument("--repo", required=True)
parser.add_argument("--head", required=True)
parser.add_argument("--base", required=True)
args = parser.parse_args()
assert args.repo == "owner/repo"
assert re.fullmatch(r"[0-9a-f]{40}", args.head)
assert args.head == subprocess.check_output(["git", "rev-parse", "v3.1.0^{commit}"], text=True).strip()
api = release.Api(command=[sys.executable, str(Path(__file__).with_name("fake_gh.py"))])
try:
    print(release.collect(args.repo, args.head, args.base, api=api, cwd=Path.cwd()), end="")
except release.Failure as error:
    print(f"release issue lookup failed: {error}", file=sys.stderr)
    sys.exit(1)
PY
cat > "$TMP/scripts/fake_gh.py" <<'PY'
import os
import re
import sys

assert sys.argv[1] == "api"
assert re.fullmatch(r"repos/owner/repo/commits/[0-9a-f]{40}/pulls\?per_page=100&page=1", sys.argv[2])
if os.environ.get("HTC_RELEASE_FIXTURE_FAILURE") == "1":
    print('HTTP/2.0 401 Unauthorized\n\n{"message":"Bad credentials"}')
    sys.exit(1)
print('HTTP/2.0 200 OK\nContent-Type: application/json\n\n[]')
PY
export GITHUB_REPOSITORY=owner/repo

(
  cd "$TMP"
  git init -q
  git config user.email test@example.invalid
  git config user.name "Release Notes Test"
  echo one > file.txt
  git add file.txt
  git commit -q -m "feat: initial release"
  git tag v3.0.0
  echo two >> file.txt
  git commit -am "fix(installer): render tags inside the canvas" -q
  git tag v3.1.0
  bash "$TMP/scripts/release-notes.sh" v3.1.0 > notes.md
  grep -q "hexo-tag-cloud v3.1.0" notes.md
  grep -q "npm install hexo-tag-cloud@3.1.0" notes.md
  grep -q "Changes since v3.0.0" notes.md
  grep -q "fix(installer): render tags inside the canvas" notes.md
  grep -q "compare/v3.0.0...v3.1.0" notes.md
  grep -q "## Resolved issues" notes.md
  grep -q "No linked issues resolved" notes.md
  ! grep -q "feat: initial release" notes.md
  ! grep -qi "changelog" notes.md

  # Missing tags must not silently broaden the range to a first-release history.
  git tag -d v3.0.0 >/dev/null
  if bash "$TMP/scripts/release-notes.sh" v3.1.0 > missing.md 2> missing.txt; then
    echo "missing predecessor unexpectedly succeeded" >&2
    exit 1
  fi
  [[ ! -s missing.md ]]
  grep -q 'predecessor' missing.txt

  # Only an explicit first-release opt-in permits a no-base history.
  RELEASE_FIRST=1 bash "$TMP/scripts/release-notes.sh" v3.1.0 > first.md
  grep -q '## Changes$' first.md
  grep -q "feat: initial release" first.md
  if RELEASE_FIRST=1 PREVIOUS_TAG=HEAD bash "$TMP/scripts/release-notes.sh" v3.1.0 > conflict.md 2> conflict.txt; then
    echo "conflicting first-release base unexpectedly succeeded" >&2
    exit 1
  fi
  [[ ! -s conflict.md ]]
  grep -q 'conflicts' conflict.txt

  # Explicit invalid/nonancestor bases must fail through the helper before notes exist.
  current_branch="$(git branch --show-current)"
  git checkout --orphan unrelated -q
  git commit --allow-empty -qm 'unrelated history'
  unrelated="$(git rev-parse HEAD)"
  git checkout "$current_branch" -q
  for base in missing-tag "$unrelated"; do
    if PREVIOUS_TAG="$base" bash "$TMP/scripts/release-notes.sh" v3.1.0 > invalid.md 2> invalid.txt; then
      echo "invalid explicit base unexpectedly succeeded" >&2
      exit 1
    fi
    [[ ! -s invalid.md ]]
    grep -q 'release issue lookup failed' invalid.txt
  done

  # A shallow checkout is incomplete even when first-release mode was requested.
  git clone --quiet --depth=1 --no-local "file://$TMP" "$TMP/shallow"
  if (cd "$TMP/shallow" && RELEASE_FIRST=1 bash "$TMP/scripts/release-notes.sh" v3.1.0) > shallow.md 2> shallow.txt; then
    echo "shallow history unexpectedly succeeded" >&2
    exit 1
  fi
  [[ ! -s shallow.md ]]
  grep -q 'shallow' shallow.txt

  # Failed metadata must leave no partial notes for a downstream publisher to accept.
  if RELEASE_FIRST=1 HTC_RELEASE_FIXTURE_FAILURE=1 bash "$TMP/scripts/release-notes.sh" v3.1.0 > failed.md 2> failure.txt; then
    echo "metadata failure unexpectedly succeeded" >&2
    exit 1
  fi
  [[ ! -s failed.md ]]
  grep -q 'release issue lookup failed' failure.txt
)

python3 "$ROOT/scripts/release-issues_tests.py"
echo "release-notes.sh test passed"
