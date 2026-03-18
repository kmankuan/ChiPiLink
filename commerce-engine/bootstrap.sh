#!/bin/bash
# Commerce Engine startup — creates supervisor config and starts on port 8005
CONF_FILE="/etc/supervisor/conf.d/commerce-engine.conf"

if [ ! -f "$CONF_FILE" ]; then
  cat > "$CONF_FILE" << 'EOF'
[program:commerce-engine]
command=/root/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8005 --workers 1 --reload
directory=/app/commerce-engine
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/commerce-engine.err.log
stdout_logfile=/var/log/supervisor/commerce-engine.out.log
stopsignal=TERM
stopwaitsecs=30
stopasgroup=true
killasgroup=true
EOF
  echo "[commerce-bootstrap] Created supervisor config"
fi

supervisorctl reread > /dev/null 2>&1
supervisorctl update > /dev/null 2>&1

sleep 2
if supervisorctl status commerce-engine | grep -q RUNNING; then
  echo "[commerce-bootstrap] Commerce Engine is RUNNING on port 8005"
else
  supervisorctl start commerce-engine > /dev/null 2>&1
  sleep 2
  echo "[commerce-bootstrap] Commerce Engine started"
fi
