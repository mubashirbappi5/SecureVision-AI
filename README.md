# 🛡️ SecureVision AI - User Guide

Welcome to **SecureVision AI**! This platform allows you to securely monitor your cameras (Laptop, USB Webcams, or Mobile IP Cameras) from anywhere in the world, with built-in AI for real-time person detection and alerts.

Follow this simple guide to connect your cameras and start monitoring.

---

## 🚀 Step 1: Log in to the Dashboard

1. Open the [SecureVision AI Dashboard](https://web-flax-beta-39.vercel.app).
2. Log in using your provided credentials (e.g., `admin@securevision.com` / `admin`).
3. Once logged in, you will see your live monitoring dashboard.

---

## 📷 Step 2: Add a New Camera

To connect a physical camera to the platform, you first need to register it on the dashboard.

1. Go to the **Camera Management** section (or click on `Total Cameras` card).
2. Click on the **Add New Camera** button.
3. **Select Camera Type**:
   - **Laptop Camera**: Your computer's built-in webcam.
   - **External USB Webcam**: A camera connected via USB.
   - **Mobile IP Camera**: Use your smartphone as a security camera (via apps like *IP Webcam*).
4. **Assign Gateway**: Select the **Local AI Gateway** from the list.
5. Click **Complete Setup**. 
6. **Important**: The system will generate a unique **Camera ID**. Please copy and save this ID.

---

## 🤖 Step 3: Run the AI Agent (Local PC)

To actually capture the video and run AI detection, you need to start the Local AI Agent on the computer where the camera is connected.

### Prerequisites
Make sure your computer has **Python (3.10+)** installed.

### Setup (One-time)
1. Download or open the `services/local-agent` folder in your terminal.
2. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

### Start the Camera
Run the agent using the **Camera ID** you copied in Step 2.

**For a Laptop Webcam or USB Camera:**
```bash
python main.py --source 0 --camera-id "YOUR_COPIED_CAMERA_ID"
```
*(If you have multiple cameras, change `--source 0` to `--source 1` etc.)*

**For a Mobile IP Camera:**
```bash
python main.py --source "http://192.168.x.x:8080/video" --camera-id "YOUR_COPIED_CAMERA_ID"
```

---

## 🔴 Step 4: Live Monitoring

Once the Python agent starts successfully:
1. Go back to your [SecureVision AI Dashboard](https://web-flax-beta-39.vercel.app).
2. You will instantly see the **Live Video Stream** appearing on the screen.
3. If a person walks in front of the camera, the AI will detect it and instantly send a **Real-Time Alert** to the dashboard!

---
*Developed with ❤️ by the SecureVision Team.*
