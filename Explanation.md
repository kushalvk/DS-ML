# Explanation

### Historical Data
- `Container_ID` → Unique ID assigned to each shipment container.
- `Declaration_Date` (YYYY-MM-DD) → Date when the shipment was declared to customs.
- `Declaration_Time` → Exact time of shipment declaration.
- `Trade_Regime` (Import / Export / Transit) → Type of shipment movement (incoming, outgoing, or passing through).
- `Origin_Country` → Country where the shipment originated.
- `Destination_Port` → Port where the shipment is received.
- `Destination_Country` → Country where the shipment is destined.
- `HS_Code` → Code used to classify the type of goods being shipped.
- `Importer_ID` → Unique ID of the importer receiving the goods.
- `Exporter_ID` → Unique ID of the exporter sending the goods.
- `Declared_Value` → Value of goods declared for customs purposes.
- `Declared_Weight` → Weight of goods as declared in documents.
- `Measured_Weight` → Actual weight recorded during inspection.
- `Shipping_Line` → Shipping company transporting the goods.
- `Dwell_Time_Hours` → Time (in hours) shipment stays at port before clearance.
- `Clearance_Status` → Current status of customs clearance (e.g., cleared, pending, held).

### Sample shipments
* `Container_ID` → Unique identifier for each shipment container.
* `Declaration_Date` (YYYY-MM-DD) → Date when the shipment was officially declared to customs.
* `Declaration_Time` → Time at which the shipment declaration was submitted.
* `Origin_Country` → Country from where the goods were shipped.
* `Destination_Port` → Port where the shipment is arriving or being delivered.
* `Destination_Country` → Country where the shipment is intended to go.
* `HS_Code` → Harmonized System code used to classify the type of goods.
* `Importer_ID` → Unique identifier of the importer receiving the goods.
* `Exporter_ID` → Unique identifier of the exporter sending the goods.
* `Declared_Value` → Monetary value of the goods as declared for customs.
* `Declared_Weight` → Weight of the shipment as declared by the exporter/importer.
* `Measured_Weight` → Actual weight of the shipment measured by authorities.
* `Dwell_Time_Hours` → Time (in hours) the shipment stays at the port before clearance.
* `Shipping_Line` → Company responsible for transporting the shipment.
* `Trade_Regime` (Import / Export / Transit) → Type of trade movement (incoming, outgoing, or passing through).
* `Clearance_Status` → Status indicating whether the shipment is cleared, pending, or held.
* `is_risky` → Flag indicating whether the shipment is considered high-risk (e.g., for inspection or fraud).

### Predictions
* `Container_ID` → Unique identifier for each shipment container.
* `Risk_Score` → Numerical probability (usually 0–1 or 0–100) indicating how likely the shipment is risky based on the model.
* `Risk_Level` → Categorized risk label (e.g., Low, Medium, High) derived from the risk score for easier interpretation.
* `Explanation_Summary` → Short explanation describing why the model marked the shipment as risky (e.g., weight mismatch, high value, unusual route).
* `Declared_Value` → Declared monetary value of the goods.
* `Declared_Weight` → Weight of goods as declared in documents.
* `Measured_Weight` → Actual weight recorded during inspection.
* `Dwell_Time_Hours` → Time the shipment stayed at the port before clearance.


### Code Explanation
- `28, anomaly detection model` → An anomaly detection model is a machine learning tool designed to identify rare, suspicious data points or patterns (outliers) that deviate significantly from established normal behavior.
- `31, Model evaluation metrics` → confusion_matrix provides a, counts of true/false positives and negatives, while classification_report offers detailed precision, recall, and F1-score per class. roc_auc_score measures how well the model separates classes across thresholds, with 1.0 being perfect.

### Functions
1. `encode` → encode the column using LabelEncoding
2. `score_to_level` → Convert score data into multiple level(Critical, High, Medium, Low)
3. `load_csv` → Load CSV and handle null value
4. `engineer_features` → identify the Weight & value, Time Features, categorical encoding, future encoding, Flags
5. `explain` → explain Risk indicate with reason
6. `train` → train model and store in model.joblib
7. `run_inference` → run model and generate an in prediction.csv
8. `__name__` == "__main__": → main entry point of program