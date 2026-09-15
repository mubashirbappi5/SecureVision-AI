import cv2
import argparse
import time
import requests
import uuid
import datetime
from ultralytics import YOLO

# Configuration
API_URL = "http://localhost:3001/api/detections"
CAMERA_ID = "demo_cam_01"  # Will be dynamically assigned in Phase 20.5
CONFIDENCE_THRESHOLD = 0.5
EVENT_COOLDOWN = 2.0  # seconds between events for the same track_id

def send_event(event_data):
    try:
        response = requests.post(API_URL, json=event_data, timeout=1.0)
        if response.status_code == 201:
            print(f"Event sent: {event_data['event_type']} ({event_data['confidence']:.2f})")
        else:
            print(f"Failed to send event: {response.status_code}")
    except Exception as e:
        print(f"Error sending event: {e}")

def main():
    parser = argparse.ArgumentParser(description="SecureVision Local AI Agent")
    parser.add_argument("--source", type=str, default="0", help="Camera index or RTSP/MP4 URL")
    parser.add_argument("--mock-detection", action="store_true", help="Force mock detections for testing")
    args = parser.parse_args()

    model = None
    if not args.mock_detection:
        print("Loading YOLO model...")
        model = YOLO("yolov8n.pt")  # Use YOLOv8 nano for speed

    # Infinite loop for pure mock mode
    if args.mock_detection:
        print("Running in pure mock mode (infinite loop)...")
        last_event_time = {}
        while True:
            current_time = time.time()
            if "mock_1" not in last_event_time or (current_time - last_event_time["mock_1"] > 3.0):
                last_event_time["mock_1"] = current_time
                event_data = {
                    "id": str(uuid.uuid4()),
                    "camera_id": CAMERA_ID,
                    "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                    "event_type": "person_detected",
                    "person_type": "unknown",
                    "severity": "info",
                    "confidence": 0.99,
                    "track_id": 999,
                    "bounding_box": [10, 10, 100, 200]
                }
                send_event(event_data)
            time.sleep(1.0)
        return

    source = int(args.source) if args.source.isdigit() else args.source
    cap = cv2.VideoCapture(source)

    if not cap.isOpened():
        print(f"Error: Could not open video source {source}")
        return

    print("Starting video stream...")
    
    last_event_time = {}

    while True:
        ret, frame = cap.read()
        if not ret:
            print("End of stream or error reading frame.")
            # For MP4 loops or reconnects in production, we'd handle it here
            break

        # Run inference (track mode for track_id) if not mocking fully
        if model is not None:
            results = model.track(frame, persist=True, classes=[0], conf=CONFIDENCE_THRESHOLD, verbose=False)

            if results and len(results) > 0:
                result = results[0]
                
                if result.boxes and result.boxes.id is not None:
                    boxes = result.boxes.xyxy.cpu().numpy()
                    track_ids = result.boxes.id.int().cpu().tolist()
                    confidences = result.boxes.conf.cpu().numpy()

                    for box, track_id, conf in zip(boxes, track_ids, confidences):
                        x1, y1, x2, y2 = map(int, box)
                    
                    # Draw BBox
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    label = f"Human {conf*100:.0f}%"
                    cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

                    # Dispatch Event (throttle per track_id)
                    current_time = time.time()
                    if track_id not in last_event_time or (current_time - last_event_time[track_id] > EVENT_COOLDOWN):
                        last_event_time[track_id] = current_time
                        
                        event_data = {
                            "id": str(uuid.uuid4()),
                            "camera_id": CAMERA_ID,
                            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                            "event_type": "person_detected",
                            "person_type": "unknown",
                            "severity": "info",
                            "confidence": float(conf),
                            "track_id": track_id,
                            "bounding_box": [x1, y1, x2, y2]
                        }
                        send_event(event_data)

        if args.mock_detection:
            # Force a mock event every 3 seconds for testing
            current_time = time.time()
            if "mock_1" not in last_event_time or (current_time - last_event_time["mock_1"] > 3.0):
                last_event_time["mock_1"] = current_time
                event_data = {
                    "id": str(uuid.uuid4()),
                    "camera_id": CAMERA_ID,
                    "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                    "event_type": "person_detected",
                    "person_type": "unknown",
                    "severity": "info",
                    "confidence": 0.99,
                    "track_id": 999,
                    "bounding_box": [10, 10, 100, 200]
                }
                send_event(event_data)
                cv2.rectangle(frame, (10, 10), (100, 200), (0, 255, 0), 2)
                cv2.putText(frame, "Human 99% (MOCK)", (10, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

        # Show live preview (disabled for background testing)
        # cv2.imshow("SecureVision Agent (Local Preview)", frame)

        # if cv2.waitKey(1) & 0xFF == ord('q'):
        #     break
        time.sleep(0.03)

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
