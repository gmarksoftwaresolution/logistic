# 🧪 Transporter Signup & Login API Testing Guide

This guide provides a comprehensive overview of the unified API structure for the Transporter onboarding process.

---

## 🏗️ Core Flow Overview

1. **Signup Flow** (`/registration`): 
   - **Step 0 (Public)**: `POST /registration/select-language`
   - **Step 1 (Public)**: `POST /registration/send-otp`
   - **Step 2 (Public)**: `POST /registration/verify-otp` -> Returns JWT
2. **Authentication Flow** (`/auth`):
   - `POST /auth/send-otp` -> `POST /auth/verify-otp` (Returns JWT)
3. **User & Dashboard APIs** (`/api/user`):
   - `GET /api/user/profile`
   - `GET /api/user/dashboard`
4. **Application Tracking** (`/api/application`):
   - `GET /api/application/status`
5. **Registration Flow** (`/registration` - **Authenticated**):
   - `POST /registration/step1` -> `POST /registration/step2` -> `POST /registration/step3` -> `POST /registration/step4`
6. **Dynamic Branching**:
   - **Personal Vehicle**: Step 5 (Vehicle) → Step 6 (Route) → Finish steps.
   - **Milk Van**: Step 5 (Milk Org) → Step 6 (Route) → Step 7 (Vehicle) → Finish steps.
7. **Admin Approval**: Super Admin reviews `UNDER_REVIEW` applications.

---

## 🔑 Signup Flow (`/registration`)

### 1. Select Language (Step 0)
- **Endpoint**: `POST /registration/select-language`
- **Request Body**: `{ "language": "English" }`

### 2. Send OTP (Step 1)
- **Endpoint**: `POST /registration/send-otp`
- **Request Body**: `{ "mobileNumber": "9876543210", "language": "English" }`

### 3. Verify OTP (Step 2)
- **Endpoint**: `POST /registration/verify-otp`
- **Request Body**: `{ "mobileNumber": "9876543210", "otp": "123456" }`
- **Response**: Returns JWT `access_token`.

---

## 🔓 Authentication APIs (`/auth`)

### 1. Send OTP
- **Endpoint**: `POST /auth/send-otp`
- **Request Body**: `{ "phoneNumber": "9876543210" }`

### 2. Verify OTP
- **Endpoint**: `POST /auth/verify-otp`
- **Request Body**: `{ "phoneNumber": "9876543210", "otp": "123456" }`
- **Response**: Returns JWT `access_token`.

---

## 👤 User & Dashboard APIs (`/api/user`) - [Requires Bearer Token]

### 1. User Profile
- **Endpoint**: `GET /api/user/profile`
- **Purpose**: Retrieve full user profile and registration data.

### 2. User Dashboard
- **Endpoint**: `GET /api/user/dashboard`
- **Purpose**: Get summary metrics (completion %, status, highlights).

---

## 📈 Application Tracking (`/api/application`) - [Requires Bearer Token]

### 1. Application Status
- **Endpoint**: `GET /api/application/status`
- **Success Response**:
  ```json
  {
    "applicationStatus": "PENDING",
    "transporterId": "GMU-TP-00001",
    "requestId": "uuid",
    "rejectionReason": null,
    "currentStep": "STEP_4"
  }
  ```

---

## 📝 Registration Steps (`/registration`) - [Requires Bearer Token]

### 1. Personal Details
- **Endpoint**: `POST /registration/step1`
- **Body**: `{ "firstName": "John", "lastName": "Doe", "email": "john@example.com", "residentialAddress": "...", "pinCode": "411001", "profilePhoto": "..." }`

### 2. Driving Details
- **Endpoint**: `POST /registration/step2`
- **Body**: `{ "licenseNumber": "MH12...", "licensePhoto": "...", "expiryDate": "2030-01-01", "experienceYears": 5 }`

### 3. Bank Details
- **Endpoint**: `POST /registration/step3`
- **Body**: `{ "accountHolderName": "John Doe", "bankName": "HDFC", "accountNumber": "...", "ifscCode": "...", "branchName": "...", "upiId": "..." }`

### 4. Vehicle Type Selection
- **Endpoint**: `POST /registration/step4`
- **Body**: `{ "vehicleCategory": "PERSONAL" }`

---

## 👑 Super Admin Approval

### 1. Get Pending Requests
- **Endpoint**: `GET /api/admin/requests?status=UNDER_REVIEW`

### 2. Approve Request
- **Endpoint**: `PATCH /api/admin/requests/:requestId/approve`

### 3. Reject Request
- **Endpoint**: `PATCH /api/admin/requests/:requestId/reject`

---

## 🆔 Unique ID Format
Generated upon Approval: `GMU-TP-XXXXX`
