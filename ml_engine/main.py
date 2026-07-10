from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
from model import pricing_model

app = FastAPI(title="Vorian ML Engine")

class PredictionRequest(BaseModel):
    distance_km: float
    duration_hrs: float
    terrain_factor: float
    weight_factor: float
    hour_of_day: int
    day_of_week: int
    utilization_rate: float
    demand_pressure: float
    month_of_year: Optional[int] = 6
    customer_trip_count: Optional[int] = 0
    offered_price: Optional[float] = None  # Para el modelo de conversión
    lead_time_hrs: Optional[float] = 24.0
    weather_severity: Optional[int] = 0
    zonal_concentration: Optional[float] = 0.0
    is_hazardous: Optional[bool] = False
    is_overweight: Optional[bool] = False

class TrainingRecord(BaseModel):
    distance_km: float
    duration_hrs: float
    terrain_factor: float
    weight_factor: float
    hour_of_day: int
    day_of_week: int
    utilization_rate: float
    demand_pressure: float
    month_of_year: Optional[int] = 6
    customer_trip_count: Optional[int] = 0
    offered_price: Optional[float] = None
    time_to_decision_secs: Optional[int] = None
    was_customer_accepted: Optional[bool] = False
    was_carrier_accepted: Optional[bool] = False
    lead_time_hrs: Optional[float] = 24.0
    weather_severity: Optional[int] = 0
    zonal_concentration: Optional[float] = 0.0
    is_hazardous: Optional[bool] = False
    is_overweight: Optional[bool] = False
    # Solo presentes en registros aceptados
    target_factor: Optional[float] = None
    target_commission: Optional[float] = None

class TrainingRequest(BaseModel):
    data: List[TrainingRecord]

@app.post("/predict")
def predict_factor(req: PredictionRequest):
    result = pricing_model.predict(req.model_dump())
    return {
        "factor_ml": result["factor"], 
        "commission_pct": result["commission"],
        "is_exploration": result["is_exploration"],
        "cold_start": pricing_model.model is None,
        "conversion_probability": result.get("conversion_probability")
    }

@app.post("/train")
def train_model(req: TrainingRequest):
    result = pricing_model.train([record.model_dump() for record in req.data])
    return result

@app.get("/health")
def health_check():
    return {
        "status": "online", 
        "engine": "Vorian ML",
        "model_loaded": pricing_model.model is not None,
        "conversion_model_loaded": pricing_model.conversion_model is not None,
    }
