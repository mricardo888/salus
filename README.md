# Salus 🛡️
**The privacy-first 'Coordination of Benefits' engine.**

[![Hackathon](https://img.shields.io/badge/UofTHacks-13-blue)](https://uofthacks.com)
[![Devpost](https://img.shields.io/badge/Devpost-Project_Page-003E54)](https://devpost.com/software/salus-9javs3)
[![Award](https://img.shields.io/badge/Winner-Best_Use_of_MongoDB_Atlas-green)](https://mongodb.com)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

> *"Financial toxicity is the new medical crisis."*

---

## 💡 Inspiration
It started with a simple observation: **The most expensive part of healthcare isn't the medicine—it's the bureaucracy.**

Meet **Maria**. She is 75, speaks only Portuguese, and just received a **$5,000 hospital bill**.
She has a confusing private insurance policy from her late husband and potential eligibility for government aid. But she doesn't know who pays first, she can't understand the complex "Coordination of Benefits" clauses, and she is terrified to upload her Identity Documents to a random AI website.

We built **Salus** to be her advocate. It’s a **local-first** AI agent that lives in her browser, speaks her language, and mathematically solves her billing crisis by stacking private insurance with government aid—driving her cost to **$0**.

## 🚀 What It Does
Salus is a **Universal Benefits Engine** that operates on a Zero-Trust architecture.

1.  **Secure Vault:** Users log in using **1Password Passkeys**. This isn't just authentication; the Passkey actually decrypts a local browser vault containing their SIN and Policy IDs. **No PII ever touches our server.**
2.  **Multi-Agent Reasoning:** We use **LangGraph** to orchestrate 4 specialized AI agents that read the bill, check private insurance rules, check public government laws, and calculate the final coverage stack.
3.  **Dual-Region Scalability:** Salus works across borders. With a single toggle, it swaps its legal knowledge base from **Ontario (OHIP)** to **New York (Medicaid)**.
4.  **Voice Accessibility:** Using **ElevenLabs**, Salus speaks to the user in their native language, making complex financial advice accessible to the elderly and blind.

## ⚙️ How We Built It
We used a **Local-First, Hybrid-Cloud Architecture**:

### **The Stack**
* **Frontend:** Next.js, Tailwind CSS, WebAuthn (Native).
* **Backend:** Python FastAPI, LangGraph.
* **AI Models:** Google Gemini 1.5 Pro (Reasoning), ElevenLabs (Voice), OpenAI Whisper (STT).
* **Database:** MongoDB Atlas (Vector Search for Laws + Document Store for Insurance Plans).
* **DevOps:** Vercel (Hosting).

### **The Architecture**
```mermaid
graph TD
    User[User (Browser)] -->|Passkey Auth| LocalVault[Local Vault (Encrypted PII)]
    User -->|Voice Stream| Backend[FastAPI Server]
    Backend -->|Orchestration| Agents[LangGraph Agents]
    Agents -->|Vector Search| MongoDB[MongoDB Atlas (Public Laws)]
    Agents -->|Reasoning| Gemini[Gemini 1.5 Pro]
    Agents -->|TTS| ElevenLabs[ElevenLabs API]
    Agents -->|Result| Frontend[UI Coverage Stack]

```

## 🧠 The Logic (Foresters "Multi-Agent Mind")

To solve the "Coordination of Benefits" problem, we built a 4-node graph:

1. **The Extractor:** Uses **Gemini 1.5 Pro** to read the bill and extract service codes (e.g., "ER Visit - $5,000").
2. **The Actuary:** Queries our Mock Insurance DB to apply private policy rules (e.g., "Sun Life pays 80%").
3. **The Social Worker:** Queries **MongoDB Vector Search** to find government grants for the remainder.
4. **The Coordinator:** Calculates the final stack (`Bill - Private - Public = $0`) and maps the data to PDF forms.

*> Check the "Debug Panel" in the UI to see these agents thinking in real-time!*

## 🛡️ Security (1Password "Best Security Hack")

We implemented a **Zero-Knowledge Architecture**.

* Standard apps store user data in a database.
* **Salus stores user data in `localStorage` encrypted with AES-256.**
* The encryption key is wrapped by the **WebAuthn (Passkey)** protocol.
* The server receives "Anonymized Facts" (e.g., "User Income: <$20k") but never the Identity itself.

## 🌍 Health Equity (Verily "Future of Healthcare")

We addressed **Financial Toxicity**—the leading cause of bankruptcy in the US. By combining **ElevenLabs** (Language Access) with **Gemini** (Legal Literacy), we ensure that non-native speakers and the elderly can access the same financial benefits as everyone else.

## 🔧 Getting Started

### Prerequisites

* Node.js 18+
* Python 3.11+
* API Keys: Gemini, MongoDB, ElevenLabs, 1Password Service Account.

### Installation

1. **Clone the repo**
```bash
git clone [https://github.com/yourusername/salus.git](https://github.com/yourusername/salus.git)
cd salus

```


2. **Setup Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

```


3. **Setup Frontend**
```bash
cd frontend
npm install
npm run dev

```


4. **Access the App**
Open `http://localhost:3000` and unlock the vault!

## 🏆 Prize Tracks Targeted

* **Verily:** Advancing Health Equity (Financial Toxicity Solution).
* **Foresters:** Multi-Agent Orchestration (LangGraph + Debug Panel).
* **1Password:** Best Security Hack (Local Decryption via Passkeys).
* **Google:** Best Use of Gemini (Long-Context Policy Analysis).
* **MongoDB:** 🏆 **WINNER: Best Use of MongoDB Atlas** (Vector Search + Hybrid Data).
* **ElevenLabs:** Best Voice AI (Streaming WebSockets).

## 👥 The Team

Built with ❤️ at UofTHacks 13.

---

*Salus: Protecting Identity. Restoring Dignity.*

