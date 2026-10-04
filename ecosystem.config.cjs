// PM2 konfigurácia pre produkčný server (ai.strhnidav.sk)
// Spustenie: pm2 start ecosystem.config.cjs && pm2 save
module.exports = {
  apps: [
    {
      name: "strhnidav-ai",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      env: { NODE_ENV: "production" },
      instances: 1,
      autorestart: true,
      max_memory_restart: "1G",
    },
  ],
};
