#!/bin/bash
# Pi-side deploy: pull latest, rebuild, restart the service.
# Run from the Pi: ./deploy.sh   (or `ssh pi@<host> './tend-tracker/deploy.sh'` from the Mac)
set -e

cd "$(dirname "$0")"
git pull
npm install
npm run build:all
sudo systemctl restart tend

echo "Deployed. Checking status..."
sudo systemctl status tend --no-pager -l | head -10
