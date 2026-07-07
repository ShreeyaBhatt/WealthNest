import os
from dataclasses import dataclass

import joblib
import numpy as np
import pandas as pd
import requests
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_pinball_loss
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder


CATEGORIES = {
    "nifty50": [120716, 112222, 120598],
    "largecap": [120586, 118825],
    "elss": [118834, 133165],
    "debt": [118625, 119060],
}
DURATIONS = [12, 24, 36, 48, 60, 72, 84, 96, 108, 120]


def fetch_nav(scheme_code: int) -> pd.Series:
    response = requests.get(f"https://api.mfapi.in/mf/{scheme_code}", timeout=30)
    response.raise_for_status()
    rows = response.json()["data"]
    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"], dayfirst=True, errors="coerce")
    df["nav"] = pd.to_numeric(df["nav"], errors="coerce")
    df = df.dropna().sort_values("date").set_index("date")
    return df["nav"].resample("ME").last().pct_change().dropna()


def category_returns() -> dict:
    out = {}
    for category, schemes in CATEGORIES.items():
        series = []
        for scheme in schemes:
            try:
                series.append(fetch_nav(scheme))
            except Exception as exc:
                print(f"Skipping {scheme}: {exc}")
        if not series:
            raise RuntimeError(f"No NAV data for {category}")
        merged = pd.concat(series, axis=1).mean(axis=1).loc["2013-01-01":"2024-12-31"].dropna()
        print(category, "monthly rows:", len(merged))
        out[category] = merged
    return out


def simulate_sip(returns: pd.Series, duration: int, sip_amount: float = 1000.0) -> pd.DataFrame:
    rows = []
    values = returns.values
    dates = returns.index
    for start in range(0, len(values) - duration + 1):
        nav = 100.0
        units = 0.0
        for r in values[start:start + duration]:
            units += sip_amount / nav
            nav *= 1 + r
        rows.append({
            "duration_months": duration,
            "sip_amount": sip_amount,
            "corpus": units * nav,
            "start_date": dates[start],
        })
    return pd.DataFrame(rows)


def build_dataset(returns_by_category: dict) -> pd.DataFrame:
    frames = []
    for category, returns in returns_by_category.items():
        for duration in DURATIONS:
            df = simulate_sip(returns, duration)
            df["category"] = category
            frames.append(df)
    data = pd.concat(frames, ignore_index=True)
    print("simulation rows:", len(data))
    return data


def train(data: pd.DataFrame):
    features = ["category", "sip_amount", "duration_months"]
    preprocessor = ColumnTransformer([
        ("category", OneHotEncoder(drop="first", handle_unknown="ignore"), ["category"]),
        ("numeric", "passthrough", ["sip_amount", "duration_months"]),
    ])
    train_df = data[data["start_date"] < "2021-01-01"]
    test_df = data[data["start_date"] >= "2021-01-01"]
    X_train = preprocessor.fit_transform(train_df[features])
    X_test = preprocessor.transform(test_df[features])
    y_train = train_df["corpus"]
    y_test = test_df["corpus"]

    models = {}
    for label, alpha in {"q25": 0.25, "q50": 0.50, "q75": 0.75}.items():
        model = GradientBoostingRegressor(
            loss="quantile",
            alpha=alpha,
            n_estimators=200,
            max_depth=4,
            learning_rate=0.05,
            min_samples_leaf=10,
            subsample=0.8,
            random_state=42,
        )
        model.fit(X_train, y_train)
        pred = model.predict(X_test)
        print(label, "pinball loss:", round(mean_pinball_loss(y_test, pred, alpha=alpha), 2))
        models[label] = model

    q25 = models["q25"].predict(X_test)
    q75 = models["q75"].predict(X_test)
    coverage = float(((y_test >= q25) & (y_test <= q75)).mean())
    print("Q25-Q75 test coverage:", round(coverage, 3))

    sample = pd.DataFrame([{"category": "nifty50", "sip_amount": 1000.0, "duration_months": 120}])
    q50_base = models["q50"].predict(preprocessor.transform(sample))[0]
    sanity = q50_base * 10
    print("Sanity 10000/month, 120 months, nifty50:", round(sanity, 2))
    if not (2_200_000 <= sanity <= 2_600_000):
        print("Warning: sanity check outside expected Rs 22-26L range")

    return {"preprocessor": preprocessor, "models": models, "features": features, "coverage": coverage}


def main():
    returns = category_returns()
    data = build_dataset(returns)
    bundle = train(data)
    path = os.path.join(os.path.dirname(__file__), "sip_model.pkl")
    joblib.dump(bundle, path)
    print("Saved", path)


if __name__ == "__main__":
    main()
