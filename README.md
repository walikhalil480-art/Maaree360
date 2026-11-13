# Till Pro — Retail Management System

> **Sell Smarter. Manage Better.**  
> A premium Point of Sale (POS), real-time inventory control, and retail business intelligence platform tailored for supermarkets, minimarkets, grocery chains, electronics shops, and hardware retailers in Kenya and East Africa.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.x-61dafb.svg)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2d3748.svg)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38b2ac.svg)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-237_Tests_Passing-brightgreen.svg)](https://vitest.dev/)
[![Currency](https://img.shields.io/badge/Currency-KES_(Kenyan_Shilling)-emerald.svg)](#currency--localization)

---

## Table of Contents

1. [Executive Overview](#executive-overview)
2. [Application Visual Tour](#application-visual-tour)
3. [Key Modules & Capabilities](#key-modules--capabilities)
4. [System Architecture](#system-architecture)
5. [Technology Stack](#technology-stack)
6. [Getting Started & Installation](#getting-started--installation)
7. [Default Credentials & Test Accounts](#default-credentials--test-accounts)
8. [Database Schema Overview](#database-schema-overview)
9. [API Route Reference](#api-route-reference)
10. [Hardware Peripherals & POS Integration](#hardware-peripherals--pos-integration)
11. [Security & Multi-Tenant Isolation](#security--multi-tenant-isolation)
12. [Currency, Payments & Localization](#currency-payments--localization)
13. [Available Scripts & Maintenance](#available-scripts--maintenance)
14. [License](#license)

---

## Executive Overview

**Till Pro** is a modern, enterprise-grade retail operating system designed to replace cumbersome legacy checkout machinery with a clean, fast, cloud-connected solution. Engineered with a focused palette of **Midnight Navy (`#0F172A`)** and **Emerald Green (`#059669`)**, paired with the high-legibility **Manrope** typeface, Till Pro delivers the polish, usability, and speed expected from modern enterprise SaaS platforms such as Stripe and Shopify.

### Core Value Propositions

- **Lightning-Fast Checkout:** Low-latency point-of-sale terminal supporting physical USB/Bluetooth barcode guns, device camera scanning, keyboard hotkeys (F12 checkout, Enter confirm), and manual SKU lookup.
- **Strict Non-Negative Inventory Ledger:** Double-entry immutable stock ledger that mathematically prevents negative balances and maintains an airtight audit trail for every item received, sold, damaged, or adjusted.
- **Authentic Supermarket Catalog:** Pre-seeded with over 200 real East African packaged supermarket goods (maize flour, cooking oils, dairy, sodas, cleaning supplies, personal care, electronics), complete with authentic manufacturer packaging photography, EAN-13 barcodes, and unit specifications.
- **Kenyan Payment Flexibility:** Full support for Cash payments with instant change calculation, Safaricom M-Pesa mobile money reference tracking, Bank transfers, Card payments, and split-tender transactions.
- **Comprehensive Financial Intelligence:** Executive P&L reporting, gross profit tracking, margin analytics, operating expense oversight, cashier shift reconciliations, and exportable PDF summaries.
- **Granular Role-Based Access (RBAC):** Tailored views and security boundaries for Store Owners, Managers, Cashiers, and Stock Clerks.

---

## Application Visual Tour

The following screenshots capture real production interfaces of Till Pro running with realistic supermarket inventory data:

### 1. Executive Dashboard Overview
Real-time sales revenue, estimated gross profit margins, FIFO inventory valuation, low-stock alerts, live transaction feeds, and inventory reorder priorities.
![Till Pro Dashboard](docs/screenshots/dashboard.png)

### 2. High-Performance Point of Sale (POS) Terminal
Split-view checkout interface featuring instant catalog search, category chips, active basket with stepper controls, line-item discounts, and single-click checkout.
![Till Pro Point of Sale](docs/screenshots/pos.png)

### 3. Inventory & Physical Stock Control
Comprehensive SKU ledger tracking physical on-hand units, safety thresholds, depleted items, and reorder requisitions.
![Till Pro Inventory Management](docs/screenshots/inventory.png)

### 4. Product Catalog & Packshot Photography
Retail goods management showcasing real packaged supermarket merchandise, margin calculations, barcode assignments, and category management.
![Till Pro Products Catalog](docs/screenshots/products.png)

### 5. Sales Transactions & Audit Ledger
Complete chronological record of customer receipts, payment methods (Cash, M-Pesa, Card), cashier identifiers, and itemized transaction breakdowns.
![Till Pro Sales Transactions](docs/screenshots/transactions.png)

### 6. Financial Reports & P&L Analytics
Executive financial health reporting with revenue trends, COGS analysis, operating expenses, and printable management reports.
![Till Pro Financial & Inventory Reports](docs/screenshots/reports.png)

### 7. Customer Accounts & Credit Tracking
Customer directory managing contact details, tax PINs, cumulative spending history, and return credits.
![Till Pro Customer Accounts](docs/screenshots/customers.png)

---

## Key Modules & Capabilities

### 🛒 Point of Sale (POS) Terminal
- **Dual-Pane Interface:** High-density catalog grid on the left; real-time shopping cart and totals on the right.
- **Hardware Scanner Guard:** `ScannerEventGuard` intercepts rapid keystrokes from USB/Bluetooth 1D/2D barcode scanners and resolves products in under 50ms without stealing focus from active inputs.
- **Camera Barcode & QR Scanner:** Built-in WebRTC video scanner powered by `html5-qrcode` for instant scanning on tablets, laptops, and mobile devices without external hardware.
- **Keyboard Shortcuts:** `F12` opens checkout instantly; `Esc` dismisses modals; `Enter` finalizes standard transactions.
- **Multi-Tender Payments:** Cash (with change due calculation), M-Pesa (with transaction code validation), Card, Bank Transfer, and Split Payments.

### 📦 Inventory & Stock Movement Ledger
- **Strict Non-Negative Balance Enforcement:** Database transactions reject any sale or stock issue that would drive physical stock below zero.
- **Movement Types:** Full ledger classification for `RECEIVE` (supplier shipments), `SALE` (POS deductions), `ADJUSTMENT` (cycle counts), `LOSS` (spoilage/breakage/theft), and `RETURN` (customer refunds).
- **Automated Low-Stock Alerts:** Real-time visual warnings when current stock breaches defined minimum safety thresholds.

### 🏷️ Product Catalog & Barcode Management
- **Authentic Merchandise Photography:** Catalog pre-loaded with over 200 real supermarket items featuring authentic product packaging packshots.
- **Multi-Code Mapping:** Products can hold multiple barcode identifiers (EAN-13 manufacturer codes, UPC-A, Code 128, and Till Pro proprietary shelf QR codes).
- **Customer Price Checker:** Dedicated standalone kiosk mode (`/price-checker`) allowing shoppers to scan barcodes at shelf terminals to verify pricing and stock availability without revealing confidential cost prices or margins.

### 💼 Cashier Shifts & Register Balancing
- **Cash Drawer Reconciliation:** Mandatory shift opening with initial cash float, real-time transaction tracking, and end-of-shift closing reconciliations.
- **Discrepancy Auditing:** Computes overage/shortage against expected drawer balances and records audit logs for management review.

### 📊 Financial & Operating Reports
- **Real-Time P&L Statement:** Net Revenue, Cost of Goods Sold (COGS), Gross Profit, Operating Expenses (rent, electricity, salaries, licenses), and Net Operating Profit.
- **Period Comparisons:** Instant toggles for Today, Yesterday, This Week, Last Week, This Month, Last Month, and Custom Date Ranges.
- **Export Capabilities:** One-click CSV and printable management PDF reports.

---

## System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend Client (React 19 + TypeScript + Vite)"]
        UI["UI Component Library (Manrope + Tailwind 4)"]
        AppShell["Midnight Navy AppShell & Navigation"]
        POS["POS Terminal & Cart Engine"]
        HardwareGuard["Hardware Scanner & Camera Engine"]
        State["Auth & Active Business Context"]
    end

    subgraph Peripherals["Hardware & Peripherals Layer"]
        USBScanner["USB / Bluetooth Barcode Scanners (HID)"]
        CamScanner["WebRTC Device Video Camera"]
        ReceiptPrinter["ESC/POS Thermal Printers (58mm / 80mm)"]
        CashDrawer["RJ11 / RJ12 Electric Cash Drawer"]
    end

    subgraph Gateway["Backend API Gateway (Node.js + Express)"]
        AuthMiddleware["JWT & Argon2id Auth Guard"]
        TenantGuard["Multi-Tenant Isolation Middleware"]
        RBAC["Role-Based Access Control (Owner, Manager, Cashier, Clerk)"]
        Validation["Zod Request Validation & Sanitization"]
    end

    subgraph Services["Core Business Services Layer"]
        SaleService["Sale & Checkout Transaction Engine"]
        InventoryService["Strict Non-Negative Stock Ledger Service"]
        ReportService["P&L & Analytics Aggregation Service"]
        ShiftService["Cashier Register & Float Service"]
        ProductService["Product Catalog & Photo Service"]
    end

    subgraph Database["Data Persistence (PostgreSQL 16)"]
        Prisma["Prisma ORM Client"]
        Tables[("20+ Relational Tables with Decimal Precision")]
    end

    USBScanner --> HardwareGuard
    CamScanner --> HardwareGuard
    HardwareGuard --> POS
    POS --> ReceiptPrinter
    POS --> CashDrawer

    UI --> AppShell
    AppShell --> Gateway
    POS --> Gateway

    Gateway --> AuthMiddleware
    AuthMiddleware --> TenantGuard
    TenantGuard --> RBAC
    RBAC --> Validation

    Validation --> SaleService
    Validation --> InventoryService
    Validation --> ReportService
    Validation --> ShiftService
    Validation --> ProductService

    SaleService --> Prisma
    InventoryService --> Prisma
    ReportService --> Prisma
    ShiftService --> Prisma
    ProductService --> Prisma

    Prisma --> Tables
```

---

## Technology Stack

| Domain | Technology | Version | Purpose & Architectural Rationale |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | 19.x | Modern concurrent rendering, fast reconciliation, robust component ecosystem |
| **Language** | TypeScript | 5.x | End-to-end type safety between client and server data contracts |
| **Build Tooling** | Vite | 6.x | Sub-second HMR dev server and optimized production rollup builds |
| **Typography** | Manrope & JetBrains Mono | Google Fonts | Modern geometric sans-serif for UI; monospace tabular figures for currency |
| **Styling** | Tailwind CSS | 4.x | Utility-first CSS engine with custom `@theme` brand color tokens |
| **Icons** | Lucide React | Latest | Crisp, consistent SVG icons across all application views |
| **Barcode Scanning** | html5-qrcode | 2.3.x | Client-side zero-latency video barcode & QR code decoding |
| **Backend Runtime** | Node.js | 22.x LTS | High-throughput asynchronous event-driven JavaScript/TypeScript runtime |
| **API Framework** | Express | 4.x | Mature, battle-tested RESTful routing and middleware pipeline |
| **Database** | PostgreSQL | 16 | ACID-compliant relational storage with strict foreign keys and transactions |
| **ORM** | Prisma | 5.x | Type-safe query building, migrations, and declarative schema modeling |
| **Authentication** | Argon2id & JWT | `@node-rs/argon2` | Industry gold-standard password hashing and cryptographically signed tokens |
| **Testing** | Vitest & Supertest | Latest | Fast isolated unit and API integration testing suite (237 tests) |

---

## Getting Started & Installation

### Prerequisites

Ensure you have the following installed on your host machine:
- **Node.js**: v18.0.0 or later (v22.x LTS recommended)
- **npm**: v9.0.0 or later
- **PostgreSQL**: v14.0 or later (running locally or via Docker)

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/smartstock.git
cd smartstock
```

### 2. Configure Backend Environment

Navigate to the `server` directory and copy the environment template:

```bash
cd server
cp .env.example .env
```

Verify your `server/.env` configuration:

```env
PORT=5001
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smartstock?schema=public"
JWT_SECRET="your-super-secure-jwt-secret-key-32-chars-min"
JWT_EXPIRES_IN="7d"
CORS_ORIGIN="http://localhost:5173"
DEFAULT_CURRENCY="KES"
TIMEZONE="Africa/Nairobi"
```

### 3. Install Dependencies & Setup Database

```bash
# In the server directory:
npm install

# Run Prisma migrations to generate the database schema:
npx prisma migrate dev

# Seed database with sample businesses, staff accounts, and 200+ real Kenyan supermarket products:
npm run seed:kenya-products
```

### 4. Setup Frontend Client

Open a second terminal window, navigate to the `client` directory, and install packages:

```bash
cd client
npm install
```

### 5. Start Development Servers

**Start the Backend API Server:**
```bash
# Inside /server
npm run dev
# Server starts on http://localhost:5001
```

**Start the Frontend Application:**
```bash
# Inside /client
npm run dev
# Frontend starts on http://localhost:5173
```

Visit **`http://localhost:5173`** in your browser to access Till Pro.

---

## Default Credentials & Test Accounts

The seed script creates pre-configured demo businesses with staff members across all four permission tiers:

| Email Address | Password | Role | Assigned Store | Permissions Summary |
| :--- | :--- | :--- | :--- | :--- |
| `walikhalil480@gmail.com` | `Password123` | **OWNER** | Khalil Academy & City General | Full system access, financial reports, user invites, settings |
| `owner@smartstock.co.ke` | `OwnerPassword123!` | **OWNER** | SmartStock Demo Mini-Mart | Full administrator and financial access |
| `manager@smartstock.co.ke` | `ManagerPassword123!` | **MANAGER** | SmartStock Demo Mini-Mart | POS, inventory adjustments, reports, shift oversight |
| `cashier@smartstock.co.ke` | `CashierPassword123!` | **CASHIER** | SmartStock Demo Mini-Mart | POS checkout, returns, price checking, shift register |
| `clerk@smartstock.co.ke` | `ClerkPassword123!` | **STOCK_CLERK** | SmartStock Demo Mini-Mart | Inventory receiving, stock counts, purchase order receiving |

---

## Database Schema Overview

Till Pro uses Prisma ORM with strict decimal precision for all monetary and fractional quantity values.

```mermaid
erDiagram
    Business ||--o{ UserBusiness : "employs"
    User ||--o{ UserBusiness : "participates in"
    Business ||--o{ Product : "owns"
    Category ||--o{ Product : "categorizes"
    Product ||--o{ ProductCode : "identified by"
    Product ||--o| StockLevel : "current balance"
    Product ||--o{ StockMovement : "audit ledger"
    Business ||--o{ Sale : "records"
    Sale ||--o{ SaleItem : "contains"
    Sale ||--o{ Payment : "settled with"
    Customer ||--o{ Sale : "transacts"
    Supplier ||--o{ PurchaseOrder : "supplies"
    PurchaseOrder ||--o{ PurchaseOrderItem : "items"
    Business ||--o{ Expense : "incurs"
    User ||--o{ CashierShift : "operates"
```

### Core Entities

- **Business:** Multi-tenant root entity containing store name, currency, tax PIN, receipt header/footer, and regional settings.
- **User & UserBusiness:** User credentials, password hashes, and store-specific role associations (`OWNER`, `MANAGER`, `CASHIER`, `STOCK_CLERK`).
- **Product & Category:** Catalog items with SKU, unit of measure (Piece, kg, Pack, Litre), wholesale cost price, retail selling price, packshot photo URL, and safety stock threshold.
- **ProductCode:** One-to-many barcode mappings (`BARCODE`, `QR`, `INTERNAL_SKU`).
- **StockLevel & StockMovement:** Normalized current stock balances and immutable double-entry movement logs with before/after balances and user references.
- **Sale, SaleItem & Payment:** Completed retail transactions, line items, itemized discounts, tax amounts, and payment tenders.
- **CashierShift:** Cash register operational sessions tracking starting float, total transactions, cash payments, manual payouts, and physical counts at closing.
- **Expense:** Operational overhead logs categorized by Rent, Utilities, Payroll, Logistics, Maintenance, and Taxes.

---

## API Route Reference

All API routes are prefixed with `/api/v1` and strictly enforce tenant isolation and role validation.

### Authentication (`/api/v1/auth`)
- `POST /register` — Create a new merchant user account
- `POST /login` — Authenticate user and receive HttpOnly session cookies
- `POST /logout` — Invalidate user session
- `GET /me` — Retrieve active user profile and store memberships
- `POST /change-password` — Update user password

### Products & Catalog (`/api/v1/businesses/:businessId/products`)
- `GET /` — List products with search, category filter, pagination, and stock status
- `POST /` — Create a new product with optional image upload (multipart/form-data)
- `GET /:id` — Get single product details, barcode codes, and stock balances
- `PUT /:id` — Update product information, price, threshold, or image
- `PATCH /:id/archive` — Soft-archive a discontinued product
- `PATCH /:id/reactivate` — Restore an archived product

### Inventory Control (`/api/v1/businesses/:businessId/inventory`)
- `GET /` — List real-time inventory balances and summary KPI metrics
- `GET /low-stock` — Fetch products at or below safety stock threshold
- `POST /operations` — Record stock movement (`RECEIVE`, `ADJUSTMENT`, `LOSS`, `RETURN`)
- `GET /movements` — Fetch immutable stock movement audit ledger
- `GET /products/:productId/movements` — Fetch movement history for a specific product

### Point of Sale & Checkout (`/api/v1/businesses/:businessId/sales`)
- `POST /` — Process POS checkout, deduct stock, calculate change, and record ledger
- `GET /` — Retrieve transaction history with date filters and payment breakdown
- `GET /:id` — Retrieve receipt details for printing or reprint
- `POST /:id/returns` — Process full or partial sales return and refund items to inventory

### Reporting & Analytics (`/api/v1/businesses/:businessId/reports`)
- `GET /summary` — Retrieve revenue, gross profit, margin %, and period comparisons
- `GET /time-series` — Daily and hourly revenue trends for charts
- `GET /top-products` — Highest revenue and highest volume products
- `GET /turnover` — Inventory turnover ratio and velocity analysis
- `GET /export` — Export financial records to CSV or management summary

### Price Checker (`/api/v1/businesses/:businessId/codes`)
- `GET /resolve?code=...` — Public customer-facing lookup returning product name, image, and selling price (omits cost price and stock levels)

---

## Hardware Peripherals & POS Integration

Till Pro is designed to integrate seamlessly with standard commercial retail hardware peripherals:

### 1. Barcode Scanners (USB & Bluetooth)
- Works out-of-the-box with any standard 1D/2D scanner configured in **USB HID Keyboard Emulation Mode** (Honeywell, Zebra, Datalogic, Eyoyo, Netum).
- The frontend `ScannerEventGuard` detects character streams arriving at intervals under 40 milliseconds with terminating `Enter` pulses, immediately routing the scanned barcode to checkout without requiring cursor focus in the input field.

### 2. Device Camera Scanning
- Integrates `html5-qrcode` to utilize built-in webcams or mobile cameras.
- Processes frames locally in Web Workers using WebAssembly/Canvas (zero server upload) for instantaneous decoding of EAN-13, UPC-A, Code 128, and QR codes.

### 3. Thermal Receipt Printers (ESC/POS)
- Supports 58mm and 80mm thermal receipt printers via USB, Bluetooth, or LAN.
- The built-in receipt template (`ReceiptModal.tsx`) formats clean monospace receipts with store branding, cashier details, tax breakdowns, M-Pesa transaction reference codes, and customer change.
- Supports browser printing styles (`@media print`) and native raw byte ESC/POS command sequences.

### 4. Cash Drawers
- Connects via standard RJ11/RJ12 drawer kick cables through the receipt printer.
- Automatically triggers drawer opening pulse upon finalizing Cash transactions.

---

## Security & Multi-Tenant Isolation

Till Pro enforces strict defense-in-depth security principles:

1. **Password Security:** Passwords are encrypted using **Argon2id** (`@node-rs/argon2`), providing state-of-the-art resistance against GPU-accelerated brute-force attacks.
2. **Session Integrity:** Authentication tokens are stored in secure, `HttpOnly`, `SameSite=Lax` cookies, protecting user sessions against Cross-Site Scripting (XSS) exfiltration.
3. **Multi-Tenant Boundaries:** Every query at the Prisma database layer enforces the `businessId` foreign key boundary. Users cannot read, mutate, or inspect data belonging to another merchant.
4. **Role Enforcement:** Sensitive endpoints (inviting staff, editing financial settings, processing returns, overriding discounts) are gated by `requireRole(['OWNER', 'MANAGER'])`.
5. **Input Validation:** All incoming HTTP payloads are rigorously validated against strict **Zod** schemas before reaching controller logic.

---

## Currency, Payments & Localization

- **Currency Formatting:** Default currency is **KES (Kenyan Shilling)**, rendered consistently with `font-tabular` numeric styling: `KES 1,250.00`.
- **Tax Calculation:** Supports Kenya Value Added Tax (VAT 16%) inclusive and exclusive line calculations.
- **Safaricom M-Pesa Integration:** Dedicated mobile money workflow recording customer telephone numbers and unique M-Pesa confirmation codes (e.g., `QJD789X123`) on receipts and audit logs.
- **Timezone:** Standardized on East Africa Time (`Africa/Nairobi`, UTC+3).

---

## Available Scripts & Maintenance

### Server Scripts (`/server`)

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | `tsx watch src/index.ts` | Start backend with live TypeScript reload |
| `npm run build` | `tsc` | Compile TypeScript into production JavaScript |
| `npm start` | `node dist/index.js` | Run compiled production server |
| `npm test` | `vitest run` | Execute entire test suite (237 tests) |
| `npm run test:watch` | `vitest` | Run tests in interactive watch mode |
| `npm run test:coverage`| `vitest run --coverage` | Generate test coverage report |
| `npm run prisma:generate` | `prisma generate` | Generate Prisma ORM client |
| `npm run prisma:migrate` | `prisma migrate dev` | Apply pending database migrations |
| `npm run seed:kenya-products` | `tsx prisma/seed-kenya-products.ts` | Seed real supermarket products & photos |

### Client Scripts (`/client`)

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | `vite` | Start frontend development server on port 5173 |
| `npm run build` | `tsc -b && vite build` | Type-check and build production bundle |
| `npm run preview` | `vite preview` | Locally preview the production build |
| `npm run lint` | `eslint .` | Lint client codebase for syntax and style |

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <strong>Till Pro</strong> &bull; Sell Smarter. Manage Better.<br />
  Designed &amp; Engineered for Modern Retail Commerce.
</p>
