import os
import random
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingClassifier

MODEL_PATH = "vorian_rf_model.pkl"
CONVERSION_MODEL_PATH = "vorian_conversion_model.pkl"

class VorianPricingModel:
    def __init__(self):
        self.model = None            # Predice factor de precio y comisión
        self.conversion_model = None # Predice probabilidad de conversión (P que el cliente acepte)
        self._load_model()

    def _load_model(self):
        if os.path.exists(MODEL_PATH):
            self.model = joblib.load(MODEL_PATH)
        if os.path.exists(CONVERSION_MODEL_PATH):
            self.conversion_model = joblib.load(CONVERSION_MODEL_PATH)

    # Features base que siempre están disponibles al momento de cotizar
    PRICE_FEATURES = [
        'distance_km', 'duration_hrs', 'terrain_factor', 'weight_factor',
        'hour_of_day', 'day_of_week', 'utilization_rate', 'demand_pressure',
        'month_of_year', 'customer_trip_count',
        # Nuevas señales crudas
        'lead_time_hrs', 'weather_severity', 'zonal_concentration', 
        'is_hazardous', 'is_overweight'
    ]

    # Features de conversión (incluye el propio precio ofrecido)
    CONVERSION_FEATURES = PRICE_FEATURES + ['offered_price']

    def predict(self, features: dict) -> dict:
        # COLD START: Si no hay modelo entrenado, devolvemos defaults
        if self.model is None:
            return {
                "factor": 1.0,
                "commission": 0.10,
                "is_exploration": False,
                "conversion_probability": None  # Sin datos aún
            }

        df = pd.DataFrame([features])

        # Rellenar columnas faltantes con defaults seguros
        for col in self.PRICE_FEATURES:
            if col not in df.columns:
                df[col] = 0

        prediction = self.model.predict(df[self.PRICE_FEATURES])[0]
        base_factor = float(prediction[0])
        base_commission = float(prediction[1])

        # --- Lógica Epsilon-Greedy (Exploración) ---
        is_exploration = False
        if random.random() < 0.10:
            is_exploration = True
            factor_noise = random.uniform(-0.05, 0.10)
            comm_noise = random.uniform(-0.02, 0.02)
            base_factor += factor_noise
            base_commission += comm_noise
            print(f"🤖 IA EXPLORANDO: Ajuste factor {factor_noise*100:.1f}%, comisión {comm_noise*100:.1f}%")

        # Safety bounds
        final_factor = max(0.8, min(1.5, base_factor))
        final_comm = max(0.05, min(0.20, base_commission))

        # Probabilidad de conversión (si el modelo ya existe)
        conversion_prob = None
        if self.conversion_model is not None:
            try:
                conv_features = {**features, 'offered_price': features.get('offered_price', 0)}
                conv_df = pd.DataFrame([conv_features])
                for col in self.CONVERSION_FEATURES:
                    if col not in conv_df.columns:
                        conv_df[col] = 0
                conversion_prob = float(self.conversion_model.predict_proba(conv_df[self.CONVERSION_FEATURES])[0][1])
            except Exception as e:
                print(f"Warning: conversion model prediction failed: {e}")

        return {
            "factor": final_factor,
            "commission": final_comm,
            "is_exploration": is_exploration,
            "conversion_probability": conversion_prob
        }

    def train(self, data: list):
        """
        Recibe TODAS las cotizaciones (aceptadas y rechazadas).
        was_customer_accepted = True/False es la señal clave de conversión.
        Solo las aceptadas tienen target_factor y target_commission válidos.
        """
        if not data or len(data) < 10:
            return {
                "status": "skipped",
                "reason": "Se requieren al menos 10 cotizaciones para entrenar el modelo.",
                "current_count": len(data) if data else 0
            }

        df = pd.DataFrame(data)

        # Rellenar columnas opcionales con defaults
        for col in ['month_of_year', 'customer_trip_count', 'time_to_decision_secs',
                    'was_customer_accepted', 'was_carrier_accepted',
                    'lead_time_hrs', 'weather_severity', 'zonal_concentration', 
                    'is_hazardous', 'is_overweight']:
            if col not in df.columns:
                df[col] = 0
        df['month_of_year'] = df['month_of_year'].fillna(6)
        df['customer_trip_count'] = df['customer_trip_count'].fillna(0)
        df['was_customer_accepted'] = df['was_customer_accepted'].fillna(False).astype(int)
        df['was_carrier_accepted'] = df['was_carrier_accepted'].fillna(False).astype(int)
        df['is_hazardous'] = df['is_hazardous'].fillna(False).astype(int)
        df['is_overweight'] = df['is_overweight'].fillna(False).astype(int)
        df['lead_time_hrs'] = df['lead_time_hrs'].fillna(24.0)
        df['weather_severity'] = df['weather_severity'].fillna(0)
        df['zonal_concentration'] = df['zonal_concentration'].fillna(0.0)

        accepted_count = int(df['was_customer_accepted'].sum())
        total_count = len(df)

        # --- Modelo 1: Precio Óptimo (solo entrenado con aceptadas) ---
        accepted_df = df[df['was_customer_accepted'] == 1].copy()
        if len(accepted_df) >= 5 and 'target_factor' in accepted_df.columns:
            X_price = accepted_df[[c for c in self.PRICE_FEATURES if c in accepted_df.columns]]
            # Rellenar features faltantes
            for col in self.PRICE_FEATURES:
                if col not in X_price.columns:
                    X_price[col] = 0
            y_price = accepted_df[['target_factor', 'target_commission']]
            self.model = RandomForestRegressor(n_estimators=50, max_depth=5, random_state=42)
            self.model.fit(X_price, y_price)
            joblib.dump(self.model, MODEL_PATH)
            print(f"✅ Modelo de precio entrenado con {len(accepted_df)} aceptadas")

        # --- Modelo 2: Probabilidad de Conversión (con TODOS los datos) ---
        if total_count >= 10 and 'offered_price' in df.columns:
            conv_features = [c for c in self.CONVERSION_FEATURES if c in df.columns]
            X_conv = df[conv_features].fillna(0)
            y_conv = df['was_customer_accepted'].astype(int)
            # Solo entrenar si hay al menos algunas de cada clase
            if y_conv.sum() >= 2 and (len(y_conv) - y_conv.sum()) >= 2:
                self.conversion_model = GradientBoostingClassifier(
                    n_estimators=50, max_depth=3, random_state=42
                )
                self.conversion_model.fit(X_conv, y_conv)
                joblib.dump(self.conversion_model, CONVERSION_MODEL_PATH)
                print(f"✅ Modelo de conversión entrenado con {total_count} cotizaciones ({accepted_count} aceptadas)")

        return {
            "status": "success",
            "total_trained": total_count,
            "accepted_used": accepted_count,
            "rejected_used": total_count - accepted_count,
            "message": f"Modelos entrenados: {accepted_count} aceptadas + {total_count - accepted_count} rechazadas."
        }

pricing_model = VorianPricingModel()
