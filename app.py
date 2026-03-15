import xgboost as xgb
import numpy as np
import pandas as pd
import joblib

import io

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from typing import List

app = FastAPI(title="CryptoVol AI", description="Crypto Volatility Prediction API")

# ── Static files & templates ──
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# -----------------------------
# Load model, scaler, and encoder
# -----------------------------
model = xgb.Booster()
model.load_model("models/model.json")

scaler = joblib.load("models/scaler.pkl")
crypto_encoder = joblib.load("models/encoder.pkl")

# -----------------------------
# Columns
# -----------------------------
scale_cols = [
    'open','high','low','close',
    'volume','marketCap',
    'price_range','return','log_return',
    'rolling_mean_7','rolling_std_7',
    'rolling_mean_14','rolling_std_14',
    'volume_change','marketcap_change'
]

feature_order = [
    'open','high','low','close','volume','marketCap',
    'price_range','return','log_return',
    'year','month','day','dayofweek',
    'rolling_mean_7','rolling_std_7','rolling_mean_14','rolling_std_14',
    'volume_change','marketcap_change','crypto_id',
    'coin_return_mean_7','coin_return_std_7','coin_volume_mean_7'
]

# -----------------------------
# Input schema
# -----------------------------
class DailyData(BaseModel):
    open: float
    high: float
    low: float
    close: float
    volume: float
    marketCap: float
    day: int
    month: int
    year: int

class InputData(BaseModel):
    crypto_name: str
    history: List[DailyData]  # list of last 14 days

# -----------------------------
# Feature engineering
# -----------------------------
def create_features(history: List[dict], crypto_name: str):

    df = pd.DataFrame(history)

    # Encode crypto name
    try:
        crypto_id = crypto_encoder.transform([crypto_name])[0]
    except ValueError:
        crypto_id = -1  # unknown crypto
    df['crypto_id'] = crypto_id

    # Price range
    df['price_range'] = df['high'] - df['low']

    # Returns
    df['return'] = (df['close'] - df['open']) / df['open']
    df['log_return'] = np.log(df['close'] / df['open'])

    # Date features
    df['dayofweek'] = pd.to_datetime(
        df[['year','month','day']].astype(str).agg('-'.join, axis=1)
    ).dt.dayofweek

    # Rolling features
    df['rolling_mean_7'] = df['close'].rolling(7, min_periods=1).mean()
    df['rolling_std_7'] = df['close'].rolling(7, min_periods=1).std().fillna(0)
    df['rolling_mean_14'] = df['close'].rolling(14, min_periods=1).mean()
    df['rolling_std_14'] = df['close'].rolling(14, min_periods=1).std().fillna(0)

    # Volume/marketcap changes
    df['volume_change'] = df['volume'].pct_change().fillna(0)
    df['marketcap_change'] = df['marketCap'].pct_change().fillna(0)

    # Coin rolling features
    df['coin_return_mean_7'] = df['return'].rolling(7, min_periods=1).mean()
    df['coin_return_std_7'] = df['return'].rolling(7, min_periods=1).std().fillna(0)
    df['coin_volume_mean_7'] = df['volume'].rolling(7, min_periods=1).mean()

    # Fill any remaining NaNs
    df = df.fillna(0)

    return df

# -----------------------------
# Health check
# -----------------------------
@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


# -----------------------------
# Required CSV columns (must match DailyData fields)
# -----------------------------
REQUIRED_CSV_COLS = ["crypto_name", "open", "high", "low", "close", "volume", "marketCap", "day", "month", "year"]

# -----------------------------
# CSV upload prediction endpoint
# -----------------------------
@app.post("/predict")
async def predict_csv(
    file: UploadFile = File(..., description="CSV file with daily OHLCV data (must include a 'crypto_name' column)")
):
    # ── 1. Read the uploaded file ──────────────────────────────────────────────
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    contents = await file.read()
    try:
        df_csv = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {e}")

    # ── 2. Validate required columns ──────────────────────────────────────────
    missing_cols = [c for c in REQUIRED_CSV_COLS if c not in df_csv.columns]
    if missing_cols:
        raise HTTPException(
            status_code=422,
            detail=f"CSV is missing required column(s): {missing_cols}. "
                   f"Required columns: {REQUIRED_CSV_COLS}"
        )

    # ── 3. Drop rows with missing values in required columns ──────────────────
    total_rows = len(df_csv)
    df_csv = df_csv.dropna(subset=REQUIRED_CSV_COLS)
    dropped = total_rows - len(df_csv)

    # ── 4. Validate minimum 14 days (after cleaning) ──────────────────────────
    if len(df_csv) < 14:
        detail_msg = (
            f"CSV must contain at least 14 complete rows of data. "
            f"After removing {dropped} row(s) with missing values, "
            f"only {len(df_csv)} valid row(s) remain."
        )
        raise HTTPException(status_code=422, detail=detail_msg)

    # ── 4. Extract & validate crypto_name from the CSV column ─────────────────
    crypto_names = df_csv["crypto_name"].dropna().astype(str).str.strip()
    if crypto_names.empty or (crypto_names == "").all():
        raise HTTPException(
            status_code=422,
            detail="The 'crypto_name' column must not be empty."
        )
    unique_names = crypto_names.unique()
    if len(unique_names) > 1:
        raise HTTPException(
            status_code=422,
            detail=f"All rows must have the same crypto_name. Found: {list(unique_names)}"
        )
    crypto_name: str = unique_names[0]

    # ── 5. Parse rows into DailyData objects for type validation ──────────────
    ohlcv_cols = [c for c in REQUIRED_CSV_COLS if c != "crypto_name"]
    try:
        history = [
            DailyData(
                open=row["open"],
                high=row["high"],
                low=row["low"],
                close=row["close"],
                volume=row["volume"],
                marketCap=row["marketCap"],
                day=int(row["day"]),
                month=int(row["month"]),
                year=int(row["year"]),
            )
            for _, row in df_csv[ohlcv_cols].iterrows()
        ]
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid data in CSV rows: {e}")

    history_dicts = [day.dict() for day in history]

    # ── 5. Feature engineering ────────────────────────────────────────────────
    df_feat = create_features(history_dicts, crypto_name)

    # ── 6. Scale ──────────────────────────────────────────────────────────────
    df_feat[scale_cols] = scaler.transform(df_feat[scale_cols])

    # ── 7. Reorder features ───────────────────────────────────────────────────
    df_feat = df_feat[feature_order]

    # ── 8. Predict on the last row ────────────────────────────────────────────
    last_row = df_feat.tail(1)
    dmatrix = xgb.DMatrix(last_row, feature_names=list(last_row.columns))
    prediction = model.predict(dmatrix)

    return {
        "crypto_name": crypto_name,
        "rows_received": len(history),
        "prediction": prediction.tolist()
    }