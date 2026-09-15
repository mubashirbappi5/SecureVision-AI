import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { DetectionEvent as ClientDetectionEvent } from '@securevision/shared-types';
import { prisma } from './db/prisma';
import { notificationEngine } from './services/notifications';

import authRoutes from './routes/auth.routes';
import agentsRoutes from './routes/agents.routes';
import camerasRoutes from './routes/cameras.routes';
import eventsRoutes from './routes/events.routes';
import facesRoutes from './routes/faces.routes';
import gatewaysRoutes from './routes/gateways.routes';

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/cameras', camerasRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/faces', facesRoutes);
app.use('/api/gateways', gatewaysRoutes);

const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// REST endpoint to receive events from agents
app.post('/api/detections', async (req, res) => {
  const event: ClientDetectionEvent = req.body;
  
  // Verify agent token (simplified for now, ideally in a middleware)
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  // In production, we'd enforce token verification here.
  // For demo/development, if camera exists, we save it.
  
  try {
    // Attempt to save to database if camera exists
    if (event.camera_id && event.camera_id !== 'demo_cam_01') {
      await prisma.detectionEvent.create({
        data: {
          eventType: event.event_type,
          personType: event.person_type,
          severity: event.severity,
          confidence: event.confidence,
          trackId: event.track_id,
          boundingBox: event.bounding_box ? (event.bounding_box as any) : null,
          cameraId: event.camera_id,
        }
      });
      
      // Trigger notification engine
      notificationEngine.processEvent(event);
    }
  } catch (error) {
    console.error("Failed to save event to DB:", error);
  }

  // Broadcast to all connected web clients
  io.emit('new_event', event);
  
  console.log(`Received event from camera ${event.camera_id}: ${event.event_type} (${Math.round(event.confidence * 100)}%)`);
  
  res.status(201).json({ success: true });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Handle Gateway RTSP test responses
  socket.on('test_rtsp_response', (data) => {
    // Relay to the express router (already handled via io.on globally, but good to log)
    console.log('Received RTSP test response:', data);
  });

  // Handle live MJPEG frames from the local Agent (Gateway)
  socket.on('video_frame', (data) => {
    // data = { cameraId: string, frame: string (base64) }
    // Broadcast to all web clients
    socket.broadcast.emit('live_video_frame', data);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`SecureVision API Server running on port ${PORT}`);
});
