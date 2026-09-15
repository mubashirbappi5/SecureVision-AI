# SecureVision AI - Phase 1 Demo

This repository contains the Phase 1 implementation of the SecureVision AI platform. It includes a Next.js Web Dashboard, an Express API with real-time Socket.IO communication, and a Python Local AI Agent that runs YOLOv8 human detection.

## Prerequisites
- Node.js 18+
- Python 3.10+
- A connected Webcam (or a `.mp4` file containing people).

## Setup & Running the System

### 1. Start the API Server
The API server acts as a centralized broker and REST endpoint.
```bash
cd apps/api
npm install
npm run dev
```
*(Runs on `http://localhost:3001`)*

### 2. Start the Web Dashboard
The web dashboard connects to the API via WebSockets to receive live detection events.
```bash
cd apps/web
npm install
npm run dev
```
*(Runs on `http://localhost:3000`)*

### 3. Run the Local AI Agent
The Python agent connects to your webcam, runs human detection using YOLO, and posts events to the API.
```bash
cd services/local-agent

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# Install dependencies (already done if following initial setup)
pip install -r requirements.txt

# Run the agent (default uses Webcam index 0)
python main.py --source 0

# Or run with an MP4 video file
python main.py --source path/to/video.mp4
```

## How to Test
1. Make sure all three components (API, Web, Agent) are running.
2. Open `http://localhost:3000` in your browser.
3. Stand in front of your webcam. 
4. The local Python window will show a live preview with a green bounding box and a "Human X%" label.
5. The Web Dashboard will instantly update, showing the detection in the "Recent Events" feed and incrementing the "Detections (Today)" counter.

## Next Steps (Phase 2 & 3)
- Integrate PostgreSQL with Prisma in the API.
- Implement Authentication & Agent Registration.
- Add RTSP parsing and ONVIF discovery to the Python Agent.
- Implement the SQLite local offline queue in the Agent.
