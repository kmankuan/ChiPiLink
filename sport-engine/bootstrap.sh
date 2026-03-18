#!/bin/bash
# Sport Engine startup — creates supervisor config and starts the service on port 8004
CONF_FILE="/etc/supervisor/conf.d/sport-engine.conf"

if [ ! -f "$CONF_FILE" ]; then
  cat > "$CONF_FILE" << 'EOF'
[program:sport-engine]
command=/root/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8004 --workers 1 --reload
directory=/app/sport-engine
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/sport-engine.err.log
stdout_logfile=/var/log/supervisor/sport-engine.out.log
stopsignal=TERM
stopwaitsecs=30
stopasgroup=true
killasgroup=true
EOF
  echo "[sport-bootstrap] Created supervisor config"
fi

supervisorctl reread > /dev/null 2>&1
supervisorctl update > /dev/null 2>&1

sleep 2
if supervisorctl status sport-engine | grep -q RUNNING; then
  echo "[sport-bootstrap] Sport Engine is RUNNING on port 8004"
else
  supervisorctl start sport-engine > /dev/null 2>&1
  sleep 2
  echo "[sport-bootstrap] Sport Engine started"
fi
