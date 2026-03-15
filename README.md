# CryptoVol AI - Crypto Volatility Prediction API

CryptoVol AI is a Machine Learning application built to predict cryptocurrency market volatility. Using an XGBoost regressor, it analyzes historical OHLCV (Open, High, Low, Close, Volume) and market cap data to forecast future price movements. The backend is powered by FastAPI, while the frontend offers a sleek, modern user interface built with Tailwind CSS.

## Features

- **Volatility Prediction:** Upload a CSV of historical crypto data (at least 14 days), and the system extracts various technical indicators (like rolling means, standard deviations, and log returns) to predict future volatility.
- **FastAPI Backend:** A fast, asynchronous REST API robustly handles data ingestion, validation, and feature engineering.
- **Tailwind CSS Frontend:** A responsive, dark/light theme supporting user interface that simplifies the process of uploading data and checking results.
- **XGBoost Inference:** Employs a pre-trained XGBoost model along with a Scikit-Learn scaler and label encoder.

## Tech Stack

- **Backend:** Python, FastAPI, Uvicorn, Pandas, XGBoost, Joblib, scikit-learn
- **Frontend:** HTML5, Vanilla JavaScript, Tailwind CSS

## Prerequisites

- **Python 3.8+**
- **Node.js & npm** (required to compile Tailwind CSS)

## Installation

1. **Clone the repository** (if applicable):
   ```bash
   git clone <your-repo-url>
   cd Crypto-Volatility
   ```

2. **Set up a Python virtual environment** (Recommended):
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Install Node dependencies (Tailwind CSS):**
   ```bash
   npm install
   ```

## Running the Application

### 1. Compile Tailwind CSS (Optional / For Development)
To watch for class changes in your HTML and rebuild the Tailwind CSS file automatically:
```bash
npm run dev
# or 
npx tailwindcss -i ./static/style.css -o ./static/tailwind.css --watch
```
*(If `styles.css` is statically provided, you can skip this step.)*

### 2. Start the FastAPI Server
Run the Uvicorn server to start the FastAPI application:
```bash
uvicorn app:app --reload
```

### 3. Access the Application
Open your web browser and navigate to:
[http://127.0.0.1:8000](http://127.0.0.1:8000)

## API Endpoints

- `GET /` - Serves the main UI (index.html).
- `POST /predict` - Accepts a CSV file containing columns `['crypto_name', 'open', 'high', 'low', 'close', 'volume', 'marketCap', 'day', 'month', 'year']` to perform volatility predictions based on the previous 14 days minimum.

## Data Format (CSV)

When using the Web UI or API, ensure your CSV includes the following exact headers:
- `crypto_name`
- `open`
- `high`
- `low`
- `close`
- `volume`
- `marketCap`
- `day`
- `month`
- `year`

*Note: At least 14 days of data are required to calculate the rolling technical indicators correctly.*
