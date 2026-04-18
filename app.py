from flask import Flask, request, jsonify, send_from_directory
import json
import os
import time
from fuzzy_logic import calculate_fuzzy_eta

app = Flask(__name__, static_folder='public')

# Load the dataset
DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'shipments.json')
try:
    with open(DATA_PATH, 'r') as f:
        shipments_data = json.load(f)
except Exception as e:
    print(f"Error loading datasets: {e}")
    shipments_data = {}

# --- STATIC FILES ---
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

# --- TRACKING API ---
@app.route('/api/track/<id>', methods=['GET'])
def track_package(id):
    tracking_id = id.upper()
    if tracking_id not in shipments_data:
        return jsonify({"error": "Tracking ID not found. Please verify the ID and try again."}), 404
        
    shipment = shipments_data[tracking_id]
    
    # Run the AI Fuzzy model
    fuzzy_result = calculate_fuzzy_eta(
        shipment['DistanceRemaining'], 
        shipment['WeatherCondition'], 
        shipment['TrafficCongestion']
    )
    
    response_data = shipment.copy()
    response_data['prediction'] = fuzzy_result
    return jsonify(response_data)

# --- CHATBOT API ---
@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({"reply": "Please provide a valid message."}), 400

    message = data['message'].lower()
    tracking_id = data.get('trackingId', '').upper()
    
    shipment_context = None
    fuzzy_context = None
    
    if tracking_id and tracking_id in shipments_data:
        shipment_context = shipments_data[tracking_id]
        fuzzy_context = calculate_fuzzy_eta(
            shipment_context['DistanceRemaining'],
            shipment_context['WeatherCondition'],
            shipment_context['TrafficCongestion']
        )

    # Heuristic NLP Intent Processing
    reply = "I'm your tracking assistant. How can I help you today? You can ask me about your shipment's status, ETA, or current location."

    if 'hello' in message or 'hi' in message:
        reply = "Hello! I am the Smart Tracking Assistant. Please provide your Tracking ID, or if you're already tracking a package, ask me about its ETA or status."
    elif any(word in message for word in ['where', 'location', 'status']):
        if shipment_context:
            reply = f"Your package is currently in **{shipment_context['CurrentLocation']}**. Its status is: **{shipment_context['Status']}**."
        else:
            reply = "To tell you where your package is, please enter a Tracking ID first."
    elif any(word in message for word in ['delay', 'eta', 'when', 'time']):
        if shipment_context:
            reply = f"Based on our Scikit-Fuzzy AI prediction, your estimated time of arrival is **{fuzzy_context['etaFormatted']}**. Current conditions indicate: **{fuzzy_context['fuzzyStatus']}**."
        else:
            reply = "I need your Tracking ID to calculate the ETA."
    elif 'weather' in message or 'traffic' in message:
        if shipment_context:
            reply = f"The route currently has **{shipment_context['WeatherCondition']}** weather and **{shipment_context['TrafficCongestion']}** traffic congestion. The AI factored this into your delays."
        else:
            reply = "I need a tracking ID to check the route conditions."
    else:
        reply = "I'm sorry, I didn't quite catch that. You can ask me 'where is my package' or 'what is the ETA'."

    time.sleep(0.5) # Simulate AI thinking delay
    return jsonify({"reply": reply})

if __name__ == '__main__':
    # Running on port 3000 to match previous frontend expectations
    app.run(port=3000, debug=True)
