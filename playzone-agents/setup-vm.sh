#!/usr/bin/env bash
# ============================================================================
# PlayZone WhatsApp bot — one-shot setup for a fresh Ubuntu 22.04+ VM
# (Google Cloud e2-micro Always Free, Oracle Always Free, or any small Linux box).
#
# Run from inside the playzone-agents folder:
#     bash setup-vm.sh
# ============================================================================
set -euo pipefail

echo "==> 1/5  Swap (Chromium needs more than the e2-micro's 1 GB RAM)"
if ! sudo swapon --show | grep -q '/swapfile'; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  echo "    2 GB swap added."
else
  echo "    swap already present, skipping."
fi

echo "==> 2/5  Node.js 20 + git"
sudo apt-get update -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

echo "==> 3/5  Google Chrome (for whatsapp-web.js / Puppeteer)"
if ! command -v google-chrome-stable >/dev/null 2>&1; then
  wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
  sudo apt-get install -y ./google-chrome-stable_current_amd64.deb
  rm -f google-chrome-stable_current_amd64.deb
else
  echo "    Chrome already installed."
fi

echo "==> 4/5  PM2 (process manager)"
sudo npm install -g pm2

echo "==> 5/5  Bot dependencies (skipping Puppeteer's bundled Chromium — we use system Chrome)"
cd "$(dirname "$0")"
export PUPPETEER_SKIP_DOWNLOAD=true
npm install --no-audit --no-fund

echo ""
echo "============================================================"
echo "✅ Setup complete."
echo ""
echo "Next:"
echo "  1) Create the .env file:   cp .env.example .env && nano .env"
echo "     (fill OPENAI_API_KEY, DATABASE_URL, ADMIN_TOKEN)"
echo "  2) Start the bot:          pm2 start src/index.js --name playzone-bot"
echo "  3) Keep it alive on boot:  pm2 save && pm2 startup   (run the line it prints)"
echo "  4) Scan the QR:            pm2 logs playzone-bot     (or open http://<VM_IP>:3001/qr)"
echo "============================================================"
