# 🛡️ SecureVision AI

SecureVision AI is an advanced, real-time AI-powered CCTV surveillance platform. It bridges local network cameras (Webcams, Mobile IP Cameras, RTSP feeds) securely to a cloud dashboard without exposing your local network.

## 🚀 Features
- **Real-Time AI Detection**: Uses YOLOv8 for high-accuracy person and object detection.
- **Secure WebSockets Bridge**: Streams live MJPEG video from a local Python agent to a Next.js dashboard securely.
- **Smart Alerts**: Categorizes events by severity (High, Medium, Low) based on confidence scores.
- **Zero Local Exposure**: Uses Ngrok and WebSockets so you never have to port-forward your router.
- **Responsive Dashboard**: Beautiful, glassmorphism UI built with Next.js and Tailwind CSS.

---

## 🏗️ System Architecture

1. **Frontend (Vercel)**: Next.js application where users view live streams and events.
2. **Backend (Local + Ngrok)**: Node.js Express server running locally, exposed securely via Ngrok, handling WebSockets and Database operations.
3. **Database (Neon Serverless)**: PostgreSQL database securely storing camera configs, events, and user data.
4. **Local AI Agent (Python)**: Runs on the physical machine (Gateway) connected to cameras. Processes frames using OpenCV and Ultralytics YOLO, and sends base64 streams and AI detections to the backend.

---

## 💻 Prerequisites

- Node.js (v18 or higher)
- Python 3.10+
- Ngrok account (for a free static domain)
- Neon.tech account (for Serverless PostgreSQL)
- Vercel account (for Frontend deployment)

---

## 🛠️ Step-by-Step Setup Guide

### Step 1: Database Setup (Neon)
1. Go to [Neon.tech](https://neon.tech) and create a free PostgreSQL project.
2. Copy the `DATABASE_URL` from the Neon dashboard.
3. In the root of this repository, navigate to `apps/api/` and create an `.env` file:
   ```env
   DATABASE_URL="your_neon_database_url_here"
   JWT_SECRET="your_super_secret_jwt_key_here"
   ENCRYPTION_KEY="32_character_long_secret_key_here!!!!!"
   PORT=3001
   ```

### Step 2: Backend Setup
1. Open a terminal in the root directory and install dependencies:
   ```bash
   npm install
   ```
2. Push the database schema to Neon:
   ```bash
   cd apps/api
   npx prisma db push
   ```
3. Generate an initial Admin user and Local Gateway:
   ```bash
   npx ts-node create-admin.ts
   npx ts-node create-gateway.ts
   ```
   *Note: Default Admin login is `admin@securevision.com` / `admin`.*
4. Start the Backend server:
   ```bash
   npm run dev
   ```

### Step 3: Ngrok Setup (Public Backend)
To allow the Vercel frontend and mobile networks to communicate with your local backend securely:
1. Install Ngrok and run:
   ```bash
   ngrok config add-authtoken YOUR_NGROK_TOKEN
   ngrok http --domain=your-static-domain.ngrok-free.dev 3001
   ```
2. Your backend is now publicly accessible at your Ngrok static domain!

### Step 4: Frontend Setup & Deployment (Vercel)
1. Go to your `apps/web/.env` (for local development) and add:
   ```env
   NEXT_PUBLIC_API_URL="https://your-static-domain.ngrok-free.dev"
   ```
2. To run the frontend locally:
   ```bash
   cd apps/web
   npm run dev
   ```
3. **To Deploy**: Go to the [Vercel Dashboard](https://vercel.com/new), import this GitHub repository, and set the **Root Directory** to `apps/web`. Add `NEXT_PUBLIC_API_URL` to the Environment Variables in Vercel before deploying.

---

## 🤖 Running the Python AI Agent

The Python agent captures video from your cameras, runs YOLO detection, and sends data to the Backend.

1. Navigate to the agent folder:
   ```bash
   cd services/local-agent
   ```
2. Set up a virtual environment and install requirements:
   ```bash
   python -m venv .venv
   # Activate it (Windows)
   .venv\Scripts\activate
   # Or (Mac/Linux)
   source .venv/bin/activate
   
   pip install -r requirements.txt
   ```
3. Run the Agent (Replace `YOUR_CAMERA_ID` with the ID generated from the Dashboard):
   ```bash
   python main.py --source 0 --camera-id "YOUR_CAMERA_ID"
   ```
   *(Use `--source 0` for laptop webcam, `1` for USB webcam, or an `http://` URL for Mobile IP cameras).*

---

## 📱 User Guide: Adding a Camera

1. Log in to your live dashboard (e.g. `admin@securevision.com` / `admin`).
2. Go to the **Camera Management** section.
3. Click **Add New Camera**.
4. **Select Source**: Choose Laptop Camera, USB Webcam, or Mobile IP Camera.
5. **Assign Gateway**: Select the "Local AI Gateway" from the dropdown.
6. Copy the Generated **Camera ID**.
7. Start your Python Agent using the copied ID. Your live stream and AI detections will instantly appear on the dashboard!

---
*Developed with ❤️ by the SecureVision Team.*
