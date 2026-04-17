# 🛠️ ForgeAdmin – Full Stack E-Commerce Dashboard

## 📌 Overview

**ForgeAdmin** is a **full-stack e-commerce management dashboard** built for the **BackForge Hackathon**.

Originally a static frontend, it has now been completely supercharged with a robust **Node.js/Express Backend** and **Firebase Firestore** database integration. This dashboard simulates a real-world store management system with fully functional modules for:

* Products (Full CRUD, Search, Pagination)
* Orders (Complex state management, atomic stock mechanics)
* Inventory (Stock addition, deductions, manual update logs)
* Analytics (Dashboard aggregation)
* Customers (Metadata tracking)
* Promotions
* Staff Management (Role-based Access Control)

---

## 🤖 AI Assistance & Attribution

This project's backend architecture, database integration, and business logic implementation were heavily accelerated using advanced AI coding tools:
* **GitHub Copilot**
* **Claude / Advanced Agentic AI Assistants**

These AI tools were utilized to architect the secure proxy pattern, write the Express controllers, implement the Firebase Admin SDK, and wire all static HTML frontend files seamlessly into a dynamic backend state.

---

## 🚀 Key Features

* **Real Authentication:** Firebase Client Auth combined with secure Backend Token verification.
* **Role-Based Access Control (RBAC):** Admin vs. Staff permission handling mapped directly in backend middleware.
* **Atomic Transactions:** Order completion automatically checks and deducts correct product stock cleanly using Firestore batching.
* **Protective Referential Integrity:** Backend prevents deletion of active categories if products exist inside them.
* **Modular Backend Architecture:** Controllers, Routes, Middleware, and Utils.

---

## 🏗️ System Architecture

ForgeAdmin utilizes a **Secure API Proxy Pattern**:

**1. UI Layer (Frontend)**
* HTML / Vanilla JavaScript
* Tailwind CSS / Font Awesome
* Firebase Client SDK (Auth only)

**2. API Layer (Backend Proxy)**
* Node.js / Express.js
* Custom Middleware (`auth.js`, `roleCheck.js`)
* Validations

**3. Data Layer (Database)**
* Firebase Firestore (NoSQL)
* Firebase Admin SDK allowing privileged backend transactions

---

## 🧰 Tech Stack

**Frontend:** HTML5, CSS3, Tailwind CSS, Vanilla JS
**Backend:** Node.js, Express.js
**Database & Auth:** Firebase (Firestore, Authentication)
**Tooling:** npm, dotenv, CORS

---

## 🚀 How to Run Locally

### 1. Configure Secrets
Ensure you have a Firebase project setup (we used `neurodb-6fcf5`).
You need to put your credentials in two places:
* `js/firebase-config.js` -> Web App API Key
* `backend/.env` -> Firebase Admin SDK Project ID, Email, and Private Key.

### 2. Install & Start
```bash
cd backend
npm install
npm run seed  # Populates your DB with dummy categories, products, and orders
npm run dev   # Starts the Express Server
```

### 3. Open Application
Navigate your browser to `http://localhost:3000`. Create a new account using the UI. Log in, and experience the dashboard!

---

## 📁 Project Structure

```
/
├── backend/
│   ├── controllers/      # Business logic (Orders, Products, Stars, etc.)
│   ├── middleware/       # JWT verification and RBAC
│   ├── routes/           # Express API endpoints
│   ├── utils/            # Validators
│   ├── seed/             # Database population scripts
│   ├── server.js         # Entry point
│   ├── .env              # Secrets (untacked)
├── js/
│   ├── pages/            # View-specific logic (e.g., products.js)
│   ├── api.js            # fetch() wrapper with token injection
│   ├── auth.js           # Firebase auth and session state
│   ├── firebase-config.js# Client configuration
├── index.html            # Login Page
├── style.css             # Global Styles
└── pages/                # All Dashboard Views
```

---

## 🤝 Contribution
This project is part of the **BackForge Hackathon** ecosystem.

## 📜 License
Open for educational and hackathon use.
💡 *Manage smarter. Build faster. Forge better.*
