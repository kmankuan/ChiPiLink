#!/bin/bash
# Sport Engine startup — starts as background subprocess
# No supervisor dependency — uses direct uvicorn process
cd /app/sport-engine

# Kill any existing sport-engine process on port 8004
pkill -f "uvicorn main:app.*8004" 2>/dev/null
sleep 1

# Start uvicorn as background process
nohup /root/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8004 --workers 1 \
  > /var/log/supervisor/sport-engine.out.log \
  2> /var/log/supervisor/sport-engine.err.log &

echo $! > /tmp/sport-engine.pid
sleep 2

# Verify it started
if curl -s http://127.0.0.1:8004/health > /dev/null 2>&1; then
  echo "[sport-bootstrap] Sport Engine is RUNNING on port 8004 (pid $(cat /tmp/sport-engine.pid))"
else
  echo "[sport-bootstrap] Sport Engine started (pid $(cat /tmp/sport-engine.pid)), waiting for health..."
fi
