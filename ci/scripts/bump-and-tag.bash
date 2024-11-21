#!/usr/bin/env bash

set -xeo pipefail

readonly live_run=${LIVE_RUN:-false}
# Release number
readonly version=${VERSION:?input VERSION is required}
# Release number
readonly branch=${BRANCH:?input BRANCH is required}
# Git actor name
readonly git_user_name=${GIT_USER_NAME:?input GIT_USER_NAME is required}
# Git actor email
readonly git_user_email=${GIT_USER_EMAIL:?input GIT_USER_EMAIL is required}

export GIT_AUTHOR_NAME=$git_user_name
export GIT_AUTHOR_EMAIL=$git_user_email
export GIT_COMMITTER_NAME=$git_user_name
export GIT_COMMITTER_EMAIL=$git_user_email

cargo +stable install toml-cli
# NOTE(fuzzypixelz): toml-cli doesn't yet support in-place modification
# See: https://github.com/gnprice/toml-cli?tab=readme-ov-file#writing-ish-toml-set
function toml_set_in_place() {
  local tmp=$(mktemp)
  toml set "$1" "$2" "$3" > "$tmp"
  mv "$tmp" "$1"
}

package_json_path="./zenoh-ts/package.json"
plugin_toml_path="./zenoh-plugin-remote-api/Cargo.toml"
# Bump Cargo version of library and top level toml
toml_set_in_place ${plugin_toml_path} "package.version" "$version"
toml_set_in_place Cargo.toml "package.version" "$version"

# Bump package.json version
JQ=".version=\"$version\""
package_tmp=$(mktemp)
cat ${package_json_path} | jq "$JQ"  > "$package_tmp"
mv ${package_tmp} ${package_json_path}

git commit Cargo.toml ${plugin_toml_path} ${package_json_path} -m "chore: Bump version to $version"
git push --force origin ${branch}

if [[ ${live_run} ]]; then
  git tag --force "$version" -m "v$version"
  git push --force origin "$version"
fi

git log -10
git show-ref --tags