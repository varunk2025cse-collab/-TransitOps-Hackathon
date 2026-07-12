# 🚀 TransitOps AI - Enterprise Fleet Intelligence

This repository contains the complete solution for the TransitOps Odoo Hackathon.

## Architecture
- **Backend**: Odoo 17 (Headless API + ORM + Postgres 15)
- **Frontend**: React 18, Vite, Tailwind CSS, Zustand, React Query

## Quick Start (Demo Mode)

### 1. Start the Backend (Docker)
```bash
docker-compose up -d
```
*This spins up PostgreSQL and Odoo on port 8069. It automatically installs the `transitops_core` module and creates a database named `transitops`.*

### 2. Start the Frontend (Node)
```bash
cd frontend
npm install
npm run dev
```
*Runs the React application on `http://localhost:5173`.*

## 🎬 The 3-Minute Hackathon Demo Script
1. **Open `http://localhost:5173`**
2. **Login**: Use standard Odoo admin credentials (email: `admin`, pass: `admin`).
3. **Dashboard**: Highlight the real-time Fleet Utilization, Operational Cost, and the **AI Fleet Health Score**.
4. **Vehicles**: Register a new vehicle (e.g., Van, 500kg limit).
5. **Dispatch Center**:
   - Attempt to dispatch the van with 600kg cargo. Show how the UI warns and the Backend actively rejects it (Constraint).
   - Adjust weight to 450kg and Dispatch.
   - Show how the vehicle and driver statuses instantly switch to "On Trip".
6. **Trips**: Complete the trip with the final odometer reading and revenue.
7. **Maintenance**: Log an oil change, proving the vehicle drops out of the dispatch pool (status: In Shop).
8. **Dashboard**: Show the ROI and Cost charts updated live.

*Built by the autonomous engineering team.*
