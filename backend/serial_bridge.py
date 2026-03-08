import asyncio
import json
import logging
import os
from datetime import datetime

logger = logging.getLogger(__name__)

SERIAL_PORT = os.getenv("SERIAL_PORT", "/dev/ttyUSB0")
BAUD_RATE   = int(os.getenv("BAUD_RATE", "9600"))


class SerialBridge:
    def __init__(self, ws_manager):
        self.ws_manager = ws_manager
        self.is_connected = False
        self._serial = None
        self._running = False
        self._command_queue: asyncio.Queue = asyncio.Queue()

    async def start(self):
        """Start reading from Arduino. Gracefully skips if no port available."""
        self._running = True
        try:
            import serial_asyncio
            self._reader, self._writer = await serial_asyncio.open_serial_connection(
                url=SERIAL_PORT, baudrate=BAUD_RATE
            )
            self.is_connected = True
            logger.info(f"Arduino connected on {SERIAL_PORT}")
            await asyncio.gather(
                self._read_loop(),
                self._write_loop()
            )
        except ImportError:
            logger.warning("serial_asyncio not installed — running without Arduino serial.")
        except Exception as e:
            logger.warning(f"Arduino serial not available ({e}) — running in API-only mode.")
            self.is_connected = False

    def stop(self):
        self._running = False
        if self._writer:
            self._writer.close()

    async def _read_loop(self):
        """Read lines from Arduino and forward to API."""
        while self._running:
            try:
                line = await self._reader.readline()
                text = line.decode("utf-8").strip()
                if not text:
                    continue
                data = json.loads(text)
                await self._process_arduino_data(data)
            except json.JSONDecodeError:
                pass  # Ignore malformed lines
            except Exception as e:
                logger.error(f"Serial read error: {e}")
                await asyncio.sleep(1)

    async def _process_arduino_data(self, data: dict):
        """Parse Arduino JSON and post to our own API sensor endpoint."""
        import httpx
        payload = {
            "tank1_level": data.get("t1", 0),
            "tank2_level": data.get("t2", 0),
            "tank3_level": data.get("t3", 0),
            "inflow_rate": data.get("f1", 0),
            "filter_rate": data.get("f2", 0),
            "sv0_open": bool(data.get("sv", [0,0,0,0,0,0])[0]),
            "sv1_open": bool(data.get("sv", [0,0,0,0,0,0])[1]),
            "sv2_open": bool(data.get("sv", [0,0,0,0,0,0])[2]),
            "sv3_open": bool(data.get("sv", [0,0,0,0,0,0])[3]),
            "sv4_open": bool(data.get("sv", [0,0,0,0,0,0])[4]),
            "sv5_open": bool(data.get("sv", [0,0,0,0,0,0])[5]),
            "battery_voltage": data.get("bv"),
            "solar_charging": bool(data.get("sc", 0)),
            "source": "arduino",
        }
        try:
            async with httpx.AsyncClient() as client:
                await client.post("http://localhost:8000/api/sensors/reading", json=payload)
        except Exception as e:
            logger.error(f"Failed to post Arduino data: {e}")

    async def _write_loop(self):
        """Send queued commands to Arduino."""
        while self._running:
            try:
                cmd = await asyncio.wait_for(self._command_queue.get(), timeout=1.0)
                msg = json.dumps(cmd) + "\n"
                self._writer.write(msg.encode("utf-8"))
                await self._writer.drain()
                logger.info(f"Sent to Arduino: {msg.strip()}")
            except asyncio.TimeoutError:
                pass
            except Exception as e:
                logger.error(f"Serial write error: {e}")

    async def send_command(self, valve_command):
        """Queue a valve command for Arduino."""
        cmd = {
            "cmd": "VALVE",
            "id": valve_command.valve_id,
            "action": valve_command.action,
        }
        await self._command_queue.put(cmd)

    async def send_schedules(self, schedules):
        """Push all schedules to Arduino EEPROM."""
        sched_data = [
            {"ts": s.tap_stand, "start": s.start_time, "end": s.end_time, "en": s.enabled}
            for s in schedules
        ]
        await self._command_queue.put({"cmd": "SCHEDULES", "data": sched_data})