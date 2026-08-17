# CYRA.AI

### Research Intelligence OS for Adaptive Learning

> Transforming academic research into personalized, intelligent learning experiences.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20Database-3ECF8E?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)
[![AI Powered](https://img.shields.io/badge/AI-Powered-purple)](#)
[![Status](https://img.shields.io/badge/Status-Active%20Development-orange)](#)

---

## 🧠 What is CYRA.AI?

CYRA.AI is an AI-powered **Research Intelligence OS** designed to bridge the gap between academic research and personalized learning.

Traditional research tools help users **find information**.

Traditional learning platforms help users **consume information**.

CYRA.AI aims to connect both.

It takes complex research, papers, documents, and knowledge sources and transforms them into **adaptive learning experiences tailored to the individual learner**.

### The core idea

```text
Research
   ↓
AI Understanding
   ↓
Knowledge Extraction
   ↓
Learner Modeling
   ↓
Adaptive Learning Path
   ↓
Personalized Learning
   ↓
Feedback & Improvement
🚀 Why CYRA.AI?

Modern students and researchers face a problem of information overload.

There are millions of:

Research papers
Articles
Books
Lecture notes
PDFs
Datasets
Technical documents

But having access to information doesn't automatically mean understanding it.

CYRA.AI focuses on answering:

"What should I learn next, and how should I learn it?"

instead of simply:

"What information exists?"

✨ Core Features
🔐 Multi-Method Authentication

CYRA.AI provides a professional authentication experience with:

Email & Password
Google OAuth
Apple OAuth
Phone authentication / OTP
Secure Supabase authentication
OAuth callback handling
Session persistence
Protected routes

Authentication is designed so each login method maintains its own loading and error state.

🔬 Research Intelligence

CYRA.AI is designed to transform research material into structured knowledge.

Potential processing pipeline:

Research Paper / PDF
        ↓
Document Processing
        ↓
Semantic Understanding
        ↓
Key Concepts
        ↓
Relationships
        ↓
Knowledge Graph
        ↓
Learning Modules

Instead of forcing learners to read hundreds of pages blindly, CYRA.AI can identify:

Important concepts
Prerequisites
Core ideas
Related topics
Knowledge gaps
Difficulty levels
Recommended learning sequences
🧬 Adaptive Learning

Every learner is different.

CYRA.AI is designed around an evolving learner profile.

Learner
   ↓
Knowledge Level
   ↓
Learning Behavior
   ↓
Performance
   ↓
Weak Areas
   ↓
Learning Preferences
   ↓
Adaptive Recommendations

The platform can use learner interactions and performance to continuously adjust the learning experience.

📚 Personalized Knowledge Paths

Instead of a fixed curriculum:

Topic A → Topic B → Topic C → Topic D

CYRA.AI aims to generate:

                 ┌── Topic B
                 │
Topic A ─────────┼── Topic C ─── Advanced Topic
                 │
                 └── Topic D

The learning path can change depending on the learner.

🤖 AI-Powered Learning

CYRA.AI can be extended to provide:

AI explanations
Research summarization
Question generation
Concept breakdowns
Personalized quizzes
Difficulty adaptation
Learning recommendations
Research-to-course generation
Knowledge gap detection
🏗️ Architecture
                    ┌─────────────────────┐
                    │      CYRA.AI        │
                    │      Frontend       │
                    │      Next.js        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    Application      │
                    │       Logic         │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       ┌────────────┐   ┌────────────┐   ┌────────────┐
       │ Supabase   │   │ AI Layer   │   │ Research   │
       │ Auth       │   │            │   │ Processing │
       └────────────┘   └────────────┘   └────────────┘
              │                │                │
              └────────────────┼────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │ Learner Intelligence│
                    │      Layer          │
                    └─────────────────────┘
🛠️ Tech Stack
Technology	Purpose
Next.js	Full-stack React framework
React	User interface
TypeScript	Type-safe development
Tailwind CSS	Styling and responsive UI
Supabase	Authentication and backend services
PostgreSQL	Relational data storage
OAuth 2.0	Social authentication
AI / LLM APIs	Research intelligence and adaptive learning
Vercel	Deployment
📁 Project Structure
CYRA.AI/
│
├── public/
│   ├── images/
│   └── assets/
│
├── src/
│   └── app/
│       ├── login/
│       │   └── page.tsx
│       │
│       ├── signup/
│       │   └── page.tsx
│       │
│       ├── auth/
│       │   └── callback/
│       │       └── route.ts
│       │
│       ├── overview/
│       │   └── page.tsx
│       │
│       └── ...
│
├── components/
│
├── lib/
│   └── supabase/
│
├── .env.local
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md
⚙️ Getting Started
1. Clone the repository
git clone https://github.com/aarnavchhabra03-sudo/CYRA.AI.git
cd CYRA.AI
2. Install dependencies
npm install
3. Configure environment variables

Create a .env.local file:

NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

NEXT_PUBLIC_SITE_URL=http://localhost:3000
Important

Never commit:

.env
.env.local
.env.production

to GitHub.

Make sure they are included in .gitignore.

🔐 Authentication Setup

CYRA.AI uses Supabase Authentication.

Supported authentication methods include:

Email
Google
Apple
Phone / OTP

For Google OAuth:

CYRA.AI
   ↓
Supabase Auth
   ↓
Google OAuth
   ↓
Supabase Callback
   ↓
CYRA.AI /auth/callback

The Google OAuth redirect URI must match the Supabase callback URL configured in Google Cloud.

▶️ Run the Development Server
npm run dev

Open:

http://localhost:3000

Login:

http://localhost:3000/login
🧪 Development Checks

Before pushing changes:

npx tsc --noEmit

Then:

npm run build

Finally:

npm run dev

A clean development cycle should be:

Code
 ↓
Type Check
 ↓
Build
 ↓
Run
 ↓
Test
 ↓
Commit
🔒 Security

CYRA.AI follows security practices including:

Supabase-managed authentication
OAuth-based authentication
Server-side OAuth callback handling
Environment variables for secrets
Protected application routes
No hardcoded API keys
No client-side exposure of private secrets
Never commit secrets

Do NOT commit:

Supabase service role keys
OAuth client secrets
API keys
Database passwords
.env.local
🗺️ Roadmap
Phase 1 — Foundation
 Next.js application
 Modern UI
 Authentication interface
 Email authentication
 Supabase integration
 Google OAuth integration
 Apple OAuth production configuration
 Phone OTP production configuration
Phase 2 — Research Intelligence
 PDF upload
 Research paper ingestion
 Document parsing
 AI summarization
 Key concept extraction
 Citation analysis
 Semantic search
 Knowledge graph
Phase 3 — Adaptive Learning
 Learner profile
 Knowledge-level estimation
 Knowledge gap detection
 Personalized learning paths
 Adaptive quizzes
 Difficulty adjustment
 Learning analytics
Phase 4 — Intelligence OS
 Research workspace
 AI research assistant
 Cross-paper reasoning
 Personal knowledge graph
 Research-to-course generation
 AI study companion
 Long-term learner modeling
💡 Vision

CYRA.AI is not intended to be another:

Search engine.

PDF reader.

AI chatbot.

Online course platform.

The long-term vision is to build an intelligence layer between research and learning.

              HUMAN KNOWLEDGE
                     │
                     ▼
              ┌─────────────┐
              │   CYRA.AI   │
              │             │
              │ Understand  │
              │ Organize    │
              │ Personalize │
              │ Adapt       │
              └──────┬──────┘
                     │
                     ▼
             HUMAN UNDERSTANDING
🌍 Impact

CYRA.AI aims to help:

🎓 Students

Understand complex academic material faster.

🔬 Researchers

Navigate large volumes of research more efficiently.

👨‍🏫 Educators

Create personalized learning experiences.

🧠 Lifelong Learners

Build continuously evolving knowledge paths.

🤝 Contributing

Contributions are welcome.

Fork the repository.
Create a feature branch.
git checkout -b feature/amazing-feature
Commit your changes.
git commit -m "feat: add amazing feature"
Push the branch.
git push origin feature/amazing-feature
Open a Pull Request.
📜 License

This project is currently under development.

License information will be added as the project approaches public release.

👨‍💻 Built With

CYRA.AI

Research Intelligence OS for Adaptive Learning.

Built with curiosity, AI, research, and a desire to rethink how humans learn.

<p align="center">
🧠 Research → Intelligence → Learning

CYRA.AI

</p> ```
