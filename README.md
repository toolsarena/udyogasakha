# UdyogaSakha

**Foundation-Governed Udyoga Facilitation Ecosystem**

A structured platform connecting seekers and providers of opportunities — jobs, service engagement roles, projects, and enterprise initiatives — under a transparent trust framework.

## Tech Stack
- **Backend**: Node.js + Express + SQLite (better-sqlite3)
- **Frontend**: React 18 + React Router
- **Auth**: JWT + bcrypt
- **Deployment**: Render.com (free tier)

## Phase 1 Modules (Active)
- Employment Exchange (full-time, part-time, contract, advisory)
- Service Engagement Roles (pujaris, traditional cooks, event coordinators)
- Trust Framework (L0–L2)
- Moderation & Governance Dashboard
- Complaint Handling & Audit Logging

## Local Setup

### Backend
```bash
cd backend
npm install
npm run init-db
npm run dev
```
Runs on http://localhost:3001

### Frontend
```bash
cd frontend
npm install
npm start
```
Runs on http://localhost:3000

### Default Admin
- Email: admin@udyogasakha.org
- Password: admin123

## Deployment
Push to GitHub and connect to [Render.com](https://render.com) — the `render.yaml` blueprint handles everything.

## Trust Levels
| Level | Name | How |
|-------|------|-----|
| L0 | Registered | Create account |
| L1 | Document Verified | Submit ID for review |
| L2 | Foundation Screened | Pass structured screening |
| L3 | Domain Expert Certified | Panel endorsement (Phase 2) |
| L4 | Community Endorsed | Reputation over time (Phase 3) |
