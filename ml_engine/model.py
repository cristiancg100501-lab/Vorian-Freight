import os
import random
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

MODEL_PATH = "vorian_rf_model.pkl"

class VorianPricingModel:
    def __init__(self):
        self.model = None
        self._load_model()

    def _load_model(self):
        if os.path.exists(MODEL_PATH):
            self.model = joblib.load(MODEL_PATH)
        else:
            self.model = None

    def predict(self, features: dict) -> dict:
        # COLD START: Si no hay modelo entrenado, devolvemos 1.0 y 0.10 de comisión (fallback)
        if self.model is None:
            return {"factor": 1.0, "commission": 0.10, "is_exploration": False}
        
        df = pd.DataFrame([features])
        
        # Aseguramos el orden estricto de columnas, agregando las nuevas métricas
        cols = ['distance_km', 'duration_hrs', 'terrain_factor', 'weight_factor', 'hour_of_day', 'day_of_week', 'utilization_rate', 'demand_pressure']
        
        # El modelo ahora devuelve dos valores (factor, commission)
        prediction = self.model.predict(df[cols])[0]
        base_factor = float(prediction[0])
        base_commission = float(prediction[1])
        
        # --- Lógica Epsilon-Greedy (Exploración) ---
        # Un 10% de las veces, la IA explorará levemente el precio y la comisión
        is_exploration = False
        if random.random() < 0.10:
            is_exploration = True
            # Agregar un ruido aleatorio de -5% a +10% en el precio
            factor_noise = random.uniform(-0.05, 0.10)
            # Agregar un ruido aleatorio de -2% a +2% en la comisión
            comm_noise = random.uniform(-0.02, 0.02)
            
            base_factor += factor_noise
            base_commission += comm_noise
            print(f"🤖 IA EXPLORANDO: Ajuste factor {factor_noise*100:.1f}%, comisión {comm_noise*100:.1f}%")

        # Safety bounds: Evitar que el ML o la exploración propongan locuras comerciales
        final_factor = max(0.8, min(1.5, base_factor))
        final_comm = max(0.05, min(0.20, base_commission)) # Comisión entre 5% y 20%
        
        return {
            "factor": final_factor,
            "commission": final_comm,
            "is_exploration": is_exploration
        }

    def train(self, data: list):
        """
        Recibe un historial de cotizaciones 'reserved' (aceptadas).
        'target_factor' es la proporción (offered_price / base_price) que el mercado aceptó.
        """
        # Evitar sobreajuste con muy pocos datos iniciales
        if not data or len(data) < 10:
            return {"status": "skipped", "reason": "Se requieren al menos 10 reservas para entrenar el modelo."}

        df = pd.DataFrame(data)
        cols = ['distance_km', 'duration_hrs', 'terrain_factor', 'weight_factor', 'hour_of_day', 'day_of_week', 'utilization_rate', 'demand_pressure']
        
        X = df[cols]
        # Multi-output target: El modelo predecirá ambas cosas a la vez
        y = df[['target_factor', 'target_commission']]

        # Startup MVP Model: Funciona muy bien con pocos datos y captura relaciones no lineales
        self.model = RandomForestRegressor(n_estimators=50, max_depth=5, random_state=42)
        self.model.fit(X, y)

        joblib.dump(self.model, MODEL_PATH)
        return {"status": "success", "message": "Modelo RandomForest entrenado y persistido con éxito."}

pricing_model = VorianPricingModel()
