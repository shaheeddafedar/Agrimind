import serial
import requests
import time
import threading

SERIAL_PORT = "COM4"
BAUD_RATE = 9600

API_URL = "http://localhost:3000/api/sensor/update"
HEARTBEAT_URL = "http://localhost:3000/api/sensor/heartbeat"
DISCONNECT_URL = "http://localhost:3000/api/sensor/disconnect"


def parse_sensor_data(line):
    """
    Expected Arduino format:
    N=52,P=167,K=161,M=39
    """

    try:
        parts = line.split(",")

        data = {}

        for part in parts:
            key, value = part.split("=")
            data[key.strip()] = float(value.strip())

        return {
            "nitrogen": data["N"],
            "phosphorus": data["P"],
            "potassium": data["K"],
            "moisture": data["M"]
        }

    except (ValueError, KeyError):
        return None


# ==========================================
# SENSOR BRIDGE HEARTBEAT
# ==========================================

def send_heartbeat():

    while True:

        try:

            response = requests.post(
                HEARTBEAT_URL,
                timeout=3
            )

            if response.ok:
                print("Heartbeat: Sensor bridge connected")

        except requests.RequestException:
            pass

        time.sleep(2)


# ==========================================
# SERIAL CONNECTION
# ==========================================

try:

    ser = serial.Serial(
        SERIAL_PORT,
        BAUD_RATE,
        timeout=2
    )

    print("AgriMind Sensor Bridge")
    print("-----------------------")
    print(f"Connected to {SERIAL_PORT}")
    print("Waiting for sensor data...\n")

except serial.SerialException as e:

    print("Could not open serial port.")
    print(e)
    exit()


# ==========================================
# START HEARTBEAT THREAD
# ==========================================

heartbeat_thread = threading.Thread(
    target=send_heartbeat,
    daemon=True
)

heartbeat_thread.start()


# ==========================================
# MAIN SENSOR LOOP
# ==========================================

while True:

    try:

        line = ser.readline().decode(
            "utf-8",
            errors="ignore"
        ).strip()

        if not line:
            continue

        print("Arduino:", line)

        sensor_data = parse_sensor_data(line)

        if sensor_data is None:
            continue

        response = requests.post(
            API_URL,
            json=sensor_data,
            timeout=5
        )

        if response.ok:

            print(
                "Sent to AgriMind:",
                sensor_data
            )

        else:

            print(
                "API error:",
                response.status_code,
                response.text
            )

    except serial.SerialException as e:
        print(
            "Serial connection error:",
            e
        )

        try:
            requests.post(
                DISCONNECT_URL,
                timeout=3
            )
            print(
                "Sensor disconnected from AgriMind."
            )
        except requests.RequestException:
            pass

        break

    except requests.RequestException as e:

        print(
            "Node.js connection error:",
            e
        )

    except KeyboardInterrupt:

        print("\nStopping sensor bridge...")

        try:

            requests.post(
                DISCONNECT_URL,
                timeout=3
            )

            print(
                "Sensor disconnected from AgriMind."
            )

        except requests.RequestException:

            pass

        break

    time.sleep(0.2)


ser.close()

print("Sensor bridge closed.")