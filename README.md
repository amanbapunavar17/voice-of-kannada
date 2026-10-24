# ಮಾತು (MAATU) — VOICE OF KANNADA
> **Learn Kannada. Speak with Confidence. Earn Through Every Word.**
> "ಕನ್ನಡ ಕಲಿಯೋಣ, ಆತ್ಮವಿಶ್ವಾಸದಿಂದ ಮಾತನಾಡೋಣ"

An AI-powered Kannada learning, speaking, culture, and rewards ecosystem combining the usability of Duolingo, the editorial elegance of modern typography, and a verifiable gaming achievement economy.

---

## 🌟 Key Features

### 1. 🏛️ Cultural Karnataka Design System
- Custom palette: Warm Cream (`#FAF7F0`), Pure White (`#FFFFFF`), Karnataka Forest Green (`#174B3A`), Rich Gold (`#D4A64A`), and Soft Gold (`#F7EAC8`).
- Bilingual typography supporting clean Latin fonts and full Unicode rendering for **ಕನ್ನಡ ಲಿಪಿ (Kannada Script)** and phonetic English transliterations.

### 2. 🎙️ AI Speaking Studio
- **Microphone speech recognition** with real-time Kannada transcript capture via browser Web Speech API.
- **FastAPI + Google Gemini backend integration** (`/api/practice`) evaluating responses in realistic everyday contexts:
  - *Daily Self-Introduction, Bengaluru BMTC Bus Travel, Darshini Dosa Ordering, Commercial Street Bargaining, College Campus Chit-Chat, Auto Driver Fare Negotiation, Asking Directions to Vidhana Soudha, Tech Park Office Conversations.*
- Feedback includes grammar suggestions, transliterations, natural colloquial Kannada, and audio pronunciation.

### 3. 📚 Structured Curriculum (10 Modules)
- 10 structured progressive modules covering 40+ interactive lessons from absolute basics to workplace fluency.
- Three interactive question formats per lesson:
  - **Multiple Choice** questions with context explanations.
  - **Word Matching** pairs connecting Kannada script to English meanings.
  - **Sentence Builder** arranging scrambled Kannada words in grammatical order.

### 4. 🎮 5 Playable Kannada Mini-Games
1. **Kannada Word Sprint**: Rapid-fire vocabulary race against a 10-second timer with combo multipliers.
2. **Sentence Builder**: Interactive reordering puzzle assembling shuffled Kannada words into grammatically correct sentences.
3. **Kannada Memory Match**: 8-card flip-and-match memory game pairing Kannada words with English definitions.
4. **Shopkeeper Challenge**: Multi-turn dialogue simulation at a local Bengaluru vegetable stall where correct Kannada negotiations give shopkeeper approval.
5. **Daily Kannada Quiz**: 5-question multi-topic comprehension and vocabulary test with instant score reviews.

### 5. 💎 Dual-Economy & Gamification Engine
- **XP (Learning Experience)**: Drives level progression (*Kannada Explorer → Word Collector → Conversation Starter → Confident Speaker → Kannada Champion*).
- **Maatu Points (Redeemable Currency)**: Earned through first-time completions, streaks, and challenges.
- **Auditable Transaction Log**: Every point/XP award or deduction contains an idempotency key, activity timestamp, and reconcilable balance ledger.
- **Day-Wise Activity & Streaks**: 7-day visual activity bar chart, monthly calendar tracker, and milestone badge system.

### 6. 📜 Professional Landscape PDF Certificate Generator
- Built with **jsPDF** vector rendering in A4 Landscape format (297mm × 210mm).
- Embellished with Karnataka gold/green geometric borders, verifiable unique Certificate IDs (e.g., `MAATU-KB-2026-89412`), and issuer credentials.
- **Public Certificate Verification API** (`/api/verify-certificate/{cert_id}`) verifying authenticity against database records.

### 7. 🎁 Maatu Goodies Store
- Kannada merchandise catalog: *Kannada Quote T-Shirts, 'ಬೆಂಗಳೂರು' Water Bottles, Hubballi Cotton Tote Bags, Hampi Heritage Notebooks, and Cultural Sticker Packs.*
- Atomic point deduction, real-time inventory validation, redemption receipt generation, and pilot fulfillment banners.

---

## 🛠️ Technology Stack

- **Frontend**:
  - React 19 + TypeScript + Vite 8
  - Vanilla CSS Design System with responsive grid/flex layouts
  - Lucide React iconography
  - Canvas Confetti for celebratory animations
  - jsPDF for client-side vector certificate generation
  - Web Speech API (SpeechRecognition + SpeechSynthesis)

- **Backend**:
  - Python 3.11 + FastAPI + Uvicorn
  - Google Gemini API (`google-genai` SDK)
  - Pydantic v2 data models
  - CORS Middleware with full environment variable configurability

- **Database / Schema**:
  - PostgreSQL / Supabase ready SQL migration (`backend/migrations/001_initial_maatu_schema.sql`)
  - Row Level Security (RLS) policies protecting user learning logs, certificates, and redemption orders.
  - Stored procedure `redeem_reward_secure` for atomic balance deduction and race-condition prevention.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher) & npm
- Python 3.10 or higher & pip
- Google Gemini API Key (optional for mock speaking, required for live AI feedback)

---

### Backend Setup (PowerShell)

1. Open PowerShell and navigate to the backend directory:
   ```powershell
   cd d:\voice-of-kannada\backend
   ```

2. Install Python dependencies:
   ```powershell
   pip install -r requirements.txt
   ```

3. Configure environment variables:
   ```powershell
   Copy-Item .env.example .env
   ```
   Edit `.env` and set your `GEMINI_API_KEY`:
   ```env
   GEMINI_API_KEY=AIzaSy...
   GEMINI_MODEL=gemini-3.8-flash
   ```

4. Start the FastAPI development server:
   ```powershell
   python -m uvicorn main:app --reload --port 8000
   ```
   *The API will be available at `http://localhost:8000` (Docs: `http://localhost:8000/docs`).*

---

### Frontend Setup (PowerShell)

1. Open another PowerShell window and navigate to the frontend directory:
   ```powershell
   cd d:\voice-of-kannada\frontend
   ```

2. Dependencies are already installed. (If needed on a new machine: `npm install`).

3. Configure environment variables (optional, defaults to `http://localhost:8000`):
   ```powershell
   Copy-Item .env.example .env
   ```

4. Start the Vite dev server:
   ```powershell
   npm run dev
   ```
   *Open your browser at `http://localhost:5173`.*

5. To run the production build check:
   ```powershell
   npm run build
   ```

---

## 🗄️ Database Setup & Supabase Migration

To deploy to production with Supabase or PostgreSQL:
1. Open your Supabase Dashboard or PostgreSQL query tool.
2. Run the SQL script located at:
   `backend/migrations/001_initial_maatu_schema.sql`
3. This creates:
   - Tables: `profiles`, `lessons`, `user_lesson_progress`, `practice_sessions`, `daily_activity`, `user_streaks`, `challenges`, `game_sessions`, `point_transactions`, `user_achievements`, `certificates`, `rewards_catalog`, `reward_redemptions`.
   - Complete Row-Level Security (RLS) policies.
   - Transactional PostgreSQL stored procedure `redeem_reward_secure(...)` for atomic point deduction.
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `frontend/.env`.

---

## 🧪 Verified Test Suite

All the following tests have been executed and verified:
1. **Frontend TypeScript & Production Build**: `tsc -b && vite build` passed with 0 errors.
2. **Backend API Endpoints**:
   - `GET /api/health` → `200 OK`
   - `GET /api/scenarios` → `200 OK` (8 realistic dialogue scenarios)
   - `GET /api/challenges` → `200 OK` (Curated daily challenges)
   - `GET /api/rewards` → `200 OK` (Merchandise catalog)
   - `GET /api/leaderboard` → `200 OK` (Weekly & monthly rankings)
   - `GET /api/verify-certificate/{cert_id}` → `200 OK` for valid IDs, `404 Not Found` for invalid IDs.
   - `POST /api/practice` → Verified with speech evaluation request and fallback resilience.
3. **Audio & Speech Engine**: Native browser Web Speech API detection for Kannada synthesis (`kn-IN`) with fallback to available voices.
4. **Certificate PDF Engine**: Dynamic vector A4 landscape document generation with instant download and visual preview modal.
5. **Gamification Ledger**: Balance reconciliation, idempotency check, and local-first persistence verified.

---

## 📜 License
Developed for the **ಮಾತು (MAATU) — VOICE OF KANNADA** project.
All rights reserved.
