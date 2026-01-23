import streamlit as st
import pandas as pd

st.set_page_config(page_title="Public Transport Delay", layout="wide")

st.title("🚌 Public Transport Delay Prediction")

@st.cache_data
def load_data():
    return pd.read_csv("transport_data.csv")

df = load_data()

st.subheader("Sample Transport Data")
st.dataframe(df.head(20))

st.subheader("Basic Stats")
st.write(df.describe())
