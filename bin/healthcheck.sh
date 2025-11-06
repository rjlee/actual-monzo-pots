#!/usr/bin/env bash
set -euo pipefail

if [ ! -r /proc/1/stat ]; then
  exit 1
fi
state=$(cut -d' ' -f3 /proc/1/stat)
if [ "$state" = "Z" ]; then
  exit 1
fi

budget_dir="${BUDGET_DIR:-${ACTUAL_BUDGET_CACHE_DIR:-./data/budget}}"
if [ -n "$budget_dir" ] && [ -d "$budget_dir" ]; then
  if [ ! -r "$budget_dir" ]; then
    exit 1
  fi
fi

exit 0
