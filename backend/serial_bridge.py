import asyncio
import json
import logging
import os
from datetime import datetime

logger = logging.getLogger(__name__)

# Environment variables with defaults para sa development
SERIAL_PORT = os.getenv("SERIAL_PORT", "/dev/ttyUSB0")
BAUD_RATE   = int(os.getenv("BAUD_RATE", "9600"))

class SerialBridge:
    def __init__(self, ws_manager):
        self.ws_manager = ws_manager
        self.is_connected = False
        self._running = False
        self._reader = None
        self._writer = None
        self._command_queue: asyncio.Queue = asyncio.Queue()

    async def start(self):
        """
        Inuumpisahan ang pakikipag-usap sa Arduino. 
        Lalagpasan ang error kung walang hardware na nakasaksak.
        """
        self._running = True
        try:
            # Import dito para hindi mag-error kung hindi installed sa system
            import serial_asyncio
            
            logger.info(f"Attempting to connect to Arduino on {SERIAL_PORT}...")
            self._reader, self._writer = await serial_asyncio.open_serial_connection(
                url=SERIAL_PORT, baudrate=BAUD_RATE
            )
            
            self.is_connected = True
            logger.info(f"SUCCESS: Arduino connected on {SERIAL_PORT}")
            
            # Patatakbuhin ang read at write loops nang sabay
            await asyncio.gather(
                self._read_loop(),
                self._write_loop()
            )
            
        except ImportError:
            logger.warning("Dependency 'serial_asyncio' not found. Run: pip install pyserial-asyncio")
            self.is_connected = False
        except Exception as e:
            # Dito papasok ang system mo dahil wala munang Arduino
            logger.warning(f"Arduino serial not available ({e}) — running in API-only mode.")
            self.is_connected = False

    def stop(self):
        """
        Ligtas na pinapatay ang serial connection.
        Hindi ito mag-e-error (AttributeError) kahit walang hardware.
        """
        self._running = False
        
        # Gumagamit ng getattr para sigurado kung existing ang _writer
        writer = getattr(self, '_writer', None)
        if writer:
            try:
                writer.close()
                logger.info("Serial Bridge: Connection closed safely.")
            except Exception as e:
                logger.error(f"Serial Bridge: Error during shutdown: {e}")
        else:
            logger.info("Serial Bridge: Stopped (No active connection to close).")

    async def _read_loop(self):
        """Nakikinig sa mga data na pinapadala ng Arduino."""
        while self._running and self._reader:
            try:
                line = await self._reader.readline()
                text = line.decode("utf-8").strip()
                if not text:
                    continue
                
                # Arduino data is expected to be in JSON format
                data = json.loads(text)
                await self._process_arduino_data(data)
                
            except json.JSONDecodeError:
                # Nilalagpasan ang mga putol o maling data mula sa serial
                pass  
            except Exception as e:
                logger.error(f"Serial read loop error: {e}")
                await asyncio.sleep(1)

    async def _process_arduino_data(self, data: dict):
        """
        Ipinapasa ang data mula sa Arduino papunta sa ating API.
        """
        import httpx
        
        # Inaayos ang format base sa SensorReading model sa models.py
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
            # Ipinapadala ang data sa sarili nating API endpoint
            async with httpx.AsyncClient() as client:
                await client.post("http://localhost:8000/api/sensors/reading", json=payload)
        except Exception as e:
            logger.error(f"Failed to post data to local API: {e}")

    async def _write_loop(self):
        """Ipinapadala ang mga utos mula sa API/Mobile papunta sa Arduino."""
        while self._running and self._writer:
            try:
                # Naghihintay ng command sa queue
                cmd = await asyncio.wait_for(self._command_queue.get(), timeout=1.0)
                msg = json.dumps(cmd) + "\n"
                
                self._writer.write(msg.encode("utf-8"))
                await self._writer.drain()
                logger.info(f"Command sent to Arduino: {msg.strip()}")
                
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Serial write loop error: {e}")

    async def send_command(self, valve_command):
        """Inilalagay ang valve command sa queue para ipadala sa Arduino."""
        cmd = {
            "cmd": "VALVE",
            "id": valve_command.valve_id,
            "action": valve_command.action,
        }
        await self._command_queue.put(cmd)

    async def send_schedules(self, schedules):
        """Inilalagay ang lahat ng schedules sa queue para ma-save sa Arduino EEPROM."""
        sched_data = [
            {
                "ts": s.tap_stand, 
                "start": s.start_time, 
                "end": s.end_time, 
                "en": s.enabled
            }
            for s in schedules
        ]
        await self._command_queue.put({"cmd": "SCHEDULES", "data": sched_data})