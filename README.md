# Public Transport Delay Prediction System

A full-stack application to predict transit delays using Machine Learning.

## Features
- **ML Model**: Random Forest Regressor trained on synthetic delay data.
- **Factors**: Considers Weather, Event Schedule, Route ID, and Time of Day.
- **Dashboard**: Interactive React UI to query the model and visualize sensitivity.

## Quick Start

### 1. Setup Backend
```bash
cd backend
pip install -r requirements.txt
python data_generator.py  # Gen data
python train_model.py     # Train model
uvicorn main:app --reload # Start API
```

### 2. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

Visit the dashboard at `http://localhost:5173`.
