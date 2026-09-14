#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-https://github.com/superbodik/CS2-TacMap.git}"
APP_DIR="${APP_DIR:-/opt/cs2-tacmap}"
API_DOMAIN="${API_DOMAIN:-api.ukrflow.pp.ua}"
SERVICE_USER="${SERVICE_USER:-tacmap}"

echo "==> пакеты"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates git nginx python3-venv python3-pip python3-dev build-essential ufw >/dev/null

if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  echo "==> node 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1
  apt-get install -y -qq nodejs >/dev/null
fi
node -v
python3 -V

echo "==> пользователь $SERVICE_USER"
id -u "$SERVICE_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$SERVICE_USER"

echo "==> код в $APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch --quiet origin
  git -C "$APP_DIR" reset --hard --quiet origin/main
else
  rm -rf "$APP_DIR"
  git clone --quiet "$REPO" "$APP_DIR"
fi

echo "==> зависимости API"
cd "$APP_DIR/server"
npm ci --omit=dev --silent 2>/dev/null || npm install --omit=dev --silent

echo "==> зависимости бота"
cd "$APP_DIR/bot"
python3 -m venv .venv
"$APP_DIR/bot/.venv/bin/pip" install --quiet --upgrade pip
"$APP_DIR/bot/.venv/bin/pip" install --quiet -r requirements.txt

echo "==> каталоги данных"
mkdir -p /var/lib/cs2-tacmap/uploads "$APP_DIR/bot/data"
chown -R "$SERVICE_USER:$SERVICE_USER" /var/lib/cs2-tacmap "$APP_DIR"

echo "==> systemd"
cat > /etc/systemd/system/cs2-tacmap-api.service <<UNIT
[Unit]
Description=CS2 TacMap API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$APP_DIR/server
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=/var/lib/cs2-tacmap
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/systemd/system/cs2-tacmap-bot.service <<UNIT
[Unit]
Description=CS2 TacMap Discord Bot
After=network-online.target cs2-tacmap-api.service
Wants=network-online.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$APP_DIR/bot
ExecStart=$APP_DIR/bot/.venv/bin/python bot.py
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNIT

echo "==> nginx"
cat > /etc/nginx/sites-available/cs2-tacmap <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $API_DOMAIN;

    client_max_body_size 512M;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/cs2-tacmap /etc/nginx/sites-enabled/cs2-tacmap
rm -f /etc/nginx/sites-enabled/default
mkdir -p /var/www/html
nginx -t
systemctl enable --now nginx >/dev/null 2>&1 || systemctl restart nginx

echo "==> firewall"
ufw allow 22/tcp >/dev/null 2>&1 || true
ufw allow 80/tcp >/dev/null 2>&1 || true
ufw allow 443/tcp >/dev/null 2>&1 || true

systemctl daemon-reload
echo "==> готово: осталось положить .env и запустить сервисы"
