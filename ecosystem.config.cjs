// PM2 konfigurácia pre produkčný server (ai.strhnidav.sk)
// Spustenie: pm2 start ecosystem.config.cjs && pm2 save
const fs = require("fs");
const path = require("path");

// Port sa berie z PORT v .env.local (predvolene 3000) – musí sedieť s App Port v CloudPanel
function readPort() {
  try {
    const env = fs.readFileSync(path.join(__dirname, ".env.local"), "utf8");
    const match = env.match(/^PORT=(\d+)\s*$/m);
    if (match) return match[1];
  } catch {}
  return "3000";
}

module.exports = {
  apps: [
    {
      name: "strhnidav-ai",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: `start -p ${readPort()}`,
      env: { NODE_ENV: "production" },
      instances: 1,
      autorestart: true,
      max_memory_restart: "1G",
    },
  ],
};
