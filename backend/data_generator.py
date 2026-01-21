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
        
        # Base delay logic (minutes)
        base_delay = 0
        
        # 1. Random Route Factor (Simulating busy routes)
        # Hash route string to get a consistent "busyness" factor
        route_hash = hash(route) % 10
        if route_hash > 7: 
            base_delay += 5
            
        # 2. Time Factor (Peak Hours: 7-9 AM, 5-7 PM)
        if 7 <= hour <= 9 or 17 <= hour <= 19:
            base_delay += 15
        elif 10 <= hour <= 16:
            base_delay += 5
            
        # 3. Weather Factor
        if weather == 'Rainy':
            base_delay += 10
        elif weather == 'Snowy':
            base_delay += 25
        elif weather == 'Cloudy':
            base_delay += 2
            
        # 4. Event Factor
        if event == 'Sports':
            base_delay += 20
        elif event == 'Concert':
            base_delay += 15
        elif event == 'Protest':
            base_delay += 30
        elif event == 'Festival':
            base_delay += 10
            
        # 5. Day Factor (Fridays are busier)
        if day_of_week == 4: # Friday
            base_delay += 5
        if day_of_week >= 5: # Weekend (less traffic usually, but depends)
            base_delay -= 5
            
        # Add random noise
        noise = np.random.normal(0, 5) # Standard deviation of 5 mins
        final_delay = max(0, base_delay + noise) # Delay can't be negative
        
        data.append({
            'Route_ID': route,
            'Weather_Condition': weather,
            'Event_Type': event,
            'Hour': hour,
            'Day_OfWeek': day_of_week,
            'Delay_Minutes': round(final_delay, 2)
        })
        
    df = pd.DataFrame(data)
    
    # Save to CSV
    df.to_csv('transport_data.csv', index=False)
    print(f"Generated {num_samples} records in transport_data.csv using real Route IDs.")
    
if __name__ == "__main__":
    generate_data()
