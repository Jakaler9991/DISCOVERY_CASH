#!/usr/bin/env bash
set -euo pipefail

# Hook invoked after files are synced to a host. Usage:
# ./sync_hook.sh /path/to/synced/dir

TARGET_DIR=${1:-}
if [ -z "$TARGET_DIR" ]; then
  echo "Usage: $0 /path/to/dir"
  exit 1
fi

echo "Running post-sync hook on $TARGET_DIR"

# Expand common archive types
shopt -s nullglob
for arc in "$TARGET_DIR"/*.zip; do
  [ -e "$arc" ] || continue
  echo "Expanding $arc"
  unzip -o "$arc" -d "$TARGET_DIR"
done

for tarf in "$TARGET_DIR"/*.tar.gz "$TARGET_DIR"/*.tgz; do
  [ -e "$tarf" ] || continue
  echo "Extracting $tarf"
  tar -xzf "$tarf" -C "$TARGET_DIR"
done

# Run hook plugins if present
if [ -d "$TARGET_DIR/.hooks" ]; then
  for script in "$TARGET_DIR/.hooks"/*; do
    [ -x "$script" ] || continue
    echo "Running hook $script"
    "$script" "$TARGET_DIR"
  done
fi

echo "Post-sync hook finished."
