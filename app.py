from flask import Flask, request, jsonify, send_from_directory
import json
import os
import time
import pandas as pd
from fuzzy_logic import calculate_fuzzy_eta
import ml_model
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='public')
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# Load the historical dataset for chatbot statistics
try:
    ML_DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'amazon_delivery_sample.csv')
    ml_dataset = pd.read_csv(ML_DATA_PATH)
except Exception as e:
    print(f"Error loading ML dataset: {e}")
    ml_dataset = None

# Load the dataset
DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'shipments.json')
try:
    with open(DATA_PATH, 'r') as f:
        shipments_data = json.load(f)
except Exception as e:
    print(f"Error loading datasets: {e}")
    shipments_data = {}

# Pre-load ML model
print("Loading Machine Learning Model...")
try:
    ml_model.load_model()
    print("ML Model Loaded.")
except Exception as e:
    print(f"ML Model not loaded (will need training): {e}")

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
    
    # Try the Machine Learning model first, fallback to AI Fuzzy model
    try:
        prediction = ml_model.predict_eta(
            shipment['WeatherCondition'], 
            shipment['TrafficCongestion'],
            shipment['DistanceRemaining']
        )
    except FileNotFoundError:
        prediction = calculate_fuzzy_eta(
            shipment['DistanceRemaining'], 
            shipment['WeatherCondition'], 
            shipment['TrafficCongestion']
        )
    
    response_data = shipment.copy()
    # Normalize status field for frontend
    response_data['prediction'] = prediction
    response_data['prediction']['displayStatus'] = prediction.get('mlStatus') or prediction.get('fuzzyStatus')
    return jsonify(response_data)

# --- ML TRAINING API ---
@app.route('/api/train', methods=['POST'])
def train_model():
    data = request.get_json(silent=True) or {}
    csv_path = data.get('dataset_path', os.path.join(os.path.dirname(__file__), 'data', 'amazon_delivery_sample.csv'))
    
    try:
        result = ml_model.train_model(csv_path)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# --- CHATBOT API ---
@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({"reply": "Please provide a valid message."}), 400

    message = data['message']
    tracking_id_raw = data.get('trackingId')
    tracking_id = tracking_id_raw.upper() if tracking_id_raw else ''
    
    shipment_context = None
    prediction_context = {}
    
    # Check if message is a direct tracking ID
    if message.upper() in shipments_data:
        tracking_id = message.upper()

    if tracking_id and tracking_id in shipments_data:
        shipment_context = shipments_data[tracking_id]
        try:
            prediction_context = ml_model.predict_eta(
                shipment_context['WeatherCondition'],
                shipment_context['TrafficCongestion'],
                shipment_context['DistanceRemaining']
            )
        except FileNotFoundError:
            prediction_context = calculate_fuzzy_eta(
                shipment_context['DistanceRemaining'],
                shipment_context['WeatherCondition'],
                shipment_context['TrafficCongestion']
            )

    # Special case for showing the full dataset (returns HTML table)
    if ml_dataset is not None and 'show' in message.lower() and 'all' in message.lower() and 'dataset' in message.lower():
        sample_df = ml_dataset.head(50)
        table_html = sample_df.to_html(classes="dataset-table", index=False, border=0)
        wrapped_table = f"<div class='dataset-scroll-container' style='max-height: 400px; max-width: 100%; overflow: auto; border: 2px solid #000; border-radius: 10px; padding: 5px; margin-top: 10px; background: white;'>{table_html}</div>"
        return jsonify({
            "reply": f"Because the full dataset contains over {len(ml_dataset):,} records, here are the first 50 rows for you to explore:<br>{wrapped_table}",
            "trackingId": tracking_id
        })

    # Prepare statistics context
    stats_context = "Historical data unavailable."
    if ml_dataset is not None:
        avg_rain = ml_dataset[ml_dataset['WeatherCondition'] == 'Rain']['Time_Taken_Hours'].mean()
        avg_storm = ml_dataset[ml_dataset['WeatherCondition'] == 'Storm']['Time_Taken_Hours'].mean()
        avg_jam = ml_dataset[ml_dataset['TrafficCongestion'] == 'Jam']['Time_Taken_Hours'].mean()
        stats_context = f"Avg delivery times from {len(ml_dataset)} records: Rain ({avg_rain:.1f}h), Storm ({avg_storm:.1f}h), Jam Traffic ({avg_jam:.1f}h)."

    # Prepare tracking context
    tracking_info = "No package is currently being tracked."
    if shipment_context:
        tracking_info = (
            f"Currently tracking ID: {tracking_id}. "
            f"From {shipment_context['Origin']} to {shipment_context['Destination']}. "
            f"Current Location: {shipment_context['CurrentLocation']}. "
            f"Status: {shipment_context['Status']}. "
            f"ETA: {prediction_context.get('etaFormatted', 'Unknown')}. "
            f"Conditions: {shipment_context['WeatherCondition']} weather and {shipment_context['TrafficCongestion']} traffic."
        )

    # Groq System Prompt
    system_prompt = (
        "You are NexTrack AI, the intelligent assistant for NexTrack Logistics. "
        "You provide real-time tracking updates, delivery statistics, and general logistics information. "
        f"\n\nDATASET CONTEXT: {stats_context}"
        f"\n\nCURRENT TRACKING CONTEXT: {tracking_info}"
        "\n\nGUIDELINES:"
        "- Be professional, efficient, and slightly futuristic."
        "- Use markdown for bolding (e.g. **Status**)."
        "- If a user provides a tracking ID that isn't in context, acknowledge it and suggest they check the ID."
        "- Keep responses concise (max 3-4 sentences unless explaining statistics)."
    )

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ],
            temperature=0.7,
            max_tokens=500
        )
        reply = completion.choices[0].message.content
    except Exception as e:
        print(f"Groq API Error: {e}")
        reply = "I'm having trouble processing your request right now. Please try again in a moment."

    return jsonify({"reply": reply, "trackingId": tracking_id})

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 3000))
    app.run(host='0.0.0.0', port=port, debug=False)
