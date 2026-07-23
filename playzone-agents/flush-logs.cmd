@echo off
REM Weekly PM2 log flush (scheduled task safeguard against unbounded log growth).
call "%APPDATA%\npm\pm2.cmd" flush
