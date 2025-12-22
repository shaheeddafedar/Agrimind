import sys
import joblib
import pandas as pd
import os
import json

try:
    # --- 1. Get Path to Model Files ---
    # Gets the absolute path to the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(script_dir, 'crop_model.joblib')
    scaler_path = os.path.join(script_dir, 'scaler.joblib')

    # --- 2. Load Model and Scaler ---
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)

    # --- 3. Get Input Data from Command Line ---
    # We expect 7 arguments (N, P, K, temp, humidity, ph, rainfall)
    if len(sys.argv) != 8:
        error_msg = json.dumps({"error": f"Incorrect number of arguments. Expected 7, got {len(sys.argv) - 1}"})
        print(error_msg, file=sys.stderr)
        sys.exit(1)

    inputs = sys.argv[1:8]
    # Convert all inputs to float
    data = [float(arg) for arg in inputs]

    # --- 4. Prepare Data for Prediction ---
    # The model was trained on: ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']
    # The order of command-line args MUST match this.
    
    # Create a DataFrame with the correct column names
    column_names = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']
    input_df = pd.DataFrame([data], columns=column_names)

    # --- 5. Scale the Data ---
    scaled_data = scaler.transform(input_df)

    # --- 6. Make Prediction ---
    prediction = model.predict(scaled_data)

    # --- 7. Output Result ---
    # Print the predicted crop name to standard output
    # We use JSON to make the output robust
    print(json.dumps({"crop": prediction[0]}))

except FileNotFoundError:
    print(json.dumps({"error": "Model or scaler file not found."}), file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(json.dumps({"error": f"Python script error: {str(e)}"}), file=sys.stderr)
    sys.exit(1)