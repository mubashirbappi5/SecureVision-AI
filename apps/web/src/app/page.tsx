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
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("sv_token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchEvents = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/events", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          // Transform DB events (which use camelCase) to match the DetectionEvent type (which expects snake_case from the python agent, or we just map it)
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
      } catch (err) {
        console.error("Failed to fetch events", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();

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
                <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 text-sm flex gap-3 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="mt-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-slate-200 capitalize">{ev.event_type.replace('_', ' ')}</span>
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
    </div>
  );
}
