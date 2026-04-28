from flask import Flask, request, jsonify, send_from_directory
import json
import os
import time
import pandas as pd
from fuzzy_logic import calculate_fuzzy_eta
import ml_model
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = Flask(__name__, static_folder='public')

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

print("Initializing AI NLP Engine...")
# Initialize NLP Intent processing once
intents = {
    "greeting": ["hello", "hi", "hey there", "good morning", "howdy"],
    "status": ["where is my package", "location", "status", "where is it", "track my shipment", "where is my order"],
    "eta": ["delay", "eta", "when will it arrive", "time", "how long", "delivery date", "how fast can i get it", "how fast"],
    "conditions": ["weather", "traffic", "why is it delayed", "road conditions", "route"],
    "dataset": ["average", "statistics", "dataset", "data", "affect", "history", "records", "show me all the dataset", "show all the dataset"]
}

corpus = []
intent_labels = []
for intent, phrases in intents.items():
    for phrase in phrases:
        corpus.append(phrase)
        intent_labels.append(intent)
        
vectorizer = TfidfVectorizer()
X_intents = vectorizer.fit_transform(corpus)
print("AI Engine Ready.")

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

    message = data['message'].lower()
    tracking_id_raw = data.get('trackingId')
    tracking_id = tracking_id_raw.upper() if tracking_id_raw else ''
    
    shipment_context = None
    prediction_context = None
    
    # Check if message is a direct tracking ID
    is_direct_tracking = False
    if message.upper() in shipments_data:
        tracking_id = message.upper()
        is_direct_tracking = True

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

    # Advanced NLP Intent Processing using TF-IDF
    user_vec = vectorizer.transform([message])
    similarities = cosine_similarity(user_vec, X_intents)
    
    best_match_idx = similarities.argmax()
    best_score = similarities[0, best_match_idx]
    
    matched_intent = intent_labels[best_match_idx] if best_score > 0.3 else "unknown"
    
    if is_direct_tracking:
        matched_intent = "status"

    if matched_intent == "greeting":
        reply = "Hello! I am the Smart Tracking Assistant. Please provide your Tracking ID, or if you're already tracking a package, ask me about its ETA or status."
    elif matched_intent == "status":
        if shipment_context:
            status_text = prediction_context.get('mlStatus', prediction_context.get('fuzzyStatus', 'Unknown'))
            customer_name = shipment_context.get("OrderedBy", "Confidential")
            
            table_html = (
                f"<table style='width:100%; border-collapse: collapse; margin-top: 10px; font-size: 0.9em; text-align: left;'>"
                f"<tr style='border-bottom: 1px solid #ffffff33;'><td style='padding: 8px;'><strong>Ordered By</strong></td><td style='padding: 8px;'>{customer_name}</td></tr>"
                f"<tr style='border-bottom: 1px solid #ffffff33;'><td style='padding: 8px;'><strong>Origin</strong></td><td style='padding: 8px;'>{shipment_context['Origin']}</td></tr>"
                f"<tr style='border-bottom: 1px solid #ffffff33;'><td style='padding: 8px;'><strong>Destination</strong></td><td style='padding: 8px;'>{shipment_context['Destination']}</td></tr>"
                f"<tr style='border-bottom: 1px solid #ffffff33;'><td style='padding: 8px;'><strong>Current Location</strong></td><td style='padding: 8px;'>{shipment_context['CurrentLocation']}</td></tr>"
                f"<tr style='border-bottom: 1px solid #ffffff33;'><td style='padding: 8px;'><strong>Status</strong></td><td style='padding: 8px;'>{shipment_context['Status']}</td></tr>"
                f"<tr style='border-bottom: 1px solid #ffffff33;'><td style='padding: 8px;'><strong>ETA</strong></td><td style='padding: 8px;'>{prediction_context.get('etaFormatted', 'Unknown')}</td></tr>"
                f"</table>"
            )
            
            reply = f"Here are the details for **{tracking_id}**:<br>{table_html}"
        else:
            reply = "To tell you where your order is and show its details, please enter a Tracking ID first."
    elif matched_intent == "eta":
        if shipment_context:
            status_text = prediction_context.get('mlStatus', prediction_context.get('fuzzyStatus', 'Unknown'))
            reply = f"Based on our AI prediction, your estimated time of arrival is **{prediction_context['etaFormatted']}**. Current conditions indicate: **{status_text}**."
        else:
            reply = "I need your Tracking ID to calculate the ETA."
    elif matched_intent == "conditions":
        if shipment_context:
            reply = f"The route currently has **{shipment_context['WeatherCondition']}** weather and **{shipment_context['TrafficCongestion']}** traffic congestion. The AI factored this into your delays."
        else:
            reply = "I need a tracking ID to check the route conditions."
    elif matched_intent == "dataset":
        if ml_dataset is not None:
            if 'show' in message and 'all' in message:
                sample_df = ml_dataset.head(50)
                # Apply inline styling to the pandas generated HTML table so it fits perfectly in the chatbot window
                table_html = sample_df.to_html(classes="dataset-table", index=False, border=0)
                # Wrap it in a scrollable div
                wrapped_table = f"<div style='max-height: 400px; max-width: 100%; overflow: auto; border: 2px solid #000; border-radius: 10px; padding: 5px; margin-top: 10px; background: white;'>{table_html}</div>"
                reply = f"Because the full dataset contains over {len(ml_dataset):,} records, here are the first 50 rows for you to explore:<br>{wrapped_table}"
            elif 'rain' in message:
                avg = ml_dataset[ml_dataset['WeatherCondition'] == 'Rain']['Time_Taken_Hours'].mean()
                reply = f"According to my training data, the average delivery time during Rain is **{avg:.1f} hours**."
            elif 'storm' in message:
                avg = ml_dataset[ml_dataset['WeatherCondition'] == 'Storm']['Time_Taken_Hours'].mean()
                reply = f"According to my training data, the average delivery time during Storms jumps to **{avg:.1f} hours**."
            elif 'traffic' in message or 'jam' in message:
                avg = ml_dataset[ml_dataset['TrafficCongestion'] == 'Jam']['Time_Taken_Hours'].mean()
                reply = f"In heavy traffic (Jam), the average delivery time in my dataset is **{avg:.1f} hours**."
            else:
                reply = f"My neural network is trained on **{len(ml_dataset):,}** records from the Amazon Delivery dataset! Ask me to 'show all the dataset' or how rain/storms affect delivery times."
        else:
            reply = "My training dataset is currently offline, so I can't compute statistics right now."
    else:
        reply = "I'm sorry, I didn't quite catch that. You can ask me 'where is my package' or 'how does rain affect deliveries'."

    time.sleep(0.5) # Simulate AI thinking delay
    return jsonify({"reply": reply, "trackingId": tracking_id})

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 3000))
    app.run(host='0.0.0.0', port=port, debug=False)
