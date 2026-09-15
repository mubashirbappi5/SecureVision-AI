"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { DetectionEvent } from "@securevision/shared-types";
import { Shield, AlertTriangle, Camera, Activity, Server, Users, LogOut } from "lucide-react";

export default function Dashboard() {
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Face Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<"friend" | "enemy">("friend");
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{type: "success" | "error", message: string} | null>(null);
  
  // Camera Config State
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [cameraUrl, setCameraUrl] = useState<string>("");
  const [cameraSaving, setCameraSaving] = useState(false);
  const [cameraSaveStatus, setCameraSaveStatus] = useState<{type: "success" | "error", message: string} | null>(null);

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("sv_token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchEventsAndCameras = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [evRes, camRes] = await Promise.all([
          fetch("http://localhost:3001/api/events", { headers }),
          fetch("http://localhost:3001/api/cameras", { headers })
        ]);
        
        if (evRes.ok) {
          const data = await evRes.json();
          const mapped = data.map((ev: any) => ({
            id: ev.id,
            camera_id: ev.cameraId,
            timestamp: ev.timestamp,
            event_type: ev.eventType,
            person_type: ev.personType,
            severity: ev.severity,
            confidence: ev.confidence,
            track_id: ev.trackId,
            bounding_box: ev.boundingBox
          }));
          setEvents(mapped);
        }
        
        if (camRes.ok) {
          const camData = await camRes.json();
          setCameras(camData);
          if (camData.length > 0) {
            setSelectedCameraId(camData[0].id);
            setCameraUrl(camData[0].url);
          }
        }
      } catch (err) {
        console.error("Failed to fetch data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEventsAndCameras();

    // Connect to the API socket server
    const socket = io("http://localhost:3001", {
      auth: { token }
    });

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("new_event", (event: DetectionEvent) => {
      setEvents((prev) => [event, ...prev].slice(0, 50)); // Keep last 50 events
    });

    return () => {
      socket.disconnect();
    };
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("sv_token");
    router.push("/login");
  };

  const handleFaceUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setUploadStatus(null);
    
    const token = localStorage.getItem("sv_token");
    const formData = new FormData();
    formData.append("image", uploadFile);
    formData.append("category", uploadCategory);

    try {
      const res = await fetch("http://localhost:3001/api/faces/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      
      const data = await res.json();
      if (res.ok) {
        setUploadStatus({ type: "success", message: "Face uploaded successfully! Agent will retrain shortly." });
        setUploadFile(null); // clear file
      } else {
        setUploadStatus({ type: "error", message: data.error || "Upload failed." });
      }
    } catch (err) {
      setUploadStatus({ type: "error", message: "Network error during upload." });
    } finally {
      setUploading(false);
    }
  };

  const handleCameraSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCameraId || !cameraUrl) return;
    
    setCameraSaving(true);
    setCameraSaveStatus(null);
    const token = localStorage.getItem("sv_token");
    
    try {
      const res = await fetch(`http://localhost:3001/api/cameras/${selectedCameraId}`, {
        method: "PUT",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: cameraUrl })
      });
      
      if (res.ok) {
        setCameraSaveStatus({ type: "success", message: "Camera URL updated! AI Agent will reconnect shortly." });
      } else {
        const data = await res.json();
        setCameraSaveStatus({ type: "error", message: data.error || "Failed to update camera." });
      }
    } catch (err) {
      setCameraSaveStatus({ type: "error", message: "Network error." });
    } finally {
      setCameraSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">Loading Dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-6 font-sans">
      <header className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-emerald-500" />
          <h1 className="text-2xl font-bold tracking-tight">SecureVision AI</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800">
            <span className="relative flex h-3 w-3">
              {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isConnected ? "bg-emerald-500" : "bg-red-500"}`}></span>
            </span>
            <span className="text-slate-400">{isConnected ? "Live" : "Offline"}</span>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-sm bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-800">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-slate-400 mb-2"><Camera className="w-5 h-5"/> Total Cameras</div>
          <div className="text-3xl font-semibold">1 Active</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-slate-400 mb-2"><Users className="w-5 h-5"/> Detections (Today)</div>
          <div className="text-3xl font-semibold">{events.length}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-red-400 mb-2"><AlertTriangle className="w-5 h-5"/> Critical Alerts</div>
          <div className="text-3xl font-semibold text-red-400">0</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-slate-400 mb-2"><Server className="w-5 h-5"/> Agent Status</div>
          <div className="text-lg font-semibold text-emerald-400">Online</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <h2 className="font-semibold flex items-center gap-2"><Activity className="w-4 h-4"/> Live Camera Feed (Demo)</h2>
            <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">camera_01</span>
          </div>
          <div className="flex-1 bg-black flex items-center justify-center min-h-[400px] text-slate-600">
            {/* Real video feed will go here. The local agent displays it via OpenCV for now. */}
            <div className="text-center">
              <Camera className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>Live stream preview is handled by Local Agent window in Phase 1.</p>
              <p className="text-sm mt-2">Watch the "Recent Events" feed for detections.</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50">
            <h2 className="font-semibold">Recent Events</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {events.length === 0 ? (
              <div className="text-center text-slate-500 py-8">No events detected yet.</div>
            ) : (
              events.map((ev, i) => (
                <div key={i} className={`bg-slate-800/50 border ${ev.severity === 'critical' ? 'border-red-900/50' : ev.severity === 'warning' ? 'border-yellow-900/50' : 'border-slate-700/50'} rounded-lg p-3 text-sm flex gap-3 animate-in fade-in slide-in-from-right-4 duration-300`}>
                  <div className="mt-1">
                    <div className={`w-2 h-2 rounded-full ${ev.severity === 'critical' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : ev.severity === 'warning' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'}`}></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`font-medium capitalize ${ev.severity === 'critical' ? 'text-red-400' : ev.severity === 'warning' ? 'text-yellow-400' : 'text-emerald-400'}`}>
                        {ev.person_type && ev.person_type !== "unknown" ? `${ev.person_type} detected` : ev.event_type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-slate-500">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-slate-400 text-xs">
                      Confidence: {Math.round(ev.confidence * 100)}% | Track ID: {ev.track_id}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Face Management Section */}
      <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
          <h2 className="font-semibold flex items-center gap-2">
            <Users className="w-4 h-4"/> Face Database Management
          </h2>
        </div>
        <div className="p-6">
          <form onSubmit={handleFaceUpload} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-slate-400 mb-2">Upload Photo</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-emerald-400 hover:file:bg-slate-700 transition-colors"
                required
              />
            </div>
            
            <div className="w-full md:w-64">
              <label className="block text-sm font-medium text-slate-400 mb-2">Classification</label>
              <select 
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value as "friend" | "enemy")}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="friend">Friend (Allowed)</option>
                <option value="enemy">Enemy (Threat)</option>
              </select>
            </div>

            <button 
              type="submit" 
              disabled={uploading || !uploadFile}
              className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? "Uploading..." : "Add to Database"}
            </button>
          </form>

          {uploadStatus && (
            <div className={`mt-4 p-3 rounded-lg text-sm flex items-center gap-2 ${uploadStatus.type === 'success' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800' : 'bg-red-900/30 text-red-400 border border-red-800'}`}>
              <div className={`w-2 h-2 rounded-full ${uploadStatus.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
              {uploadStatus.message}
            </div>
          )}
        </div>
      </div>

      {/* Camera Configuration Section */}
      <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
          <h2 className="font-semibold flex items-center gap-2">
            <Camera className="w-4 h-4"/> Camera Source Configuration
          </h2>
        </div>
        <div className="p-6">
          {cameras.length === 0 ? (
            <div className="text-slate-400 text-sm">No cameras found in database. Create one using the API first.</div>
          ) : (
            <form onSubmit={handleCameraSave} className="flex flex-col md:flex-row gap-4 items-end">
              <div className="w-full md:w-64">
                <label className="block text-sm font-medium text-slate-400 mb-2">Select Camera</label>
                <select 
                  value={selectedCameraId}
                  onChange={(e) => {
                    setSelectedCameraId(e.target.value);
                    const cam = cameras.find(c => c.id === e.target.value);
                    if (cam) setCameraUrl(cam.url);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {cameras.map(cam => (
                    <option key={cam.id} value={cam.id}>{cam.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-slate-400 mb-2">Connection URL (RTSP / Webcam Index)</label>
                <input 
                  type="text" 
                  value={cameraUrl}
                  onChange={(e) => setCameraUrl(e.target.value)}
                  placeholder="rtsp://... or 0"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={cameraSaving || !cameraUrl}
                className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cameraSaving ? "Saving..." : "Save Config"}
              </button>
            </form>
          )}

          {cameraSaveStatus && (
            <div className={`mt-4 p-3 rounded-lg text-sm flex items-center gap-2 ${cameraSaveStatus.type === 'success' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800' : 'bg-red-900/30 text-red-400 border border-red-800'}`}>
              <div className={`w-2 h-2 rounded-full ${cameraSaveStatus.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
              {cameraSaveStatus.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
