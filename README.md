# 🛡️ SecureVision AI - User Guide

Welcome to **SecureVision AI**! This platform allows you to securely monitor your cameras (Laptop, USB Webcams, Mobile IP Cameras, or Traditional CCTV/RTSP Cameras) from anywhere in the world, with built-in AI for real-time person detection and alerts.

Follow this simple guide to connect your cameras and start monitoring.

---

## 🚀 Step 1: Log in to the Dashboard

1. Open the [SecureVision AI Dashboard](https://web-flax-beta-39.vercel.app).
2. Log in using your provided credentials (e.g., `admin@securevision.com` / `admin`).
3. Once logged in, you will see your live monitoring dashboard.

---

## 📷 Step 2: Add a New Camera

To connect a physical camera to the platform, you first need to register it on the dashboard.

1. Go to the **Camera Management** section.
2. Click on the **Add New Camera** button.
3. **Select Camera Type**:
   - **Laptop Camera**: Your computer's built-in webcam.
   - **External USB Webcam**: A camera connected via USB.
   - **Mobile IP Camera**: Use your smartphone as a camera (via apps like *IP Webcam*).
   - **CCTV / IP Camera (RTSP)**: A traditional CC camera connected to your network (Hikvision, Dahua, etc.).
4. **Assign Gateway**: Select the **Local AI Gateway** from the list.
5. Click **Complete Setup**. 
6. **Important**: The system will generate a unique **Camera ID**. Please copy and save this ID.

---

## 🤖 Step 3: Run the AI Agent (Local PC)

To actually capture the video and run AI detection, you need to start the Local AI Agent on the computer where the camera is connected or which is on the same WiFi/Network as your cameras.

### Prerequisites (One-time Setup)
Make sure your computer has **Python (3.10+)** installed.
1. Download or open the `services/local-agent` folder.
2. Open terminal in that folder and install the required packages:
   ```bash
   pip install -r requirements.txt
   ```

### 1-Click Camera Startup
We have made it incredibly simple to start your camera without any coding!

1. Open the `services/local-agent` folder on your computer.
2. Double-click the **`Start_Camera.bat`** file.
3. A black window will open. **If it's your first time**, it will ask you to paste your **Camera ID** (which you copied from the Dashboard). Paste it and press Enter.
4. The system will save your ID and instantly start the camera! 

*(Note: The next time you double-click `Start_Camera.bat`, it won't ask for the ID again—it will start your camera automatically!)*

---

## 🔴 Step 4: Live Monitoring

Once the Python agent starts successfully:
1. Go back to your [SecureVision AI Dashboard](https://web-flax-beta-39.vercel.app).
2. You will instantly see the **Live Video Stream** appearing on the screen.
3. If a person walks in front of the camera, the AI will detect it and instantly send a **Real-Time Alert** to the dashboard!

---
*Developed with ❤️ by the SecureVision Team.*
