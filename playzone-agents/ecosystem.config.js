// PM2 process definition for the PlayZone WhatsApp bot.
// Keeps the bot running 24/7: auto-restarts on any crash and (with `pm2 save` +
// pm2-startup) relaunches automatically when Windows boots.
//
//   pm2 start ecosystem.config.js
//   pm2 save
//
module.exports = {
  apps: [
    {
      name: 'playzone-bot',
      script: 'src/index.js',
      cwd: 'D:/sportspot/playzone-agents',
      autorestart: true,          // restart if the process ever exits/crashes
      restart_delay: 3000,        // wait 3s between restarts
      max_restarts: 1000,         // effectively unlimited over the process lifetime
      max_memory_restart: '700M', // guard against a Chromium memory leak
      env: {
        PORT: '3001',
      },
      out_file: 'D:/sportspot/playzone-agents/logs/bot-out.log',
      error_file: 'D:/sportspot/playzone-agents/logs/bot-err.log',
      time: true,                 // prefix log lines with timestamps
    },

    // FastAPI backend (shared Neon DB + website API + website->WhatsApp bridge).
    {
      name: 'sportspot-backend',
      script: 'C:/Users/Yousuf Traders/anaconda3/python.exe',
      args: '-m uvicorn main:app --host 127.0.0.1 --port 8000',
      cwd: 'D:/sportspot/backend',
      interpreter: 'none',
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 1000,
      out_file: 'D:/sportspot/playzone-agents/logs/backend-out.log',
      error_file: 'D:/sportspot/playzone-agents/logs/backend-err.log',
      time: true,
    },

    // Next.js frontend (the customer-facing website on :3000).
    {
      name: 'sportspot-frontend',
      script: 'D:/sportspot/frontend/node_modules/next/dist/bin/next',
      args: 'dev',
      cwd: 'D:/sportspot/frontend',
      interpreter: 'node',
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 1000,
      out_file: 'D:/sportspot/playzone-agents/logs/frontend-out.log',
      error_file: 'D:/sportspot/playzone-agents/logs/frontend-err.log',
      time: true,
    },
  ],
};
