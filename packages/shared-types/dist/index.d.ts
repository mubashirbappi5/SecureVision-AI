export interface DetectionEvent {
    id: string;
    camera_id: string;
    timestamp: string;
    event_type: 'person_detected' | 'family_detected' | 'unknown_person' | 'restricted_person' | 'zone_entry' | 'zone_exit' | 'potential_threat' | 'camera_offline' | 'agent_offline';
    person_type?: 'family' | 'restricted' | 'unknown';
    zone_id?: string;
    risk_score?: number;
    severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    track_id?: number;
    bounding_box?: [number, number, number, number];
    screenshot_path?: string;
}
export interface Camera {
    id: string;
    name: string;
    source_type: 'rtsp' | 'webcam' | 'mp4';
    url: string;
    enabled: boolean;
    status: 'online' | 'offline';
}
export interface AgentHealth {
    agent_id: string;
    status: 'online' | 'offline';
    cpu_usage: number;
    ram_usage: number;
    gpu_usage?: number;
    version: string;
    last_heartbeat: string;
    connected_cameras: number;
}
