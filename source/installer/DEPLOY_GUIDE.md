# Deploying the client app to the VPS

The VPS has only 1 GB of RAM, which is not enough to run `next build`. So you **build on your PC**, upload the finished build over SFTP, and the VPS only installs the production dependencies and runs the app.

## Server layout

`2-start-client.sh` looks for `../clientend`, so on the VPS the folders must sit side by side:

```
<your app dir>/
├── installer/
│   ├── 1-install-node.sh
│   └── 2-start-client.sh
└── clientend/
    ├── .next/
    ├── public/
    ├── package.json
    ├── pnpm-lock.yaml
    ├── pnpm-workspace.yaml
    ├── next.config.ts
    └── .env.production
```

| Script | When to run | What it does |
|---|---|---|
| `1-install-node.sh` | **Once** | Installs nvm, the latest LTS Node.js, corepack (for pnpm) and pm2 |
| `2-start-client.sh` | **Every deploy** | Runs `pnpm install --prod` in `../clientend` and (re)starts the app in production mode with pm2 |

Below, `<app dir>` means the folder on the VPS that holds `installer` and `clientend`.

---

## Part A: build on your PC (every deploy)

### 1. Create the production env file (first time only)

Copy `clientend\.env.example` to `clientend\.env.production` and fill in real values:

```env
NEXT_PUBLIC_API_MODE=mock                       # or "http" once the backend is live
NEXT_PUBLIC_API_URL=https://api.your-domain.com/api/v1
NEXT_PUBLIC_MOCK_LATENCY_MS=0
NEXT_PUBLIC_SITE_URL=https://your-domain.com
REVALIDATE_SECRET=<long random string>
NEXT_PUBLIC_IMAGE_HOSTS=cdn.lunetbuz.com
```

> **Important:** `NEXT_PUBLIC_*` values are baked into the build. If you change any of them, you must **rebuild and re-upload**. Editing the file on the server only changes server-only values such as `REVALIDATE_SECRET`.

### 2. Build

In PowerShell, from the `clientend` folder:

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue   # clean build, no dev leftovers
pnpm install
pnpm build
Remove-Item -Recurse -Force .next\cache -ErrorAction SilentlyContinue   # build cache, not needed on the server
```

---

## Part B: upload over SFTP

Upload these from your PC to the VPS:

| From your PC | To the VPS | When |
|---|---|---|
| `installer/1-install-node.sh` | `<app dir>/installer/` | First time |
| `installer/2-start-client.sh` | `<app dir>/installer/` | First time, and whenever the script changes |
| `clientend/.next/` (whole folder) | `<app dir>/clientend/.next/` | Every deploy |
| `clientend/public/` (whole folder) | `<app dir>/clientend/public/` | Every deploy |
| `clientend/package.json` | `<app dir>/clientend/` | Every deploy |
| `clientend/pnpm-lock.yaml` | `<app dir>/clientend/` | Every deploy |
| `clientend/pnpm-workspace.yaml` | `<app dir>/clientend/` | Every deploy |
| `clientend/next.config.ts` | `<app dir>/clientend/` | Every deploy |
| `clientend/.env.production` | `<app dir>/clientend/` | First time, and whenever it changes |

**Do not upload** `node_modules`, `src`, `dummy_data`, `scripts` or `.next/cache`. The mock data is already compiled into `.next`, and the server installs its own `node_modules`.

> On an update, **delete the old `<app dir>/clientend/.next` on the VPS before uploading the new one**. Otherwise stale build files mix with the new ones.

---

## Part C: on the VPS (first-time setup)

SSH into the VPS.

### 1. Add swap (strongly recommended on 1 GB RAM)

This keeps `pnpm install` and the app from being killed when memory runs out.

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 2. Install Node.js (only once)

```bash
cd <app dir>/installer
bash 1-install-node.sh
source ~/.bashrc
```

### 3. Install dependencies and start the app

```bash
bash <app dir>/installer/2-start-client.sh
```

The app now runs on port **3000**. To use another port, run `PORT=8080 bash 2-start-client.sh`.

### 4. Start the app automatically after a reboot (only once)

```bash
pm2 startup
```

This prints a `sudo env PATH=... pm2 startup ...` command. Copy that command, run it, and then run:

```bash
pm2 save
```

### 5. Check it

```bash
pm2 status
pm2 logs lunetbaz-client
curl -I http://localhost:3000
```

---

## Deploying an update

1. On your PC, do **Part A, step 2** (build).
2. On the VPS, delete the old build: `rm -rf <app dir>/clientend/.next`
3. Upload the "Every deploy" items from **Part B** over SFTP.
4. On the VPS, restart the app: `bash <app dir>/installer/2-start-client.sh`

---

## Optional: serve on port 80 with a domain (nginx)

```bash
sudo apt-get install -y nginx
sudo tee /etc/nginx/sites-available/lunetbaz >/dev/null <<'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF
sudo ln -sf /etc/nginx/sites-available/lunetbaz /etc/nginx/sites-enabled/lunetbaz
sudo nginx -t && sudo systemctl reload nginx
```

For HTTPS, run `sudo apt-get install -y certbot python3-certbot-nginx && sudo certbot --nginx -d your-domain.com`.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `bash: $'\r': command not found` | The scripts got Windows line endings during upload (some SFTP clients convert in "text/auto" mode; use binary mode). Fix them with `sed -i 's/\r$//' <app dir>/installer/*.sh` |
| `nvm: command not found` / `pnpm: command not found` | Run `source ~/.bashrc` or open a new SSH session |
| `No production build in .../.next` | `.next` wasn't uploaded, or it went to the wrong folder. It must be `<app dir>/clientend/.next/BUILD_ID` |
| App keeps restarting | Run `pm2 logs lunetbaz-client`. Make sure swap is on (`free -h`) |
| Changed a `NEXT_PUBLIC_*` value and nothing changed | Those values are fixed at build time, so rebuild on your PC and re-upload `.next` |
