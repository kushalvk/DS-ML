import pandas as pd
import numpy as np
import json

np.random.seed(42)
n = 500

HIGH_RISK_COUNTRIES = ['KP', 'IR', 'SY', 'LY', 'YE', 'VE', 'MM']
MED_RISK_COUNTRIES = ['NG', 'PK', 'AF', 'SD', 'IQ', 'SO']
LOW_RISK_COUNTRIES = ['US', 'DE', 'JP', 'GB', 'FR', 'CA', 'AU', 'SG', 'NL', 'CH']
ALL_COUNTRIES = HIGH_RISK_COUNTRIES + MED_RISK_COUNTRIES + LOW_RISK_COUNTRIES

SHIPPING_LINES = ['MAERSK', 'MSC', 'CMA CGM', 'COSCO', 'EVERGREEN', 'HAPAG', 'ONE', 'YML', 'HMM', 'PIL']
HS_CODES = ['8471', '8517', '2710', '7108', '6110', '8703', '3004', '9013', '2933', '8542']

def make_container():
    is_risky = np.random.random() < 0.22
    
    if is_risky:
        origin = np.random.choice(HIGH_RISK_COUNTRIES + MED_RISK_COUNTRIES, p=[0.6/len(HIGH_RISK_COUNTRIES)]*len(HIGH_RISK_COUNTRIES) + [0.4/len(MED_RISK_COUNTRIES)]*len(MED_RISK_COUNTRIES))
        declared_weight = np.random.uniform(500, 15000)
        weight_offset = np.random.choice([-1, 1]) * np.random.uniform(500, 5000)
        measured_weight = max(100, declared_weight + weight_offset)
        declared_value = np.random.choice([
            np.random.uniform(100000, 2000000),
            np.random.uniform(100, 2000)
        ])
        dwell_time = np.random.choice([
            np.random.uniform(0.1, 1.5),
            np.random.uniform(72, 200)
        ])
        clearance_status = np.random.choice(['Flagged', 'Seized', 'Under Review'], p=[0.5, 0.3, 0.2])
        hour = np.random.choice(list(range(0, 5)) + list(range(22, 24)), p=[1/7]*7)
    else:
        origin = np.random.choice(LOW_RISK_COUNTRIES + MED_RISK_COUNTRIES)
        declared_weight = np.random.uniform(1000, 20000)
        weight_offset = np.random.normal(0, declared_weight * 0.03)
        measured_weight = max(100, declared_weight + weight_offset)
        declared_value = np.random.uniform(5000, 200000)
        dwell_time = np.random.uniform(4, 48)
        clearance_status = np.random.choice(['Cleared', 'Pending'], p=[0.85, 0.15])
        hour = np.random.randint(6, 20)

    destination = np.random.choice(LOW_RISK_COUNTRIES)
    
    return {
        'Container_ID': f'CONT{np.random.randint(100000, 999999)}',
        'Declaration_Date': pd.Timestamp('2024-01-01') + pd.Timedelta(days=np.random.randint(0, 365)),
        'Declaration_Time': f'{hour:02d}:{np.random.randint(0,59):02d}',
        'Origin_Country': origin,
        'Destination_Country': destination,
        'HS_Code': np.random.choice(HS_CODES),
        'Importer_ID': f'IMP{np.random.randint(1000, 9999)}',
        'Exporter_ID': f'EXP{np.random.randint(1000, 9999)}',
        'Declared_Value': round(declared_value, 2),
        'Declared_Weight': round(declared_weight, 2),
        'Measured_Weight': round(measured_weight, 2),
        'Dwell_Time_Hours': round(dwell_time, 2),
        'Shipping_Line': np.random.choice(SHIPPING_LINES),
        'Trade_Regime': np.random.choice(['IMPORT', 'TRANSIT', 'RE-EXPORT', 'TEMP_IMPORT'], p=[0.6, 0.2, 0.15, 0.05]),
        'Clearance_Status': clearance_status,
        'is_risky': int(is_risky)
    }

rows = [make_container() for _ in range(n)]
df = pd.DataFrame(rows)
df.to_csv('/home/claude/sample_shipments.csv', index=False)
print(f"Generated {len(df)} records")
print(df['Clearance_Status'].value_counts())
print(df['is_risky'].value_counts())
