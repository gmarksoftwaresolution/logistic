# GMU Logistics Platform
## Complete Project Documentation & Master Onboarding Guide
**Version:** 1.0.0  
**Company:** Gramuunati Logistics (GMU)  
**Target Audience:** Interns, Developers, QA Testers, & New Engineering Team Members  
**Last Updated:** August 2026  

---

## How to Use this Guide

Welcome to the **GMU Logistics Engineering Team**! This guide serves as your comprehensive handbook to understand the business operations, system architecture, database schema, mobile & web applications, and developer workflows of the GMU Logistics Monorepo platform.

> [!IMPORTANT]
> **Reading Roadmap for New Team Members:**
> 1. **Day 1 (Mandatory Start):** Read **Section 1 (Project Introduction)** through **Section 5 (User Roles)** to understand *why* the platform exists and *how* rural logistics operates.
> 2. **Day 2 (Environment Setup):** Work through **Section 8 (Project Structure)**, **Section 9 (Requirements & Installation)**, **Section 10 (Environment Configuration)**, and **Section 12 (How to Run the Project)**.
> 3. **Week 1 (Core Concepts):** Study **Section 11 (Database & Prisma)**, **Section 14 (Complete Module Documentation)**, **Section 15 (Order Status Lifecycle)**, and **Section 16 (QR & OTP Workflow)**.
> 4. **Reference Material:** Keep **Section 19 (Common Errors)**, **Section 23 (Commands Cheat Sheet)**, and **Section 25 (Final Checklist)** bookmarked for daily engineering work.

> [!WARNING]
> **Security Notice regarding Secrets & Credentials:**
> Never commit real database URLs, JWT secret keys, API keys, or production environment files (`.env`) to GitHub or public repositories. Always use `.env.example` templates and keep actual credentials stored securely in password managers or developer secret vaults.

---

## Section 1: Project Introduction

### 1.1 What is GMU Logistics?
**GMU Logistics** (Gramuunati Logistics) is a hyper-local, multi-leg supply chain and logistics engine engineered specifically for rural and semi-urban India. It empowers micro-entrepreneurs, Self Help Groups (SHGs), local village producers, and regional transporters by connecting them to broader commercial markets.

### 1.2 Why it Was Built: The Rural Logistics Problem
In traditional logistics networks, major courier services (like BlueDart, Delhivery, or FedEx) operate effectively between tier-1 and tier-2 cities. However, they struggle with **rural first-mile pickup** and **last-mile delivery** due to:
* **Unstructured Geography:** High cost of picking up small product batches from remote villages.
* **Lack of Aggregation:** Rural artisans, farmers, and SHGs produce goods in small quantities without localized consolidation centers.
* **Transport Fragmentation:** Regional drivers and local vehicles (pickups, milk vans, 3-wheelers) operate on fixed routes without integration into digital tracking platforms.

```text
[Rural Artisans / SHGs] ---> (Unorganized Village Transport) ---> [High Freight Costs] ---> [Limited Market Access]
```

### 1.3 Business Objective
GMU Logistics bridge this gap by digitizing the village ecosystem:
1. **First-Mile Aggregation:** Local SHG members and Community Resource Persons (CRPs) collect packages directly from village producers.
2. **Middle-Mile Efficiency:** Regional transporters load consolidated cargo from village pickup nodes and transport it to the central **Gramuunati (GMU) Warehouse Hub**.
3. **Last-Mile Delivery:** Goods are dispatched from the central hub to target district SHG nodes for direct delivery to end buyers.

### 1.4 How GMU Hub Connects SHGs and Transporters
The **GMU Hub** acts as the central intelligence server and physical sorting node. It orchestrates:
* Automated routing of orders based on service pincodes.
* Intelligent vehicle matching for transporters based on parcel weights.
* Dual-sided OTP and QR code handovers to prevent theft or parcel misplacement.

### 1.5 Real-World Example
* **Scenario:** An SHG in a remote village in Odisha produces 20 kg of handmade organic turmeric. A buyer in a nearby city orders this product online.
* **Execution:**
  1. The local SHG CRP accepts the order on the `SHG Mobile App` and visits the seller to package and generate QR labels.
  2. A local milk van driver registered on the `Transporter Mobile App` picks up the box while on their morning route and drops it at the central `GMU Hub`.
  3. The `GMU Hub Web Dashboard` logs receipt, performs quality checks, and assigns a last-mile delivery transporter.
  4. The last-mile transporter drops the box to the destination village SHG, who delivers it to the buyer's doorstep.

### Why This Matters
Understanding the business motivation ensures that every line of code you write—whether a database index or a mobile screen button—serves the real-world goal of empowering rural producers and eliminating delivery friction.

---

## Section 2: What is GMU Logistics?

The GMU Logistics network is divided into four distinct logistical legs plus reverse logistics:

```mermaid
flowchart LR
    A[First-Mile: Seller to SHG Node] --> B[Middle-Mile: Transporter to GMU Hub]
    B --> C[Central Warehousing & QC]
    C --> D[Middle-Mile: GMU Hub to Drop SHG]
    D --> E[Last-Mile: Drop SHG to Buyer]
    E -.-> F[Reverse Logistics: Buyer Return to Seller]
```

### 2.1 Logistics Breakdown

| Logistics Leg | Description | Real-World Example | Primary Technology |
| :--- | :--- | :--- | :--- |
| **First-Mile** | Collection of goods from individual village sellers by a local SHG member. | CRP visits a village artisan's home, verifies 5 terracotta pots, affixes QR codes, and records pickup. | `SHG Mobile App` |
| **Middle-Mile** | Transportation of aggregated goods between village SHG points and the central GMU Warehouse Hub. | A 3-wheeler pickup driver collects 10 parcels from 3 village SHGs and transports them to the central hub. | `Transporter Mobile App` & `GMU Hub` |
| **Last-Mile** | Final delivery of parcels from the destination SHG node to the buyer's home. | Destination SHG member carries the parcel to the buyer's doorstep and collects the delivery OTP. | `SHG Mobile App` |
| **Reverse Logistics** | Return flow for damaged, defective, or rejected items back to the hub/seller. | Buyer rejects a parcel due to transit damage; SHG scans the barcode and initiates a `ReturnOrder`. | `SHG App`, `Transporter App`, `GMU Hub` |

### Why This Matters
Logistics is modular. Recognizing which leg a backend endpoint or app screen belongs to prevents bugs in order assignment, status tracking, and commission calculations.

---

## Section 3: What the Platform Does

| Area | Purpose | Key Functionality |
| :--- | :--- | :--- |
| **GMU Hub** | Central administrative control center web dashboard. | Warehouse inventory management, QC approval, order dispatching, driver approvals, system analytics. |
| **SHG App** | Mobile app for Self Help Group members / CRPs. | First-mile seller pickups, village package aggregation, last-mile doorstep deliveries, local earnings tracking. |
| **Transporter App** | Mobile app for commercial drivers and logistics providers. | Route selection, vehicle registration, batch QR scanning, hub drop-offs, trip earnings tracking. |
| **Parcel Tracking** | Granular box-level tracking system. | Maintains real-time location history, timestamp logs, and handler identity for every parcel box. |
| **QR Code System** | Digital identity for physical packages. | Unique dynamic QR image generation (`qrCodeValue`, `qrImage`) for instant phone camera scanning. |
| **OTP System** | Dual-verification security for handovers. | 4-digit code generated on sender's device and verified on recipient's device to validate physical handoffs. |
| **Warehouse** | Physical and digital storage node management. | Tracks bin storage (`STORED`), quality control (`QC_PASSED`), order batching, and outbound dispatching. |
| **Returns** | Management of return orders (`ReturnOrder`). | Handles buyer return requests, barcode tracking, return parcel scan histories, and seller return delivery. |
| **Earnings** | Automated commission distribution platform. | Calculates distance, weight, and leg-based commissions credited to SHGs and Transporters upon success. |

### Why This Matters
Each area fulfills a distinct role in the ecosystem. Clean separation of concerns across these areas keeps our monorepo scalable and maintainable.

---

## Section 4: Complete Business Flow

### 4.1 End-to-End Order Lifecycle Flow

```mermaid
sequenceDiagram
    autonumber
    actor Buyer
    actor Seller
    actor SHG_Pickup as Pickup SHG (CRP)
    actor Transporter as Transporter Driver
    actor GMU_Hub as GMU Hub Admin
    actor SHG_Drop as Drop SHG Member

    Buyer->>Seller: Places Order (MasterOrder Created)
    Seller-->>SHG_Pickup: Broadcast / Pickup Order Notification
    SHG_Pickup->>Seller: Visits Seller, inspects items, generates Parcel QR
    Seller->>SHG_Pickup: Provides Seller Handover OTP
    Note over SHG_Pickup: Status: PARCEL_PICKED
    Transporter->>SHG_Pickup: Arrives at Village Node, batch scans Parcel QRs
    SHG_Pickup->>Transporter: Provides SHG Handover OTP
    Note over Transporter: Status: IN_TRANSIT_TO_HUB
    Transporter->>GMU_Hub: Unloads parcels at Central Warehouse Hub
    GMU_Hub->>GMU_Hub: Scans QRs, performs QC, updates status to STORED
    Note over GMU_Hub: Warehouse Inventory Management
    GMU_Hub->>Transporter: Assigns Outbound Drop Transporter
    Transporter->>SHG_Drop: Transports & delivers parcels to Destination Village SHG
    SHG_Drop->>Transporter: Provides Destination Handover OTP
    Note over SHG_Drop: Status: PARCEL_AT_DROP_SHG
    SHG_Drop->>Buyer: Visits Buyer doorstep for delivery
    Buyer->>SHG_Drop: Shares Buyer Delivery OTP
    Note over Buyer: Status: DELIVERED (Earning Credited)
```

> [!IMPORTANT]
> **The Golden Chain of Handovers:**
> Notice that a parcel NEVER moves from one person to another without TWO actions:
> 1. **Physical Scan of the Parcel QR Code** (Proves the recipient has the physical box).
> 2. **Verification of the Handover OTP** (Proves the sender authorized the transfer).

### Why This Matters
If a parcel is lost, the combination of QR scans and OTP verifications allows developers and admins to identify the exact person who last held physical custody of the box.

---

## Section 5: User Roles

| Role Name | Platform Interface | Core Responsibilities | Database Enum Value |
| :--- | :--- | :--- | :--- |
| **Super Admin** | GMU Hub (Web) | Full platform control, system configuration, global analytics, admin user management. | `SUPER_ADMIN` |
| **GMU Admin** | GMU Hub (Web) | Warehouse oversight, driver onboarding approval, order rerouting, QC validation. | `ADMIN` |
| **SHG Member / CRP** | SHG App (Mobile) | First-mile seller pickups, village package aggregation, last-mile delivery, earning tracking. | `SHG` |
| **Individual SHG** | SHG App (Mobile) | Independent local service provider managing localized pickup/drop tasks. | `INDIVIDUAL` |
| **Transporter** | Transporter App (Mobile) | Inter-village and hub transport, vehicle capacity management, route execution. | `TRANSPORTER` |
| **Seller** | Seller / E-com Integration | Product listing, stock availability, parcel preparation, seller OTP generation. | `SELLER` |
| **Buyer** | Consumer E-com Interface | Order placement, delivery address input, item receipt, delivery OTP verification. | `BUYER` |

> [!NOTE]
> **Developer Tip on Role Guards:**
> In the NestJS backend, API endpoints are protected using `@Roles(UserRole.ADMIN, UserRole.SHG)` decorators combined with standard `JwtAuthGuard` and `RolesGuard`.

### Why This Matters
Security and data integrity depend on strict Role-Based Access Control (RBAC). Always ensure API requests validate user roles before returning sensitive logistics data.

---

## Section 6: Technology Used

| Technology | Simple Meaning | Role & Use in GMU Logistics |
| :--- | :--- | :--- |
| **React (v19)** | UI JavaScript Library | Powers the `GMU-hub` web administration dashboard interface. |
| **React Native (v0.81)** | Mobile Application Framework | Enables native Android/iOS mobile apps using JavaScript/TypeScript. |
| **Expo SDK (v54)** | React Native Tooling & Suite | Provides mobile hardware access: camera for QR scanning, location, and push notifications. |
| **Tailwind CSS (v4)** | Utility-first CSS Framework | Used in `GMU-hub` web interface for modern, responsive dashboard styling. |
| **NativeWind (v4)** | Tailwind for React Native | Utility styling solution for custom mobile UI design in `shg-app`. |
| **NestJS (v10)** | Progressive Node.js Backend Framework | Modular, strongly-typed server framework hosting our REST APIs and business logic. |
| **Prisma ORM (v6)** | Next-generation Database Toolkit | Provides type-safe database queries, migrations, and model relationships for PostgreSQL. |
| **PostgreSQL** | Relational Database Engine | Primary data store for orders, users, parcels, transactions, and audit logs. |
| **Supabase Auth** | Identity & Auth Management | Provides underlying authentication UUID management and secure user identity storage. |
| **JWT (JSON Web Tokens)** | Encrypted Auth Tokens | Stateless user session verification passed via HTTP `Authorization: Bearer <token>`. |
| **Swagger UI** | Interactive API Documentation | Automatically generates interactive API endpoints test harness at `/api/docs`. |
| **TypeScript (v5+)** | Typed JavaScript Superscript | Enforces type safety across backend services, mobile applications, and web dashboards. |
| **Git & GitHub** | Distributed Version Control | Manages source code branches, pull requests, code reviews, and releases. |

### Why This Matters
Using a single unified language (TypeScript) across backend and frontends reduces context switching and enables shared types, interfaces, and validation schemas across our entire monorepo.

---

## Section 7: System Architecture

### 7.1 High-Level Architecture Topology

```text
                               +----------------------------------+
                               |     Client Applications Layer     |
                               +----------------------------------+
                               |                                  |
     +-------------------------+--------+                +--------+-------------------------+
     |  GMU Hub Web Dashboard           |                |  SHG & Transporter Mobile Apps   |
     |  (React 19 + Vite + Tailwind)    |                |  (React Native + Expo SDK 54)    |
     +-------------------------+--------+                +--------+-------------------------+
                               |                                  |
                               +-----------------+----------------+
                                                 | HTTPS / REST APIs
                                                 v
                               +----------------------------------+
                               |      NestJS API Server Gateway    |
                               |  - JWT & Roles Guards            |
                               |  - Swagger Documentation         |
                               |  - Express / Throttler Engine    |
                               +-----------------+----------------+
                                                 |
                               +-----------------+----------------+
                               |    Modules & Business Services   |
                               |  - GMU Admin Module              |
                               |  - SHG Operations Module         |
                               |  - Transporter Logistics Module  |
                               |  - Vehicle Suggestion Algorithm  |
                               +-----------------+----------------+
                                                 |
                               +-----------------+----------------+
                               |     Prisma ORM Data Layer        |
                               +-----------------+----------------+
                                                 |
                                                 v
                               +----------------------------------+
                               |     PostgreSQL Database Core     |
                               |  (MasterOrders, Parcels, Users)  |
                               +----------------------------------+
```

### Why This Matters
Architecture diagrams provide a mental map. When diagnosing an issue (e.g. "Mobile app shows Network Error"), you can systematically trace the path: Client $\rightarrow$ Network $\rightarrow$ NestJS Guard $\rightarrow$ Controller $\rightarrow$ Service $\rightarrow$ Prisma $\rightarrow$ DB.

---

## Section 8: Project Structure

The project is structured as an NPM Workspaces monorepo located under [logistic/](file:///c:/Users/parth/OneDrive/Desktop/GST-v1/logistic):

```text
logistic/
├── apps/                             # Frontend Applications Workspace
│   ├── GMU-hub/                      # React 19 Vite Web Dashboard
│   │   ├── src/
│   │   │   ├── components/           # UI Components (Cards, Tables, Modals)
│   │   │   ├── pages/                # Page Views (Dashboard, Orders, Inventory)
│   │   │   └── services/             # Axios API integration clients
│   │   ├── package.json
│   │   └── vite.config.ts
│   ├── shg-app/                      # Expo React Native App for SHGs / CRPs
│   │   ├── src/
│   │   │   ├── components/           # Mobile Components (OrderCard, Buttons)
│   │   │   ├── screens/              # App Screens (HomeScreen, PickupScannerScreen)
│   │   │   └── navigation/           # React Navigation stack & tabs
│   │   └── package.json
│   └── transporter-app/              # Expo React Native App for Drivers
│       ├── src/                      # Driver screens, QR camera scanning, trip routes
│       └── package.json
├── backend/                          # Backend Services Workspace
│   └── app/                          # Core NestJS Application Server
│       ├── prisma/                   # Database Management
│       │   ├── schema.prisma         # Primary Database Schema definition
│       │   ├── seed-pincode.ts       # Pincode directory seeder script
│       │   └── migrations/           # SQL Migration history
│       ├── src/                      # Source Code
│       │   ├── main.ts               # NestJS Application Entry Point
│       │   ├── app.module.ts         # Root Application Module
│       │   └── modules/              # Feature Modules
│       │       ├── gmu/              # GMU Admin Features (Orders, Warehouses)
│       │       ├── shg/              # SHG Mobile APIs (Pickup, Handover, Earnings)
│       │       └── transporter/      # Transporter APIs (Trips, Vehicle, Scans)
│       └── package.json
├── docs/                             # Project Documentation & Architectural Guides
├── scripts/                          # Developer Automation Scripts
├── package.json                      # Monorepo Root Workspaces Configuration
└── tsconfig.json                     # Shared TypeScript Configuration
```

### Why This Matters
Monorepos prevent code isolation. Knowing where each app and module resides allows developers to quickly modify full-stack features across backend and frontend seamlessly.

---

## Section 9: Requirements & Installation

### 9.1 Prerequisites

Before setting up the project locally, verify your system meets the following requirements:

| Tool | Recommended Version | Download / Verification Command |
| :--- | :--- | :--- |
| **Operating System** | Windows 10/11, macOS, or Linux | `systeminfo` or `uname -a` |
| **Node.js** | v20.x LTS or higher | `node -v` |
| **npm** | v10.x or higher | `npm -v` |
| **PostgreSQL** | v15.x or v16.x | `psql --version` |
| **Expo CLI** | Integrated via `npx expo` | `npx expo --version` |
| **VS Code Extensions** | Prisma, ESLint, Prettier, Tailwind CSS | Installed in VS Code |

### 9.2 Step-by-Step Local Setup

#### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd GST-v1/logistic
```

#### Step 2: Install Monorepo Dependencies
Run `npm install` from the monorepo root to link all npm workspace packages:
```bash
npm install
```

#### Step 3: Setup Local PostgreSQL Database
1. Open PostgreSQL (via pgAdmin, psql, or DBeaver) and create a new database named `gmu_logistic`:
   ```sql
   CREATE DATABASE gmu_logistic;
   ```

#### Step 4: Configure Backend Environment Variables
Copy `.env.example` inside `backend/app` to `.env`:
```bash
cd backend/app
cp .env.example .env
```
*(Update `DATABASE_URL` with your local database credentials).*

#### Step 5: Run Database Migrations & Seeds
From `backend/app`, run:
```bash
npx prisma db push
npx ts-node src/reset-and-seed-20-orders.ts
```

### Why This Matters
A standardized development setup prevents "works on my machine" issues and ensures fast onboarding for new team members.

---

## Section 10: Environment Configuration

> [!CAUTION]
> **Environment Security Rule:**
> NEVER commit `.env` files containing real production passwords or secret keys. The tables below document variable keys and purpose only.

### 10.1 Backend Environment Variables (`backend/app/.env`)

| Variable Name | Purpose | Example / Development Value |
| :--- | :--- | :--- |
| `PORT` | HTTP Server Port number | `3000` |
| `DATABASE_URL` | PostgreSQL connection string with password & port | `postgresql://postgres:postgres@localhost:5432/gmu_logistic?schema=public` |
| `DIRECT_URL` | Direct connection string for Supabase / Prisma migrations | `postgresql://postgres:postgres@localhost:5432/gmu_logistic?schema=public` |
| `JWT_SECRET` | Secret key used to sign and verify JWT auth tokens | `super-secret-gmu-jwt-key-2026` |
| `JWT_EXPIRATION` | Duration before JWT tokens expire | `7d` |
| `DEV_OTP_BYPASS` | Enabling universal test OTP for local developers | `true` |
| `DEV_DEFAULT_OTP` | Default OTP used when bypass mode is active | `1234` |

### 10.2 Mobile Apps Environment Variables (`shg-app/.env` & `transporter-app/.env`)

| Variable Name | Purpose | Example Value |
| :--- | :--- | :--- |
| `EXPO_PUBLIC_API_BASE_URL` | Local API server endpoint URL | `http://192.168.1.10:3000/api` |
| `EXPO_PUBLIC_APP_ENV` | Application runtime environment identifier | `development` |

### Why This Matters
Misconfigured environment variables are the #1 cause of application boot failures. Always double-check your IP address and port mappings when testing mobile apps locally.

---

## Section 11: Database & Prisma ORM

Our database is managed via **Prisma ORM** ([schema.prisma](file:///c:/Users/parth/OneDrive/Desktop/GST-v1/logistic/backend/app/prisma/schema.prisma)). Below are the core domain models:

### 11.1 Key Database Tables & Purpose

```mermaid
erDiagram
    User ||--o{ OrderAssignment : assigned
    Seller ||--o{ Order : originates
    Buyer ||--o{ Order : receives
    MasterOrder ||--|{ MasterOrderItem : contains
    Order ||--|{ Parcel : packaging
    Parcel ||--o{ ParcelScanHistory : tracks
    Order ||--o{ VerificationRecord : validates
    User ||--o{ Earning : calculates
```

| Model Name | Primary Key | Key Relations | Purpose in Platform |
| :--- | :--- | :--- | :--- |
| `User` | `Int` (autoincrement) | `ShgDetail`, `TransporterDetail`, `Address` | Central store for all authenticated platform users (SHGs, Drivers, Admins). |
| `MasterOrder` | `Int` (autoincrement) | `Buyer`, `MasterOrderItem`, `PickupOrder` | Top-level customer purchase order containing multiple items from multiple sellers. |
| `Order` / `PickupOrder` | `String` / `Int` | `Seller`, `User` (SHG/Driver), `Parcel` | Split order leg representing an individual pickup task assigned to an SHG/Driver. |
| `DropOrder` | `Int` (autoincrement) | `Buyer`, `User` (SHG/Driver), `DropOrderItem` | Delivery order leg representing transportation and last-mile delivery to the buyer. |
| `ReturnOrder` | `Int` (autoincrement) | `DropOrder`, `User`, `ReturnOrderItem` | Manages reverse logistics when a buyer requests a return or delivery fails. |
| `Parcel` | `String` (UUID) | `Order`, `ParcelScanHistory` | Physical box itemization with barcode, QR code image, weight, and current holder. |
| `ParcelScanHistory` | `String` (UUID) | `Parcel`, `User` | Complete physical tracking history log storing action, GPS coordinates, and user role. |
| `VerificationRecord` | `Int` (autoincrement) | `Order` | Stores generated handover codes, OTP expiration times, attempt counts, and status. |
| `Earning` | `Int` (autoincrement) | `User` (SHG) | Financial credit ledger logging payouts for completed delivery legs. |

> [!NOTE]
> **Developer Tip on Prisma Schema:**
> Whenever you modify [schema.prisma](file:///c:/Users/parth/OneDrive/Desktop/GST-v1/logistic/backend/app/prisma/schema.prisma), always run `npx prisma generate` to update the TypeScript client types in your workspace.

### Why This Matters
Database schema integrity is paramount. Understanding entity relationships prevents orphaned records and broken foreign key constraints during complex multi-leg order transitions.

---

## Section 12: How to Run the Project

You can run any application directly from the monorepo root using **npm Workspaces**:

### 12.1 Quick Execution Commands

```bash
# 1. Start Backend API Server (NestJS dev mode)
npm run backend:dev

# 2. Start GMU Hub Web Dashboard (Vite dev server)
npm run gmu-hub:dev

# 3. Start SHG Mobile App (Expo Metro bundler)
npm run shg-app:start

# 4. Start Transporter Mobile App (Expo Metro bundler)
npm run transporter-app:start
```

### 12.2 Interactive API Documentation (Swagger)
Once the backend is running, open your web browser and navigate to:
```text
http://localhost:3000/api/docs
```
Swagger provides an interactive REST client to test all APIs, view DTO schemas, and inspect request payload requirements.

```text
[Browser / Swagger UI] ---> HTTP Requests ---> [NestJS Endpoints @ http://localhost:3000/api/docs]
```

### Why This Matters
Knowing how to independently launch and test each component of the stack allows you to isolate bugs quickly between frontend UI state and backend logic.

---

## Section 13: Authentication & Security

### 13.1 Authentication Workflow

```mermaid
sequenceDiagram
    autonumber
    actor User as Mobile / Web User
    participant Auth as NestJS Auth Module
    participant DB as PostgreSQL User Table
    participant JWT as JWT Service

    User->>Auth: Request OTP (Phone Number)
    Auth->>DB: Check if user exists & generate 4-digit OTP
    Auth-->>User: Sends SMS OTP (or 1234 in DEV mode)
    User->>Auth: Submit Phone Number + OTP
    Auth->>Auth: Verify OTP & Expiration
    Auth->>JWT: Generate Signed Access Token
    JWT-->>User: Returns { accessToken, userProfile, role }
    User->>Auth: Submits subsequent requests with Header `Authorization: Bearer <token>`
```

> [!TIP]
> **Developer OTP Bypass Mode:**
> During local development, setting `DEV_OTP_BYPASS=true` in `backend/app/.env` allows developers to log in to any test user account using the default OTP `1234`.

### 13.2 Security Best Practices
1. **Bearer Token Transmission:** Mobile apps and web dashboards store the JWT securely (`AsyncStorage` on mobile, encrypted local storage on web) and inject it into Axios request headers.
2. **Role Authorization Guards:** Every sensitive endpoint checks the user's role before executing logic.

### Why This Matters
Authentication flaws can expose sensitive logistics data and user phone numbers. Always test endpoints with both authorized and unauthorized user roles.

---

## Section 14: Complete Module Documentation

---

### Module 14.1: GMU Hub - Dashboard & Analytics
* **Purpose:** Provides central admins with a high-level operational overview of active orders, daily deliveries, active drivers, and warehouse volume.
* **Primary Users:** `SUPER_ADMIN`, `ADMIN`.
* **Key Features:** Live metric counters, delivery success rates, active pickup stats, order volume charts.
* **Database Tables:** `Order`, `PickupOrder`, `DropOrder`, `User`.
* **APIs Used:** `GET /api/gmu/dashboard/stats`, `GET /api/gmu/dashboard/analytics`.

---

### Module 14.2: GMU Hub - Order Management (Pickup & Drop)
* **Purpose:** Manage global orders across first-mile pickups and last-mile drops.
* **Primary Users:** `ADMIN`.
* **Key Features:** View order status, reassign pickup SHG, reassign transporter driver, approve manual redirects.
* **Database Tables:** `Order`, `OrderAssignment`, `RedirectedOrder`.
* **APIs Used:** `GET /api/gmu/orders`, `PATCH /api/gmu/orders/:id/assign-transporter`.

---

### Module 14.3: GMU Hub - Warehouse & Inventory
* **Purpose:** Track physical parcel receiving, Quality Control (QC), bin placement, and dispatch batching at the central hub.
* **Primary Users:** `ADMIN` (Warehouse Manager).
* **Key Features:** Receive inward shipments, record item QC status (`QC_PASSED` / `QC_FAILED`), log storage shelf numbers, generate master manifest for outbound drivers.
* **Database Tables:** `Warehouse`, `WarehouseInventory`, `Parcel`, `ParcelScanHistory`.
* **APIs Used:** `POST /api/gmu/warehouse/receive`, `GET /api/gmu/warehouse/inventory`.

---

### Module 14.4: GMU Hub - Returns Management
* **Purpose:** Process buyer return requests and manage reverse logistics back to sellers.
* **Primary Users:** `ADMIN`.
* **Key Features:** Inspect return reasons, assign return pick-up drivers, track return parcel barcodes.
* **Database Tables:** `ReturnOrder`, `ReturnOrderItem`, `return_order_scan_history`.
* **APIs Used:** `GET /api/gmu/returns`, `PATCH /api/gmu/returns/:id/status`.

---

### Module 14.5: GMU Hub - Community & Transporter Management
* **Purpose:** Onboard, review, and approve SHG members and transporter drivers.
* **Primary Users:** `ADMIN`.
* **Key Features:** Review uploaded KYC documents (Aadhaar, PAN, DL, RC), approve/reject applications, edit service areas.
* **Database Tables:** `User`, `Application`, `Document`, `DrivingDetail`, `ShgServiceArea`.
* **APIs Used:** `GET /api/gmu/community/applications`, `PATCH /api/gmu/community/applications/:id/approve`.

---

### Module 14.6: SHG App - Login & Profile Setup
* **Purpose:** Authenticate SHG members and complete multi-step profile registration.
* **Primary Users:** `SHG`, `INDIVIDUAL`.
* **Key Features:** Phone OTP login, personal detail entry, bank detail setup, document upload.
* **Database Tables:** `User`, `ShgDetail`, `Address`, `BankDetail`, `StepTracking`.
* **APIs Used:** `POST /api/shg/auth/send-otp`, `POST /api/shg/auth/verify-otp`, `POST /api/shg/user/step-data`.

---

### Module 14.7: SHG App - Broadcast & Assigned Pickup Orders
* **Purpose:** Receive available pickup orders in the SHG's service area and accept/reject tasks.
* **Primary Users:** `SHG`.
* **Key Features:** View order broadcasts, accept pickup task, view seller contact details and navigation address.
* **Database Tables:** `PickupOrder`, `OrderAssignment`, `ShgServiceArea`.
* **APIs Used:** `GET /api/shg/orders/broadcasts`, `POST /api/shg/orders/:id/accept`.

---

### Module 14.8: SHG App - Seller Pickup & QR Handover
* **Purpose:** Collect items from village sellers, create parcels, and hand over to transporters.
* **Primary Users:** `SHG`.
* **Key Features:** Item inspection, parcel QR generation (`Parcel`), seller OTP verification, transporter handover.
* **Database Tables:** `Parcel`, `VerificationRecord`, `ParcelScanHistory`.
* **APIs Used:** `POST /api/shg/orders/create-parcel`, `POST /api/shg/orders/verify-handover`.

---

### Module 14.9: SHG App - Doorstep Delivery & Earnings
* **Purpose:** Perform last-mile delivery to buyers and track earned commissions.
* **Primary Users:** `SHG`.
* **Key Features:** View assigned drop orders, navigate to buyer address, enter buyer delivery OTP, view earnings history.
* **Database Tables:** `DropOrder`, `VerificationRecord`, `Earning`.
* **APIs Used:** `GET /api/shg/orders/drop-assignments`, `POST /api/shg/orders/complete-delivery`, `GET /api/shg/earnings`.

---

### Module 14.10: Transporter App - Registration & Route Setup
* **Purpose:** Driver signup, vehicle detail submission, and operating route selection.
* **Primary Users:** `TRANSPORTER`.
* **Key Features:** Vehicle type selection (2W, 3W, 4W, Milk Van), driving license upload, working schedule definition.
* **Database Tables:** `User`, `TransporterDetail`, `DrivingDetail`, `RouteDetail`, `OtherDetails`.
* **APIs Used:** `POST /api/transporter/auth/register`, `POST /api/transporter/user/vehicle-details`.

---

### Module 14.11: Transporter App - Assigned Trips & Batch QR Scanner
* **Purpose:** View assigned pickup/drop trips and scan physical package barcodes.
* **Primary Users:** `TRANSPORTER`.
* **Key Features:** Camera QR scanner ([PickupScannerScreen.tsx](file:///c:/Users/parth/OneDrive/Desktop/GST-v1/logistic/apps/shg-app/src/screens/PickupScannerScreen.tsx)), parcel count verification, batch scan session commit, route map.
* **Database Tables:** `ScanSession`, `ScanSessionItem`, `ParcelScanHistory`.
* **APIs Used:** `POST /api/transporter/scan/session`, `POST /api/transporter/scan/commit`.

---

### Module 14.12: Transporter App - Hub & Buyer Handovers
* **Purpose:** Complete cargo deliveries at the central GMU Hub or drop SHG node.
* **Primary Users:** `TRANSPORTER`.
* **Key Features:** Hub check-in, handover code entry, trip completion summary, payout log.
* **Database Tables:** `Order`, `VerificationRecord`, `ParcelScanHistory`.
* **APIs Used:** `POST /api/transporter/orders/complete-trip`.

### Why This Matters
Comprehensive module documentation prevents feature duplication. Before creating a new service or screen, check if similar logic already exists in a related module.

---

## Section 15: Order Status Lifecycle

Below is the complete state transition matrix enforced across backend services:

| Order Status Enum | Meaning & Stage | Trigger Event | Allowed Next Statuses |
| :--- | :--- | :--- | :--- |
| `PENDING` | Order created by buyer; awaiting allocation. | Buyer completes checkout. | `SHG_ASSIGNED` |
| `SHG_ASSIGNED` | Assigned to local village SHG member. | System maps service pincode to active SHG. | `PARCEL_PICKED`, `REJECTED` |
| `PARCEL_PICKED` | SHG collected parcel from seller; QR generated. | SHG verifies seller OTP. | `TRANSPORTER_ASSIGNED` |
| `TRANSPORTER_ASSIGNED` | Assigned to driver for hub transportation. | Transporter accepts trip. | `IN_TRANSIT_TO_HUB` |
| `IN_TRANSIT_TO_HUB` | Transporter carrying parcel to central hub. | Transporter scans parcel QR into session. | `HUB_RECEIVED` |
| `HUB_RECEIVED` | Arrived at central GMU Hub warehouse. | Warehouse admin scans parcel inward. | `STORED`, `QC_FAILED` |
| `STORED` | Package stored in warehouse shelf bin. | Warehouse staff logs shelf location. | `READY_FOR_DISPATCH` |
| `READY_FOR_DISPATCH` | Aggregated and assigned to outbound driver. | Admin generates outbound manifest. | `OUT_FOR_DELIVERY` |
| `OUT_FOR_DELIVERY` | Driver/Drop SHG carrying parcel to buyer. | Driver scans parcel for final leg. | `PARCEL_AT_DROP_SHG`, `DELIVERED` |
| `DELIVERED` | Handed to buyer; delivery complete. | Buyer delivery OTP verified. | `RETURN_REQUESTED` |
| `RETURN_REQUESTED` | Buyer initiated return request. | Buyer submits return issue. | `RETURN_APPROVED`, `RETURN_REJECTED` |
| `RETURN_COMPLETED` | Parcel returned back to seller. | Seller signs return receipt. | None (Final State) |

> [!WARNING]
> **Status Lock Rule:**
> Status transitions must strictly follow this matrix. Never manually update an `Order` status in the database without adding a corresponding tracking record in `ParcelScanHistory` or `PickupTracking`.

### Why This Matters
Invalid status transitions cause mobile app crashes and broken UI state. Always use backend service helper methods (e.g. `orderService.updateStatus()`) to execute validated status changes.

---

## Section 16: QR Code & OTP Handover Workflow

### 16.1 The Dual-Verification Protocol

```mermaid
sequenceDiagram
    autonumber
    actor Sender as Parcel Sender (e.g. SHG)
    participant App as Mobile App Camera
    participant API as NestJS API Server
    actor Recipient as Parcel Recipient (e.g. Driver)

    Recipient->>App: 1. Scans Parcel QR Code with Phone Camera
    App->>API: 2. Transmits scanned `qrCodeValue` + GPS location
    API->>API: 3. Validates parcel existence & status
    API-->>Sender: 4. Sends 4-Digit Handover OTP to Sender's Screen
    Sender->>Recipient: 5. Verbally shares 4-Digit OTP with Recipient
    Recipient->>App: 6. Enters 4-Digit OTP on screen
    App->>API: 7. Submits OTP for verification
    API->>API: 8. Validates OTP in `VerificationRecord` table
    API->>API: 9. Transfers custody in `Parcel` table & logs `ParcelScanHistory`
    API-->>App: 10. Handover Success Confirmation
```

### Why This Matters
Physical packages cannot speak for themselves. The QR code identifies *what* the package is, and the OTP proves *who* authorized its transfer. Both steps are mandatory for secure supply chain management.

---

## Section 17: API Communication & Request Lifecycle

When a client application interacts with the backend, requests flow through a strictly defined NestJS architectural pipeline:

```text
[Mobile App / Web Dashboard]
            │
            ▼ (HTTP Request with JSON payload & Bearer JWT)
[Global NestJS ValidationPipe] ──► (Validates DTO types & throws 400 Bad Request if invalid)
            │
            ▼
[JwtAuthGuard & RolesGuard]   ──► (Verifies JWT signature & checks user roles)
            │
            ▼
[Controller Handler]          ──► (Extracts `@Body()`, `@Param()`, `@CurrentUser()`)
            │
            ▼
[Business Service]            ──► (Executes business algorithms & vehicle assignments)
            │
            ▼
[Prisma ORM Layer]            ──► (Generates SQL queries & manages transactions)
            │
            ▼
[PostgreSQL Database]         ──► (Executes queries & updates table records)
```

### Why This Matters
Understanding this flow enables efficient debugging. If an API returns a `400 Bad Request`, you know the request failed at the `ValidationPipe` stage before even reaching your service logic.

---

## Section 18: Debugging Guide

When troubleshooting bugs during development, use this systematic checklist:

```mermaid
flowchart TD
    A[Issue Encountered] --> B{Is it a UI or Network error?}
    B -- UI Rendering --> C[Check React / React Native Console Logs]
    B -- API / Data Error --> D[Inspect Browser Network Tab / Metro Logs]
    D --> E{API HTTP Status Code?}
    E -- 401 / 403 --> F[Check JWT Auth Token & RolesGuard]
    E -- 400 Bad Request --> G[Check DTO Class-Validator Schemas]
    E -- 500 Internal Error --> H[Inspect NestJS Terminal Output]
    H --> I[Check Prisma Query Logs in PostgreSQL]
```

### 18.1 Key Debugging Commands & Tools
* **Browser DevTools:** Press `F12` in Chrome/Edge to inspect Network HTTP requests, request headers, and console errors when working on `GMU-hub`.
* **Metro Bundler Logs:** View live terminal logs when running `shg-app` or `transporter-app`.
* **Prisma Query Debugging:** Enable verbose SQL logging by running the backend with:
  ```bash
  DEBUG="prisma:query" npm run backend:dev
  ```

### Why This Matters
Structured debugging saves hours of wasted time. Always follow empirical log evidence rather than guessing why code is failing.

---

## Section 19: Common Errors & Troubleshooting

| Error Symptom | Root Cause | First Verification Check | Resolution |
| :--- | :--- | :--- | :--- |
| `EADDRINUSE: port 3000` | Another process is already using port 3000. | Run `netstat -ano \| findstr :3000` (Windows) or `lsof -i :3000` (Mac/Linux). | Kill the process running on port 3000 or change `PORT` in `.env`. |
| `Can't reach database server at localhost:5432` | PostgreSQL service is stopped or invalid credentials. | Verify PostgreSQL service is running (`pg_isready`). | Start PostgreSQL service or correct `DATABASE_URL` password in `backend/app/.env`. |
| `Unauthorized Exception: JWT Expired` | Auth token expired or missing `Authorization` header. | Inspect Request Header in Swagger or Network tab for `Bearer <token>`. | Log out and log back in to generate a fresh JWT access token. |
| `Camera permission denied` | Expo camera permissions not granted on test device. | Check app settings on mobile device or emulator. | Grant camera access permission in mobile device settings. |
| `Metro Bundler Cache Stale Error` | Metro bundler holding old cached JS code builds. | Terminal output shows React Native bundling errors. | Restart Metro bundler with clear flag: `npm run shg-app:start -- --clear`. |

### Why This Matters
Reference tables empower developers to self-resolve 90% of routine setup and runtime issues independently.

---

## Section 20: Git & Branching Workflow

To maintain monorepo stability, all team members follow our standardized Git workflow:

```mermaid
gitGraph
    commit id: "Initial Main"
    branch feature/shg-qr-scanner
    checkout feature/shg-qr-scanner
    commit id: "Add Camera Screen"
    commit id: "Add Verification API"
    checkout main
    merge feature/shg-qr-scanner id: "PR Merged #42"
```

### 20.1 Git Command Sequence

```bash
# 1. Always start by fetching the latest main branch
git checkout main
git pull origin main

# 2. Create a feature branch using standard naming conventions
# Formats: feature/<name>, fix/<issue>, chore/<task>
git checkout -b feature/pickup-otp-validation

# 3. Make small, logical commits with clear descriptive messages
git add .
git commit -m "feat(shg-app): add dual-verification OTP screen for seller pickup"

# 4. Push your branch to GitHub
git push origin feature/pickup-otp-validation

# 5. Open a Pull Request (PR) on GitHub against the main branch
```

### Why This Matters
Clean branch strategy and descriptive commits prevent merge conflicts and make code reviews fast and productive.

---

## Section 21: Testing & QA Checklist

Before submitting a Pull Request, complete this verification checklist:

| Verification Area | Requirement Check | Status (`PASS` / `FAIL`) |
| :--- | :--- | :--- |
| **UI & Layout** | Buttons, text fields, and icons display properly across mobile screens and desktop web views. | `[ ] PASS` |
| **Form Validation** | Required fields fail gracefully with user-friendly error messages if left empty. | `[ ] PASS` |
| **API Endpoints** | Endpoints return correct HTTP status codes (`200 OK`, `201 Created`, `400 Bad Request`). | `[ ] PASS` |
| **Database Integrity** | Database updates correctly without orphaned foreign key records. | `[ ] PASS` |
| **QR Code Scanning** | Camera successfully reads package barcodes and transmits correct payload. | `[ ] PASS` |
| **OTP Handovers** | Handover fails if an incorrect OTP code is entered. | `[ ] PASS` |
| **Role Authorization** | Non-admin users cannot access admin endpoints (`403 Forbidden`). | `[ ] PASS` |

### Why This Matters
Thorough pre-commit testing prevents regressions and ensures build stability for the entire engineering team.

---

## Section 22: Production Overview

When building for production environments, observe the following rules:

1. **Backend Production Build:** The NestJS API compiles to standalone JavaScript inside the `dist/` directory:
   ```bash
   npm run build --workspace=@logistic/backend
   ```
2. **Web Dashboard Build:** The React Vite dashboard compiles to static assets inside `dist/`:
   ```bash
   npm run build --workspace=frontend
   ```
3. **Mobile Builds (EAS):** Expo mobile apps are compiled into native Android `.apk`/`.aab` and iOS `.ipa` binaries using Expo Application Services (EAS):
   ```bash
   eas build --platform android
   ```
4. **Reverse Proxy & SSL:** Production backends run behind an Nginx reverse proxy providing SSL/TLS encryption (`https://`) and PM2 process management for zero-downtime reloads.

### Why This Matters
Production builds behave differently than local development servers. Always test your production bundle using preview scripts before deploying updates to users.

---

## Section 23: Commands Cheat Sheet

| Command | Workspace | Purpose |
| :--- | :--- | :--- |
| `npm run backend:dev` | Root | Starts NestJS API backend server in hot-reload watch mode. |
| `npm run gmu-hub:dev` | Root | Starts GMU Hub web dashboard Vite development server. |
| `npm run shg-app:start` | Root | Launches Expo Metro bundler for SHG Mobile App. |
| `npm run transporter-app:start` | Root | Launches Expo Metro bundler for Transporter Mobile App on port 8082. |
| `npx prisma db push` | `backend/app` | Pushes Prisma schema changes directly to local database. |
| `npx prisma studio` | `backend/app` | Opens interactive browser GUI to inspect and edit database records. |
| `npm run seed:pincode` | Root | Seeds Indian pincode and village directory into database. |

### Why This Matters
Having all daily terminal commands consolidated in one reference table speeds up development workflows.

---

## Section 24: Four-Week Intern Learning Plan

```mermaid
gantt
    title Four-Week Intern Onboarding Roadmap
    dateFormat  YYYY-MM-DD
    section Week 1: Foundation
    Business Flow & Architecture     :active, w1, 2026-08-01, 7d
    section Week 2: GMU Hub & Backend
    NestJS APIs & Web Dashboard      :w2, 2026-08-08, 7d
    section Week 3: Mobile Apps
    React Native & Expo Hardware     :w3, 2026-08-15, 7d
    section Week 4: Feature Delivery
    Real Task Execution & PR Merge   :w4, 2026-08-22, 7d
```

### 4.1 Weekly Milestones

* **Week 1: Business Operations & Setup**
  * Read Sections 1–7 of this guide.
  * Set up local development environment (Node, Postgres, Expo).
  * Run all applications locally and inspect sample data.

* **Week 2: Backend APIs & GMU Hub Web Dashboard**
  * Explore NestJS modules under `backend/app/src/modules`.
  * Test APIs using Swagger UI (`http://localhost:3000/api/docs`).
  * Fix a minor UI/bug ticket in the `GMU-hub` web application.

* **Week 3: Mobile Apps (SHG & Transporter)**
  * Explore React Native screens in `shg-app` and `transporter-app`.
  * Practice scanning test QR codes using Expo Camera emulator.
  * Trace a complete order pickup flow on a mobile emulator.

* **Week 4: Real Task Execution**
  * Pick an assigned feature ticket from the team backlog.
  * Create a feature branch, write clean code, and write unit/integration tests.
  * Submit a Pull Request on GitHub and present your work to the team lead.

### Why This Matters
A structured 4-week roadmap provides clear goals and milestones, ensuring smooth progression from beginner to confident contributor.

---

## Section 25: Final Checklist & The Golden Rule

### 25.1 "I Can..." Self-Assessment Checklist

Before taking on your first independent feature ticket, verify that you can confidently check off every item:

- [ ] **I can** explain the business mission of GMU Logistics in plain English.
- [ ] **I can** describe the difference between First-Mile, Middle-Mile, and Last-Mile logistics.
- [ ] **I can** run all 4 monorepo apps locally (`backend`, `GMU-hub`, `shg-app`, `transporter-app`).
- [ ] **I can** open and test backend endpoints using Swagger UI.
- [ ] **I can** inspect database tables using Prisma Studio (`npx prisma studio`).
- [ ] **I can** explain how QR codes and 4-digit OTPs secure package handovers.
- [ ] **I can** trace an order from `PENDING` to `DELIVERED` across database models.
- [ ] **I can** debug a failing API request using browser DevTools or NestJS terminal logs.
- [ ] **I can** create a clean Git feature branch and submit a structured Pull Request.

---

### The Golden Rule of GMU Logistics Engineering

> [!IMPORTANT]
> **The Golden Rule:**  
> **Understand the business flow first $\rightarrow$ understand the app flow $\rightarrow$ understand the code $\rightarrow$ make the smallest safe change $\rightarrow$ test the complete affected workflow.**

Welcome aboard to the team! Build safe, test thoroughly, and empower rural enterprise!
