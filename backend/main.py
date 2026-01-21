from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Public Transport Delay Prediction API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Model
try:
    model = joblib.load('delay_model.pkl')
    print("Model loaded successfully.")
except FileNotFoundError:
    model = None
    print("Warning: delay_model.pkl not found. Predictions will fail until model is trained.")

class PredictionRequest(BaseModel):
    Route_ID: str
    Weather_Condition: str
    Event_Type: str
    Hour: int
    Day_OfWeek: int

@app.get("/")
def read_root():
    return {"message": "Public Transport Delay Prediction API is Running"}

@app.post("/predict")
def predict_delay(request: PredictionRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded. Please train the model first.")
    
    # Create DataFrame from input
    input_data = pd.DataFrame([request.dict()])
    
    try:
        prediction = model.predict(input_data)[0]
        # Return prediction and some context
        return {
            "predicted_delay_minutes": round(prediction, 2),
            "severity": "High" if prediction > 20 else "Moderate" if prediction > 10 else "Low"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "healthy", "model_loaded": model is not None}

@app.get("/feature-importance")
def get_feature_importance():
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded.")
    
    try:
        # Get feature names
        preprocessor = model.named_steps['preprocessor']
        regressor = model.named_steps['regressor']
        
        cat_features = ['Route_ID', 'Weather_Condition', 'Event_Type']
        num_features = ['Hour', 'Day_OfWeek']
        
        # Get one-hot names
        ohe = preprocessor.named_transformers_['cat']
        cat_names = ohe.get_feature_names_out(cat_features)
        
        # All feature names in order
        all_features = list(cat_names) + num_features
        
        importances = regressor.feature_importances_
        
        # Combine
        feature_impact = []
        for name, score in zip(all_features, importances):
            feature_impact.append({"feature": name, "importance": float(score)})
            
        # Sort
        feature_impact.sort(key=lambda x: x['importance'], reverse=True)
        return feature_impact
    except Exception as e:
        print(f"Error calculating feature importance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/route-risks")
def get_route_risks():
    try:
        df = pd.read_csv('transport_data.csv')
        risk_data = df.groupby('Route_ID')['Delay_Minutes'].mean().reset_index()
        risk_data['Delay_Minutes'] = risk_data['Delay_Minutes'].round(2)
        return risk_data.to_dict(orient='records')
    except Exception as e:
        print(f"Error calculating route risks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/routes")
def get_routes():
    try:
        # Return unique Route IDs from the training data
        if model is None:
             raise HTTPException(status_code=500, detail="Model not loaded")
        
        # We can read from csv or getting from preprocessor if we stored it
        # Safest is to read unique values from csv used for training or load mapping
        df = pd.read_csv('transport_data.csv')
        routes = df['Route_ID'].unique().tolist()
        routes.sort()
        return routes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
