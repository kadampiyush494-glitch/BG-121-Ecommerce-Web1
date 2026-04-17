<div align="center">

# 🚀 ForgeAdmin
### Full-Stack E-Commerce Management Dashboard

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=white)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

A comprehensive, production-ready admin panel built for the **BackForge Hackathon**, featuring secure authentication, role-based access, and real-time database integration.

</div>

---

## 📌 Overview

**ForgeAdmin** began as a static UI frontend and has now been supercharged into a robust, complete application. By integrating a **Node.js/Express Backend** and **Firebase Firestore**, this dashboard perfectly simulates a real-world store management system.

### Core Modules:
- 📦 **Products:** Full CRUD operations, filtering, and pagination.
- 🧾 **Orders:** Complex state management with atomic stock deduction mechanisms.
- 📊 **Inventory:** Real-time stock addition, deductions, and manual update logging.
- 📈 **Analytics:** Aggregation of live dashboard metrics.
- 👥 **Customers & Staff:** Metadata tracking and Role-Based Access Control (RBAC).

---

## 🤖 AI Assistance & Attribution

> **Built smarter, shipped faster.**

This project's backend architecture, database integration, and complex business logic were heavily accelerated using advanced AI coding tools. We proudly acknowledge the use of:

* [![GitHub Copilot](https://img.shields.io/badge/GitHub%20Copilot-black?style=flat-square&logo=github&logoColor=white)](#) For accelerated code generation and API structuring.
* [![Claude AI](https://img.shields.io/badge/Claude%20AI-D97757?style=flat-square&logo=anthropic&logoColor=white)](#) / **Advanced Agentic AI Assistants** for architecting the secure proxy pattern, writing intelligent Express controllers, implementing the Firebase Admin SDK, and wiring static files to dynamic states.

---

## 🔥 Key Features

- 🔐 **Real Authentication:** Firebase Client Auth combined with secure Backend Token validation intercepts.
- 🛡️ **Role-Based Access Control (RBAC):** `Admin` vs. `Staff` permission handling mapped tightly via backend middleware.
- ⚡ **Atomic Transactions:** Completing an order automatically guarantees correct product stock deduction using Firestore batch actions.
- 🔗 **Referential Integrity:** The backend actively prevents the deletion of active categories if they contain existing products.
- 🧩 **Modular Architecture:** Clean separation of concerns (Controllers, Routes, Middleware, Utils).

---

## 🏗️ System Architecture

ForgeAdmin utilizes a **Secure API Proxy Pattern** to protect client data.

### 1. UI Layer (Frontend)
* Pure HTML5 / Vanilla JavaScript
* Tailwind CSS / Font Awesome
* Firebase Client SDK *(For Auth only)*

### 2. API Layer (Backend Proxy)
* Node.js / Express.js
* Custom Security Middleware (`auth.js`, `roleCheck.js`)
* Centralized Data Validation

### 3. Data Layer (Database)
* Firebase Firestore (NoSQL)
* Firebase Admin SDK *(Used in backend for privileged transactions)*

---

## 🚀 How to Run Locally

### 1. Configure Secrets
Ensure you have a Firebase project setup (e.g. `neurodb-6fcf5`). You need to configure credentials in two specific locations:
* **Frontend:** Add your Web App API Key inside `js/firebase-config.js`
* **Backend:** Add your Admin SDK Project ID, Service Email, and Private Key inside `backend/.env`

### 2. Install & Start Server
```bash
# Navigate to the backend directory
cd backend

# Install all NodeJS Dependencies
npm install

# (Optional) Populate your clean database with dummy products & orders!
npm run seed

# Start the Express Development Server
npm run dev
```

### 3. Access Dashboard
Once the server is running on **port 3000**, open your browser and navigate to:
👉 `http://localhost:3000`

*Click "Create an account" to register your first Admin user!*

---

## 📁 Project Structure

```text
/
├── backend/
│   ├── controllers/      # Business logic (Orders, Products, Stars, etc.)
│   ├── middleware/       # JWT verification and RBAC checks
│   ├── routes/           # Express API endpoints mapping
│   ├── utils/            # Shared validators
│   ├── seed/             # Database population scripts
│   ├── server.js         # Backend Entry point
│   └── .env              # Secrets (untacked)
├── js/
│   ├── pages/            # View-specific logic (e.g., products.js)
│   ├── api.js            # fetch() wrapper with token injection
│   ├── auth.js           # Firebase auth and session state
│   └── firebase-config.js# Client configuration
├── index.html            # Login Page
├── style.css             # Global Styles
└── pages/                # All Dashboard Views
```

---

## 🤝 Contribution & License
This project is part of the **BackForge Hackathon** ecosystem. Open for educational and hackathon use.

<div align="center">
💡 <i>Manage smarter. Build faster. Forge better.</i>
</div>
