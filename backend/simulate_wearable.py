import asyncio
import websockets
import json
import time

async def simulate_vitals(patient_id="patient-123"):
    uri = f"ws://localhost:8000/ws/vitals/{patient_id}"
    print(f"📡 Connecting mock wearable to {uri}...")
    
    try:
        async with websockets.connect(uri, extra_headers={"Origin": "http://localhost:8000"}) as websocket:
            print("✅ Connected! Starting live vitals stream...")
            print("---")
            
            # Start with normal vitals
            hr = 80
            o2 = 98
            
            for i in range(25):
                # After 5 seconds, simulate a sudden medical event (Tachycardia & Hypoxia)
                if i > 5:
                    hr += 8
                    o2 -= 2
                    
                payload = {
                    "Heart_Rate": hr,
                    "O2_Saturation": max(o2, 70), # Don't drop below 70%
                    "timestamp": time.time()
                }
                
                # Visual warning in the console for the pitch
                if hr > 120 or o2 < 85:
                    print(f"⚠️  CRITICAL -> HR: {hr} BPM | O2: {o2}%")
                else:
                    print(f"🟢 Normal -> HR: {hr} BPM | O2: {o2}%")
                    
                await websocket.send(json.dumps(payload))
                await asyncio.sleep(1) # Send every 1 second
                
            print("---")
            print("🏁 Simulation complete. Patient stabilized.")
    except ConnectionRefusedError:
        print("❌ Could not connect! Is your uvicorn backend running on port 8000?")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("Welcome to the PARS Wearable Simulator!")
    print("This will send live JSON data to the FastAPI backend via WebSockets.")
    asyncio.run(simulate_vitals())
