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
import json, joblib, warnings
warnings.filterwarnings("ignore")

from sklearn.ensemble import GradientBoostingClassifier, IsolationForest
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix

LABEL_MAP     = {"Clear": 0, "Low Risk": 1, "Critical": 2}
LABEL_REVERSE = {0: "Low", 1: "Medium", 2: "Critical"}
CLASS_WEIGHTS = {0: 1.0, 1: 3.0, 2: 30.0}  # compensate for 78/21/1 imbalance

SCORE_BAND = {     # map 0-100 score → Risk_Level string for dashboard
    "Critical": 75,
    "High":     50,
    "Medium":   25,
}

COL = {
    "date":    "Declaration_Date (YYYY-MM-DD)",
    "time":    "Declaration_Time",
    "regime":  "Trade_Regime (Import / Export / Transit)",
    "origin":  "Origin_Country",
    "dest_port":"Destination_Port",
    "dest_ctry":"Destination_Country",
    "hs":      "HS_Code",
    "imp":     "Importer_ID",
    "exp":     "Exporter_ID",
    "value":   "Declared_Value",
    "dec_w":   "Declared_Weight",
    "meas_w":  "Measured_Weight",
    "line":    "Shipping_Line",
    "dwell":   "Dwell_Time_Hours",
    "status":  "Clearance_Status",
}

def engineer_features(df: pd.DataFrame,
                       imp_freq: dict = None,
                       exp_freq: dict = None,
                       hs_freq:  dict = None) -> pd.DataFrame:
    """
    Build feature matrix from raw shipment DataFrame.
    imp_freq / exp_freq / hs_freq:  frequency maps fitted on training data.
    If None, they are derived from df itself (fit+transform on train split).
    """
    df = df.copy()

    for c in [COL["value"], COL["dec_w"], COL["meas_w"], COL["dwell"]]:
        df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0)

    dw = df[COL["dec_w"]].clip(lower=1e-9)
    mw = df[COL["meas_w"]]

    df["weight_diff"]     = mw - dw
    df["weight_diff_abs"] = df["weight_diff"].abs()
    df["weight_diff_pct"] = df["weight_diff"] / dw # signed ratio
    df["weight_ratio"]    = mw / dw    # raw ratio
    df["value_per_kg"]    = df[COL["value"]] / dw
    df["log_value"]       = np.log1p(df[COL["value"]])
    df["log_weight"]      = np.log1p(dw)
    df["log_dwell"]       = np.log1p(df[COL["dwell"]])
    df["_date"] = pd.to_datetime(df[COL["date"]], errors="coerce")
    df["day_of_week"]  = df["_date"].dt.dayofweek
    df["is_weekend"]   = (df["day_of_week"] >= 5).astype(int)
    df["month"]        = df["_date"].dt.month

    def _hour(t):
        try: return int(str(t).split(":")[0])
        except: return 12
    df["hour_of_day"]  = df[COL["time"]].apply(_hour)
    df["is_night"]     = ((df["hour_of_day"] < 6) | (df["hour_of_day"] >= 22)).astype(int)
    df["hs_str"]        = df[COL["hs"]].astype(str).str.zfill(6)
    df["hs_chapter"]    = df["hs_str"].str[:2].astype(str)   # first 2 digits
    le_hs = LabelEncoder()
    df["hs_chapter_enc"] = le_hs.fit_transform(df["hs_chapter"])

    if hs_freq is None:
        hs_freq = df[COL["hs"]].value_counts().to_dict()
    df["hs_freq"] = df[COL["hs"]].map(hs_freq).fillna(0)

    le_line = LabelEncoder()
    df["line_enc"] = le_line.fit_transform(df[COL["line"]].astype(str).fillna("UNK"))

    le_port = LabelEncoder()
    df["dest_port_enc"] = le_port.fit_transform(df[COL["dest_port"]].astype(str).fillna("UNK"))
    df["is_transit"] = (df[COL["regime"]].str.lower() == "transit").astype(int)

    if imp_freq is None:
        imp_freq = df[COL["imp"]].value_counts().to_dict()
    if exp_freq is None:
        exp_freq = df[COL["exp"]].value_counts().to_dict()

    df["importer_freq"] = df[COL["imp"]].map(imp_freq).fillna(0)
    df["exporter_freq"] = df[COL["exp"]].map(exp_freq).fillna(0)

    w_std  = df["weight_diff_abs"].std() + 1e-9
    vpk_m  = df["value_per_kg"].mean()
    vpk_s  = df["value_per_kg"].std() + 1e-9

    df["flag_wt_mismatch"]   = (df["weight_diff_abs"] > 2 * w_std).astype(int)
    df["flag_high_vpk"]      = (df["value_per_kg"]   > vpk_m + 2 * vpk_s).astype(int)
    df["flag_low_vpk"]       = ((df["value_per_kg"]  < vpk_m - 1.5 * vpk_s) & (df["value_per_kg"] > 0)).astype(int)
    df["flag_high_dwell"]    = (df[COL["dwell"]] > 76).astype(int)   # >76h = above Clear max
    df["flag_very_hi_dwell"] = (df[COL["dwell"]] > 122).astype(int)  # above Low Risk max
    df["flag_night"]         = df["is_night"]
    df["flag_weekend"]       = df["is_weekend"]
    df["flag_zero_value"]    = (df[COL["value"]] == 0).astype(int)
    df["flag_zero_weight"]   = (df[COL["dec_w"]] == 0).astype(int)

    return df, imp_freq, exp_freq, hs_freq


FEATURE_COLS = [
    "weight_diff_pct", "weight_diff_abs", "weight_ratio",
    "value_per_kg", "log_value", "log_weight",
    "log_dwell", "Dwell_Time_Hours",
    "day_of_week", "is_weekend", "month",
    "hour_of_day", "is_night",
    "hs_chapter_enc", "hs_freq",
    "line_enc", "dest_port_enc", "is_transit",
    "importer_freq", "exporter_freq",
    "flag_wt_mismatch", "flag_high_vpk", "flag_low_vpk",
    "flag_high_dwell", "flag_very_hi_dwell",
    "flag_night", "flag_weekend",
    "flag_zero_value", "flag_zero_weight",
]

def train(historical_path: str, model_path: str = "model.joblib"):
    print("=" * 60)
    print("TRAINING  —  Historical_Data.csv")
    print("=" * 60)

    df = pd.read_csv(historical_path)
    print(f"Loaded {len(df):,} records")
    print("Label distribution:\n", df[COL["status"]].value_counts().to_dict())

    y = df[COL["status"]].map(LABEL_MAP).fillna(0).astype(int)

    df_feat, imp_freq, exp_freq, hs_freq = engineer_features(df)
    available = [c for c in FEATURE_COLS if c in df_feat.columns]
    X = df_feat[available].fillna(0)

    sample_weights = y.map(CLASS_WEIGHTS)

    X_train, X_test, y_train, y_test, sw_train, sw_test = train_test_split(
        X, y, sample_weights, test_size=0.2, random_state=42, stratify=y
    )

    clf = GradientBoostingClassifier(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.07,
        subsample=0.8,
        min_samples_leaf=10,
        random_state=42,
    )
    clf.fit(X_train, y_train, sample_weight=sw_train)

    y_pred  = clf.predict(X_test)
    y_proba = clf.predict_proba(X_test)

    print("\n── Classification Report ──")
    print(classification_report(y_test, y_pred, target_names=["Clear", "Low Risk", "Critical"]))

    try:
        auc = roc_auc_score(y_test, y_proba, multi_class="ovr", average="macro")
        print(f"Macro ROC-AUC (OvR): {auc:.4f}")
    except Exception as e:
        print(f"AUC not computed: {e}")

    print("\n── Confusion Matrix ──")
    print(confusion_matrix(y_test, y_pred))

    fi = sorted(zip(available, clf.feature_importances_), key=lambda x: x[1], reverse=True)
    print("\n── Top 10 Features ──")
    for feat, imp in fi[:10]:
        print(f"  {feat:<30} {imp:.4f}")

    iso = IsolationForest(n_estimators=150, contamination=0.12, random_state=42)
    iso.fit(X_train)

    artifact = {
        "clf":        clf,
        "iso":        iso,
        "feat_cols":  available,
        "imp_freq":   imp_freq,
        "exp_freq":   exp_freq,
        "hs_freq":    hs_freq,
        "auc":        auc if "auc" in dir() else None,
        "top_features": fi[:10],
    }
    joblib.dump(artifact, model_path)
    print(f"\nModel saved → {model_path}")
    return artifact

def explain(row: pd.Series, risk_level: str) -> str:
    reasons = []

    wpct = row.get("weight_diff_pct", 0)
    if abs(wpct) > 0.10:
        direction = "higher" if wpct > 0 else "lower"
        reasons.append(f"measured weight is {abs(wpct)*100:.0f}% {direction} than declared")

    vpk = row.get("value_per_kg", 0)
    if row.get("flag_high_vpk", 0):
        reasons.append(f"unusually high value-per-kg (${vpk:,.0f}/kg)")
    elif row.get("flag_low_vpk", 0):
        reasons.append(f"suspiciously low value-per-kg (${vpk:.2f}/kg)")

    dwell = row.get("Dwell_Time_Hours", 0)
    if row.get("flag_very_hi_dwell", 0):
        reasons.append(f"very high dwell time ({dwell:.0f} hrs)")
    elif row.get("flag_high_dwell", 0):
        reasons.append(f"above-average dwell time ({dwell:.0f} hrs)")

    if row.get("flag_night", 0):
        reasons.append("declared during off-hours")
    if row.get("flag_weekend", 0):
        reasons.append("weekend declaration")
    if row.get("flag_zero_value", 0):
        reasons.append("declared value is zero")
    if row.get("flag_zero_weight", 0):
        reasons.append("declared weight is zero")
    if row.get("is_transit", 0):
        reasons.append("transit shipment")

    if risk_level in ("Critical", "High"):
        if not reasons:
            reasons.append("anomalous pattern detected by ML model")
        return "Risk indicators: " + "; ".join(reasons[:3]) + "."
    else:
        if reasons:
            return f"Minor flags ({'; '.join(reasons[:2])}); overall risk within acceptable range."
        return "All shipment parameters within normal ranges. Standard clearance applicable."

def score_to_level(score: float) -> str:
    if score >= SCORE_BAND["Critical"]: return "Critical"
    if score >= SCORE_BAND["High"]:     return "High"
    if score >= SCORE_BAND["Medium"]:   return "Medium"
    return "Low"


def run_inference(realtime_path: str,
                  model_path: str = "model.joblib",
                  output_path: str = "predictions.csv") -> pd.DataFrame:
    print("\n" + "=" * 60)
    print("INFERENCE  —  Real-Time_Data.csv")
    print("=" * 60)

    art  = joblib.load(model_path)
    clf  = art["clf"]
    iso  = art["iso"]
    feat = art["feat_cols"]

    df = pd.read_csv(realtime_path)
    print(f"Loaded {len(df):,} real-time records")

    df_feat, _, _, _ = engineer_features(
        df,
        imp_freq=art["imp_freq"],
        exp_freq=art["exp_freq"],
        hs_freq =art["hs_freq"],
    )
    available = [c for c in feat if c in df_feat.columns]
    X = df_feat[available].fillna(0)

    proba     = clf.predict_proba(X) # shape (n, 3) → [Clear, LowRisk, Critical]
    clf_score = proba[:, 1] * 0.5 + proba[:, 2] # weighted towards critical

    raw_iso   = iso.score_samples(X)
    anom_score = 1 - (raw_iso - raw_iso.min()) / (raw_iso.max() - raw_iso.min() + 1e-9)

    final_score = np.clip(0.75 * clf_score + 0.25 * anom_score, 0, 1) * 100

    out = pd.DataFrame()
    out["Container_ID"]       = df["Container_ID"]
    out["Risk_Score"]         = final_score.round(1)
    out["Risk_Level"]         = [score_to_level(s) for s in final_score]

    explanations = []
    for i in range(len(df_feat)):
        row   = df_feat.iloc[i]
        level = out["Risk_Level"].iloc[i]
        explanations.append(explain(row, level))
    out["Explanation_Summary"] = explanations

    out["Origin_Country"]    = df[COL["origin"]].values
    out["Destination_Port"]  = df[COL["dest_port"]].values
    out["Destination_Country"] = df[COL["dest_ctry"]].values
    out["HS_Code"]           = df[COL["hs"]].values
    out["Shipping_Line"]     = df[COL["line"]].values
    out["Declared_Value"]    = df[COL["value"]].values
    out["Declared_Weight"]   = df[COL["dec_w"]].values
    out["Measured_Weight"]   = df[COL["meas_w"]].values
    out["Dwell_Time_Hours"]  = df[COL["dwell"]].values
    out["Declaration_Date"]  = df[COL["date"]].values
    out["Actual_Status"]     = df[COL["status"]].values

    out = out.sort_values("Risk_Score", ascending=False).reset_index(drop=True)
    out.to_csv(output_path, index=False)
    print(f"Predictions saved → {output_path}")

    lc = out["Risk_Level"].value_counts().to_dict()
    summary = {
        "total":    len(out),
        "critical": lc.get("Critical", 0),
        "high":     lc.get("High", 0),
        "medium":   lc.get("Medium", 0),
        "low":      lc.get("Low", 0),
        "avg_score": round(out["Risk_Score"].mean(), 1),
    }
    print("\n── Score Summary ──")
    for k, v in summary.items():
        print(f"  {k:<15} {v}")

    actual_critical = out[out["Actual_Status"] == "Critical"]
    our_flagged     = out[out["Risk_Level"].isin(["Critical", "High"])]
    captured        = actual_critical[actual_critical["Risk_Level"].isin(["Critical","High"])]
    print(f"\n── Recall on actual Critical containers ──")
    print(f"  Actual Critical    : {len(actual_critical)}")
    print(f"  Our Critical+High  : {len(our_flagged)}")
    print(f"  Correctly flagged  : {len(captured)}  ({len(captured)/max(len(actual_critical),1)*100:.1f}% recall)")

    with open("summary.json", "w") as f:
        json.dump(summary, f, indent=2)

    return out

if __name__ == "__main__":
    import sys, os

    hist_path = sys.argv[1] if len(sys.argv) > 1 else "Historical_Data.csv"
    rt_path   = sys.argv[2] if len(sys.argv) > 2 else "Real-Time_Data.csv"

    if not os.path.exists(hist_path):
        print(f"ERROR: {hist_path} not found"); sys.exit(1)
    if not os.path.exists(rt_path):
        print(f"ERROR: {rt_path} not found"); sys.exit(1)

    train(hist_path, model_path="model.joblib")
    results = run_inference(rt_path, model_path="model.joblib", output_path="predictions.csv")

    print("\nTop 10 highest-risk containers:")
    print(results[["Container_ID","Risk_Score","Risk_Level","Origin_Country","Dwell_Time_Hours","Explanation_Summary"]].head(10).to_string(index=False))
