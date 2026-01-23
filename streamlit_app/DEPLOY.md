# How to Run and Deploy the Streamlit App

This directory contains a complete Streamlit application for the Public Transport Delay Prediction system.

## 1. Local Setup

### Prerequisites
- Python 3.8+ installed.

### Steps
1. **Navigate to the directory**:
   ```bash
   cd streamlit_app
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Verify Files**:
   Ensure `delay_model.pkl` and `transport_data.csv` are present in this folder.
   (If not, copy them from the `../backend/` directory).

4. **Run the App**:
   ```bash
   streamlit run app.py
   ```

   The app should open in your browser at `http://localhost:8501`.

## 2. Deploying to Streamlit Cloud

Streamlit Community Cloud is the easiest way to deploy this for free.

### Steps
1. **Push to GitHub**:
   - Create a new GitHub repository (or use your existing one).
   - Commit and push this entire project (or just the `streamlit_app` folder) to GitHub.
   - *Note: If `delay_model.pkl` is >100MB, you might need Git LFS, but yours is ~35MB so it fits.*

2. **Sign up/Login to Streamlit Cloud**:
   - Go to [share.streamlit.io](https://share.streamlit.io/).
   - Connect your GitHub account.

3. **New App**:
   - Click "New app".
   - Select your Repository: e.g., `your-username/public-transport-delay`.
   - Select Branch: `main`.
   - **Main file path**: `streamlit_app/app.py` (or just `app.py` if you pushed only this folder).

4. **Deploy**:
   - Click "Deploy!".
   - Streamlit will install the packages from `requirements.txt` and verify the code.

5. **Secrets (Optional)**:
   - If you want to keep your Google Maps API Key secure (instead of hardcoded in `app.py`):
     - Go to your App Dashboard → Settings → Secrets.
     - Add:
       ```toml
       GOOGLE_API_KEY = "AIzaSyCi3U..."
       ```
     - Update `app.py` line 44:
       ```python
       API_KEY = st.secrets["GOOGLE_API_KEY"]
       ```

## Troubleshooting
- **Model not found**: Ensure `delay_model.pkl` is in the same folder as `app.py`.
- **Dependencies**: If deployment fails, check the logs on Streamlit Cloud. Usually, it's a missing package in `requirements.txt`.
