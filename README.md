# 🏢 Multi-Tenant Attendance Management System

![Project Status](https://img.shields.io/badge/Status-Production-success?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-React%20Native%20|%20Node.js%20|%20PostgreSQL-blue?style=for-the-badge)

A robust, enterprise-grade attendance and HR management system built with a **Multi-Tenant Architecture**. Designed to handle multiple companies (tenants) within a single deployed instance, keeping each company's data securely isolated in its own PostgreSQL schema.

> **Live Demo:** [https://presensi.yexsx.my.id](https://presensi.yexsx.my.id)

---

## ✨ Key Features

### 🛡️ Multi-Tenant Architecture
- Single backend application serving multiple companies securely.
- **Data Isolation:** Each company (tenant) gets its own isolated PostgreSQL schema.
- Automatic schema provisioning and migrations using Prisma.

### 📍 Advanced Attendance Tracking
- **Geolocation Validation:** Validates check-in/out coordinates against the office radius.
- **Facial Recognition:** Verifies employee identity during attendance.
- **Flexible Work Hours:** Configurable start/end times per employee with automated late status.
- **Break Time Tracking:** Record start and end times for employee rest periods.

### 💼 HR & Administration
- **Correction System:** Employees can request attendance corrections (time adjustments), subject to admin approval.
- **Leave Management:** Complete workflow for leave requests (sick, annual, unpaid).
- **Automated Payroll:** Automatically calculates net salary based on base pay, late deductions, and working days.
- **Task Management:** Assign and track employee tasks.

### 🏢 Super Admin Dashboard
- **Billing Generation:** Automatically generate monthly subscription bills for all registered tenants based on active user counts.
- **Tenant Management:** Provision, activate, or deactivate companies from a central hub.

---

## 🛠️ Technology Stack

**Frontend (Mobile & Web)**
- **Framework:** React Native & Expo
- **Routing:** Expo Router
- **Networking:** Axios
- **Styling:** Custom StyleSheet System

**Backend (API)**
- **Runtime:** Node.js & Express.js
- **ORM:** Prisma
- **Database:** PostgreSQL (utilizing dynamic Multi-Schema routing)
- **Security:** JSON Web Tokens (JWT) & bcrypt

**Infrastructure & Deployment**
- **Server:** Ubuntu VPS
- **Process Manager:** PM2
- **Reverse Proxy:** Nginx
- **Security:** SSL/TLS managed by Certbot (Let's Encrypt)

---

## 🚀 Live Demo & Testing

You can test the application using the following dummy data:

**1. Super Admin / Company Dashboard (Web)**
- **URL:** [https://presensi.yexsx.my.id](https://presensi.yexsx.my.id)
- **Email:** `restokingbabyayy@gmail.com`
- **Password:** `Resto123`

**2. Employee App (Mobile/Web)**
- **URL:** [https://presensi.yexsx.my.id](https://presensi.yexsx.my.id)
- **Test Employee Email:** `husna@restoking.com` (or any other generated employee email)
- **Password:** `user123`

---

## ⚙️ Installation & Local Development

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL
- PM2 (for production)

### 2. Backend Setup
```bash
cd absensi
npm install
# Set up .env variables (DATABASE_URL, JWT_SECRET, PORT)
npx prisma generate
npx prisma db push
```

### 3. Frontend Setup
```bash
cd mobile
npm install
# Configure API URL in src/services/api.ts
npm start
```

### 4. Production Deployment
This project is configured to run on a VPS using PM2 and Nginx. The `ecosystem.config.js` is provided to spin up both the Node server and the static web bundle concurrently.

```bash
# Compile Frontend
cd mobile && npx expo export:web

# Start PM2
cd ../absensi
pm2 start ecosystem.config.js --update-env
```

---
*Created by Aziz Zarkasyi - Feel free to reach out for feedback or collaboration!*
