# PHARR ✦ AI-Powered Inventory Orchestration

![PHARR Logo](/public/logo.png)

**PHARR** is a state-of-the-art, AI-driven pharmaceutical inventory orchestration platform designed for speed, compliance, and intelligence. It empowers healthcare providers and distributors to manage complex inventories with real-time monitoring, automated compliance checks, and a powerful AI agent.

---

## 🚀 Key Features

- **✦ Intelligent Orchestrator**: A conversational AI agent (powered by Gemini) that understands your inventory schema and performs complex queries, updates, and analysis.
- **📦 Dynamic Inventory**: Highly flexible inventory management with customizable schemas to fit any pharmaceutical workflow.
- **🛡️ Risk & Compliance Monitor**: Real-time tracking of expiry dates, low stock, and regulatory compliance (DSCSA, NDC).
- **📝 Immutable Audit Log**: A cryptographically signed record of every change, ensuring complete transparency and accountability.
- **🔐 Enterprise-Grade Security**: Built-in 2FA, session management, and robust data isolation.
- **🎨 Clinical Dark Mode**: A premium, high-contrast interface designed for professional medical environments.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, Framer Motion
- **AI Engine**: Vercel AI SDK, Google Gemini 2.5 Flash
- **Database**: PostgreSQL with Prisma ORM
- **State Management**: Zustand
- **Security**: Speakeasy (2FA), JSON Web Tokens (JWT)

---

## 🚦 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Google AI API Key (Gemini)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/nullcraft/pharr.git
   cd pharr
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure Environment**:
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/pharr"
   GOOGLE_GENERATIVE_AI_API_KEY="your_api_key_here"
   JWT_SECRET="your_secret_here"
   ```

4. **Initialize Database**:
   ```bash
   npx prisma db push
   ```

5. **Run Development Server**:
   ```bash
   pnpm dev
   ```

---

## 📖 Architecture

PHARR follows a modern Next.js App Router architecture:

- `/app`: Root layouts, authentication, and the main application shell.
- `/app/api`: Serverless API routes for auth, inventory, and AI orchestration.
- `/components`: Reusable UI components built with a "Clinical" design language.
- `/store`: Global state management for user sessions and AI provider configs.
- `/lib`: Core utilities for authentication, database pooling, and AI SDK integration.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

Built with ✦ by **NULLCRAFT**
