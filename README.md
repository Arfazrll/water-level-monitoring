# 🌊 IoT Water Level Monitoring System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Arduino](https://img.shields.io/badge/Framework-Arduino-00979D.svg)](https://www.arduino.cc/)
[![Platform](https://img.shields.io/badge/Platform-ESP32-E73525.svg)](https://www.espressif.com/en/products/socs/esp32)

**A smart, real-time solution for monitoring water levels remotely. Built with an ESP32 and an ultrasonic sensor, this project provides a reliable and cost-effective way to keep track of water levels in tanks, wells, or reservoirs from anywhere in the world.**

---

### 🎥 Project Showcase

[Tonton Video Demo](https://drive.google.com/file/d/1I9ZeGkwwbnJWzgZtNRgFsyNmyu4iCrVV/view?usp=drive_link)

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
* **Remote Accessibility:** Monitor your system from anywhere via a cloud-based dashboard.
* **Pump Control:** Manually or automatically control the water pump.
* **Alerts & Notifications:** Configure custom email alerts for critical water levels.
* **Data Visualization:** Analyze historical data through charts and logs to understand consumption patterns.
* **Low Cost & Open Source:** Built with affordable hardware and fully customizable software.

---

## 🏛️ System Architecture

The architecture of this system is designed for reliability and real-time responsiveness. The diagram below illustrates the complete data flow, from sensor to user interface.

![System Architecture](./image_5a880f.png)
*(Catatan: Diagram ini menggunakan NodeMCU sebagai contoh, namun arsitekturnya identik untuk ESP32. Pastikan Anda telah mengunggah gambar `image_5a880f.png` ke repositori Anda agar gambar ini muncul)*

The workflow is as follows:

1.  **Input (Data Acquisition):** An ultrasonic sensor placed above the water tank (`Tangki Air`) continuously measures the distance to the water's surface.
2.  **Processing:** An **ESP32** microcontroller reads the raw data from the sensor. It then processes this data to calculate the current water level and percentage.
3.  **Connectivity:** The ESP32 connects to a local **Wi-Fi network** to gain internet access, acting as the bridge between the physical hardware and the cloud server.
4.  **Backend & Frontend Server:** The processed data is transmitted over the internet to the **Web Server**. This server hosts both the backend and frontend applications.
    * The **Backend** is responsible for data storage, user authentication, pump control logic, and sending notifications.
    * The **Frontend** provides a user-friendly dashboard for real-time monitoring and interaction.
5.  **Output (User Interface):** The end-user can access the web application from any device with a browser, such as a smartphone or PC. From the dashboard, the user can:
    * View **Real-time Monitoring** data.
    * Perform **Pump Control**.
    * Receive **Notifications** about the tank's status.
    * Review **Data History**.

---

## 🛠️ Technology Stack

* **Microcontroller:** ESP32 Development Board
* **Sensor:** HC-SR04 Ultrasonic Sensor
* **Firmware:** C++ on the Arduino Framework
* **Backend:** Node.js, Express, MongoDB, Mongoose, WebSocket (ws)
* **Frontend:** Next.js, React, Tailwind CSS
* **Cloud Platform:** Deployed on any platform that supports Node.js (e.g., Vercel, Heroku, AWS).

---

## 🚀 Getting Started

Follow these steps to set up the project.

### Prerequisites

* **Hardware:**
    * ESP32 Development Board
    * HC-SR04 Ultrasonic Sensor
    * Jumper Wires
    * 5V Power Supply (e.g., USB adapter)
* **Software:**
    * [Arduino IDE](https://www.arduino.cc/en/software) installed.
    * **ESP32 Board Core:** Install the ESP32 board manager in your Arduino IDE. Follow this [tutorial](https://randomnerdtutorials.com/installing-the-esp32-board-in-arduino-ide-windows-instructions/).
    * [Node.js](https://nodejs.org/) (for the backend)
    * [MongoDB](https://www.mongodb.com/try/download/community) (or a MongoDB Atlas account)

### Hardware Assembly

Connect the components as described below. It is crucial to ensure all connections are secure for accurate readings.

| HC-SR04 Pin | ESP32 Pin      |
| :---------- | :------------- |
| `VCC`       | `VIN`          |
| `GND`       | `GND`          |
| `Trig`      | `GPIO5`        |
| `Echo`      | `GPIO18`       |

> **⚠️ Important:** The HC-SR04 sensor's `Echo` pin outputs a 5V signal, while the ESP32's GPIO pins are only **3.3V tolerant**. For long-term reliability and to prevent damage to your ESP32, it is **highly recommended** to use a simple voltage divider (e.g., a 1kΩ and a 2kΩ resistor) to step down the 5V signal to approximately 3.3V before connecting it to the ESP32's `Echo` pin.

### Software Setup & Deployment

#### 1. Backend Setup
```bash
# Navigate to the backend directory
cd BackEnd

# Install dependencies
npm install

# Create a .env file and add your configuration
# (see .env.example)
cp .env.example .env

# Run the server
npm run dev
````

#### 2\. Frontend Setup

```bash
# Navigate to the frontend directory
cd FrontEnd

# Install dependencies
npm install

# Run the development server
npm run dev
```

#### 3\. Firmware (ESP32)

1.  **Open in Arduino IDE:** Open the `.ino` project file from the `Firmware` directory.

2.  **Configure Credentials:** Update the Wi-Fi credentials and the server endpoint in the code.

    ```cpp
    // --- CONFIGURATION ---
    const char* ssid = "YOUR_WIFI_SSID";
    const char* password = "YOUR_WIFI_PASSWORD";
    const char* server_ip = "YOUR_BACKEND_SERVER_IP";
    const int server_port = 8080;

    const int TANK_HEIGHT_CM = 200; // Total height of your tank
    // ---------------------
    ```

3.  **Upload the Code:**

      * Connect the ESP32 to your computer via USB.
      * In the Arduino IDE, go to `Tools > Board` and select a generic board like **"ESP32 Dev Module"**.
      * Choose the correct COM port under `Tools > Port`.
      * Click the **Upload** button.

4.  **Monitor:**
    Open the Serial Monitor (`Ctrl+Shift+M`) at a baud rate of `115200` (ESP32's default) to see status messages and readings.

-----

## 🔧 Troubleshooting

  * **No Data on Dashboard:**
      * Ensure the ESP32 is connected to your Wi-Fi (check the Serial Monitor in Arduino IDE for logs).
      * Verify that the `server_ip` in the firmware code is correct and accessible from your ESP32's network.
      * Check that the backend server is running and there are no firewall rules blocking the connection.
  * **Inaccurate Readings:**
      * Ensure the sensor is perfectly perpendicular to the water surface.
      * Make sure the `TANK_HEIGHT_CM` constant in the code matches your tank's actual height.
      * Check your voltage divider resistors if the readings are consistently wrong.

-----

## 🗺️ Roadmap & Future Enhancements

  * [ ] **Automated Pump Control:** Implement logic on the backend to automatically control the pump based on user-defined thresholds.
  * [ ] **Solar Power:** Make the system self-sufficient by powering it with a solar panel and a rechargeable battery.
  * [ ] **Data Logging:** Store data locally on an SD card as a backup in case of network failure.
  * [ ] **Enhanced UI:** Develop a custom web application or mobile app for a more tailored user experience.

-----

## 🤝 Contributing

Contributions are what make the open-source community an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

-----

## 📄 License

Distributed under the MIT License. See the `LICENSE` file for details.
