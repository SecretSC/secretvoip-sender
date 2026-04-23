# SecretVoIP SMS — Self-hosted deployment (Debian + Nginx + /sms)

The platform runs in two pieces, both on your Debian server:

* **Frontend** — Vite-built static React app, served by Nginx under `/sms/`
* **Backend** — Node/Express on `127.0.0.1:3001`, proxied by Nginx at `/sms/api/`

The real upstream SMS API key lives only on the backend (`SMS_UPSTREAM_API_KEY`)
and is **never** exposed to the browser.

---

## 1. Prerequisites

```bash
sudo apt update
sudo apt install -y nginx postgresql nodejs npm git
sudo npm install -g pnpm           # optional
```

## 2. Database

```bash
sudo -u postgres psql <<SQL
CREATE USER secretvoip WITH PASSWORD 'a-strong-password';
CREATE DATABASE secretvoip_sms OWNER secretvoip;
SQL
```

## 3. Get the code

```bash
sudo mkdir -p /var/www/secretvoip-sms
sudo chown -R $USER /var/www/secretvoip-sms
cd /var/www/secretvoip-sms
# copy this repository here (rsync, git clone, scp, etc.)
```

## 4. Environment

```bash
cp .env.example .env
nano .env
```

Set at minimum:

```
VITE_APP_BASE_PATH=/sms
VITE_USE_MOCK=false
APP_URL=https://secretvoip.com/sms
API_PORT=3001
DATABASE_URL=postgresql://secretvoip:a-strong-password@localhost:5432/secretvoip_sms
SMS_UPSTREAM_BASE_URL=https://skytelecom.io/api
SMS_UPSTREAM_API_KEY=YOUR_REAL_KEY
JWT_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)
ADMIN_EMAIL=admin@secretvoip.com
ADMIN_TEMP_PASSWORD=ChangeMe!2026
```

## 5. Build the frontend

```bash
cd /var/www/secretvoip-sms
npm install
npm run build           # output goes to ./dist
```

Vite uses `VITE_APP_BASE_PATH` so all asset URLs are prefixed with `/sms/`.
React Router uses the same env var as its `basename`.

## 6. Run the backend

```bash
cd /var/www/secretvoip-sms/backend
npm install --omit=dev
node src/server.js          # smoke test, then Ctrl+C
```

Install the systemd unit:

```bash
sudo cp deploy/secretvoip-sms.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now secretvoip-sms
sudo systemctl status secretvoip-sms
```

The first launch automatically applies `db/schema.sql` and seeds the super-admin
account from `ADMIN_EMAIL` / `ADMIN_TEMP_PASSWORD` (force-change on first login).

> Prefer PM2? `pm2 start backend/src/server.js --name secretvoip-sms && pm2 save`

## 7. Nginx

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/secretvoip-sms
sudo ln -s /etc/nginx/sites-available/secretvoip-sms /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

(Use `certbot --nginx -d secretvoip.com` for HTTPS.)

## 8. Verify

* `https://secretvoip.com/sms/` — landing page
* `https://secretvoip.com/sms/login` — admin login
* `https://secretvoip.com/sms/api/health` — should return `{"ok":true}`

## 9. Updating

```bash
cd /var/www/secretvoip-sms
git pull
npm install && npm run build
cd backend && npm install --omit=dev
sudo systemctl restart secretvoip-sms
```

## Security notes

* `SMS_UPSTREAM_API_KEY` is read by the backend only and never sent to the browser.
* Passwords are hashed with bcrypt (cost 12).
* JWTs are signed with `JWT_SECRET` and expire after 12 h.
* Public sign-up is disabled — accounts are admin-provisioned only.
* All sensitive admin actions are recorded in `audit_logs`.
