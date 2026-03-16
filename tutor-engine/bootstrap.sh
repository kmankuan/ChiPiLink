#!/bin/bash
# Tutor Engine startup — creates supervisor config and starts the service
CONF_FILE="/etc/supervisor/conf.d/tutor-engine.conf"

if [ ! -f "$CONF_FILE" ]; then
  cat > "$CONF_FILE" << 'EOF'
[program:tutor-engine]
command=/root/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8003 --workers 1 --reload
directory=/app/tutor-engine
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/tutor-engine.err.log
stdout_logfile=/var/log/supervisor/tutor-engine.out.log
stopsignal=TERM
stopwaitsecs=30
stopasgroup=true
killasgroup=true
EOF
  echo "[tutor-bootstrap] Created supervisor config"
fi

supervisorctl reread > /dev/null 2>&1
supervisorctl update > /dev/null 2>&1

sleep 2
if supervisorctl status tutor-engine | grep -q RUNNING; then
  echo "[tutor-bootstrap] Tutor Engine is RUNNING on port 8003"
else
  supervisorctl start tutor-engine > /dev/null 2>&1
  sleep 2
  echo "[tutor-bootstrap] Tutor Engine started"
fi
