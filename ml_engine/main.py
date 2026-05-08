from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from model import pricing_model

app = FastAPI(title="Vorian ML Engine")

class PredictionRequest(BaseModel):
    distance_km: float
    duration_hrs: float
    terrain_factor: float
    weight_factor: float
    hour_of_day: int
    day_of_week: int

class TrainingRecord(PredictionRequest):
    target_factor: float

class TrainingRequest(BaseModel):
    data: List[TrainingRecord]

@app.post("/predict")
def predict_factor(req: PredictionRequest):
    factor = pricing_model.predict(req.model_dump())
    return {
        "factor_ml": factor, 
        "cold_start": pricing_model.model is None
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
        "model_loaded": pricing_model.model is not None
    }
