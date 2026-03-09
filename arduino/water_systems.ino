/*
 * Barangay Water System — Arduino Mega 2560 Firmware
 * Sends sensor readings to Raspberry Pi via USB Serial (JSON)
 * Receives valve commands and schedule updates from Pi
 *
 * Serial Protocol:
 *   TX (Arduino → Pi): {"t1":1200,"t2":800,"t3":2600,"f1":4.8,"f2":0.7,"sv":[1,1,1,0,0,0],"bv":12.4,"sc":1}
 *   RX (Pi → Arduino): {"cmd":"VALVE","id":1,"action":"CLOSE"}
 *                      {"cmd":"SCHEDULES","data":[{"ts":1,"start":"05:30","end":"07:00","en":true},...]}
 *
 * Wiring:
 *   JSN-SR04T Tank1: TRIG=22, ECHO=23
 *   JSN-SR04T Tank2: TRIG=24, ECHO=25
 *   JSN-SR04T Tank3: TRIG=26, ECHO=27
 *   YF-S201 Inflow:  Signal=2 (interrupt)
 *   YF-S201 Filter:  Signal=3 (interrupt)
 *   Relay SV0–SV5:   Pins 30,31,32,33,34,35 (LOW = energize = OPEN for NC valve)
 *   Battery sense:   A0 (voltage divider: 12V → 5V via 10k/4.7k)
 *   Solar sense:     A1
 *   LCD I2C:         SDA=20, SCL=21
 *   Keypad:          Rows=40,41,42,43 Cols=44,45,46,47
 *   RTC DS3231:      I2C shared with LCD
 */

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <RTClib.h>
#include <ArduinoJson.h>
#include <Keypad.h>
#include <EEPROM.h>

// ── Pin Definitions ──────────────────────────────────────────────────────────
#define TRIG1 22
#define ECHO1 23
#define TRIG2 24
#define ECHO2 25
#define TRIG3 26
#define ECHO3 27

#define FLOW1_PIN 2   // Interrupt 0
#define FLOW2_PIN 3   // Interrupt 1

#define RELAY_SV0 30
#define RELAY_SV1 31
#define RELAY_SV2 32
#define RELAY_SV3 33
#define RELAY_SV4 34
#define RELAY_SV5 35

#define BATT_PIN A0
#define SOLAR_PIN A1

// ── Tank Dimensions ──────────────────────────────────────────────────────────
const float TANK1_CAP = 2000.0;  // liters
const float TANK2_CAP = 2000.0;
const float TANK3_CAP = 4000.0;
const float TANK1_H_CM = 120.0;  // internal height in cm — adjust to actual
const float TANK2_H_CM = 120.0;
const float TANK3_H_CM = 150.0;

// ── Flow sensors ─────────────────────────────────────────────────────────────
volatile unsigned long flow1_pulses = 0;
volatile unsigned long flow2_pulses = 0;
void IRAM_ATTR countFlow1() { flow1_pulses++; }
void IRAM_ATTR countFlow2() { flow2_pulses++; }

// ── Valve states ─────────────────────────────────────────────────────────────
bool sv_open[6] = { false, false, false, false, false, false };
const int RELAY_PINS[6] = { RELAY_SV0, RELAY_SV1, RELAY_SV2, RELAY_SV3, RELAY_SV4, RELAY_SV5 };

// ── Control thresholds ───────────────────────────────────────────────────────
const float T2_CLOSE_PCT = 90.0;  // Close SV0 when Tank 2 >= 90%
const float T2_OPEN_PCT  = 70.0;  // Reopen SV0 when Tank 2 <= 70%

// ── Schedules (EEPROM-backed) ─────────────────────────────────────────────────
struct Schedule { uint8_t start_h, start_m, end_h, end_m; bool enabled; };
Schedule schedules[5];  // Index 0 = Tap Stand 1

// ── LCD & RTC ─────────────────────────────────────────────────────────────────
LiquidCrystal_I2C lcd(0x27, 20, 4);
RTC_DS3231 rtc;

// ── Keypad ────────────────────────────────────────────────────────────────────
const byte ROWS = 4, COLS = 4;
char keys[ROWS][COLS] = {
  {'1','2','3','A'},{'4','5','6','B'},{'7','8','9','C'},{'*','0','#','D'}
};
byte rowPins[ROWS] = {40,41,42,43};
byte colPins[COLS] = {44,45,46,47};
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

// ── Timing ────────────────────────────────────────────────────────────────────
unsigned long lastSend = 0;
unsigned long lastFlowCalc = 0;
const unsigned long SEND_INTERVAL = 5000;   // Send data every 5 seconds
const unsigned long FLOW_INTERVAL = 10000;  // Calculate flow rate every 10s
float inflow_rate = 0.0, filter_rate = 0.0;

// ── Serial input buffer ───────────────────────────────────────────────────────
String serialBuffer = "";

void setup() {
  Serial.begin(9600);

  // Relay pins — HIGH = de-energized = valve CLOSED (NC valve)
  for (int i = 0; i < 6; i++) {
    pinMode(RELAY_PINS[i], OUTPUT);
    digitalWrite(RELAY_PINS[i], HIGH);  // All closed on startup
  }

  // Flow sensor interrupts
  pinMode(FLOW1_PIN, INPUT_PULLUP);
  pinMode(FLOW2_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(FLOW1_PIN), countFlow1, RISING);
  attachInterrupt(digitalPinToInterrupt(FLOW2_PIN), countFlow2, RISING);

  // LCD
  Wire.begin();
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0,0); lcd.print("Water System v1.0");
  lcd.setCursor(0,1); lcd.print("Initializing...");

  // RTC
  if (!rtc.begin()) {
    lcd.setCursor(0,2); lcd.print("RTC FAULT!");
  }

  // Load schedules from EEPROM
  loadSchedules();

  delay(2000);
  lcd.clear();
}

void loop() {
  unsigned long now = millis();

  // Calculate flow rates every 10 seconds
  if (now - lastFlowCalc >= FLOW_INTERVAL) {
    noInterrupts();
    unsigned long p1 = flow1_pulses; flow1_pulses = 0;
    unsigned long p2 = flow2_pulses; flow2_pulses = 0;
    interrupts();
    // YF-S201: ~7.5 pulses per liter at 1 L/min
    // Adjust calibration factor (7.5) based on actual sensor
    float interval_min = FLOW_INTERVAL / 60000.0;
    inflow_rate = (p1 / 7.5) / interval_min;
    filter_rate = (p2 / 7.5) / interval_min;
    lastFlowCalc = now;
  }

  // Read sensors and apply control logic every 500ms
  float t1_l = readTankLevel(TRIG1, ECHO1, TANK1_H_CM, TANK1_CAP);
  float t2_l = readTankLevel(TRIG2, ECHO2, TANK2_H_CM, TANK2_CAP);
  float t3_l = readTankLevel(TRIG3, ECHO3, TANK3_H_CM, TANK3_CAP);

  // Apply SV0 hysteresis
  float t2_pct = t2_l / TANK2_CAP * 100.0;
  if (t2_pct >= T2_CLOSE_PCT) setValve(0, false);
  else if (t2_pct <= T2_OPEN_PCT) setValve(0, true);

  // Apply Tank 3 tier-based tap control + schedule
  applyTierControl(t3_l);

  // Send JSON to Pi every 5 seconds
  if (now - lastSend >= SEND_INTERVAL) {
    float batt = readBatteryVoltage();
    bool solar = (analogRead(SOLAR_PIN) > 200);
    sendReading(t1_l, t2_l, t3_l, batt, solar);
    lastSend = now;
  }

  // Check for commands from Pi
  readSerialCommands();

  // Update LCD
  updateLCD(t1_l, t2_l, t3_l);

  delay(500);
}

// ── Ultrasonic level reading ──────────────────────────────────────────────────
float readTankLevel(int trig, int echo, float height_cm, float capacity_l) {
  digitalWrite(trig, LOW); delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(10);
  digitalWrite(trig, LOW);
  long duration = pulseIn(echo, HIGH, 30000);
  if (duration == 0) return -1.0;  // Sensor fault
  float dist_cm = duration * 0.0343 / 2.0;
  float water_cm = height_cm - dist_cm;
  water_cm = constrain(water_cm, 0, height_cm);
  return (water_cm / height_cm) * capacity_l;
}

// ── Valve control ─────────────────────────────────────────────────────────────
void setValve(int id, bool open) {
  sv_open[id] = open;
  // NC valve: LOW signal = relay energized = valve OPEN
  digitalWrite(RELAY_PINS[id], open ? LOW : HIGH);
}

// ── Tier-based tap control ────────────────────────────────────────────────────
void applyTierControl(float t3_l) {
  int maxTaps;
  if      (t3_l >= 2000) maxTaps = 5;
  else if (t3_l >= 1000) maxTaps = 3;
  else if (t3_l >= 400)  maxTaps = 1;
  else                   maxTaps = 0;

  DateTime now = rtc.now();

  int openCount = 0;
  for (int i = 0; i < 5; i++) {
    bool inWindow = isInSchedule(i, now.hour(), now.minute());
    bool allow = (openCount < maxTaps) && inWindow;
    setValve(i + 1, allow);
    if (allow) openCount++;
  }
}

bool isInSchedule(int tapIdx, int h, int m) {
  if (!schedules[tapIdx].enabled) return false;
  int now_min  = h * 60 + m;
  int start_min = schedules[tapIdx].start_h * 60 + schedules[tapIdx].start_m;
  int end_min   = schedules[tapIdx].end_h   * 60 + schedules[tapIdx].end_m;
  return (now_min >= start_min && now_min < end_min);
}

// ── Battery voltage reading ───────────────────────────────────────────────────
float readBatteryVoltage() {
  // Voltage divider: R1=10k, R2=4.7k → Vout = Vin * 4.7/14.7
  int raw = analogRead(BATT_PIN);
  float v_adc = raw * (5.0 / 1023.0);
  return v_adc * (14.7 / 4.7);
}

// ── Send JSON reading to Pi ───────────────────────────────────────────────────
void sendReading(float t1, float t2, float t3, float bv, bool sc) {
  StaticJsonDocument<256> doc;
  doc["t1"] = round(t1 * 10) / 10.0;
  doc["t2"] = round(t2 * 10) / 10.0;
  doc["t3"] = round(t3 * 10) / 10.0;
  doc["f1"] = round(inflow_rate * 100) / 100.0;
  doc["f2"] = round(filter_rate * 100) / 100.0;
  JsonArray sv = doc.createNestedArray("sv");
  for (int i = 0; i < 6; i++) sv.add(sv_open[i] ? 1 : 0);
  doc["bv"] = round(bv * 10) / 10.0;
  doc["sc"] = sc ? 1 : 0;
  serializeJson(doc, Serial);
  Serial.println();
}

// ── Read incoming commands from Pi ────────────────────────────────────────────
void readSerialCommands() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') {
      processCommand(serialBuffer);
      serialBuffer = "";
    } else {
      serialBuffer += c;
    }
  }
}

void processCommand(String json) {
  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, json);
  if (err) return;

  const char* cmd = doc["cmd"];
  if (strcmp(cmd, "VALVE") == 0) {
    int id = doc["id"];
    bool open = (strcmp(doc["action"], "OPEN") == 0);
    setValve(id, open);
  }
  else if (strcmp(cmd, "SCHEDULES") == 0) {
    JsonArray data = doc["data"];
    for (JsonObject s : data) {
      int ts = s["ts"].as<int>() - 1;  // 0-indexed
      if (ts < 0 || ts > 4) continue;
      const char* start = s["start"];
      const char* end   = s["end"];
      sscanf(start, "%hhu:%hhu", &schedules[ts].start_h, &schedules[ts].start_m);
      sscanf(end,   "%hhu:%hhu", &schedules[ts].end_h,   &schedules[ts].end_m);
      schedules[ts].enabled = s["en"].as<bool>();
    }
    saveSchedules();
  }
}

// ── EEPROM schedule persistence ───────────────────────────────────────────────
void saveSchedules() {
  EEPROM.put(0, schedules);
}
void loadSchedules() {
  EEPROM.get(0, schedules);
  // Validate — if EEPROM is blank, set defaults
  for (int i = 0; i < 5; i++) {
    if (schedules[i].start_h > 23 || schedules[i].end_h > 23) {
      schedules[i] = {5, 30, 7, 0, true};  // Default 05:30–07:00
    }
  }
}

// ── LCD update ────────────────────────────────────────────────────────────────
void updateLCD(float t1, float t2, float t3) {
  DateTime now = rtc.now();
  char buf[21];

  lcd.setCursor(0,0);
  snprintf(buf, 21, "T1:%3d%% T2:%3d%% %02d:%02d",
    (int)(t1/TANK1_CAP*100), (int)(t2/TANK2_CAP*100), now.hour(), now.minute());
  lcd.print(buf);

  lcd.setCursor(0,1);
  snprintf(buf, 21, "T3: %4dL = %3d%%    ",
    (int)t3, (int)(t3/TANK3_CAP*100));
  lcd.print(buf);

  lcd.setCursor(0,2);
  snprintf(buf, 21, "SV0:%s SV1-5:%d%d%d%d%d",
    sv_open[0]?"ON ":"OFF",
    sv_open[1],sv_open[2],sv_open[3],sv_open[4],sv_open[5]);
  lcd.print(buf);

  lcd.setCursor(0,3);
  snprintf(buf, 21, "In:%.1fL/m Fil:%.1fL/m ",
    inflow_rate, filter_rate);
  lcd.print(buf);
}