#!/usr/bin/env bash
set -euo pipefail

pip install -r backend/requirements.txt

if ! command -v npm >/dev/null 2>&1; then
  NODE_VERSION=20.19.0
  NODE_DIR="$PWD/.render-node"
  mkdir -p "$NODE_DIR"
  curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" | tar -xJ -C "$NODE_DIR" --strip-components=1
  export PATH="$NODE_DIR/bin:$PATH"
fi

cd frontend
npm ci
npm run build
