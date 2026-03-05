"""
Customs Risk Assessment ML Pipeline
====================================
Handles: preprocessing, feature engineering, model training,
         anomaly detection, explainability, inference.
"""

import pandas as pd
import numpy as np
import json
import joblib
import warnings
warnings.filterwarnings('ignore')

from sklearn.ensemble import RandomForestClassifier, IsolationForest, GradientBoostingClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.pipeline import Pipeline


# ─────────────────────────── Constants ───────────────────────────

HIGH_RISK_COUNTRIES = {'KP', 'IR', 'SY', 'LY', 'YE', 'VE', 'MM', 'CU', 'BY'}
MED_RISK_COUNTRIES  = {'NG', 'PK', 'AF', 'SD', 'IQ', 'SO', 'ML', 'CD', 'CF', 'SS'}

SCORE_THRESHOLDS = {
    'critical': 0.75,
    'high':     0.50,
    'medium':   0.25,
}

# ─────────────────────────── Feature Engineering ─────────────────

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # ── Numeric derived features ──
    df['Declared_Weight'] = pd.to_numeric(df['Declared_Weight'], errors='coerce').fillna(1)
    df['Measured_Weight'] = pd.to_numeric(df['Measured_Weight'], errors='coerce').fillna(df['Declared_Weight'])
    df['Declared_Value']  = pd.to_numeric(df['Declared_Value'],  errors='coerce').fillna(0)
    df['Dwell_Time_Hours']= pd.to_numeric(df['Dwell_Time_Hours'],errors='coerce').fillna(24)

    df['weight_diff']       = df['Measured_Weight'] - df['Declared_Weight']
    df['weight_diff_pct']   = df['weight_diff'] / (df['Declared_Weight'] + 1e-9)
    df['abs_weight_diff']   = df['weight_diff'].abs()
    df['value_per_kg']      = df['Declared_Value'] / (df['Declared_Weight'] + 1e-9)
    df['log_value']         = np.log1p(df['Declared_Value'])
    df['log_weight']        = np.log1p(df['Declared_Weight'])
    df['dwell_log']         = np.log1p(df['Dwell_Time_Hours'])

    # ── Country risk encoding ──
    def country_risk(c):
        if c in HIGH_RISK_COUNTRIES: return 2
        if c in MED_RISK_COUNTRIES:  return 1
        return 0

    df['origin_risk']      = df['Origin_Country'].apply(country_risk)
    df['dest_risk']        = df['Destination_Country'].apply(country_risk)
    df['route_risk']       = df['origin_risk'] + df['dest_risk']

    # ── Time features ──
    if 'Declaration_Date' in df.columns:
        df['Declaration_Date'] = pd.to_datetime(df['Declaration_Date'], errors='coerce')
        df['day_of_week']   = df['Declaration_Date'].dt.dayofweek
        df['is_weekend']    = (df['day_of_week'] >= 5).astype(int)
    else:
        df['day_of_week'] = 0
        df['is_weekend']  = 0

    if 'Declaration_Time' in df.columns:
        def parse_hour(t):
            try:
                return int(str(t).split(':')[0])
            except:
                return 12
        df['hour_of_day']   = df['Declaration_Time'].apply(parse_hour)
        df['is_night']      = ((df['hour_of_day'] < 6) | (df['hour_of_day'] >= 22)).astype(int)
    else:
        df['hour_of_day'] = 12
        df['is_night']    = 0

    # ── Categorical encoding ──
    for col in ['Trade_Regime', 'Shipping_Line', 'Origin_Country', 'Destination_Country', 'HS_Code']:
        if col in df.columns:
            le = LabelEncoder()
            df[f'{col}_enc'] = le.fit_transform(df[col].astype(str).fillna('UNKNOWN'))

    # ── Binary flags ──
    w_std  = df['abs_weight_diff'].std() + 1e-9
    v_mean = df['value_per_kg'].mean()
    v_std  = df['value_per_kg'].std() + 1e-9

    df['flag_weight_mismatch']  = (df['abs_weight_diff'] > 2 * w_std).astype(int)
    df['flag_high_value_per_kg']= (df['value_per_kg'] > v_mean + 2 * v_std).astype(int)
    df['flag_low_value_per_kg'] = ((df['value_per_kg'] < v_mean - 1.5 * v_std) & (df['value_per_kg'] > 0)).astype(int)
    df['flag_night_declaration']= df['is_night']
    df['flag_weekend']          = df['is_weekend']
    df['flag_high_dwell']       = (df['Dwell_Time_Hours'] > 72).astype(int)
    df['flag_low_dwell']        = (df['Dwell_Time_Hours'] < 2).astype(int)
    df['flag_high_risk_origin'] = (df['origin_risk'] == 2).astype(int)

    return df


FEATURE_COLS = [
    'weight_diff_pct', 'abs_weight_diff', 'value_per_kg', 'log_value',
    'log_weight', 'dwell_log', 'Dwell_Time_Hours',
    'origin_risk', 'dest_risk', 'route_risk',
    'day_of_week', 'is_weekend', 'hour_of_day', 'is_night',
    'Trade_Regime_enc', 'Shipping_Line_enc',
    'Origin_Country_enc', 'Destination_Country_enc', 'HS_Code_enc',
    'flag_weight_mismatch', 'flag_high_value_per_kg', 'flag_low_value_per_kg',
    'flag_night_declaration', 'flag_weekend',
    'flag_high_dwell', 'flag_low_dwell', 'flag_high_risk_origin',
]


# ─────────────────────────── Model Training ──────────────────────

def prepare_labels(df: pd.DataFrame) -> pd.Series:
    """Derive risk label from available columns."""
    if 'is_risky' in df.columns:
        return df['is_risky'].astype(int)
    if 'Clearance_Status' in df.columns:
        risky_statuses = {'Flagged', 'Seized', 'Under Review', 'Rejected'}
        return df['Clearance_Status'].isin(risky_statuses).astype(int)
    # Heuristic fallback
    df2 = engineer_features(df)
    label = (
        (df2['flag_weight_mismatch'] == 1) |
        (df2['flag_high_risk_origin'] == 1) |
        (df2['flag_high_value_per_kg'] == 1)
    ).astype(int)
    return label


def train_model(df: pd.DataFrame, save_path='./model.joblib'):
    print("=== Training Customs Risk Model ===")
    df_feat = engineer_features(df)
    y = prepare_labels(df)

    available_cols = [c for c in FEATURE_COLS if c in df_feat.columns]
    X = df_feat[available_cols].fillna(0)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    clf = GradientBoostingClassifier(
        n_estimators=200, max_depth=4, learning_rate=0.08,
        subsample=0.8, random_state=42
    )
    clf.fit(X_train, y_train)

    y_pred  = clf.predict(X_test)
    y_proba = clf.predict_proba(X_test)[:, 1]
    auc     = roc_auc_score(y_test, y_proba)
    print(f"ROC-AUC: {auc:.4f}")
    print(classification_report(y_test, y_pred))

    # Anomaly detector
    iso = IsolationForest(n_estimators=100, contamination=0.15, random_state=42)
    iso.fit(X_train)

    # Feature importances
    importances = dict(zip(available_cols, clf.feature_importances_))
    top_features = sorted(importances.items(), key=lambda x: x[1], reverse=True)[:10]
    print("\nTop features:", top_features)

    artifact = {
        'clf': clf,
        'iso': iso,
        'feature_cols': available_cols,
        'auc': auc,
        'top_features': top_features,
    }
    joblib.dump(artifact, save_path)
    print(f"Model saved → {save_path}")
    return artifact


# ─────────────────────────── Explanation Generator ───────────────

def generate_explanation(row: pd.Series, risk_level: str) -> str:
    reasons = []

    # Weight mismatch
    if abs(row.get('weight_diff_pct', 0)) > 0.15:
        direction = 'higher' if row.get('weight_diff', 0) > 0 else 'lower'
        pct = abs(row.get('weight_diff_pct', 0)) * 100
        reasons.append(f"measured weight is {pct:.0f}% {direction} than declared")

    # Value per kg
    vpk = row.get('value_per_kg', 0)
    if row.get('flag_high_value_per_kg', 0):
        reasons.append(f"unusually high value-per-kg (${vpk:,.0f}/kg)")
    elif row.get('flag_low_value_per_kg', 0):
        reasons.append(f"suspiciously low value-per-kg (${vpk:,.2f}/kg)")

    # Origin risk
    origin_risk = row.get('origin_risk', 0)
    if origin_risk == 2:
        reasons.append("high-risk origin country")
    elif origin_risk == 1:
        reasons.append("medium-risk origin country")

    # Dwell time
    if row.get('flag_high_dwell', 0):
        reasons.append(f"excessive dwell time ({row.get('Dwell_Time_Hours', 0):.0f} hrs)")
    elif row.get('flag_low_dwell', 0):
        reasons.append("unusually short dwell time")

    # Night / weekend
    if row.get('flag_night_declaration', 0):
        reasons.append("declared during off-hours")
    if row.get('flag_weekend', 0):
        reasons.append("weekend submission")

    if risk_level in ('Critical', 'High'):
        if not reasons:
            reasons.append("anomalous shipment pattern detected by ML model")
        return f"Risk indicators: {'; '.join(reasons[:3])}."
    else:
        if reasons:
            return f"Minor flags noted ({'; '.join(reasons[:2])}), but overall low risk profile."
        return "All shipment parameters within normal ranges. Standard clearance applicable."


# ─────────────────────────── Inference ───────────────────────────

def score_to_level(score: float) -> str:
    if score >= SCORE_THRESHOLDS['critical']: return 'Critical'
    if score >= SCORE_THRESHOLDS['high']:     return 'High'
    if score >= SCORE_THRESHOLDS['medium']:   return 'Medium'
    return 'Low'


def run_inference(df: pd.DataFrame, model_path='./model.joblib') -> pd.DataFrame:
    artifact = joblib.load(model_path)
    clf      = artifact['clf']
    iso      = artifact['iso']
    feat_cols= artifact['feature_cols']

    df_feat = engineer_features(df)
    available = [c for c in feat_cols if c in df_feat.columns]
    X = df_feat[available].fillna(0)

    # Classifier probability
    clf_prob = clf.predict_proba(X)[:, 1]

    # Anomaly score → 0-1 (higher = more anomalous)
    raw_scores  = iso.score_samples(X)          # more negative = more anomalous
    anom_scores = 1 - (raw_scores - raw_scores.min()) / (raw_scores.max() - raw_scores.min() + 1e-9)

    # Combine
    final_score = np.clip(0.70 * clf_prob + 0.30 * anom_scores, 0, 1)

    results = df[['Container_ID']].copy() if 'Container_ID' in df.columns else pd.DataFrame({'Container_ID': range(len(df))})
    results['Risk_Score']  = (final_score * 100).round(1)
    results['Risk_Level']  = [score_to_level(s) for s in final_score]

    # Explanations
    expl = []
    for idx in range(len(df_feat)):
        row   = df_feat.iloc[idx]
        level = results['Risk_Level'].iloc[idx]
        expl.append(generate_explanation(row, level))
    results['Explanation_Summary'] = expl

    # Extra detail columns for dashboard
    results['Origin_Country']   = df['Origin_Country'].values if 'Origin_Country' in df.columns else 'N/A'
    results['Declared_Value']   = df['Declared_Value'].values if 'Declared_Value' in df.columns else 0
    results['Declared_Weight']  = df['Declared_Weight'].values if 'Declared_Weight' in df.columns else 0
    results['Measured_Weight']  = df['Measured_Weight'].values if 'Measured_Weight' in df.columns else 0
    results['Dwell_Time_Hours'] = df['Dwell_Time_Hours'].values if 'Dwell_Time_Hours' in df.columns else 0
    results['HS_Code']          = df['HS_Code'].values if 'HS_Code' in df.columns else 'N/A'
    results['Shipping_Line']    = df['Shipping_Line'].values if 'Shipping_Line' in df.columns else 'N/A'

    return results.sort_values('Risk_Score', ascending=False).reset_index(drop=True)


# ─────────────────────────── Summary Stats ───────────────────────

def generate_summary(results: pd.DataFrame) -> dict:
    level_counts = results['Risk_Level'].value_counts().to_dict()
    return {
        'total':         len(results),
        'critical':      level_counts.get('Critical', 0),
        'high':          level_counts.get('High', 0),
        'medium':        level_counts.get('Medium', 0),
        'low':           level_counts.get('Low', 0),
        'avg_score':     round(results['Risk_Score'].mean(), 1),
        'top_origins':   results[results['Risk_Level'].isin(['Critical','High'])]['Origin_Country'].value_counts().head(5).to_dict(),
    }


# ─────────────────────────── Main ────────────────────────────────

if __name__ == '__main__':
    print("Loading dataset...")
    df = pd.read_csv('./sample_shipments.csv')
    print(f"Loaded {len(df)} records")

    artifact = train_model(df)

    print("\nRunning inference...")
    results = run_inference(df)

    output_path = './predictions.csv'
    results.to_csv(output_path, index=False)
    print(f"\nPredictions saved → {output_path}")
    print(results[['Container_ID', 'Risk_Score', 'Risk_Level', 'Explanation_Summary']].head(10).to_string())

    summary = generate_summary(results)
    print("\nSummary:", json.dumps(summary, indent=2))
    with open('./summary.json', 'w') as f:
        json.dump(summary, f, indent=2)
