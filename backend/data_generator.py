import pandas as pd
import numpy as np
import random
import os
from datetime import datetime, timedelta

def generate_data(num_samples=5000):
    np.random.seed(42)
    
    # Load Real Route IDs from GTFS
    print("Loading GTFS routes...")
    try:
        routes_df = pd.read_csv('../data/hyderabad_GTFS/routes.txt')
        routes = routes_df['route_id'].astype(str).tolist()
        print(f"Found {len(routes)} real routes.")
    except Exception as e:
        print(f"Error loading GTFS routes: {e}. Falling back to dummy routes.")
        routes = ['R-101', 'R-102', 'R-103', 'R-201', 'R-202']
    
    # Base ranges
    dates = [datetime(2025, 1, 1) + timedelta(days=i) for i in range(num_samples)]
    weather_conditions = ['Sunny', 'Rainy', 'Cloudy', 'Snowy']
    event_types = ['None', 'Sports', 'Concert', 'Festival', 'Protest']
    
    data = []
    
    for _ in range(num_samples):
        date = random.choice(dates)
        route = random.choice(routes)
        weather = random.choice(weather_conditions)
        event = random.choice(event_types)
        
        # Features
        hour = random.randint(5, 23)  # Operating hours
        day_of_week = date.weekday()  # 0=Monday, 6=Sunday
        
        # New Granular Features
        temperature = round(np.random.normal(30, 5), 1) # Avg 30C in Hyderabad
        precipitation = 0.0
        event_attendance = 0
        
        # Correlate features with categories for realism
        if weather == 'Rainy':
            precipitation = round(random.uniform(5.0, 50.0), 1)
            temperature -= 3 # Rain cools it down
        elif weather == 'Snowy':
            temperature = round(random.uniform(-5.0, 2.0), 1)
        elif weather == 'Sunny':
            temperature += 2
            
        if event != 'None':
            # Attendance in thousands
            if event == 'Sports': event_attendance = random.randint(20000, 60000)
            elif event == 'Concert': event_attendance = random.randint(10000, 40000)
            elif event == 'Festival': event_attendance = random.randint(50000, 100000)
            elif event == 'Protest': event_attendance = random.randint(5000, 20000)
        
        # Base delay logic (minutes)
        base_delay = 0
        
        # 1. Random Route Factor
        route_hash = hash(route) % 10
        if route_hash > 7: 
            base_delay += 5
            
        # 2. Time Factor (Rush Hours)
        if 7 <= hour <= 9 or 17 <= hour <= 19:
            base_delay += 15
        elif 10 <= hour <= 16:
            base_delay += 5
            
        # 3. Weather Factor (Granular)
        # 0.5 min delay per mm of rain
        base_delay += (precipitation * 0.5) 
        
        # Extreme heat delay (>40C slows things down slighty due to overheating/fatigue)
        if temperature > 40:
            base_delay += 5
        # Freezing delay
        if temperature < 0:
            base_delay += 10
            
        # 4. Event Factor (Granular)
        # 1 min delay per 5000 people
        base_delay += (event_attendance / 5000)
        
        # Extra penalty for specific chaotic events
        if event == 'Protest':
            base_delay += 10
            
        # 5. Day Factor
        if day_of_week == 4: # Friday
            base_delay += 5
        if day_of_week >= 5: # Weekend
            base_delay -= 5
            
        # Add random noise
        noise = np.random.normal(0, 5)
        final_delay = max(0, base_delay + noise)
        
        data.append({
            'Route_ID': route,
            'Weather_Condition': weather,
            'Event_Type': event,
            'Hour': hour,
            'Day_OfWeek': day_of_week,
            'Temperature': temperature,
            'Precipitation': precipitation,
            'Event_Attendance': event_attendance,
            'Delay_Minutes': round(final_delay, 2)
        })
        
    df = pd.DataFrame(data)
    
    # Save to CSV
    df.to_csv('transport_data.csv', index=False)
    print(f"Generated {num_samples} records in transport_data.csv using real Route IDs.")
    
if __name__ == "__main__":
    generate_data()
