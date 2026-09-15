const http = require('http');

async function testAuth() {
  console.log('Testing Registration...');
  const res1 = await fetch('http://localhost:3001/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@securevision.com', password: 'password123', name: 'Admin User' })
  });
  const data1 = await res1.json();
  console.log('Register Response:', res1.status, data1);

  console.log('\nTesting Login...');
  const res2 = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@securevision.com', password: 'password123' })
  });
  const data2 = await res2.json();
  console.log('Login Response:', res2.status, data2);

  if (data2.token) {
    console.log('\nTesting Agent Route (Requires Auth)...');
    const res3 = await fetch('http://localhost:3001/api/agents', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${data2.token}` }
    });
    const data3 = await res3.json();
    console.log('Agents Response:', res3.status, data3);

    console.log('\nTesting Events Route (Database Verification)...');
    const res4 = await fetch('http://localhost:3001/api/events', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${data2.token}` }
    });
    const data4 = await res4.json();
    console.log('Events Response Before Mock:', res4.status, `Fetched ${data4.length} events from database.`);

    console.log('\nCreating Test Camera in DB...');
    const resCam = await fetch('http://localhost:3001/api/cameras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data2.token}` },
      body: JSON.stringify({ name: 'Test DB Cam', sourceType: 'mock', url: 'mock://test' })
    });
    const camData = await resCam.json();
    console.log('Camera Create Response:', resCam.status, camData.id);

    console.log('\nSending Mock Event to Database...');
    const res5 = await fetch('http://localhost:3001/api/detections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: "mock-1234",
        camera_id: camData.id,
        timestamp: new Date().toISOString(),
        event_type: "person_detected",
        person_type: "unknown",
        severity: "info",
        confidence: 0.95,
        track_id: 1,
        bounding_box: [0, 0, 100, 100]
      })
    });
    console.log('Mock Event POST Response:', res5.status);

    const res6 = await fetch('http://localhost:3001/api/events', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${data2.token}` }
    });
    const data6 = await res6.json();
    console.log('Events Response After Mock:', res6.status, `Fetched ${data6.length} events from database.`);
    if (data6.length > 0) {
      console.log('Successfully saved and retrieved event:', data6[0].eventType);
    }
  }
}

testAuth();
