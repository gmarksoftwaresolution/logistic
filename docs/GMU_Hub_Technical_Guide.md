# GMU HUB WEB DASHBOARD
## Complete Project Documentation & Technical Onboarding Manual
**Easy-to-understand guide for interns, developers, testers and new team members**  
**Version:** 1.0.0  
**Company:** Gramuunati Logistics (GMU)  
**Target Audience:** Interns, Frontend Engineers, Full-Stack Developers, & QA Testers  
**Last Updated:** August 2026  

---

## How to use this guide

Welcome to the **GMU Hub Engineering Team**! If you are completely new, read **Sections 1–6** first. Then follow **Section 8** to install the project and **Section 11** to run it. Use the remaining sections as a reference while working.

> [!IMPORTANT]
> **Security Notice:** Repository URLs, database passwords, JWT secrets, cloud credentials and production values must be obtained securely from the project owner. Never guess or commit secrets to Git repositories.

---

# 1. Project Introduction

**GMU Hub** (Gramuunati Logistics Hub Web Dashboard) is the central business management and logistics control application for rural and hyper-local supply chains. It connects village producers (Sellers), Self Help Group (SHG) members, commercial drivers (Transporters), warehouse staff, and end buyers into one unified system.

The most important thing for a new team member to understand is that **GMU Hub is a connected multi-leg logistics process**. A status change in one stage (e.g. SHG Pickup) directly affects the next stage (Transporter Pickup, Warehouse Intake, Storage, Outbound Dispatch, and Doorstep Delivery).

### Example Workflow
```text
Seller -> Pickup SHG -> Pickup Transporter -> GMU Warehouse (QC & Storage) -> Drop Transporter -> Drop SHG -> Buyer Doorstep
```

---

# 2. What is GMU Hub?

**GMU Hub** is an administrative command center web application (built with **React 19**, **Vite 8**, **Tailwind CSS v4**, and **TypeScript**). In simple words, it is software that helps operations managers and warehouse teams manage day-to-day rural logistics in one connected application.

```text
Seller / Buyer Master
↓
Product / Village Pincode Master
↓
Master Order Creation
↓
Pickup Order & QR Parcel Generation
↓
Warehouse Intake & Bin Storage (QC_PASSED / STORED)
↓
Outbound Dispatch & Doorstep Delivery
↓
Settlement & Partner Earnings
```

> [!TIP]
> **Core Developer Rule:** When working on any feature, always ask: **"What other logistical stage or partner depends on this status update?"**

---

# 3. What GMU Hub Does

| Area | Purpose |
| :--- | :--- |
| **Order Management** | Oversees all active Pickup, Drop, and Return orders across all network stages. |
| **Warehouse & Storage** | Digital parcel receiving (`HUB_RECEIVED`), Quality Control (`QC_PASSED`), bin placement (`STORED`), and dispatch. |
| **Inventory Control** | Real-time tracking of incoming, stored, and return inventory items. |
| **Community Management** | Review and approval of Self Help Groups (SHGs) and individual CRP members. |
| **Transporter Management** | Onboarding route partners, personal vehicle drivers, milk van routes, and capacity management. |
| **QR Code System** | Generating unique parcel QR images (`qrCodeValue`, `qrImage`) and verifying camera scans. |
| **OTP Verification** | Handover PIN verification records (`VerificationRecord`) between senders and recipients. |
| **Order History & Audit** | Searching historical orders, inspecting timeline events, and exporting delivery logs. |
| **User & Security** | Phone OTP authentication, JWT session tokens, and Role-Based Access Control (`ADMIN`, `SUPER_ADMIN`). |
| **Settings & Profile** | Managing admin profile, security passwords, regional language preferences, and notifications. |

---

# 4. Complete Business Flow

Learn these flows before reading the code.

### 4.1 Sales & Delivery Pickup Flow
```text
Buyer Places Order
↓
Master Order Created (MasterOrder)
↓
Split into Pickup Order (PickupOrder)
↓
Broadcast / Assigned to Village SHG
↓
SHG Collects Parcel & Generates QR (PARCEL_PICKED)
↓
Transporter Picks Up & In-Transit (IN_TRANSIT_TO_HUB)
↓
GMU Hub Warehouse Intake (HUB_RECEIVED)
```

### 4.2 Warehouse Storage & Outbound Flow
```text
Parcels Received at Hub (HUB_RECEIVED)
↓
Quality Control Inspection (QC_PASSED / QC_FAILED)
↓
Shelf Bin Storage Allocation (STORED)
↓
Outbound Order Batching & Manifest Generation
↓
Assigned to Drop Transporter (DISPATCHED)
↓
In-Transit to Destination Village SHG
```

### 4.3 Last-Mile Delivery Flow
```text
Drop Transporter Delivers to Destination SHG (PARCEL_AT_DROP_SHG)
↓
Destination SHG Visits Buyer Doorstep
↓
Buyer Verifies Parcel & Provides Delivery OTP
↓
Status Updated to DELIVERED
↓
Commission Credited to SHG & Transporter (Earning)
```

### 4.4 Reverse Logistics (Return Flow)
```text
Buyer / Transporter Initiates Return Request (RETURN_REQUESTED)
↓
Assigned to Return SHG / Transporter
↓
Return Parcel Scanned & Intaked at Hub (RETURN_PARCEL_AT_HUB)
↓
Returned to Seller / Restocked
```

### Why the flow matters
If a Pickup Order status changes, the Warehouse Intake and Drop Order assignment depend on that status. Therefore, **always test the complete affected flow, not only one screen.**

---

# 5. Users and Roles

| Role | Easy Explanation | Responsibilities |
| :--- | :--- | :--- |
| **Superadmin** | Highest-level administrative control. | Full system access, global analytics, system configuration, admin management. |
| **Administrator (GMU Admin)** | Manages operations & network governance. | Order rerouting, SHG/Driver approvals, return resolution, SLA monitoring. |
| **Warehouse Manager** | Manages physical hub storage. | Parcel receiving, quality control inspection, bin placement, outbound manifests. |
| **SHG Member / CRP** | Village field partner (uses `SHG App`). | First-mile seller pickups, village package consolidation, doorstep delivery to buyer. |
| **Transporter Driver** | Commercial driver (uses `Transporter App`). | Inter-village and hub cargo transport, route execution, vehicle capacity management. |
| **Seller** | Village producer / artisan. | Stock listing, package handover to SHG, seller OTP generation. |
| **Buyer** | Consumer. | Order placement, address input, parcel inspection, delivery OTP verification. |

*For an access problem, check authentication (logged in?) and authorization (role allowed?).*

---

# 6. Technology Used

| Technology | Simple Meaning | Use in Project |
| :--- | :--- | :--- |
| **React 19** | Frontend UI Library | Screens, forms, data tables, modals, and dynamic dashboard views. |
| **Vite 8** | Frontend Build Tool | Runs development server (`http://localhost:5173`) and builds production code. |
| **AppContext** | React Context API | Centralized application state management (orders, counts, user profile). |
| **NestJS 10** | Backend API Framework | Server REST APIs, authentication guards, DTO validation, and business services. |
| **TypeScript 6.0** | Typed JavaScript | Enforces type-safe interfaces across frontend and backend. |
| **Prisma 6.19** | Database ORM | Communicates with PostgreSQL database using strongly-typed models. |
| **PostgreSQL 15+** | Relational Database | Stores permanent data (orders, users, parcels, scan logs, earnings). |
| **Tailwind CSS v4** | Utility CSS Framework | Modern responsive UI styling and dark/light color tokens. |
| **Recharts** | Data Charting Library | Analytics trend graphs and order volume charts on the Dashboard page. |
| **Framer Motion** | Animation Library | Micro-animations, drawer transitions, and smooth modal popups. |
| **Lucide React** | Icon Suite | Navigation icons, status indicators, and button icons. |
| **Swagger UI** | API Documentation | Endpoint testing harness at `http://localhost:3000/api/docs`. |

### Overall Architecture
```text
Browser (GMU Hub Web App)
↓
React Frontend (AppContext + Tailwind CSS)
↓ HTTP / REST + JWT Bearer Token
NestJS Backend API Gateway
↓
Services / Business Logic (Order, Vehicle, Community)
↓
Prisma ORM Client
↓
PostgreSQL Database
```

---

# 7. Project Structure

The project contains two primary workspaces: **Frontend (`apps/GMU-hub`)** and **Backend (`backend/app`)**.

### Frontend Structure (`apps/GMU-hub/`)
```text
apps/GMU-hub/
■■■ src/
■ ■■■ assets/           → Static images and brand logos
■ ■■■ components/       → Reusable UI components (DataTable, Layout, Modal, StatusBadge, Tabs, TimeAgo)
■ ■■■ context/          → Centralized state store (AppContext.tsx)
■ ■■■ hooks/            → Custom React hooks (useGrabScroll.ts)
■ ■■■ pages/            → Screen views (Dashboard, OrderManagement, Inventory, Community, Transporter, OrderHistory, Settings)
■ ■■■ utils/            → API client wrapper (api.ts)
■ ■■■ App.css           → Global CSS overrides
■ ■■■ App.tsx           → State-driven router component
■ ■■■ index.css         → Tailwind v4 import & font setup
■ ■■■ main.tsx          → React DOM entry point
■■■ index.html          → HTML template
■■■ package.json        → Frontend dependencies & scripts
■■■ vite.config.ts      → Vite configuration
```

### Backend Structure (`backend/app/`)
```text
backend/app/
■■■ src/
■ ■■■ common/           → Shared utilities, decorators, and JWT guards
■ ■■■ modules/          → Feature modules
■ ■ ■■■ gmu/            → GMU Admin APIs (order-management, community-management, transporter-management)
■ ■ ■■■ shg/            → SHG Mobile APIs (order, user, earnings, pickup)
■ ■ ■■■ transporter/    → Transporter Mobile APIs (order, registration, vehicle)
■ ■■■ prisma/           → Database schema and seed scripts
■ ■ ■■■ schema.prisma   → Database models and relations
■ ■ ■■■ seed-pincode.ts → Pincode directory seeder
■ ■■■ main.ts           → NestJS server startup file
■■■ .env                → Backend environment variables
■■■ package.json        → Backend dependencies
```

*For a feature, trace:* **Frontend Page → `api.ts` → NestJS Controller → Service → Prisma → Database**.

---

# 8. Requirements and Installation

### System Requirements

| Software | Requirement |
| :--- | :--- |
| **OS** | Windows 10/11, macOS 12+, or Ubuntu 20.04/22.04 LTS |
| **Node.js** | v20.x LTS recommended (`node -v`) |
| **npm** | v10.x or higher (`npm -v`) |
| **PostgreSQL** | v15.x or v16.x (`psql --version`) |
| **Browser** | Latest Google Chrome, Microsoft Edge, Firefox, or Safari |
| **RAM** | Minimum 8 GB; 16 GB recommended |
| **Free Storage** | At least 10 GB |

### Step 1 — Clone the Repository
```bash
git clone <repository-url>
cd GST-v1/logistic
```

### Step 2 — Verify Node.js
```bash
node -v
npm -v
```

### Step 3 — Install Dependencies
```bash
npm install
```

---

# 9. Environment Configuration

Environment files contain machine-specific settings. **Never commit real passwords or cloud credentials.**

### Backend: `backend/app/.env`

| Variable | Purpose | Example Value |
| :--- | :--- | :--- |
| `PORT` | Backend HTTP server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/gmu_logistic?schema=public` |
| `JWT_SECRET` | Access-token signing key | `super-secret-gmu-jwt-key-2026` |
| `JWT_EXPIRATION` | Access-token expiry duration | `7d` |
| `DEV_OTP_BYPASS` | Enable local test OTP mode | `true` |
| `DEV_DEFAULT_OTP` | Default local test OTP | `1234` |

### Frontend: `apps/GMU-hub/.env`

| Variable | Purpose | Example Value |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base API URL endpoint | `http://localhost:3000/api` |
| `VITE_APP_ENV` | Environment identifier | `development` |

> [!CAUTION]
> **Never commit .env files containing secrets.**

---

# 10. Database and Prisma

PostgreSQL is the database. Prisma is the ORM tool used by NestJS to communicate with PostgreSQL.

```text
React (GMU Hub) -> NestJS API -> Prisma ORM -> PostgreSQL Database
```

| Term | Easy Meaning |
| :--- | :--- |
| **Database** | Container holding application data (`gmu_logistic`). |
| **Table** | Stores one type of information (e.g. `Order`, `Parcel`, `User`). |
| **Row** | One individual record. |
| **Column** | One field property. |
| **Primary Key** | Unique record identifier (`id`). |
| **Foreign Key** | Connects records between tables (e.g. `sellerId` referencing `Seller.id`). |
| **Relation** | Describes connections between database models. |

### Prisma Schema Location
`backend/app/prisma/schema.prisma`

### Database Commands
```bash
cd backend/app
npx prisma generate
npx prisma db push
npx ts-node src/reset-and-seed-20-orders.ts
```

---

# 11. How to Run the Project

Normal local-development process:

### 1. Start PostgreSQL
Ensure your local PostgreSQL server is running.

### 2. Start Backend (Terminal 1)
```bash
cd backend/app
npm run start:dev
```
* **Backend API Base:** `http://localhost:3000/api`
* **Interactive Swagger Docs:** `http://localhost:3000/api/docs`

### 3. Start GMU Hub Frontend (Terminal 2)
From monorepo root:
```bash
npm run gmu-hub:dev
```
* **Frontend Web Application:** `http://localhost:5173`

### 4. Open Frontend in Browser
Navigate to `http://localhost:5173` in Google Chrome. If the app opens but data does not load, verify backend status and `VITE_API_URL`.

---

# 12. Authentication and Security

The project uses **phone OTP authentication**. Successful verification returns a signed JWT access token.

```text
Phone Number Input -> Request OTP -> Verify OTP (1234 in DEV mode) -> JWT Access Token -> Authenticated Requests
```

### Developer OTP
`DEV_OTP_BYPASS=true` and `DEV_DEFAULT_OTP=1234` in `backend/app/.env` allows developers to test any mobile number using test OTP `1234` without real SMS credits.

### JWT Session Handling
API requests pass the token in HTTP headers: `Authorization: Bearer <token>`.  
If an API returns `401 Unauthorized`, [api.ts](file:///c:/Users/parth/OneDrive/Desktop/GST-v1/logistic/apps/GMU-hub/src/utils/api.ts) automatically clears local storage and redirects the user to the landing screen.

### Security Rules
* Do not share passwords, JWT secrets or database credentials.
* Do not commit secrets to Git.
* Do not bypass authentication in production code.
* Check roles (`SUPER_ADMIN`, `ADMIN`) for permission issues.

---

# 13. Master & Reference Data

Master data is information created once and reused across transactions.

| Master | Purpose |
| :--- | :--- |
| **User / Partner Master** | Accounts for SHG members, CRPs, drivers, admins. |
| **Seller Master** | Rural producers, addresses, and village location data. |
| **Buyer Master** | End buyers, delivery addresses, pincodes. |
| **Pincode Master** | Indian villages, talukas, districts, post offices, pincodes (`pincode` table). |
| **Product Master** | Products, categories, daily/weekly production, weight, price (`products` table). |

```text
Create Seller Master -> Product Listed -> Buyer Places Order -> MasterOrder Created -> Customer Transactions Affect Earnings
```

*If a transaction dropdown is empty, first check if the required master record exists.*

---

# 14. Pickup Process

```text
Buyer Places Order -> MasterOrder Created -> PickupOrder Broadcast -> SHG Accepts -> Seller Handover (OTP) -> PARCEL_PICKED -> Transporter Pickup -> IN_TRANSIT_TO_HUB
```

* **`PickupOrder`** records the first-mile collection task from the seller.
* **`Parcel`** records individual box items, generating unique QR images (`qrImage`).
* **`VerificationRecord`** records dynamic 4-digit handover codes to ensure physical custody transfer.

> [!TIP]
> **Development Rule:** If Pickup Order status changes, verify that related Parcel status and Tracking timeline records are correctly updated.

---

# 15. Warehouse & Storage Process

```text
Transporter Unloads at Hub -> Warehouse Intake (HUB_RECEIVED) -> Quality Control (QC_PASSED) -> Shelf Bin Storage (STORED) -> Outbound Manifest Batching -> Dispatched to Driver
```

* **`WarehouseIntake`** records inward receipt of parcels from transporters.
* **`WarehouseInventory`** records bin placement, storage date, and QC status.
* **`Dispatched`** records outbound cargo loaded onto destination drop transporters.

### Storage Quantity Example
```text
Incoming Parcels = 20 units
QC Passed & Stored = 18 units
QC Failed / Damaged = 2 units
Remaining for Dispatch = 18 units
```

*Always test parcel status changes through the complete warehouse flow.*

---

# 16. Drop & Last-Mile Delivery Process

```text
Drop Transporter Transport -> Delivered to Destination Village SHG (PARCEL_AT_DROP_SHG) -> SHG Doorstep Visit -> Buyer Inspection -> Buyer Delivery OTP Verified -> DELIVERED
```

* **`DropOrder`** records last-mile transportation and doorstep delivery.
* **`Delivery OTP`** ensures the buyer received the box before status becomes `DELIVERED`.
* **`Earning`** automatically credits commission to the SHG member and Transporter upon delivery completion.

---

# 17. Return & Reverse Logistics Process

```text
Buyer / Driver Initiates Return (RETURN_REQUESTED) -> Return Pickup Assigned -> Scanned into Hub (RETURN_PARCEL_AT_HUB) -> Restocked or Returned to Seller
```

* **`ReturnOrder`** manages reverse logistics tasks.
* Handles both **Transporter Returns** (failed delivery handoffs) and **Buyer Returns** (damaged/defective items).

---

# 18. API and Frontend/Backend Communication

```text
User clicks Action -> React triggers AppContext -> api.ts sends HTTP Request -> NestJS Controller -> DTO / Guard -> Service Logic -> Prisma ORM -> PostgreSQL -> Response back to React UI
```

### Swagger API Documentation
With backend running, open: `http://localhost:3000/api/docs`

| Area | Example Endpoints |
| :--- | :--- |
| **Auth** | `POST /api/auth/login`, `POST /api/auth/send-otp`, `POST /api/auth/verify-otp` |
| **Pickup Orders** | `GET /api/orders/pickup/new`, `POST /api/orders/:id/shg-accept`, `POST /api/orders/:id/warehouse-intake` |
| **Warehouse** | `GET /api/orders/inventory/stored`, `POST /api/orders/:id/store`, `POST /api/qr/generate` |
| **Drop Orders** | `GET /api/orders/drop/new`, `POST /api/orders/:id/drop-transporter-accept`, `POST /api/orders/:id/drop-complete` |
| **Community** | `GET /api/community/shg/requests`, `PATCH /api/community/:id/approve` |
| **Transporters** | `GET /api/transporters/route-partners/requests`, `PATCH /api/transporters/:id/approve` |

*When an API fails, inspect the browser Network tab first and then backend terminal logs.*

---

# 19. File & Asset Management

* **Uploaded KYC Documents:** Stored under backend uploads (`Aadhaar`, `PAN`, `DL`, `RC`).
* **Parcel QR Images:** Dynamically generated using Node `qrcode` and served as base64 or API data URIs.
* **Excel Data Exports:** Powered by table export helpers in `DataTable.tsx`.

---

# 20. How to Debug a Problem

Follow this 10-step debugging workflow when an issue occurs:

```text
1. Understand requirement
↓
2. Reproduce issue
↓
3. Check Browser Console (F12)
↓
4. Inspect Network request payload & status code
↓
5. Check Backend terminal logs
↓
6. Inspect Controller & DTO validation
↓
7. Inspect Service business logic
↓
8. Inspect Prisma query / PostgreSQL data
↓
9. Fix root cause
↓
10. Test complete affected flow again
```

> [!WARNING]
> **Debugging Rule:** Do not immediately change code. First identify where the request is failing.

---

# 21. Common Errors & Fixes

| Problem | Likely Reason | First Check |
| :--- | :--- | :--- |
| **Port 3000 in use** | Old backend process running. | Stop old Node process (`netstat -ano \| findstr :3000`). |
| **Port 5173 in use** | Old Vite process running. | Stop old Vite process or let Vite pick next port. |
| **DB Connection Error** | PostgreSQL stopped or wrong credentials. | Verify PostgreSQL service & `DATABASE_URL` in `backend/app/.env`. |
| **401 Unauthorized** | Token missing, invalid, or expired. | Check `localStorage` for `gmu_token` & request Authorization header. |
| **403 Forbidden** | User role lacks permission for endpoint. | Check user role in DB vs `@Roles()` decorator in controller. |
| **404 Not Found** | Incorrect API URL path or endpoint. | Check `VITE_API_URL` and NestJS controller route mapping. |
| **500 Internal Error** | Backend exception / service error. | Read full backend terminal stack trace. |
| **Empty Data Table** | Master records or orders missing in DB. | Run seed script `npx ts-node src/reset-and-seed-20-orders.ts`. |
| **Frontend Data Not Loading** | API URL misconfigured or CORS blocked. | Inspect Browser DevTools Network tab. |

---

# 22. Git and Development Workflow

Use a feature branch for every task.

```bash
git pull origin main
git status
git checkout -b feature/my-hub-change

# Make changes & test locally
git add .
git commit -m "feat(gmu-hub): describe the change"
git push -u origin feature/my-hub-change
```

### Before Pushing Checklist
* Test the changed feature.
* Test related order flows.
* Check browser console and backend logs.
* Review `git diff`.
* Make sure no secrets are included.
* Keep commits focused.

> [!CAUTION]
> **Avoid git push --force, git reset --hard or rebase unless specifically instructed.**

---

# 23. Testing Checklist

| Check | Question |
| :--- | :--- |
| **Requirement** | Did I implement exactly what was requested? |
| **UI** | Does the screen display correctly on all viewport sizes? |
| **Validation** | Are invalid inputs rejected properly with clear messages? |
| **API** | Does the correct endpoint receive the expected request body? |
| **Database** | Is expected data saved/updated correctly in PostgreSQL? |
| **Success** | Does the normal logistics flow work end-to-end? |
| **Failure** | Does the system show a useful error message on failure? |
| **Related Flow** | Could another order leg or module be affected by this change? |
| **Permissions** | Does only the correct user role have access? |
| **Logs** | Are there unexpected terminal or console errors? |
| **Git** | Is the commit clean and focused? |

*Example: After changing Pickup Order status logic, test Pickup Order, related Warehouse Intake, and Drop Order behavior.*

---

# 24. Production Overview

Interns should not deploy to production without approval.

```text
Developer Code -> Git Repository -> Build Step -> AWS / Production Server -> NestJS + PostgreSQL -> Nginx Reverse Proxy -> User Browser
```

### Build Commands
```bash
# Build Backend
cd backend/app
npm run build

# Build Frontend
cd apps/GMU-hub
npm run build
```

### Production Safety
* Use production environment values.
* Never expose database passwords or JWT secrets.
* Do not run destructive database commands without approval.
* Follow backup and deployment procedures.
* Test thoroughly before deployment.

---

# 25. Important Commands Cheat Sheet

| Task | Command |
| :--- | :--- |
| **Install Dependencies** | `npm install` |
| **Start Backend** | `npm run backend:dev` (or `npm run start:dev` in `backend/app`) |
| **Start Frontend** | `npm run gmu-hub:dev` |
| **Generate Prisma Client** | `npx prisma generate` |
| **Push DB Schema** | `npx prisma db push` |
| **Seed 20 Sample Orders** | `npx ts-node src/reset-and-seed-20-orders.ts` |
| **Build Backend** | `npm run build --workspace=@logistic/backend` |
| **Build Frontend** | `npm run build --workspace=frontend` |
| **Swagger API Docs** | `http://localhost:3000/api/docs` |

---

# 26. Intern Learning Plan

| Stage | Learn Roadmap |
| :--- | :--- |
| **Day 1** | Logistics concept, project purpose, install tools and run project. |
| **Days 2–3** | React pages/components in `apps/GMU-hub` and NestJS modules/controllers/services. |
| **Days 4–5** | PostgreSQL, Prisma models, entity relationships, and Swagger APIs. |
| **Week 2** | Order Management (Pickup, Warehouse, Drop, Return) and Community/Transporters. |
| **Week 3** | Debugging, validation, QR scanning, and OTP verification workflows. |
| **Week 4** | Small UI/API changes, end-to-end testing, Git feature branches, and pull requests. |

*Do not try to memorize the whole codebase. Learn how a requirement moves from UI → API → business logic → database and back.*

---

# 27. Final Checklist

| I can... | Done |
| :--- | :---: |
| Explain what GMU Hub is. | [ ] |
| Explain why master data and pincode coverage are important. | [ ] |
| Explain Pickup Flow: Order -> Pickup SHG -> Transporter -> Hub. | [ ] |
| Explain Warehouse Flow: Intake -> QC -> Bin Storage -> Outbound Dispatch. | [ ] |
| Explain Last-Mile Drop Flow: Transporter -> Drop SHG -> Buyer Delivery OTP. | [ ] |
| Explain Return Flow: Request -> Pickup -> Hub Intake. | [ ] |
| Find a frontend page for a feature in `apps/GMU-hub/src/pages`. | [ ] |
| Find the related backend module/service in `backend/app/src/modules`. | [ ] |
| Find the Prisma schema models in `schema.prisma`. | [ ] |
| Run PostgreSQL, backend and frontend locally. | [ ] |
| Open Swagger and test an API endpoint. | [ ] |
| Debug using Chrome Console and Network tab. | [ ] |
| Use a Git feature branch. | [ ] |
| Test success and error cases across connected order flows. | [ ] |
| Keep secrets and production data safe. | [ ] |

---

# THE GOLDEN RULE

> [!IMPORTANT]
> **THE GOLDEN RULE:**  
> **Understand the business flow first $ightarrow$ understand the code $ightarrow$ make the smallest safe change $ightarrow$ test the complete affected flow.**

*Prepared as an easy-to-understand complete project documentation for the Gramuunati Logistics (GMU) Hub platform.*
