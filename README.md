# Logistic Monorepo Platform

Welcome to the unified monorepo for the **Logistic** platform. This repository organizes the codebases for the **SHG App**, **Transporter App**, and their respective NestJS backend services into a single clean structure, preserving all original code line-for-line without modifications.

---

## 📁 Repository Structure

```text
logistic/
├── apps/
│   ├── shg-app/                  # React Native mobile application for SHG
│   └── transporter-app/          # React Native mobile application for Transporters
├── backend/
│   ├── shg/                      # Shared/SHG NestJS backend service
│   └── transporter/              # Transporter NestJS backend service
├── packages/                     # Placeholder for shared local packages
├── infrastructure/               # DevOps and configuration assets
├── docs/                         # Architecture and documentation
└── scripts/                      # Developer automation scripts
```

---

## 🚀 Running the Apps Locally

Using **npm Workspaces**, you can start any of the applications or services directly from the root folder:

### 📱 Frontend Mobile Apps

* **Start SHG App**:
  ```bash
  npm run shg-app:start
  ```

* **Start Transporter App**:
  ```bash
  npm run transporter-app:start
  ```

### ⚙️ Backend Services

* **Start SHG Backend**:
  ```bash
  npm run shg-backend:dev
  ```

* **Start Transporter Backend**:
  ```bash
  npm run transporter-backend:dev
  ```

---

## 🛠️ Monorepo Integrity & Custom Scaffolding

- All core source files, configurations, assets, and database models remain **exactly as they were in the original development branches**.
- Root-level npm Workspaces link all project workspaces together natively, making dependency resolution and future shared packaging seamless.
