# 🌊 IoT Water Level Monitoring System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Arduino](https://img.shields.io/badge/Framework-Arduino-00979D.svg)](https://www.arduino.cc/)
[![Platform](https://img.shields.io/badge/Platform-ESP8266-E73525.svg)](https://www.espressif.com/en/products/socs/esp8266)

**A smart, real-time solution for monitoring water levels remotely. Built with an ESP8266 and an ultrasonic sensor, this project provides a reliable and cost-effective way to keep track of water levels in tanks, wells, or reservoirs from anywhere in the world.**

---

## 🎯 About The Project

In many residential and industrial settings, manual monitoring of water tanks is inefficient and prone to error, leading to potential water shortages or overflows. This project offers a definitive solution by automating the monitoring process. It leverages the power of the Internet of Things (IoT) to provide real-time data on water levels, accessible through a custom dashboard on your phone or web browser.

This system is perfect for:
* 🏡 **Homeowners:** Monitoring overhead or underground water tanks.
* 🌾 **Farmers:** Managing water levels in irrigation tanks.
* 🏭 **Industries:** Keeping track of liquid levels in storage containers.
* 💧 **Communities:** Monitoring water reservoirs for public supply.

---

## ✨ Key Features

* **Real-Time Data:** Get instant updates on the water level.
* **Remote Access:** Monitor your system from anywhere via a cloud-based dashboard.
* **Alerts & Notifications:** (Optional) Configure custom alerts for critical water levels (e.g., full or empty).
* **Data Visualization:** Analyze historical data through charts and graphs to understand consumption patterns.
* **Low Cost & Open Source:** Built with affordable hardware and fully customizable software.

---

## 🛠️ Technology Stack

* **Microcontroller:** NodeMCU ESP8266
* **Sensor:** HC-SR04 Ultrasonic Sensor
* **Firmware:** C++ on the Arduino Framework
* **Cloud Platform:** Compatible with Blynk, Thingspeak, AWS IoT, or any custom MQTT broker.

---

## ⚙️ How It Works

The system operates on a simple yet effective principle:

1.  **Measurement:** The HC-SR04 ultrasonic sensor, positioned at the top of the tank, emits an ultrasonic pulse.
2.  **Calculation:** The sensor calculates the time it takes for the pulse to travel to the water's surface and bounce back. This duration is used to determine the distance between the sensor and the water.
3.  **Data Processing:** The NodeMCU ESP8266 receives this distance data and calculates the actual water level percentage based on the tank's total height.
4.  **Transmission:** The ESP8266 connects to your local Wi-Fi network and sends the processed data to a configured IoT cloud platform.
5.  **Visualization:** You can log in to the IoT platform's dashboard to view the data in a user-friendly format, such as gauges, charts, and numerical displays.

---

## 🚀 Getting Started

Follow these steps to set up the project.

### Prerequisites

* **Hardware:**
    * NodeMCU ESP8266
    * HC-SR04 Ultrasonic Sensor
    * Jumper Wires
    * 5V Power Supply (e.g., USB adapter)
* **Software:**
    * [Arduino IDE](https://www.arduino.cc/en/software) installed.
    * [ESP8266 Board Core](https://github.com/esp8266/Arduino) installed in Arduino IDE.
    * An account on an IoT platform like [Blynk](https://blynk.io/).

### Hardware Assembly

> **💡 Pro Tip:** For a clean and durable setup, consider designing and 3D printing a custom enclosure for the sensor and microcontroller.

Connect the components as follows:

| HC-SR04 Pin | NodeMCU ESP8266 Pin |
| :---------- | :------------------ |
| `VCC`       | `Vin`               |
| `GND`       | `GND`               |
| `Trig`      | `D1` (GPIO5)        |
| `Echo`      | `D2` (GPIO4)        |

### Software Setup & Deployment

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/Arfazrll/water-level-monitoring.git](https://github.com/Arfazrll/water-level-monitoring.git)
    cd water-level-monitoring
    ```

2.  **Configure:**
    Open the `.ino` file in the Arduino IDE and update the following configuration variables with your details.
    ```cpp
    // --- CONFIGURATION ---
    #define BLYNK_TEMPLATE_ID "YOUR_BLYNK_TEMPLATE_ID"
    #define BLYNK_DEVICE_NAME "Water Level Monitor"
    #define BLYNK_AUTH_TOKEN "YOUR_BLYNK_AUTH_TOKEN"

    char ssid[] = "YOUR_WIFI_SSID";
    char pass[] = "YOUR_WIFI_PASSWORD";

    const int TANK_HEIGHT_CM = 200; // Set the total height of your tank in cm
    // ---------------------
    ```

3.  **Upload the Code:**
    * Connect the NodeMCU to your computer via USB.
    * In the Arduino IDE, select `NodeMCU 1.0 (ESP-12E Module)` as the board and the correct COM port.
    * Click the **Upload** button.

4.  **Monitor:**
    Open the Serial Monitor (`Ctrl+Shift+M`) at a baud rate of `9600` to see status messages and readings.

---

## 🔧 Troubleshooting

* **No Data on Dashboard:**
    * Double-check your Wi-Fi SSID, password, and IoT platform authentication token.
    * Ensure your Wi-Fi network has a stable 2.4GHz connection.
    * Verify hardware connections.
* **Inaccurate Readings:**
    * Ensure the sensor is perfectly perpendicular to the water surface.
    * Make sure the `TANK_HEIGHT_CM` constant in the code matches your tank's actual height.
    * Objects inside the tank can sometimes interfere with the ultrasonic waves. Ensure a clear path for the sensor.

---

## 🗺️ Roadmap & Future Enhancements

This project has great potential for expansion. Here are some ideas:

* [ ] **Pump Automation:** Integrate a relay to automatically turn a water pump on or off based on the water level.
* [ ] **Solar Power:** Make the system self-sufficient by powering it with a solar panel and a rechargeable battery.
* [ ] **Data Logging:** Store data locally on an SD card as a backup in case of network failure.
* [ ] **Enhanced UI:** Develop a custom web application or mobile app for a more tailored user experience.

---

## 🤝 Contributing

Contributions make the open-source community an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**. Please read our [contributing guidelines](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

A big thank you to the open-source community for providing the tools and libraries that made this project possible.
