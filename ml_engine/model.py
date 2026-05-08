import os
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

    def predict(self, features: dict) -> float:
        # COLD START: Si no hay modelo entrenado, devolvemos 1.0 
        # La Next.js API se encargará de aplicar los "Market Factors" (Heurística)
        if self.model is None:
            return 1.0
        
        df = pd.DataFrame([features])
        
        # Aseguramos el orden estricto de columnas
        cols = ['distance_km', 'duration_hrs', 'terrain_factor', 'weight_factor', 'hour_of_day', 'day_of_week']
        prediction = self.model.predict(df[cols])[0]
        
        # Safety bounds: Evitar que el ML proponga locuras comerciales
        return float(max(0.8, min(1.5, prediction)))

    def train(self, data: list):
        """
        Recibe un historial de cotizaciones 'reserved' (aceptadas).
        'target_factor' es la proporción (offered_price / base_price) que el mercado aceptó.
        """
        # Evitar sobreajuste con muy pocos datos iniciales
        if not data or len(data) < 10:
            return {"status": "skipped", "reason": "Se requieren al menos 10 reservas para entrenar el modelo."}

        df = pd.DataFrame(data)
        cols = ['distance_km', 'duration_hrs', 'terrain_factor', 'weight_factor', 'hour_of_day', 'day_of_week']
        
        X = df[cols]
        y = df['target_factor']

        # Startup MVP Model: Funciona muy bien con pocos datos y captura relaciones no lineales
        self.model = RandomForestRegressor(n_estimators=50, max_depth=5, random_state=42)
        self.model.fit(X, y)

        joblib.dump(self.model, MODEL_PATH)
        return {"status": "success", "message": "Modelo RandomForest entrenado y persistido con éxito."}

pricing_model = VorianPricingModel()
