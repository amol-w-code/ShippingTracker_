import pandas as pd
import numpy as np
import os
import joblib

try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential, load_model
    from tensorflow.keras.layers import Dense, Dropout
except ImportError:
    tf = None

from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.keras')
ENCODERS_PATH = os.path.join(os.path.dirname(__file__), 'encoders.joblib')

def train_model(csv_path):
    """
    Trains a Keras Neural Network on the provided CSV dataset.
    Expected columns: WeatherCondition, TrafficCongestion, DistanceRemaining, Time_Taken_Hours
    """
    if tf is None:
        raise ImportError("TensorFlow is not installed.")
        
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found at {csv_path}")

    # Load dataset
    df = pd.read_csv(csv_path)

    required_columns = ['WeatherCondition', 'TrafficCongestion', 'DistanceRemaining', 'Time_Taken_Hours']
    for col in required_columns:
        if col not in df.columns:
            raise ValueError(f"Missing required column: {col}")

    # Preprocessing
    encoders = {}
    X = pd.DataFrame()
    
    # Categorical features
    for col in ['WeatherCondition', 'TrafficCongestion']:
        le = LabelEncoder()
        X[col] = le.fit_transform(df[col].astype(str).str.lower())
        encoders[col] = le
        
    # Numerical feature scaling
    scaler = StandardScaler()
    X['DistanceRemaining'] = scaler.fit_transform(df[['DistanceRemaining']])
    encoders['DistanceScaler'] = scaler
    
    y = df['Time_Taken_Hours'].values

    # Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(X.values, y, test_size=0.2, random_state=42)

    # Build Keras Model
    model = Sequential([
        Dense(64, activation='relu', input_shape=(X_train.shape[1],)),
        Dropout(0.2),
        Dense(32, activation='relu'),
        Dense(16, activation='relu'),
        Dense(1, activation='linear') # Output layer for regression
    ])

    model.compile(optimizer='adam', loss='mean_squared_error', metrics=['mae'])

    # Train Model
    history = model.fit(X_train, y_train, epochs=20, batch_size=32, validation_split=0.2, verbose=0)

    # Evaluate
    loss, mae = model.evaluate(X_test, y_test, verbose=0)

    # Save model and encoders
    model.save(MODEL_PATH)
    joblib.dump(encoders, ENCODERS_PATH)

    return {"status": "success", "mae": float(mae), "message": "Keras Model trained successfully"}

def predict_eta(weather, traffic, distance):
    """
    Predicts the ETA in hours using the trained Keras model.
    """
    if tf is None:
        raise ImportError("TensorFlow is not installed.")
        
    if not os.path.exists(MODEL_PATH) or not os.path.exists(ENCODERS_PATH):
        raise FileNotFoundError("Keras ML model is not trained yet. Please train the model first.")

    model = load_model(MODEL_PATH)
    encoders = joblib.load(ENCODERS_PATH)

    # Preprocess input
    X_input = []
    
    weather = str(weather).lower()
    traffic = str(traffic).lower()
    
    for col, val in [('WeatherCondition', weather), ('TrafficCongestion', traffic)]:
        le = encoders[col]
        try:
            encoded_val = le.transform([val])[0]
        except ValueError:
            encoded_val = 0
        X_input.append(encoded_val)

    # Scale distance
    scaler = encoders['DistanceScaler']
    scaled_dist = scaler.transform([[float(distance)]])[0][0]
    X_input.append(scaled_dist)

    X_input_arr = np.array([X_input])

    # Predict
    eta_hours = model.predict(X_input_arr, verbose=0)[0][0]
    
    # Formatting time
    days = int(eta_hours // 24)
    hours = int(eta_hours % 24)
    time_str = ""
    if days > 0: time_str += f"{days} Day(s) "
    if hours > 0 or days == 0: time_str += f"{hours} Hour(s)"
    
    # Status
    base_hours = distance / 50.0 # Expected base time
    multiplier = eta_hours / base_hours if base_hours > 0 else 1.0
    status = "On Time"
    if multiplier > 1.3: status = "Expected Delay"
    if multiplier > 1.8: status = "Significant Delay"
    
    return {
        "etaHours": round(float(eta_hours), 1),
        "etaFormatted": time_str.strip() or "Less than an hour",
        "mlStatus": status,
        "is_ml_prediction": True
    }
