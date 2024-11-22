#!/usr/bin/env bash

set -xeo pipefail

readonly live_run=${LIVE_RUN:-false}
# Release number
readonly version=${VERSION:?input VERSION is required}
# Dependencies' pattern
readonly bump_deps_pattern=${BUMP_DEPS_PATTERN:-''}
# Dependencies' version
readonly bump_deps_version=${BUMP_DEPS_VERSION:-''}
# Dependencies' git branch
readonly bump_deps_branch=${BUMP_DEPS_BRANCH:-''}
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
toml_set_in_place Cargo.toml "workspace.package.version" "$version"

# Bump package.json version
JQ=".version=\"$version\""
package_tmp=$(mktemp)
cat ${package_json_path} | jq "$JQ"  > "$package_tmp"
mv ${package_tmp} ${package_json_path}

git commit Cargo.toml ${plugin_toml_path} ${package_json_path} -m "chore: Bump version to $version"

# Select all package dependencies that match $bump_deps_pattern and bump them to $bump_deps_version
if [[ "$bump_deps_pattern" != '' ]]; then
  deps=$(toml get Cargo.toml workspace.dependencies | jq -r "keys[] | select(test(\"$bump_deps_pattern\"))")
  for dep in $deps; do
    if [[ -n $bump_deps_version ]]; then
      toml_set_in_place Cargo.toml "workspace.dependencies.$dep.version" "$bump_deps_version"
    fi

    if [[ -n $bump_deps_branch ]]; then
      toml_set_in_place Cargo.toml "workspace.dependencies.$dep.branch" "$bump_deps_branch"
    fi
  done

  package_metadata_old=$(toml get zenoh-plugin-remote-api/Cargo.toml package.metadata.deb.depends)
  package_metadata_new=$(sed "s/.*/zenohd (=$bump_deps_version)/" <<< $package_metadata_old)
  toml_set_in_place ${plugin_toml_path} "package.metadata.deb.depends" "$package_metadata_new"
  
  # Update lockfile
  cargo check

  if [[ -n $bump_deps_version || -n $bump_deps_branch ]]; then
    git commit Cargo.toml ${plugin_toml_path} Cargo.lock -m "chore: Bump $bump_deps_pattern version to $bump_deps_version"
  else
    echo "warn: no changes have been made to any workspace.dependencies matching $bump_deps_pattern"
  fi
fi

if [[ ${live_run} ]]; then
  git tag --force "$version" -m "v$version"
fi

git log -10
git show-ref --tags
git push origin
git push --force origin "$version"