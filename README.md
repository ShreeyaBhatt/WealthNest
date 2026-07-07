# WealthNest

WealthNest is a family investment portfolio tracker for the combined FSD-2 + FCSP-2 academic project. It includes a MERN portfolio app, a FastAPI AI/ML microservice, Gemini-powered portfolio insights, a statement parser, and an ML-powered SIP Goal Planner.

## Project Structure

```text
client/            React 18 + Vite + Tailwind + Recharts
server/            Node.js + Express + Mongoose API
fastapi_service/   FastAPI AI/ML service, Gemini integration, SIP model
```

## Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB Atlas connection string or local MongoDB
- Gemini API key for live AI responses

## Setup

### 1. Backend API

```bash
cd server
npm install
copy .env.example .env
npm run dev
```

Set these values in `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/wealthnest
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_URL=http://localhost:5173
FASTAPI_URL=http://localhost:8000
```

### 2. FastAPI AI/ML Service

```bash
cd fastapi_service
pip install -r requirements.txt
set GEMINI_API_KEY=your-gemini-key
uvicorn main:app --reload --port 8000
```

The repo includes `sip_model.pkl` so the SIP forecast endpoint works immediately. To rebuild it from mfapi.in NAV data:

```bash
cd fastapi_service
python train_sip_model.py
```

The trainer downloads NAV history, resamples monthly returns, simulates SIP outcomes, trains Q25/Q50/Q75 GradientBoostingRegressor models, prints pinball loss and interval coverage, and saves `sip_model.pkl`.

### 3. Frontend

```bash
cd client
npm install
copy .env.example .env
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Seed Patel Family Demo Data

Start MongoDB, then run:

```bash
cd server
npm run seed:patel
```

Demo login:

```text
Email: amit.patel@wealthnest.demo
Password: PatelDemo@123
```

The seed creates:

- User: Amit Patel
- Family: Patel Family
- Members: Amit, Pooja, Rohan, Sneha
- Stage 1 investments:
  - HDFC Nifty 50 with 27 BUY transactions
  - ICICI Bluechip with 18 BUY transactions
  - Mirae ELSS for Rohan with 6 BUY transactions
  - Reliance stock: 50 shares at ₹2,450
  - TCS for Rohan: 5 shares at ₹3,800
  - SBI FD: ₹2,00,000
  - Amit PPF: ₹1,72,000
  - Pooja PPF: ₹1,12,000

The Stage 1 dashboard total is exactly ₹12,02,450.

## Demo Flow

1. Log in as Amit Patel.
2. Open Dashboard and verify the Stage 1 total portfolio value is ₹12,02,450.
3. Review asset allocation, per-investment gain/loss bars, member breakdown, trend chart, and transaction timeline.
4. Open Investments and add a new transaction. Try a SELL with units greater than the holding to see validation.
5. Open Upload Statement, upload a CAMS/KFintech CAS PDF, review confidence scores, edit low-confidence fields, then import all rows.
6. Open AI Insights and click Generate AI Insights.
7. Review health score, risk badge, allocation feedback, member recommendations, and the ML SIP Goal Planner cards.
8. Use the chat assistant to ask about SIP gaps, diversification, or the Patel Family goal plan.

## API Summary

All protected Node routes require `Authorization: Bearer <token>` and return:

```json
{ "success": true, "message": "...", "data": {} }
```

Implemented Node endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET/POST/PUT/DELETE /api/family`
- `GET/POST/PUT/DELETE /api/family/:id/members`
- `GET/POST/PUT/DELETE /api/investments`
- `GET/POST/PUT/DELETE /api/transactions`
- `GET /api/analytics/dashboard?familyId=...`
- `GET /api/analytics/trends?familyId=...`
- `POST /api/statements/import`
- `POST /api/insights/save`
- `GET /api/insights/saved?familyId=...`
- `GET /api/insights/sip-forecasts?familyId=...`

Implemented FastAPI endpoints:

- `GET /health`
- `POST /parse-statement`
- `POST /generate-insights`
- `POST /ml/sip-forecast`
- `POST /chat`

## Notes

- Gemini calls gracefully fall back to deterministic demo responses if `GEMINI_API_KEY` is missing.
- The SIP endpoint loads `sip_model.pkl` once at FastAPI startup.
- Transaction recomputation keeps dividends from changing units or invested amount.
- SELL transactions are rejected when quantity exceeds the current holding.
