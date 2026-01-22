from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import googlemaps # New dependency

app = FastAPI(title="Industrial Transit Prediction API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (change in production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Google Maps Client
# Get your API key from Google Cloud Console
gmaps = googlemaps.Client(key="AIzaSyCi3U0TUQmlrrrVOaR-aG6k4KNusN8DOKg")

# Load Model
try:
    model = joblib.load('delay_model.pkl') # cite: 2
except FileNotFoundError:
    model = None

class TripPredictionRequest(BaseModel):
    origin: str
    destination: str
    Route_ID: str
    Weather_Condition: str
    Event_Type: str
    Hour: int
    Day_OfWeek: int

@app.post("/predict-trip")
def predict_trip(request: TripPredictionRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not trained")

    try:
        # 1. Get Base Time from Google Maps
        directions = gmaps.distance_matrix(request.origin, request.destination, mode="transit")
        google_time_sec = directions['rows'][0]['elements'][0]['duration']['value']
        google_time_min = google_time_sec / 60

        # 2. Get ML Predicted Delay
        features = pd.DataFrame([{
            "Route_ID": request.Route_ID,
            "Weather_Condition": request.Weather_Condition,
            "Event_Type": request.Event_Type,
            "Hour": request.Hour,
            "Day_OfWeek": request.Day_OfWeek
        }])
        
        delay_prediction = model.predict(features)[0] # cite: 2
        total_time = google_time_min + delay_prediction

        return {
            "google_maps_base_time": round(google_time_min, 2),
            "predicted_extra_delay": round(delay_prediction, 2),
            "total_estimated_arrival": round(total_time, 2),
            "units": "minutes"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/routes")
def get_routes():
    try:
        df = pd.read_csv('transport_data.csv')
        unique_routes = sorted(df['Route_ID'].unique().tolist())
        return {"routes": unique_routes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load routes: {str(e)}")

@app.post("/predict-trend")
def predict_trend(request: TripPredictionRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not trained")
    
    try:
        trend_data = []
        # Predict for every hour of the day (0-23)
        for h in range(24):
            features = pd.DataFrame([{
                "Route_ID": request.Route_ID,
                "Weather_Condition": request.Weather_Condition,
                "Event_Type": request.Event_Type,
                "Hour": h,
                "Day_OfWeek": request.Day_OfWeek
            }])
            predicted_delay = model.predict(features)[0]
            trend_data.append({"hour": h, "delay": round(predicted_delay, 2)})
            
        return {"trend": trend_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
