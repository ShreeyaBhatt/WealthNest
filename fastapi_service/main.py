import json
import os
import re
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Literal, Optional

import joblib
import numpy as np
import pandas as pd
import pdfplumber
import requests
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


MODEL_PATH = os.path.join(os.path.dirname(__file__), "sip_model.pkl")
app_state: Dict[str, Any] = {"sip_bundle": None}


class SipForecastRequest(BaseModel):
    category: Literal["nifty50", "largecap", "elss", "debt"]
    monthly_sip: float = Field(gt=0)
    duration_months: int = Field(ge=12, le=360)
    goal_amount: float = Field(default=0, ge=0)


class InsightRequest(BaseModel):
    totalValue: float = 0
    allocationPercentages: List[Dict[str, Any]] = []
    topHoldings: List[Dict[str, Any]] = []
    members: List[Dict[str, Any]] = []


class ChatRequest(BaseModel):
    familyId: str
    message: str
    history: List[Dict[str, str]] = []
    portfolioSummary: Optional[Dict[str, Any]] = None
    latestInsights: Optional[Dict[str, Any]] = None
    sipForecasts: Optional[List[Dict[str, Any]]] = None


def fallback_base_prediction(category: str, duration_months: int) -> Dict[str, float]:
    annual_rates = {
        "nifty50": (0.09, 0.115, 0.14),
        "largecap": (0.085, 0.105, 0.13),
        "elss": (0.095, 0.12, 0.145),
        "debt": (0.055, 0.07, 0.085),
    }
    vals = []
    for annual in annual_rates[category]:
        monthly = (1 + annual) ** (1 / 12) - 1
        corpus = 1000 * (((1 + monthly) ** duration_months - 1) / monthly) * (1 + monthly)
        vals.append(corpus)
    return {"conservative": vals[0], "expected": vals[1], "optimistic": vals[2]}


def predict_base(category: str, duration_months: int) -> Dict[str, float]:
    bundle = app_state.get("sip_bundle")
    if not bundle:
        return fallback_base_prediction(category, duration_months)

    row = pd.DataFrame([{"category": category, "sip_amount": 1000.0, "duration_months": duration_months}])
    preds = {}
    for label, model in bundle["models"].items():
        preds[label] = float(model.predict(bundle["preprocessor"].transform(row))[0])
    return {
        "conservative": preds["q25"],
        "expected": preds["q50"],
        "optimistic": preds["q75"],
    }


def extract_json(text: str) -> Dict[str, Any]:
    cleaned = text.strip()
    cleaned = re.sub(r"^```json|```$", "", cleaned, flags=re.IGNORECASE | re.MULTILINE).strip()
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        cleaned = match.group(0)
    return json.loads(cleaned)


def gemini_generate(prompt: str, temperature: float = 0.25) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return ""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": temperature},
    }
    response = requests.post(url, json=payload, timeout=25)
    response.raise_for_status()
    return response.json()["candidates"][0]["content"]["parts"][0]["text"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    if os.path.exists(MODEL_PATH):
        app_state["sip_bundle"] = joblib.load(MODEL_PATH)
    yield


app = FastAPI(title="WealthNest AI/ML Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"success": True, "message": "WealthNest FastAPI healthy", "model_loaded": bool(app_state.get("sip_bundle"))}


@app.post("/parse-statement")
async def parse_statement(file: UploadFile = File(...)):
    raw = await file.read()
    temp_path = os.path.join(os.path.dirname(__file__), f"_upload_{file.filename}")
    with open(temp_path, "wb") as f:
        f.write(raw)

    lines: List[str] = []
    try:
        with pdfplumber.open(temp_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text() or ""
                lines.extend(text.splitlines())
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            pass

    transactions = []
    fund_name = ""
    folio = ""
    date_re = r"(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})"
    money_re = r"(-?\d[\d,]*\.?\d*)"

    for line in lines:
        if not fund_name and re.search(r"(fund|scheme|nifty|bluechip|elss)", line, re.I):
            fund_name = line.strip()[:120]
        if not folio:
            folio_match = re.search(r"folio\s*(?:no\.?)?\s*[:\-]?\s*([A-Z0-9/-]+)", line, re.I)
            if folio_match:
                folio = folio_match.group(1)
        if re.search(date_re, line) and re.search(r"(purchase|redemption|dividend|switch|sip)", line, re.I):
            pieces = re.findall(money_re, line.replace(",", ""))
            date = re.search(date_re, line).group(1)
            tx_type = "BUY"
            if re.search(r"redemption|sell", line, re.I):
                tx_type = "SELL"
            elif re.search(r"dividend", line, re.I):
                tx_type = "DIVIDEND"
            amount = float(pieces[-3]) if len(pieces) >= 3 else 0.0
            units = float(pieces[-2]) if len(pieces) >= 2 else 0.0
            nav = float(pieces[-1]) if pieces else 0.0
            confidence = {
                "fundName": 0.92 if fund_name else 0.55,
                "folio": 0.9 if folio else 0.6,
                "date": 0.88,
                "transactionType": 0.86,
                "amount": 0.82 if amount else 0.65,
                "units": 0.82 if units else 0.65,
                "nav": 0.82 if nav else 0.65,
            }
            transactions.append({
                "fundName": fund_name or "Unknown fund",
                "folio": folio or "Unknown",
                "date": date,
                "transactionType": tx_type,
                "amount": amount,
                "units": units,
                "nav": nav,
                "confidence": confidence,
                "flags": [k for k, v in confidence.items() if v < 0.8],
            })

    return {
        "fundName": fund_name or "Unknown fund",
        "folio": folio or "Unknown",
        "transactions": transactions,
        "confidence": {
            "fundName": 0.92 if fund_name else 0.55,
            "folio": 0.9 if folio else 0.6,
            "transactions": 0.88 if transactions else 0.45,
        },
    }


@app.post("/generate-insights")
def generate_insights(summary: InsightRequest):
    fallback = {
        "healthScore": 7,
        "healthLabel": "Healthy with concentration risk",
        "riskLevel": "Moderate",
        "riskExplanation": "The portfolio has a useful mix of equity, retirement and fixed-income assets, but SIP goals need regular review.",
        "allocationFeedback": [
            "Equity exposure is suitable for long-term family goals.",
            "Fixed-income and PPF balances add stability for near-term needs.",
        ],
        "diversificationSuggestions": [
            "Avoid adding too much to the same large-cap theme.",
            "Map each child goal to a target corpus and review SIP adequacy yearly.",
        ],
        "memberRecommendations": [
            {"name": m.get("name", "Member"), "recommendation": "Keep investments aligned to age, goal horizon and liquidity needs."}
            for m in summary.members
        ],
    }

    prompt = f"""
You are WealthNest's family portfolio analyst. Return only valid JSON matching this shape:
{{
  "healthScore": 1,
  "healthLabel": "...",
  "riskLevel": "...",
  "riskExplanation": "...",
  "allocationFeedback": ["..."],
  "diversificationSuggestions": ["..."],
  "memberRecommendations": [{{"name": "...", "recommendation": "..."}}]
}}
Use integer healthScore from 1 to 10. No markdown. Portfolio summary:
{json.dumps(summary.dict())}
"""
    for _ in range(2):
        try:
            text = gemini_generate(prompt)
            if not text:
                break
            parsed = extract_json(text)
            required = {"healthScore", "healthLabel", "riskLevel", "riskExplanation", "allocationFeedback", "diversificationSuggestions", "memberRecommendations"}
            if required.issubset(parsed.keys()):
                parsed["healthScore"] = max(1, min(10, int(parsed["healthScore"])))
                return parsed
        except Exception:
            continue
    return fallback


@app.post("/ml/sip-forecast")
def sip_forecast(req: SipForecastRequest):
    base = predict_base(req.category, req.duration_months)
    scale = req.monthly_sip / 1000.0
    expected = base["expected"] * scale
    required = (req.goal_amount / base["expected"]) * 1000 if req.goal_amount > 0 and base["expected"] > 0 else 0
    return {
        "conservative": round(base["conservative"] * scale, 2),
        "expected": round(expected, 2),
        "optimistic": round(base["optimistic"] * scale, 2),
        "required_sip_for_goal": round(required, 2),
        "gap_amount": round(req.goal_amount - expected, 2) if req.goal_amount > 0 else 0,
    }


@app.post("/chat")
def chat(req: ChatRequest):
    context = {
        "portfolioSummary": req.portfolioSummary,
        "latestInsights": req.latestInsights,
        "sipForecasts": req.sipForecasts,
    }
    prompt = f"""
You are WealthNest's concise family finance assistant. Use the context when available.
Do not invent exact returns. Keep answers practical and in Indian rupees where relevant.
Context JSON: {json.dumps(context, default=str)}
Conversation: {json.dumps(req.history[-8:])}
User: {req.message}
Assistant:
"""
    try:
        text = gemini_generate(prompt, temperature=0.45)
        if text:
            return {"reply": text.strip()}
    except Exception:
        pass
    return {"reply": "I can help with portfolio allocation, SIP goal gaps, and family-wise priorities. Generate insights first for a more personalised answer."}
