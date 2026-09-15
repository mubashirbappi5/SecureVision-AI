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
  const [gateways, setGateways] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("demo_cam_01");
  const [liveFrame, setLiveFrame] = useState<string | null>(null);
  
  // Wizard State
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizCamName, setWizCamName] = useState("");
  const [wizSourceType, setWizSourceType] = useState("rtsp");
  const [wizUrl, setWizUrl] = useState("");
  const [wizUsername, setWizUsername] = useState("");
  const [wizPassword, setWizPassword] = useState("");
  const [wizGatewayId, setWizGatewayId] = useState("");
  const [wizTestStatus, setWizTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [wizTestMessage, setWizTestMessage] = useState("");

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
        const [evRes, camRes, gwRes] = await Promise.all([
          fetch("http://localhost:3001/api/events", { headers }),
          fetch("http://localhost:3001/api/cameras", { headers }),
          fetch("http://localhost:3001/api/gateways", { headers })
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
          if (camData.length > 0 && !selectedCameraId) {
            setSelectedCameraId(camData[0].id);
          }
        }
        
        if (gwRes.ok) {
          setGateways(await gwRes.json());
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
    
    socket.on("live_video_frame", (data: any) => {
      if (data.cameraId === selectedCameraId || data.cameraId === 'demo_cam_01') {
        setLiveFrame(data.frame);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [router, selectedCameraId]);

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

  const testConnection = async () => {
    setWizTestStatus("testing");
    setWizTestMessage("Connecting to gateway and verifying RTSP stream...");
    
    const token = localStorage.getItem("sv_token");
    try {
      const res = await fetch(`http://localhost:3001/api/cameras/test-connection`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          url: wizUrl,
          username: wizUsername,
          password: wizPassword,
          agentId: wizGatewayId
        })
      });
      const data = await res.json();
      if (res.ok) {
        setWizTestStatus("success");
        setWizTestMessage("✓ Camera connected successfully!");
      } else {
        setWizTestStatus("error");
        setWizTestMessage(data.error || "Authentication Failed or Camera Offline");
      }
    } catch (err) {
      setWizTestStatus("error");
      setWizTestMessage("Gateway timeout or network error.");
    }
  };

  const saveCamera = async () => {
    const token = localStorage.getItem("sv_token");
    try {
      const res = await fetch(`http://localhost:3001/api/cameras`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: wizCamName,
          sourceType: wizSourceType,
          connectionMode: "local_gateway",
          url: wizUrl,
          username: wizUsername,
          password: wizPassword,
          agentId: wizGatewayId
        })
      });
      if (res.ok) {
        setWizardOpen(false);
        // Refresh page to load new camera
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetWizard = () => {
    setWizardStep(1);
    setWizCamName("");
    setWizSourceType("rtsp");
    setWizUrl("");
    setWizUsername("");
    setWizPassword("");
    setWizGatewayId("");
    setWizTestStatus("idle");
    setWizTestMessage("");
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
          <div className="text-3xl font-semibold">{cameras.length} Active</div>
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
          <div className="flex items-center gap-3 text-slate-400 mb-2"><Server className="w-5 h-5"/> Gateways</div>
          <div className="text-lg font-semibold text-emerald-400">{gateways.length} Online</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <h2 className="font-semibold flex items-center gap-2"><Activity className="w-4 h-4"/> Live Camera Feed (Demo)</h2>
            <select 
              value={selectedCameraId}
              onChange={e => setSelectedCameraId(e.target.value)}
              className="text-xs bg-slate-950 border border-slate-700 px-2 py-1 rounded text-slate-300"
            >
              {cameras.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              {cameras.length === 0 && <option value="demo_cam_01">demo_cam_01</option>}
            </select>
          </div>
          <div className="flex-1 bg-black flex items-center justify-center min-h-[400px] text-slate-600 overflow-hidden relative">
            {liveFrame ? (
              <img src={liveFrame} alt="Live Stream" className="w-full h-full object-contain" />
            ) : (
              <div className="text-center p-6">
                <Camera className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Waiting for video stream via Gateway...</p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-600 animate-pulse"></div>
                  <div className="w-2 h-2 rounded-full bg-slate-600 animate-pulse delay-75"></div>
                  <div className="w-2 h-2 rounded-full bg-slate-600 animate-pulse delay-150"></div>
                </div>
              </div>
            )}
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

      {/* Cameras & Gateways Lists */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gateways */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50">
            <h2 className="font-semibold flex items-center gap-2">
              <Server className="w-4 h-4"/> Registered Gateways
            </h2>
          </div>
          <div className="p-0">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 bg-slate-950/50 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Gateway Name</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Token ID</th>
                </tr>
              </thead>
              <tbody>
                {gateways.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-4 text-center text-slate-500">No gateways found. Run the local agent to register one.</td></tr>
                )}
                {gateways.map(g => (
                  <tr key={g.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-medium">{g.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${g.status === 'online' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                        {g.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{g.id.substring(0,8)}...</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Camera List & Wizard Trigger */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
            <h2 className="font-semibold flex items-center gap-2">
              <Camera className="w-4 h-4"/> Camera Management
            </h2>
            <button 
              onClick={() => { resetWizard(); setWizardOpen(true); }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-colors"
            >
              + Add Camera
            </button>
          </div>
          <div className="p-0">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 bg-slate-950/50 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Camera Name</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Gateway</th>
                </tr>
              </thead>
              <tbody>
                {cameras.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-4 text-center text-slate-500">No cameras configured.</td></tr>
                )}
                {cameras.map(c => (
                  <tr key={c.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-slate-400 uppercase text-xs">{c.sourceType}</td>
                    <td className="px-4 py-3 text-slate-400">{gateways.find(g => g.id === c.agentId)?.name || "Unknown"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Camera Setup Wizard Modal */}
      {wizardOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-400" />
                Add New Camera
              </h2>
              <button onClick={() => setWizardOpen(false)} className="text-slate-400 hover:text-white">&times;</button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              {/* Step indicator */}
              <div className="flex justify-between mb-8 relative">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-800 -z-10 -translate-y-1/2"></div>
                {[1,2,3,4,5,6].map(step => (
                  <div key={step} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 
                    ${wizardStep === step ? 'bg-emerald-600 border-emerald-500 text-white' : 
                      wizardStep > step ? 'bg-emerald-900/50 border-emerald-700 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
                  >
                    {step}
                  </div>
                ))}
              </div>

              {/* Step 1 */}
              {wizardStep === 1 && (
                <div className="animate-in slide-in-from-right-4">
                  <h3 className="text-xl font-medium mb-4">Camera Information</h3>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Camera Name</label>
                  <input type="text" value={wizCamName} onChange={e => setWizCamName(e.target.value)} placeholder="e.g. Front Door Camera" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all" autoFocus />
                  <p className="text-xs text-slate-500 mt-2">A descriptive name for your camera.</p>
                </div>
              )}

              {/* Step 2 */}
              {wizardStep === 2 && (
                <div className="animate-in slide-in-from-right-4">
                  <h3 className="text-xl font-medium mb-4">Source Type</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setWizSourceType('rtsp')} className={`p-4 rounded-xl border-2 text-left transition-all ${wizSourceType === 'rtsp' ? 'border-emerald-500 bg-emerald-900/20' : 'border-slate-800 bg-slate-950 hover:border-slate-700'}`}>
                      <div className="font-semibold mb-1">IP Camera (RTSP)</div>
                      <div className="text-xs text-slate-400">Hikvision, Dahua, or any ONVIF/RTSP compatible network camera.</div>
                    </button>
                    <button onClick={() => setWizSourceType('webcam')} className={`p-4 rounded-xl border-2 text-left transition-all ${wizSourceType === 'webcam' ? 'border-emerald-500 bg-emerald-900/20' : 'border-slate-800 bg-slate-950 hover:border-slate-700'}`}>
                      <div className="font-semibold mb-1">USB Webcam</div>
                      <div className="text-xs text-slate-400">Local webcam connected directly to the gateway computer.</div>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3 */}
              {wizardStep === 3 && (
                <div className="animate-in slide-in-from-right-4">
                  <h3 className="text-xl font-medium mb-4">Connection Details</h3>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    {wizSourceType === 'rtsp' ? 'RTSP URL' : 'Webcam Index'}
                  </label>
                  <input type="text" value={wizUrl} onChange={e => setWizUrl(e.target.value)} placeholder={wizSourceType === 'rtsp' ? "rtsp://192.168.1.100:554/Streaming/Channels/101" : "0"} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:border-emerald-500 outline-none mb-4" />
                  
                  {wizSourceType === 'rtsp' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Username</label>
                        <input type="text" value={wizUsername} onChange={e => setWizUsername(e.target.value)} placeholder="admin" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:border-emerald-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Password</label>
                        <input type="password" value={wizPassword} onChange={e => setWizPassword(e.target.value)} placeholder="••••••••" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:border-emerald-500 outline-none" />
                      </div>
                    </div>
                  )}
                  <div className="mt-4 p-3 bg-blue-950/40 border border-blue-900/50 rounded-lg text-xs text-blue-300">
                    <strong>Note:</strong> Local camera addresses (e.g. 192.168.x.x) are only accessible inside your local network. The Camera Gateway will bridge this securely.
                  </div>
                </div>
              )}

              {/* Step 4 */}
              {wizardStep === 4 && (
                <div className="animate-in slide-in-from-right-4">
                  <h3 className="text-xl font-medium mb-4">Assign to Gateway</h3>
                  <p className="text-sm text-slate-400 mb-4">Select the Local Gateway that has physical network access to this camera.</p>
                  
                  {gateways.length === 0 ? (
                    <div className="p-4 bg-yellow-950/40 border border-yellow-900/50 rounded-lg text-sm text-yellow-300">
                      No gateways found. Please run the Python Local AI Agent on your network first. It will auto-register.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {gateways.map(g => (
                        <button key={g.id} onClick={() => setWizGatewayId(g.id)} className={`w-full p-4 rounded-xl border-2 text-left flex justify-between items-center transition-all ${wizGatewayId === g.id ? 'border-emerald-500 bg-emerald-900/20' : 'border-slate-800 bg-slate-950 hover:border-slate-700'}`}>
                          <div>
                            <div className="font-semibold">{g.name}</div>
                            <div className="text-xs text-slate-500 mt-1">Status: {g.status} | ID: {g.id.substring(0,8)}...</div>
                          </div>
                          {g.status === 'online' ? (
                            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                          ) : (
                            <span className="w-3 h-3 rounded-full bg-slate-500"></span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 5 */}
              {wizardStep === 5 && (
                <div className="animate-in slide-in-from-right-4 text-center py-8">
                  <h3 className="text-xl font-medium mb-2">Test Connection</h3>
                  <p className="text-sm text-slate-400 mb-8">The backend will now ask the gateway to verify the RTSP stream.</p>
                  
                  {wizTestStatus === 'idle' && (
                    <button onClick={testConnection} className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20">
                      Run Connection Test
                    </button>
                  )}
                  
                  {wizTestStatus === 'testing' && (
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
                      <div className="text-emerald-400">{wizTestMessage}</div>
                    </div>
                  )}

                  {wizTestStatus === 'success' && (
                    <div className="p-4 bg-emerald-950/40 border border-emerald-900/50 rounded-xl text-emerald-400 flex items-center justify-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm">✓</div>
                      {wizTestMessage}
                    </div>
                  )}

                  {wizTestStatus === 'error' && (
                    <div className="p-4 bg-red-950/40 border border-red-900/50 rounded-xl text-red-400 flex flex-col items-center justify-center gap-2">
                      <div className="font-semibold flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> Connection Failed</div>
                      <div className="text-sm">{wizTestMessage}</div>
                      <button onClick={() => setWizTestStatus('idle')} className="mt-4 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-sm text-slate-300">Try Again</button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 6 */}
              {wizardStep === 6 && (
                <div className="animate-in slide-in-from-right-4 text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-4">
                    <Shield className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">Ready to Save</h3>
                  <p className="text-sm text-slate-400 mb-8">Your camera is configured and connection is verified.</p>
                  
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-left max-w-sm mx-auto mb-8 text-sm">
                    <div className="flex justify-between mb-2"><span className="text-slate-500">Name:</span> <span className="text-slate-200">{wizCamName}</span></div>
                    <div className="flex justify-between mb-2"><span className="text-slate-500">Source:</span> <span className="text-slate-200 uppercase">{wizSourceType}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Gateway:</span> <span className="text-slate-200">{gateways.find(g=>g.id===wizGatewayId)?.name}</span></div>
                  </div>

                  <button onClick={saveCamera} className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-12 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 w-full sm:w-auto">
                    Save Camera & Start Tracking
                  </button>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-800 bg-slate-950/50 flex justify-between">
              <button 
                onClick={() => setWizardStep(prev => Math.max(1, prev - 1))}
                disabled={wizardStep === 1 || wizTestStatus === 'testing'}
                className="px-6 py-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Back
              </button>
              
              {wizardStep < 6 && (
                <button 
                  onClick={() => setWizardStep(prev => Math.min(6, prev + 1))}
                  disabled={
                    (wizardStep === 1 && !wizCamName) ||
                    (wizardStep === 3 && !wizUrl) ||
                    (wizardStep === 4 && !wizGatewayId) ||
                    (wizardStep === 5 && wizTestStatus !== 'success') ||
                    wizTestStatus === 'testing'
                  }
                  className="bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 px-8 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
