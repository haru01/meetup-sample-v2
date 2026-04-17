#!/bin/bash
# Fix ownership of named volumes (created as root) then switch to devuser
set -e

# Derive project root from working directory (set by docker-compose working_dir)
PROJECT_DIR="${PWD}"

for sub in "" "/backend" "/frontend" "/e2e"; do
  dir="${PROJECT_DIR}${sub}/node_modules"
  if [ -d "$dir" ]; then
    chown devuser:$(id -g devuser) "$dir" 2>/dev/null || true
  fi
done

exec gosu devuser "$@"
