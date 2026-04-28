import pandas as pd
import numpy as np
import os
import joblib
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
from sklearn.ensemble import RandomForestRegressor

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.joblib')

def train_model(csv_path):
    """
    Trains a Scikit-Learn Model on the provided CSV dataset.
    Expected columns: WeatherCondition, TrafficCongestion, DistanceRemaining, Time_Taken_Hours
    """
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

    # Build and Train Scikit-Learn Model
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)

    # Save model and encoders together
    joblib.dump({"model": model, "encoders": encoders}, MODEL_PATH)

    return {"status": "success", "mae": float(mae), "message": "Scikit-Learn Model trained successfully"}

def predict_eta(weather, traffic, distance):
    """
    Predicts the ETA in hours using the trained Scikit-Learn model.
    """
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError("ML model is not trained yet. Please train the model first.")

    saved_data = joblib.load(MODEL_PATH)
    model = saved_data["model"]
    encoders = saved_data["encoders"]

    # Preprocess input
    X_input = []
    
    weather = str(weather).lower()
    traffic = str(traffic).lower()
    
    for col, val in [('WeatherCondition', weather), ('TrafficCongestion', traffic)]:
        le = encoders[col]
        try:
            # Handle unseen labels gracefully
            if val in le.classes_:
                encoded_val = le.transform([val])[0]
            else:
                encoded_val = 0
        except ValueError:
            encoded_val = 0
        X_input.append(encoded_val)

    # Scale distance
    scaler = encoders['DistanceScaler']
    scaled_dist = scaler.transform([[float(distance)]])[0][0]
    X_input.append(scaled_dist)

    X_input_arr = np.array([X_input])

    # Predict
    eta_hours = model.predict(X_input_arr)[0]
    
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
