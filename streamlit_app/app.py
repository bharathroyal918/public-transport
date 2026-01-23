import streamlit as st
import pandas as pd
import joblib
import googlemaps
from datetime import datetime
import folium
from streamlit_folium import st_folium
import polyline
import numpy as np
import os

# --- Page Configuration ---
st.set_page_config(
    page_title="TransitAI: Smart Delay Prediction",
    page_icon="🚌",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- CSS Styling ---
st.markdown("""
<style>
    .main .block-container {
        padding-top: 2rem;
        padding-bottom: 2rem;
    }
    h1 {
        color: #2563eb;
    }
    .stButton>button {
        width: 100%;
        background-color: #2563eb;
        color: white;
        border-radius: 0.5rem;
        padding: 0.5rem 1rem;
        font-weight: 600;
    }
    .metric-container {
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        padding: 1rem;
        background-color: white;
        text-align: center;
    }
</style>
""", unsafe_allow_html=True)

# --- Configuration & Constants ---
API_KEY = "AIzaSyCi3U0TUQmlrrrVOaR-aG6k4KNusN8DOKg"

# --- Load Resources (Cached) ---
@st.cache_resource
def load_resources():
    # Initialize Google Maps Client
    gmaps = googlemaps.Client(key=API_KEY)
    
    # Load Model
    model_path = os.path.join(os.path.dirname(__file__), 'delay_model.pkl')
    try:
        model = joblib.load(model_path)
    except FileNotFoundError:
        st.error(f"Model file not found at {model_path}. Please check deployment.")
        model = None

    # Load Routes
    data_path = os.path.join(os.path.dirname(__file__), 'transport_data.csv')
    try:
        df = pd.read_csv(data_path)
        routes = sorted(df['Route_ID'].unique().tolist())
    except FileNotFoundError:
        routes = []
        st.warning(f"Data file not found at {data_path}. Route list empty.")

    return gmaps, model, routes

gmaps, model, available_routes = load_resources()

# --- Inputs (Sidebar) ---
with st.sidebar:
    st.title("TransitAI 🚌")
    st.caption("Smart Delay Prediction System")
    st.divider()

    st.subheader("Trip Details")
    
    origin = st.text_input("Origin", "Vijayawada", placeholder="e.g. Vijayawada")
    destination = st.text_input("Destination", "Guntur", placeholder="e.g. Guntur")
    
    route_id = st.selectbox("Route ID", ["Select Route"] + available_routes if available_routes else [])

    st.divider()
    
    col1, col2 = st.columns(2)
    with col1:
        weather_condition = st.selectbox("Weather", ["Clear", "Rainy", "Foggy", "Cloudy", "Snowy"])
        hour = st.number_input("Hour (0-23)", 0, 23, 12)
    with col2:
        event_type = st.selectbox("Event", ["Normal", "Holiday", "Peak Hours", "Festival", "Protest", "Sports", "Concert", "None"])
        day_of_week = st.selectbox("Day", options=[0, 1, 2, 3, 4, 5, 6], format_func=lambda x: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][x])

    # Granular Controls (Expander)
    with st.expander("Scenario Analysis (What-If)"):
        # Auto-update logic simulation (default values based on selection)
        default_temps = {'Clear': 30, 'Sunny': 35, 'Cloudy': 28, 'Rainy': 25, 'Snowy': -2, 'Foggy': 20}
        default_precip = {'Clear': 0, 'Sunny': 0, 'Cloudy': 0, 'Rainy': 20, 'Snowy': 10, 'Foggy': 5}
        
        temp = st.slider("Temperature (°C)", -10, 50, default_temps.get(weather_condition, 30))
        precip = st.slider("Precipitation (mm)", 0, 100, default_precip.get(weather_condition, 0))
        
        default_attendance = {'Normal': 0, 'Sports': 40000, 'Concert': 25000, 'Festival': 60000, 'Protest': 10000}
        event_attendance = st.slider("Crowd Size", 0, 100000, default_attendance.get(event_type, 0), step=1000)

    calculate_btn = st.button("Calculate Delay", type="primary")

# --- Main Logic ---

if calculate_btn:
    if not origin or not destination or route_id == "Select Route":
        st.error("Please fill in Origin, Destination and Route ID.")
    else:
        try:
            with st.spinner("Fetching Route & Predicting Delays..."):
                # 1. Google Maps Data
                # Get Directions logic to display map path
                now = datetime.now()
                # For map display
                directions_result = gmaps.directions(origin, destination, mode="transit", departure_time=now)
                
                # For base time calculation (using distance matrix as in backend/main.py or directions result)
                # Using distance matrix ensures consistency with backend logic, but directions result has duration too.
                # directions_result[0]['legs'][0]['duration']['value'] is seconds.
                
                if not directions_result:
                    st.error("No directions found for this route.")
                    google_time_min = 0
                    path_points = []
                else:
                    leg = directions_result[0]['legs'][0]
                    google_time_sec = leg['duration']['value']
                    google_time_min = google_time_sec / 60
                    
                    # Decode path
                    overview_polyline = directions_result[0]['overview_polyline']['points']
                    path_points = polyline.decode(overview_polyline)

                # 2. ML Prediction
                if model:
                    features = pd.DataFrame([{
                        "Route_ID": route_id,
                        "Weather_Condition": weather_condition,
                        "Event_Type": event_type,
                        "Hour": hour,
                        "Day_OfWeek": day_of_week,
                        "Temperature": temp,
                        "Precipitation": precip,
                        "Event_Attendance": event_attendance
                    }])
                    
                    predicted_delay = model.predict(features)[0]
                else:
                    predicted_delay = 0

                total_time = google_time_min + predicted_delay

            # --- Layout: Map & Metrics ---
            
            # Metrics Row
            m1, m2, m3 = st.columns(3)
            with m1:
                st.metric("Google Maps Base Time", f"{google_time_min:.1f} min")
            with m2:
                st.metric("AI Predicted Delay", f"+{predicted_delay:.1f} min", delta_color="inverse")
            with m3:
                st.metric("Total Estimated Time", f"{total_time:.1f} min")

            # Map
            st.subheader(f"Route: {origin} ➡ {destination}")
            
            if path_points:
                # Center map on route
                center_lat = sum([p[0] for p in path_points]) / len(path_points)
                center_lng = sum([p[1] for p in path_points]) / len(path_points)
                
                m = folium.Map(location=[center_lat, center_lng], zoom_start=12)
                
                # Draw Route
                folium.PolyLine(
                    path_points,
                    color="#2563eb",
                    weight=5,
                    opacity=0.8
                ).add_to(m)
                
                # Markers
                folium.Marker(path_points[0], popup=f"Origin: {origin}", icon=folium.Icon(color="green")).add_to(m)
                folium.Marker(path_points[-1], popup=f"Dest: {destination}", icon=folium.Icon(color="red")).add_to(m)
                
                st_folium(m, width=900, height=400)

            # --- Trend Analysis ---
            st.subheader("Hourly Delay Forecast")
            
            if model:
                trend_data = []
                for h in range(24):
                    f = features.copy()
                    f['Hour'] = h
                    d = model.predict(f)[0]
                    trend_data.append({"Hour": h, "Predicted Delay (min)": max(0, d)}) # ensure non-negative for chart niceness
                
                trend_df = pd.DataFrame(trend_data)
                st.area_chart(trend_df.set_index("Hour"), color="#2563eb")

        except Exception as e:
            st.error(f"An error occurred: {str(e)}")

elif not available_routes:
    st.info("Loading system resources...")

# Footer
st.markdown("---")
st.markdown("Developed with TransitAI Engine | Models trained on GTFS & Google Maps Data")
