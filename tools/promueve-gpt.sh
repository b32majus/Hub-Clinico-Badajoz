#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  printf '%s\n' 'promueve-gpt: must run inside a compatible Git worktree' >&2
  exit 1
}
OVERLAY="$REPO_ROOT/config/opencode/profiles/promueve-gpt.json"
if [[ ! -f "$OVERLAY" ]]; then
  printf 'promueve-gpt: overlay not found: %s\n' "$OVERLAY" >&2
  exit 1
fi
if ! python3 - "$OVERLAY" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    json.load(f)
PY
then
  printf 'promueve-gpt: invalid JSON overlay: %s\n' "$OVERLAY" >&2
  exit 1
fi

export OPENCODE_CONFIG_CONTENT="$(<"$OVERLAY")"
exec opencode "$@"
