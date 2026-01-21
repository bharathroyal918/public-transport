import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, r2_score

def train_model():
    print("Loading data...")
    try:
        df = pd.read_csv('transport_data.csv')
    except FileNotFoundError:
        print("Error: transport_data.csv not found. Run data_generator.py first.")
        return

    # Features and Target
    X = df.drop('Delay_Minutes', axis=1)
    y = df['Delay_Minutes']

    # Preprocessing
    categorical_features = ['Route_ID', 'Weather_Condition', 'Event_Type']
    numerical_features = ['Hour', 'Day_OfWeek']

    # Create a column transformer
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features),
            ('num', 'passthrough', numerical_features)
        ]
    )

    # Pipeline
    model = Pipeline([
        ('preprocessor', preprocessor),
        ('regressor', RandomForestRegressor(n_estimators=100, random_state=42))
    ])

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Train
    print("Training model...")
    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"Model Trained. MAE: {mae:.2f} mins, R2 Score: {r2:.2f}")

    # Save
    joblib.dump(model, 'delay_model.pkl')
    print("Model saved to delay_model.pkl")

if __name__ == "__main__":
    train_model()
