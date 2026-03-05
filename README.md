# Customs Risk Assessment System

## Quick Start

```bash
pip install -r requirements.txt
python generate_dataset.py      # creates sample_shipments.csv
python ml_pipeline.py           # trains model + outputs predictions.csv
```

## Files
- `ml_pipeline.py`     — full ML pipeline: preprocessing, training, inference, explainability
- `generate_dataset.py` — synthetic shipment data generator (500 containers)
- `predictions.csv`    — sample output with Risk_Score, Risk_Level, Explanation_Summary
- `requirements.txt`   — Python dependencies

## Pipeline Overview
1. **Feature Engineering** — weight diff, value/kg, country risk, time features, flags
2. **Gradient Boosting Classifier** — trained on labeled shipment data  
3. **Isolation Forest** — anomaly detection for unusual patterns
4. **Combined Score** — 70% classifier + 30% anomaly score
5. **Explainability** — rule-based natural language explanations per container

## Input CSV Columns
Container_ID, Declaration_Date, Declaration_Time, Origin_Country, Destination_Country,
HS_Code, Importer_ID, Exporter_ID, Declared_Value, Declared_Weight, Measured_Weight,
Dwell_Time_Hours, Shipping_Line, Trade_Regime, Clearance_Status

## Output CSV Columns
Container_ID, Risk_Score (0–100), Risk_Level (Critical/High/Medium/Low), Explanation_Summary,
Origin_Country, Declared_Value, Declared_Weight, Measured_Weight, Dwell_Time_Hours, HS_Code, Shipping_Line
