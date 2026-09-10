#!/usr/bin/env bash
set -euo pipefail
pip install -r backend/requirements.txt
if command -v npm >/dev/null 2>&1; then
  cd frontend
  npm ci
  npm run build
fi
