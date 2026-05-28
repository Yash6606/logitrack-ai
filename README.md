

# 🚚 LogiTrack AI

### 🚀 Smart Supply Chain, Real-Time Delivery Tracking & AI-Powered Logistics Platform

[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2015-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Firebase](https://img.shields.io/badge/Database-Firebase%20Firestore-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![Socket.IO](https://img.shields.io/badge/RealTime-Socket.IO-010101?style=for-the-badge&logo=socket.io)](https://socket.io/)
[![XGBoost](https://img.shields.io/badge/AI-XGBoost%20%26%20Scikit--Learn-F26F21?style=for-the-badge&logo=scikit-learn)](https://xgboost.readthedocs.io/)

LogiTrack AI is an enterprise-grade, high-fidelity supply chain and logistics management application. Built for modern, fast-paced logistics, it combines real-time operations tracking (via WebSockets & Leaflet.js maps) with deep predictive intelligence (using XGBoost and Random Forest models) to optimize inventory, predict customer retention risk, and coordinate fleet dispatches seamlessly.

---

## ✨ System Features

### 👑 SaaS Master Admin (SuperAdmin Control Panel)
*   **Centralized Platform Oversight** — Monitor total platform users, registered store owners, delivery agents, and customers.
*   **SaaS Revenue Analytics** — Global financial health summaries, including aggregate subscription revenues and Pro vs Free conversion ratios.
*   **Global Directory Control** — Live view of all registered enterprise store accounts, contact details, and their active subscription tiers.
*   **Stripe Sandbox Audits** — Interactive subscription payment ledger showing transaction IDs, dates, plans, and amounts in INR.

### 🏢 Business Owner (Control Center)
*   **Intuitive Operations Dashboard** — Track real-time sales, order completions, pending dispatches, revenue trajectories, and low stock warnings.
*   **Dynamic Inventory Control** — Full CRUD panel with automated stock level monitoring, smart replenishment thresholds, and categories.
*   **Intelligent Dispatching** — Interactive status pipelines featuring manual override alongside **AI Auto-Assignment** of agents.
*   **Global Fleet Routing** — A live map (Leaflet.js) tracking all concurrent delivery agents, warehouse hubs, and active target routes.
*   **Advanced AI Analytics** — Future demand forecasts, automated customer churn risk categorizations, and proactive re-engagement suggestions.

### 🚚 Delivery Agent (Mobile Portal)
*   **PWA-Optimized Interface** — Fully mobile-responsive interface for agents operating on the move.
*   **Active Route Management** — Clear delivery lists containing customer phone numbers, navigation targets, and delivery items.
*   **Live Telemetry Simulator** — Built-in simulated GPS tracker that streams live coordinate telemetry to the central map via WebSockets.
*   **Integrated Earnings & Payouts** — Earn ₹50 per successful delivery, with instant dashboard credit, analytics, and history tracking.

### 🛒 Customer (E-Commerce Platform)
*   **Immersive Storefront** — Browse products with fast search, Category Filters, and instant cart updates.
*   **Secure Checkout Simulation** — Live shopping cart featuring quantity thresholds, fake payment gateways, and order receipts.
*   **Live Shipment Tracker** — Real-time tracking of their delivery agent on a map, with instant WebSocket status alerts.
*   **Feedback Loops** — Rate delivery experiences (1-5 stars) and request hassle-free returns within a 24-hour window.

---

## 🤖 Deep-Dive: AI & Optimization Engine

LogiTrack AI is not just a dashboard—it implements heavy mathematical modeling and machine learning using Python's scientific ecosystem (`NumPy`, `Pandas`, `SciPy`, `Scikit-Learn`, and `XGBoost`).

```
                              ┌──────────────────────────────┐
                              │     LogiTrack AI Engine      │
                              └──────────────┬───────────────┘
                                             │
             ┌───────────────────────────────┼───────────────────────────────┐
             ▼                               ▼                               ▼
  ┌─────────────────────┐         ┌─────────────────────┐         ┌─────────────────────┐
  │   Demand Forecast   │         │   Churn Predictor   │         │  Smart Dispatcher   │
  │  (XGBoost Regressor)│         │   (Random Forest)   │         │ (Hungarian Solver)  │
  └──────────┬──────────┘         └──────────┬──────────┘         └──────────┬──────────┘
             │                               │                               │
  • Lags (1d, 2d, 7d, 14d)        • Recency, Frequency            • SciPy optimization
  • Rolling Mean & Std Dev        • Monetary Value (LTV)          • Minimizes overall
  • 7-day auto-regressive         • Return Rate vs Rating         • fleet transit ETAs
```

### 1. Dynamic Demand Forecasting (XGBoost Regressor)
Predicts product restock quantities for the next 7 days.
*   **Engineered Features:** Computes time-series lags (`lag_1`, `lag_2`, `lag_7`, `lag_14`), rolling averages (7-day and 14-day intervals), rolling standard deviations, and calendar temporal markers (day of the week, month).
*   **Execution Strategy:** Simulates future time horizons through a 7-step autoregressive loop, using previous predictions as input features dynamically.
*   **Fallback:** If the model is not yet compiled, the system gracefully falls back to a rule-based **Weighted Moving Average (WMA)** that weights recent sales heavier than older ones.

### 2. Customer Churn Prevention (Random Forest Classifier)
Identifies accounts at risk of dropping out before it happens.
*   **RFM Pipeline:** Queries historical checkout records from Firestore to compile individual user features:
    *   **Recency:** Days elapsed since their most recent checkout.
    *   **Frequency:** Total completed checkouts.
    *   **Monetary Value:** Aggregate Lifelong Transaction Value (LTV).
    *   **Engagement Metrics:** Refund/return rates and customer review scores.
*   **Training & Classification:** Fits a Random Forest Classifier to label risk (Low, Medium, High) and outputs customized re-engagement prompts.

### 3. Smart Fleet Auto-Assignment (SciPy Bipartite Solver)
Optimizes dispatches globally using modern operational research.
*   **Surrogate ETA Engine:** Calculates agent-to-warehouse route times by combining spherical Haversine distances with queuing theory variables (8-minute delay per pending package in the agent’s backlog).
*   **Hungarian Algorithm Matching:** For bulk/batch dispatches, the backend uses `scipy.optimize.linear_sum_assignment` (the Hungarian algorithm) to solve the bipartite matching problem, mapping a set of orders to available agents such that the **global fleet transit time is minimized**.

---

## 🛠 Tech Stack

| Component | Technologies & Frameworks | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js 15 (App Router, Turbopack), TypeScript | Multi-portal web application |
| **Styling & UI** | Tailwind CSS v4, Radix/ShadCN UI, Lucide icons | Seamless, premium dark-themed layout |
| **State & Hooks**| Zustand, Custom React Hooks (`useAuth`, `useSocket`) | Modular client data propagation |
| **Backend** | FastAPI (Python 3.11+), Pydantic | High-performance asynchronous REST endpoints |
| **Real-Time** | Socket.IO (ASGI combined engine) | Dynamic bidirection telemetry updates |
| **Database** | Firebase Firestore (NoSQL Document Store) | Elastic, live-synced persistent data store |
| **Security** | Firebase Auth (JWT verification) | Secure portal access and role checks |
| **ML Engine** | NumPy, Pandas, Scikit-Learn, XGBoost, SciPy | Predictive demand & churn modeling |

---

## 🏗 System Architecture

```
                 ┌──────────────────────────────────────┐
                 │       Next.js 15 Web Portal          │
                 │  (Owner, Agent, and Customer Views)   │
                 └───────┬──────────────────────▲───────┘
                         │ REST                 │ Socket.IO
                         │ Requests             │ Telemetry
                         ▼                      │
                 ┌──────────────────────────────┴───────┐
                 │          FastAPI Backend             │
                 │   (Combined socketio.ASGIApp)        │
                 └───────┬──────────────────────▲───────┘
                         │                      │
                         │ Firestore Queries    │ Model I/O
                         ▼                      ▼
             ┌───────────────────────┐      ┌───────────────────────┐
             │  Firebase Cloud Suite │      │    Trained ML Models  │
             │   (Auth, DB, Storage) │      │  (.joblib artifacts)  │
             └───────────────────────┘      └───────────────────────┘
```

---

## 📂 Project Structure

```
devfusion/
├── frontend/               # Next.js 15 React Workspace
│   ├── app/                # Pages Router (Owner, Agent, Shop, Tracking)
│   ├── components/         # Leaflet Maps, UI Components, Layout Wrappers
│   ├── hooks/              # Asynchronous Socket.IO and Auth Hooks
│   ├── lib/                # Firebase Web SDK, Axios client, OSRM router
│   ├── store/              # Zustand global shopping cart and states
│   └── types/              # Static TypeScript type definitions
│
├── backend/                # FastAPI Python Workspace
│   ├── ai/                 # Machine Learning & Fleet Optimizers
│   │   ├── models/         # Serialized ML model binaries (.joblib)
│   │   ├── auto_assign.py  # Hungarian algorithm fleet matching
│   │   ├── churn_predictor.py # RandomForest churn models
│   │   ├── demand_forecast.py # XGBoost Regressor demand timeseries
│   │   └── retrain_models.py  # Standalone model retraining pipeline
│   ├── routers/            # Modulized HTTP endpoint routers
│   ├── schemas/            # Pydantic schema data models
│   ├── services/           # Business logic utilities
│   ├── utils/              # JWT handlers, Geo-helpers
│   ├── websocket/          # Asynchronous Socket.IO handlers
│   ├── config.py           # Firebase Admin SDK initialization
│   ├── seed_data.py        # Comprehensive database seeding engine
│   ├── Dockerfile          # Production Docker container blueprint
│   └── main.py             # App entrypoint (combined FastAPI + ASGI Socket.IO)
```

---

## 📦 Setup Guide

### Prerequisites
Ensure you have the following installed on your machine:
*   [Node.js](https://nodejs.org/) (Version 18 or above)
*   [Python](https://www.python.org/) (Version 3.11 or above)

---

### 1. Clone & Configuration
Clone this repository and check your project path:
```bash
git clone https://github.com/your-team/logitrack-ai.git
cd logitrack-ai
```

#### Firebase Credentials Configuration
1. Open the [Firebase Console](https://console.firebase.google.com/) and navigate to your project settings.
2. Select **Service Accounts** and click **Generate new private key**.
3. Save the downloaded JSON file as `firebase-service-account.json` and place it inside the `backend/` directory:
   `backend/firebase-service-account.json`

---

### 2. Backend Setup
Set up a Python virtual environment, install the compiled libraries, seed the cloud database, and compile the ML models.

```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install all required libraries
pip install -r requirements.txt
```

#### Step A: Seed Database
Populate your Firebase Firestore with 30 days of synthetic historical orders, local Indian geographic locations (Ahmedabad), sample products, and preset delivery agents.
```bash
python seed_data.py
```

#### Step B: Train Machine Learning Models
To generate the Scikit-Learn and XGBoost models, run the retrain script. This queries the seeded Firestore records, engineers features, trains the algorithms, and outputs binary files into `backend/ai/models/`.
```bash
python ai/retrain_models.py
```
> [!NOTE]
> Running the retrain script creates `churn_rf.joblib` and `demand_forecast_xgb.joblib` in your `backend/ai/models/` folder. If these files are missing, the server will log a fallback message and use rule-based alternatives gracefully.

#### Step C: Fire Up FastAPI Server
Start the backend ASGI application locally on port `8000`:
```bash
uvicorn main:combined_app --reload --port 8000
```
*   Your API documentation will be interactive at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
*   The health status check is open at: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

---

### 3. Frontend Setup
Deploy the Next.js React user interface locally using Turbopack.

```bash
# Navigate to the frontend directory
cd ../frontend

# Install node dependencies
npm install

# Start the Next.js development server
npm run dev
```

*   Open your browser and navigate to: [http://localhost:3000](http://localhost:3000)

---

## 🔑 Demo Access Accounts

The seeder initializes the database with ready-to-test profiles representing each component layer of the app. Use these credentials to sign in:

| Portal Role | Registered Login Email | Password | Primary Interface Actions |
| :--- | :--- | :--- | :--- |
| **SaaS Master Admin** | `master@logitrack.ai` (or `master`) | `master` | Global SaaS Subscriptions, SaaS Admin Panel, Billing Analytics & Payout Oversight |
| **Business Owner** | `owner@logitrack.ai` | `demo1234` | Live Fleet Maps, AI Forecasts, Inventory Management, Agent Dispatches |
| **Delivery Agent** | `agent1@logitrack.ai` | `demo1234` | Today's Deliveries, GPS Simulator, Completed Earnings Tracker |
| **Customer** | `customer@logitrack.ai` | `demo1234` | Browsing items, Mock Checkout, Live Agent Route Tracking |

---

## 🐛 Known Considerations

> [!IMPORTANT]
> **Free Hosting Options (For Judges):** 
> *   **Hugging Face Spaces (Recommended Card-Free):** If deployed using our newly added backend `Dockerfile` on Hugging Face, the server **remains online 24/7** and does not go to sleep! Actions and WebSocket map telemetry respond instantly.
> *   **Render (Free Tier):** If deployed on Render, the backend automatically goes to sleep after 15 minutes of inactivity. When launching the live website for the first time, **please allow ~50 seconds** for the backend server to wake up and connect the real-time Socket.IO channels. Once active, all dispatches respond instantly.
*   **GPS Simulation Range:** The GPS simulation for agents runs inside their mobile portal (client-side simulation). Leaving the Agent portal tab open allows the simulated truck to proceed along the OSRM path, updating the live map.
*   **Sandbox Payments:** Checkout utilizes a simulated payment processor. Transaction IDs are randomly generated for simulation purposes; no payment gateways are integrated.
*   **Firebase CORS:** Ensure your Firebase Storage rules allow CORS if uploading custom product pictures from local environments.
*   **Firebase / Firestore Quota limits:**
    > [!WARNING]
    > If the web application displays **"wrong credentials"** when signing in with the demo profiles or if requests fail in the browser console with a **500 (Internal Server Error)** status code, the default shared sandbox database may have exceeded its daily free Firestore operations quota (`ResourceExhausted: 429 Quota exceeded`).
    > 
    > **How to fix this:**
    > 1. Go to the [Firebase Console](https://console.firebase.google.com/) and create your own free Firebase project.
    > 2. Enable **Firestore Database** (in test mode) and **Authentication** (enable Email/Password provider).
    > 3. Go to **Project Settings > Service Accounts**, click **Generate new private key**, and download the key as a JSON file.
    > 4. Rename the downloaded file to `firebase-service-account.json` and replace the one located inside your `backend/` directory.
    > 5. Seed your private database by running `python seed_data.py` inside the `backend/` directory, and restart your server with `uvicorn main:combined_app --reload --port 8000`.

---


## 👥 DevFusion Team

This system was engineered by Team **DevFusion** for high-performance logistics automation:
*   **Team Lead** — Full-stack Architect & WebSocket Orchestration
*   **Backend Developer** — FastAPI Design, Security, and Database Optimization
*   **Data Scientist** — XGBoost Forecasting, Random Forest Classifiers, & Operational Solvers
*   **Frontend UI Designer** — Next.js 15 App Layouts, Leaflet Integration, & Tailwind UX

---

## 📄 License

This project is licensed under the MIT License — Developed by team **DevFusion** for the 2026 Hackathon.
