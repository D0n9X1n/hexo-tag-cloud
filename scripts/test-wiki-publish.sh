#!/usr/bin/env bash
set -euo pipefail


root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
publisher="$root/scripts/publish-wiki.sh"
workflow="$root/.github/workflows/publish-wiki.yml"

fail() {
  printf 'wiki publish test: %s\n' "$1" >&2
  exit 1
}

[[ -x "$publisher" ]] || fail "publisher is missing or not executable"
[[ -f "$workflow" ]] || fail "workflow is missing"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
source_dir="$tmp/source"
wiki_repo="$tmp/wiki"
mkdir -p "$source_dir"
git init -q -b master "$wiki_repo"
git -C "$wiki_repo" config user.name test
git -C "$wiki_repo" config user.email test@example.invalid
printf '# stale\n' > "$wiki_repo/Stale.md"
printf '# old\n' > "$wiki_repo/Keep.md"
git -C "$wiki_repo" add --all
git -C "$wiki_repo" commit -q -m seed

printf '# home\n' > "$source_dir/Home.md"
printf '# 首页\n' > "$source_dir/Home-zh-CN.md"
printf '# current\n' > "$source_dir/Keep.md"
printf 'not a wiki page\n' > "$source_dir/ignored.txt"

first_output="$tmp/first-output"
GITHUB_OUTPUT="$first_output" "$publisher" "$source_dir" "$wiki_repo" 0123456789abcdef
[[ "$(<"$first_output")" == "changed=true" ]] || fail "changed publish did not request a push"
[[ -d "$wiki_repo/.git" ]] || fail "publisher removed Git metadata"
[[ "$(git -C "$wiki_repo" branch --show-current)" == "master" ]] || fail "publisher changed branch"
[[ -f "$wiki_repo/Home.md" ]] || fail "publisher omitted a new page"
[[ -f "$wiki_repo/Home-zh-CN.md" ]] || fail "publisher omitted the Chinese page"
[[ "$(<"$wiki_repo/Keep.md")" == "# current" ]] || fail "publisher did not update a page"
[[ ! -e "$wiki_repo/Stale.md" ]] || fail "publisher retained a deleted page"
[[ ! -e "$wiki_repo/ignored.txt" ]] || fail "publisher copied a non-Markdown file"
[[ "$(git -C "$wiki_repo" rev-list --count HEAD)" == "2" ]] || fail "first publish did not create one commit"
[[ "$(git -C "$wiki_repo" log -1 --pretty=%s)" == "Publish wiki from 0123456" ]] || fail "commit does not identify source SHA"

no_change_output="$tmp/no-change-output"
GITHUB_OUTPUT="$no_change_output" "$publisher" "$source_dir" "$wiki_repo" 0123456789abcdef
[[ "$(<"$no_change_output")" == "changed=false" ]] || fail "unchanged publish requested a push"
[[ "$(git -C "$wiki_repo" rev-list --count HEAD)" == "2" ]] || fail "unchanged publish created a commit"

rm "$source_dir/Keep.md"
printf '# renamed\n' > "$source_dir/Renamed.md"
"$publisher" "$source_dir" "$wiki_repo" fedcba9876543210
[[ ! -e "$wiki_repo/Keep.md" ]] || fail "rename retained the old page"
[[ -f "$wiki_repo/Renamed.md" ]] || fail "rename omitted the new page"
[[ "$(git -C "$wiki_repo" rev-list --count HEAD)" == "3" ]] || fail "rename did not create one commit"

for required in \
  'branches: [master]' \
  'workflow_dispatch:' \
  'group: publish-wiki' \
  'cancel-in-progress: false' \
  "if: github.ref == 'refs/heads/master'" \
  'contents: write' \
  'secrets.GITHUB_TOKEN' \
  "x-access-token:\${GH_TOKEN}" \
  'scripts/publish-wiki.sh' \
  "if: steps.mirror.outputs.changed == 'true'" \
  'HEAD:master'; do
  grep -Fq -- "$required" "$workflow" || fail "workflow is missing: $required"
done

if grep -Eq '^[[:space:]]*paths(-ignore)?:' "$workflow"; then
  fail "workflow filters master pushes instead of publishing after every merge"
fi

printf 'wiki publish test passed\n'
