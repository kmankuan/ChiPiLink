#!/bin/bash
# Integration Hub startup — creates supervisor config and starts the service
# Called by the main backend on startup

CONF_FILE="/etc/supervisor/conf.d/integration-hub.conf"

# Only create if not already present
if [ ! -f "$CONF_FILE" ]; then
  cat > "$CONF_FILE" << 'EOF'
[program:integration-hub]
command=/root/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8002 --workers 1 --reload
directory=/app/integration-hub
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/integration-hub.err.log
stdout_logfile=/var/log/supervisor/integration-hub.out.log
stopsignal=TERM
stopwaitsecs=30
stopasgroup=true
killasgroup=true
EOF
  echo "[hub-bootstrap] Created supervisor config"
fi

# Reload supervisor and start the hub
supervisorctl reread > /dev/null 2>&1
supervisorctl update > /dev/null 2>&1

# Verify
sleep 2
if supervisorctl status integration-hub | grep -q RUNNING; then
  echo "[hub-bootstrap] Integration Hub is RUNNING on port 8002"
else
  supervisorctl start integration-hub > /dev/null 2>&1
  sleep 2
  echo "[hub-bootstrap] Integration Hub started"
fi
