#!/usr/bin/env bash
set -euo pipefail

# Install prerequisites and dosbox-x on Debian/Ubuntu. Adjust for other distros.
if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root or with sudo"
  exit 1
fi

apt update
apt install -y dosbox-x python3 python3-venv python3-pip rsync openssh-client

# Install Python prometheus client for exporter
python3 -m pip install --upgrade pip
python3 -m pip install prometheus_client

echo "dosbox-x and Python dependencies installed."
