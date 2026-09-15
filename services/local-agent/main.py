import cv2
import argparse
import time
import requests
import uuid
import datetime
import os
import numpy as np
from ultralytics import YOLO

# Configuration
API_URL = "http://localhost:3001/api/detections"
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
    parser.add_argument("--source", type=str, default="0", help="Camera index, MP4 path, or RTSP URL")
    parser.add_argument("--rtsp", type=str, default=None, help="Explicit RTSP URL (overrides --source)")
    parser.add_argument("--camera-id", type=str, default="demo_cam_01", help="The UUID of this camera in the SecureVision database")
    parser.add_argument("--mock-detection", action="store_true", help="Force mock detections for testing")
    args = parser.parse_args()

    camera_id = args.camera_id
    source = args.rtsp if args.rtsp else args.source

    # Face Recognition Setup
    print("Initializing Face Recognition...")
    face_cascade = cv2.CascadeClassifier("haarcascade_frontalface_default.xml")
    recognizer = cv2.face.LBPHFaceRecognizer_create()
    
    friends_dir = os.path.join("data", "friends")
    face_samples = []
    face_labels = []
    
    # Label 1 will mean "friend"
    FRIEND_LABEL = 1
    
    if os.path.exists(friends_dir):
        print(f"Scanning for friends in {friends_dir}...")
        for img_name in os.listdir(friends_dir):
            if img_name.lower().endswith(('.png', '.jpg', '.jpeg')):
                img_path = os.path.join(friends_dir, img_name)
                img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
                if img is None:
                    continue
                faces = face_cascade.detectMultiScale(img, scaleFactor=1.1, minNeighbors=5)
                for (x, y, w, h) in faces:
                    face_roi = img[y:y+h, x:x+w]
                    face_roi = cv2.resize(face_roi, (200, 200))
                    face_samples.append(face_roi)
                    face_labels.append(FRIEND_LABEL)
                    
        if len(face_samples) > 0:
            print(f"Training face recognizer on {len(face_samples)} friend faces...")
            recognizer.train(face_samples, np.array(face_labels))
            print("Training complete.")
        else:
            print("No valid faces found in friends directory.")
    else:
        print("No friends directory found.")

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
                    "camera_id": camera_id,
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

    # Parse integer source for webcams, otherwise leave as string (URL/Path)
    if isinstance(source, str) and source.isdigit():
        source = int(source)

    def connect_stream():
        print(f"Connecting to stream: {source}...")
        cap = cv2.VideoCapture(source)
        if not cap.isOpened():
            print(f"Warning: Could not open video source {source}")
            return None
        print("Stream connected successfully.")
        return cap

    cap = connect_stream()
    
    while cap is None:
        print("Retrying connection in 5 seconds...")
        time.sleep(5.0)
        cap = connect_stream()

    if not cap.isOpened():
        print(f"Error: Could not open video source {source}")
        return

    print("Starting video stream...")
    
    last_event_time = {}

    while True:
        if cap is None or not cap.isOpened():
            cap = connect_stream()
            if cap is None:
                time.sleep(5.0)
                continue

        ret, frame = cap.read()
        if not ret:
            print("Warning: End of stream, frame dropped, or connection lost. Reconnecting...")
            cap.release()
            cap = None
            time.sleep(2.0)
            continue

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
                    
                    # Ensure bbox is within frame
                    x1, y1 = max(0, x1), max(0, y1)
                    x2, y2 = min(frame.shape[1], x2), min(frame.shape[0], y2)
                    
                    person_type = "enemy"
                    severity = "critical"
                    color = (0, 0, 255)
                    
                    # Try Face Recognition if LBPH is trained
                    if len(face_samples) > 0 and (y2 - y1) > 0 and (x2 - x1) > 0:
                        roi_color = frame[y1:y2, x1:x2]
                        roi_gray = cv2.cvtColor(roi_color, cv2.COLOR_BGR2GRAY)
                        faces = face_cascade.detectMultiScale(roi_gray, scaleFactor=1.1, minNeighbors=3)
                        
                        for (fx, fy, fw, fh) in faces:
                            face_roi = roi_gray[fy:fy+fh, fx:fx+fw]
                            face_roi = cv2.resize(face_roi, (200, 200))
                            label_id, distance = recognizer.predict(face_roi)
                            
                            # Lower distance means better match (typical threshold for LBPH is < 80-100)
                            if label_id == FRIEND_LABEL and distance < 85:
                                person_type = "friend"
                                severity = "info"
                                color = (0, 255, 0)
                                break  # matched a friend, no need to check other faces in this bbox
                    
                    # Draw BBox
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                    label = f"{person_type.capitalize()} {conf*100:.0f}%"
                    cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

                    # Dispatch Event (throttle per track_id)
                    current_time = time.time()
                    if track_id not in last_event_time or (current_time - last_event_time[track_id] > EVENT_COOLDOWN):
                        last_event_time[track_id] = current_time
                        
                        event_data = {
                            "id": str(uuid.uuid4()),
                            "camera_id": camera_id,
                            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                            "event_type": "person_detected",
                            "person_type": person_type,
                            "severity": severity,
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
                    "camera_id": camera_id,
                    "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                    "event_type": "person_detected",
                    "person_type": "enemy",
                    "severity": "critical",
                    "confidence": 0.99,
                    "track_id": 999,
                    "bounding_box": [10, 10, 100, 200]
                }
                send_event(event_data)
                cv2.rectangle(frame, (10, 10), (100, 200), (0, 0, 255), 2)
                cv2.putText(frame, "Enemy 99% (MOCK)", (10, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)

        # Show live preview (disabled for background testing)
        # cv2.imshow("SecureVision Agent (Local Preview)", frame)

        # if cv2.waitKey(1) & 0xFF == ord('q'):
        #     break
        time.sleep(0.03)

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
