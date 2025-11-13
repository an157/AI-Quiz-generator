# back_end/app.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import traceback

from core.bullet_func import generate_quiz_from_text

app = FastAPI(title="Quiz API", version="0.1.0")

# 本地前端/Swagger 调试方便起见，先放开所有域；上线后请按需收紧
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QuizRequest(BaseModel):
    source_text: str
    bullet_points: List[str]

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/generate_quiz")
def generate_quiz(req: QuizRequest):
    try:
        result = generate_quiz_from_text(req.source_text, req.bullet_points)
        return {"questions": result}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
