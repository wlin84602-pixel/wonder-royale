#!/bin/sh
set -eu
cosmetic_dir="${COSMETIC_DATA_DIR:-/app/.data}"
mkdir -p "$cosmetic_dir"
if [ "$(id -u)" = 0 ]; then
  chown node:node "$cosmetic_dir"
  for file in "$cosmetic_dir/cosmetics.json" "$cosmetic_dir/cosmetics.json.tmp"; do
    if [ -f "$file" ]; then chown node:node "$file"; fi
  done
  exec su-exec node "$0" "$@"
fi
# Fail startup if the mounted volume cannot persist rewards.
probe="$cosmetic_dir/.write-check-$$"
(umask 077; : > "$probe")
rm "$probe"
exec "$@"
