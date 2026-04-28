import pandas as pd
import random
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
CSV_PATH = os.path.join(DATA_DIR, 'amazon_delivery_sample.csv')

def generate_data():
    weather_conditions = ['Clear', 'Rain', 'Storm', 'Fog', 'Snow']
    traffic_conditions = ['Low', 'Medium', 'High', 'Jam']
    
    data = []
    for _ in range(5000): # Generate 5000 rows
        weather = random.choice(weather_conditions)
        traffic = random.choice(traffic_conditions)
        distance = round(random.uniform(5.0, 500.0), 1)
        
        # Base time logic
        base_time = distance / 50.0 
        
        # Weather multipliers
        if weather == 'Clear': base_time *= random.uniform(0.9, 1.1)
        elif weather == 'Rain': base_time *= random.uniform(1.2, 1.5)
        elif weather == 'Fog': base_time *= random.uniform(1.3, 1.6)
        elif weather == 'Snow': base_time *= random.uniform(1.5, 2.0)
        elif weather == 'Storm': base_time *= random.uniform(1.8, 2.5)
            
        # Traffic multipliers
        if traffic == 'Low': base_time *= random.uniform(0.9, 1.1)
        elif traffic == 'Medium': base_time *= random.uniform(1.1, 1.3)
        elif traffic == 'High': base_time *= random.uniform(1.4, 1.8)
        elif traffic == 'Jam': base_time *= random.uniform(1.8, 2.5)
            
        time_taken = round(base_time, 2)
        
        data.append({
            'WeatherCondition': weather,
            'TrafficCongestion': traffic,
            'DistanceRemaining': distance,
            'Time_Taken_Hours': time_taken
        })
        
    df = pd.DataFrame(data)
    df.to_csv(CSV_PATH, index=False)
    print(f"Generated {len(df)} rows in {CSV_PATH}")

if __name__ == "__main__":
    generate_data()
