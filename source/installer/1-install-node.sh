#!/usr/bin/env bash
# Installs nvm, the latest LTS Node.js, pnpm (via corepack) and pm2.
# Run once on a fresh VPS as your normal user (not root):  bash 1-install-node.sh
set -euo pipefail

NVM_VERSION="v0.40.3"

if ! command -v curl >/dev/null 2>&1; then
  echo ">> Installing curl"
  sudo apt-get update -y && sudo apt-get install -y curl
fi

echo ">> Installing nvm $NVM_VERSION"
curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/$NVM_VERSION/install.sh" | bash

export NVM_DIR="$HOME/.nvm"
# shellcheck source=/dev/null
. "$NVM_DIR/nvm.sh"

echo ">> Installing latest LTS Node.js"
nvm install --lts
nvm alias default 'lts/*'
nvm use default

# Newer Node releases no longer bundle corepack, so install it explicitly.
# corepack then provides the exact pnpm version pinned in clientend/package.json.
echo ">> Installing corepack + pm2"
npm install -g corepack pm2
corepack enable

echo
echo "Done."
echo "  node: $(node -v)"
echo "  npm:  $(npm -v)"
echo "  pm2:  $(pm2 -v)"
echo
echo "Open a new shell (or run: source ~/.bashrc) so nvm/node are on your PATH."
