"""
Customs Risk Assessment — Updated ML Pipeline
===============================================
Train on:  Historical_Data.csv  (54,000 rows, Jan–Sep 2020)
Score on:  Real-Time_Data.csv   (8,481 rows,  Apr–Jun 2021)

Label mapping
  Clear    → 0  (Low risk)
  Low Risk → 1  (Medium risk)
  Critical → 2  (High / Critical risk)

Key changes vs. synthetic pipeline
  - Real column names from actual dataset
  - 3-class classification (Clear / Low Risk / Critical)
  - Destination_Port added as a feature
  - Importer / Exporter frequency encoding
  - HS Code 2-digit prefix as a category
  - SMOTE-style class-weight balancing for imbalanced labels
  - Saves predictions.csv compatible with the React dashboard
"""

import pandas as pd
import numpy as np
import json, joblib, warnings # json → save summary, joblib → save/load trained model, warnings → suppress warnings

warnings.filterwarnings("ignore")

from sklearn.ensemble import GradientBoostingClassifier, IsolationForest # 1. main ML model (classification), 2. TODO: anomaly detection model
from sklearn.preprocessing import LabelEncoder # Converts text → numeric
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix # TODO: Model evaluation metrics

# ── Config ──────────────────────────────────────────────────────────────────

LABEL_MAP = {"Clear": 0, "Low Risk": 1, "Critical": 2} # Converts text labels → numeric classes
CLASS_WEIGHTS = {0: 1.0, 1: 3.0, 2: 30.0} # Gives more importance to Critical cases
SCORE_BAND = {"Critical": 75, "High": 50, "Medium": 25} # Converts score → risk level

# Short aliases → actual CSV column names
COL = {
    "date": "Declaration_Date (YYYY-MM-DD)", "time": "Declaration_Time",
    "regime": "Trade_Regime (Import / Export / Transit)",
    "origin": "Origin_Country", "dest_port": "Destination_Port",
    "dest_ctry": "Destination_Country", "hs": "HS_Code",
    "imp": "Importer_ID", "exp": "Exporter_ID",
    "value": "Declared_Value", "dec_w": "Declared_Weight",
    "meas_w": "Measured_Weight", "line": "Shipping_Line",
    "dwell": "Dwell_Time_Hours", "status": "Clearance_Status",
}

# List of features used for training
FEATURE_COLS = [
    "weight_diff_pct", "weight_diff_abs", "weight_ratio",
    "value_per_kg", "log_value", "log_weight", "log_dwell", "Dwell_Time_Hours",
    "day_of_week", "is_weekend", "month", "hour_of_day", "is_night",
    "hs_chapter_enc", "hs_freq", "line_enc", "dest_port_enc", "is_transit",
    "importer_freq", "exporter_freq",
    "flag_wt_mismatch", "flag_high_vpk", "flag_low_vpk",
    "flag_high_dwell", "flag_very_hi_dwell", "flag_night", "flag_weekend",
    "flag_zero_value", "flag_zero_weight",
]

# ── Helpers ──────────────────────────────────────────────────────────────────

# Converts categorical data → numbers
def encode(series):
    return LabelEncoder().fit_transform(series.astype(str).fillna("UNK"))

# Converts numeric score → label
def score_to_level(score):
    for level, threshold in SCORE_BAND.items():
        if score >= threshold:
            return level
    return "Low"


def load_csv(path):
    """Load CSV and convert numeric columns."""
    df = pd.read_csv(path) # Reads CSV file
    for c in [COL["value"], COL["dec_w"], COL["meas_w"], COL["dwell"]]:
        df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0) # Converts values to numbers and replaces missing with 0
    return df


# ── Feature Engineering ───────────────────────────────────────────────────────

def engineer_features(df, imp_freq=None, exp_freq=None, hs_freq=None):
    df = df.copy()
    for c in [COL["value"], COL["dec_w"], COL["meas_w"], COL["dwell"]]:
        df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0) # Converts values to numbers and replaces missing with 0

    dw = df[COL["dec_w"]].clip(lower=1e-9)
    mw = df[COL["meas_w"]]

    # Weight & value features
    df["weight_diff"] = mw - dw # Difference between actual and declared weight
    df["weight_diff_abs"] = df["weight_diff"].abs() # ----------------------------------------------------------------------
    df["weight_diff_pct"] = df["weight_diff"] / dw # % difference → very important fraud signal
    df["weight_ratio"] = mw / dw # Ratio between weights
    df["value_per_kg"] = df[COL["value"]] / dw # Detects over/under valuation
    # Log transformation → reduces skew
    df["log_value"] = np.log1p(df[COL["value"]])
    df["log_weight"] = np.log1p(dw)
    df["log_dwell"] = np.log1p(df[COL["dwell"]])

    # Time features
    dates = pd.to_datetime(df[COL["date"]], errors="coerce")
    df["day_of_week"] = dates.dt.dayofweek
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    df["month"] = dates.dt.month
    df["hour_of_day"] = df[COL["time"]].apply(lambda t: int(str(t).split(":")[0]) if pd.notna(t) else 12)
    df["is_night"] = ((df["hour_of_day"] < 6) | (df["hour_of_day"] >= 22)).astype(int) # Night shipment → suspicious sometimes

    # Categorical encodings
    df["hs_chapter"] = df[COL["hs"]].astype(str).str.zfill(6).str[:2]
    df["hs_chapter_enc"] = encode(df["hs_chapter"])
    df["line_enc"] = encode(df[COL["line"]])
    df["dest_port_enc"] = encode(df[COL["dest_port"]])
    df["is_transit"] = (df[COL["regime"]].str.lower() == "transit").astype(int)

    # Frequency encodings (fit on training data if not provided)
    imp_freq = imp_freq or df[COL["imp"]].value_counts().to_dict()
    exp_freq = exp_freq or df[COL["exp"]].value_counts().to_dict()
    hs_freq = hs_freq or df[COL["hs"]].value_counts().to_dict()
    df["importer_freq"] = df[COL["imp"]].map(imp_freq).fillna(0)
    df["exporter_freq"] = df[COL["exp"]].map(exp_freq).fillna(0)
    df["hs_freq"] = df[COL["hs"]].map(hs_freq).fillna(0)

    # Flags
    vpk, vpk_std = df["value_per_kg"].mean(), df["value_per_kg"].std() + 1e-9
    w_std = df["weight_diff_abs"].std() + 1e-9
    flags = {
        "flag_wt_mismatch": df["weight_diff_abs"] > 2 * w_std, # Big weight mismatch
        "flag_high_vpk": df["value_per_kg"] > vpk + 2 * vpk_std, # Very expensive goods
        "flag_low_vpk": (df["value_per_kg"] < vpk - 1.5 * vpk_std) & (df["value_per_kg"] > 0),
        "flag_high_dwell": df[COL["dwell"]] > 76,
        "flag_very_hi_dwell": df[COL["dwell"]] > 122,
        "flag_night": df["is_night"],
        "flag_weekend": df["is_weekend"],
        "flag_zero_value": df[COL["value"]] == 0, # Suspicious (value = 0)
        "flag_zero_weight": df[COL["dec_w"]] == 0,
    }
    df = df.assign(**{k: v.astype(int) for k, v in flags.items()})

    return df, imp_freq, exp_freq, hs_freq


# ── Explain ───────────────────────────────────────────────────────────────────

def explain(row, risk_level):
    wpct = getattr(row, "weight_diff_pct", 0)
    vpk = getattr(row, "value_per_kg", 0)
    dwell = getattr(row, "Dwell_Time_Hours", 0)

    checks = [
        (abs(wpct) > 0.10, f"weight is {abs(wpct) * 100:.0f}% {'higher' if wpct > 0 else 'lower'} than declared"),
        (getattr(row, "flag_high_vpk", 0), f"high value/kg (${vpk:,.0f}/kg)"),
        (getattr(row, "flag_low_vpk", 0), f"low value/kg (${vpk:.2f}/kg)"),
        (getattr(row, "flag_very_hi_dwell", 0), f"very high dwell ({dwell:.0f} hrs)"),
        (getattr(row, "flag_high_dwell", 0), f"above-average dwell ({dwell:.0f} hrs)"),
        (getattr(row, "flag_night", 0), "off-hours declaration"),
        (getattr(row, "flag_weekend", 0), "weekend declaration"),
        (getattr(row, "flag_zero_value", 0), "declared value is zero"),
        (getattr(row, "flag_zero_weight", 0), "declared weight is zero"),
        (getattr(row, "is_transit", 0), "transit shipment"),
    ]
    reasons = [msg for flag, msg in checks if flag]

    if risk_level in ("Critical", "High"):
        body = "; ".join(reasons[:3]) if reasons else "anomalous pattern detected by ML model"
        return f"Risk indicators: {body}."
    else:
        if reasons:
            return f"Minor flags ({'; '.join(reasons[:2])}); risk within acceptable range."
        return "All parameters normal. Standard clearance applicable."


# ── Train ─────────────────────────────────────────────────────────────────────

def train(hist_path, model_path="model.joblib"):
    print(f"\n--- Training on {hist_path} ---")
    df = load_csv(hist_path)
    print(f"Records: {len(df):,} | Labels: {df[COL['status']].value_counts().to_dict()}")

    y = df[COL["status"]].map(LABEL_MAP).fillna(0).astype(int) # Converts values to numbers and replaces missing with 0
    df_feat, imp_freq, exp_freq, hs_freq = engineer_features(df) # appley above function

    X = df_feat[[c for c in FEATURE_COLS if c in df_feat.columns]].fillna(0)
    sw = y.map(CLASS_WEIGHTS)

    # Train model
    X_tr, X_te, y_tr, y_te, sw_tr, _ = train_test_split(
        X, y, sw, test_size=0.2, random_state=42, stratify=y
    )

    # Main prediction model
    clf = GradientBoostingClassifier(
        n_estimators=300, max_depth=5, learning_rate=0.07,
        subsample=0.8, min_samples_leaf=10, random_state=42,
    )
    clf.fit(X_tr, y_tr, sample_weight=sw_tr)

    y_pred = clf.predict(X_te)
    y_proba = clf.predict_proba(X_te)
    print(classification_report(y_te, y_pred, target_names=["Clear", "Low Risk", "Critical"])) # Shows accuracy, precision, recall

    try:
        auc = roc_auc_score(y_te, y_proba, multi_class="ovr", average="macro") # Measures model quality
        print(f"Macro ROC-AUC: {auc:.4f}")
    except Exception as e:
        print(f"AUC skipped: {e}")
        auc = None

    iso = IsolationForest(n_estimators=150, contamination=0.12, random_state=42) # Detects unusual shipments
    iso.fit(X_tr)

    # Saves model to file
    joblib.dump({
        "clf": clf, "iso": iso, "feat_cols": list(X.columns),
        "imp_freq": imp_freq, "exp_freq": exp_freq, "hs_freq": hs_freq,
    }, model_path)
    print(f"Model saved → {model_path}")


# ── Inference ─────────────────────────────────────────────────────────────────

def run_inference(rt_path, model_path="model.joblib", output_path="predictions.csv"):
    print(f"\n--- Inference on {rt_path} ---")
    art = joblib.load(model_path) # Load Model
    clf, iso, feat = art["clf"], art["iso"], art["feat_cols"]

    df = load_csv(rt_path)
    df_feat, _, _, _ = engineer_features(df, art["imp_freq"], art["exp_freq"], art["hs_freq"])
    X = df_feat[[c for c in feat if c in df_feat.columns]].fillna(0)

    proba = clf.predict_proba(X) # Predict Probability
    clf_score = proba[:, 1] * 0.5 + proba[:, 2] # Risk Score Calculation
    raw_iso = iso.score_samples(X)
    anom_score = 1 - (raw_iso - raw_iso.min()) / (raw_iso.max() - raw_iso.min() + 1e-9)
    final_score = np.clip(0.75 * clf_score + 0.25 * anom_score, 0, 1) * 100 # Final risk score (0–100)

    risk_levels = [score_to_level(s) for s in final_score] # Risk Level
    explanations = [explain(r, lv) for r, lv in zip(df_feat.itertuples(), risk_levels)] # Explanation

    out = pd.DataFrame({
        "Container_ID": df["Container_ID"],
        "Risk_Score": final_score.round(1),
        "Risk_Level": risk_levels,
        "Explanation_Summary": explanations,
        "Origin_Country": df[COL["origin"]].values,
        "Destination_Port": df[COL["dest_port"]].values,
        "Destination_Country": df[COL["dest_ctry"]].values,
        "HS_Code": df[COL["hs"]].values,
        "Shipping_Line": df[COL["line"]].values,
        "Declared_Value": df[COL["value"]].values,
        "Declared_Weight": df[COL["dec_w"]].values,
        "Measured_Weight": df[COL["meas_w"]].values,
        "Dwell_Time_Hours": df[COL["dwell"]].values,
        "Declaration_Date": df[COL["date"]].values,
        "Actual_Status": df[COL["status"]].values,
    }).sort_values("Risk_Score", ascending=False).reset_index(drop=True)

    out.to_csv(output_path, index=False) # out csv to specific path

    lc = out["Risk_Level"].value_counts()
    summary = {
        "total": int(len(out)),
        "critical": int(lc.get("Critical", 0)),
        "high": int(lc.get("High", 0)),
        "medium": int(lc.get("Medium", 0)),
        "low": int(lc.get("Low", 0)),
        "avg_score": float(round(out["Risk_Score"].mean(), 1)),
    }
    print(summary)
    json.dump(summary, open("summary.json", "w"), indent=2)

    actual_crit = out[out["Actual_Status"] == "Critical"]
    flagged = out[out["Risk_Level"].isin(["Critical", "High"])]
    captured = actual_crit[actual_crit["Risk_Level"].isin(["Critical", "High"])]
    print(
        f"Recall on Critical: {len(captured)}/{len(actual_crit)} ({len(captured) / max(len(actual_crit), 1) * 100:.1f}%)")

    return out


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys, os

    hist_path = sys.argv[1] if len(sys.argv) > 1 else "Historical_Data.csv"
    rt_path = sys.argv[2] if len(sys.argv) > 2 else "Real-Time_Data.csv"

    for p in [hist_path, rt_path]:
        if not os.path.exists(p):
            print(f"ERROR: {p} not found")
            sys.exit(1)

    # Full pipeline runs automatically
    if os.path.exists("model.joblib"):
        print("Model found → Skipping training")
    else:
        print("Training model...")
        train(hist_path)

    results = run_inference(rt_path)
    print(results[["Container_ID", "Risk_Score", "Risk_Level", "Origin_Country", "Explanation_Summary"]].head(
        10).to_string(index=False))
