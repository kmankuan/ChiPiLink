"""
Service Process Manager — Starts and monitors child services (Sport Engine, etc.)
Runs services as direct subprocess.Popen children — no supervisor dependency.
Auto-restarts crashed services. Health checks every 30s.
"""
import subprocess
import asyncio
import os
import signal
import logging
from typing import Dict, Optional

logger = logging.getLogger("service_manager")


class ServiceProcess:
    def __init__(self, name: str, command: list, cwd: str, port: int):
        self.name = name
        self.command = command
        self.cwd = cwd
        self.port = port
        self.process: Optional[subprocess.Popen] = None
        self.restart_count = 0
        self.max_restarts = 5

    def start(self):
        """Start the service as a subprocess."""
        if self.process and self.process.poll() is None:
            logger.info(f"[{self.name}] Already running (pid {self.process.pid})")
            return True

        try:
            log_out = open(f"/var/log/supervisor/{self.name}.out.log", "a")
            log_err = open(f"/var/log/supervisor/{self.name}.err.log", "a")

            self.process = subprocess.Popen(
                self.command,
                cwd=self.cwd,
                stdout=log_out,
                stderr=log_err,
                preexec_fn=os.setsid,  # New process group so it survives
            )
            logger.info(f"[{self.name}] Started on port {self.port} (pid {self.process.pid})")
            return True
        except Exception as e:
            logger.error(f"[{self.name}] Failed to start: {e}")
            return False

    def is_alive(self):
        if not self.process:
            return False
        return self.process.poll() is None

    def stop(self):
        if self.process and self.process.poll() is None:
            try:
                os.killpg(os.getpgid(self.process.pid), signal.SIGTERM)
                self.process.wait(timeout=5)
            except Exception:
                try:
                    self.process.kill()
                except Exception:
                    pass
            logger.info(f"[{self.name}] Stopped")


class ServiceManager:
    def __init__(self):
        self.services: Dict[str, ServiceProcess] = {}
        self._monitor_task = None

    def register(self, name: str, command: list, cwd: str, port: int):
        self.services[name] = ServiceProcess(name, command, cwd, port)

    def start_all(self):
        for svc in self.services.values():
            svc.start()

    async def start_monitoring(self):
        """Background task: check services every 30s, restart if crashed."""
        self._monitor_task = asyncio.create_task(self._monitor_loop())

    async def _monitor_loop(self):
        await asyncio.sleep(10)  # Initial delay
        while True:
            for svc in self.services.values():
                if not svc.is_alive() and svc.restart_count < svc.max_restarts:
                    logger.warning(f"[{svc.name}] Crashed, restarting ({svc.restart_count + 1}/{svc.max_restarts})")
                    svc.start()
                    svc.restart_count += 1
            await asyncio.sleep(30)

    def stop_all(self):
        for svc in self.services.values():
            svc.stop()
        if self._monitor_task:
            self._monitor_task.cancel()

    def status(self):
        return {
            name: {
                "running": svc.is_alive(),
                "pid": svc.process.pid if svc.process else None,
                "port": svc.port,
                "restarts": svc.restart_count,
            }
            for name, svc in self.services.items()
        }


# Global instance
service_manager = ServiceManager()
