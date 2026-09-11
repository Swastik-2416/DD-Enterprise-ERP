# DD Enterprise ERP — Development Roadmap

> **Project:** DD Enterprise Paver Block ERP  
> **Client:** DD Enterprise  
> **Live URL:** https://www.ddenterprisepaverblock.co.in  
> **Repository:** https://github.com/Swastik-2416/DD-Enterprise-ERP  

---

## ✅ Phase 1 — Foundation & Deployment (COMPLETED)

> Goal: Build the core ERP skeleton, connect real database, and deploy to a live URL for client preview.

### Infrastructure
- [x] Project scaffolded with Vite + React + TypeScript
- [x] Tailwind CSS integrated for styling
- [x] Supabase project created and connected
- [x] Database schema designed and tables created (companies, profiles, items, stock, invoices, payments, production, etc.)
- [x] Authentication system built (Email + Password via Supabase Auth)
- [x] Role-based access implemented (`manager` vs `accountant`)
- [x] Admin user created in Supabase
- [x] Company profile seeded in database

### Core Modules (UI Prototype)
- [x] Login page
- [x] Dashboard with overview stats
- [x] Master Data: Item Categories
- [x] Master Data: Units of Measurement
- [x] Master Data: Items / SKUs
- [x] Master Data: Bill of Materials (BOM)
- [x] Stakeholders: Suppliers
- [x] Stakeholders: Customers
- [x] Procurement: Purchase Invoices
- [x] Sales: Sales Invoices
- [x] Payments module
- [x] Manufacturing: Production Orders
- [x] Reports: GST Report
- [x] Reports: Stock Report

### Deployment
- [x] Code pushed to GitHub (`main` branch)
- [x] Cloudflare Pages set up with auto-deploy from GitHub
- [x] SPA routing (`_redirects`) configured for Cloudflare
- [x] Supabase environment variables set in Cloudflare
- [x] Custom domain `www.ddenterprisepaverblock.co.in` connected
- [x] SSL certificate active on custom domain
- [x] Domain hidden from Google Search (private ERP, not indexed)

---

## 🔄 Phase 2 — Full Functional Backend & Live Data (UPCOMING)

> Goal: Make every module fully functional with real database reads/writes. The app should be able to create, edit, delete, and list all real data without using any mock/demo data.

**Estimated Timeline:** 4–6 weeks

---

### 2.1 — Authentication & User Management
- [ ] **User Management page** — Managers can create/deactivate accounts for other staff members
- [ ] **Password reset flow** — Send password reset emails via Supabase
- [ ] **Profile page** — Allow users to update their own name and avatar
- [ ] **Session timeout** — Auto log out after a period of inactivity for security

---

### 2.2 — Company & Settings
- [ ] **Company settings page** — Update GSTIN, address, logo, and contact info from inside the app
- [ ] **Logo upload** — Store company logo in Supabase Storage and display it on invoices
- [ ] **Financial year setting** — Set the current financial year for filtering reports correctly

---

### 2.3 — Master Data (Live CRUD)
- [x] **Item Categories** — Full Create, Read, Update, Delete (CRUD) wired to Supabase
- [x] **Units of Measurement** — Full CRUD wired to Supabase
- [x] **Items / SKUs** — Full CRUD with real-time form validation (HSN code, GST rate, purchase/selling rate, etc.)
- [x] **Bill of Materials (BOM)** — Create multi-line BOM, link raw materials to finished goods, set wastage %
- [ ] **Warehouses** — Add support for named warehouses (currently defaulting to a placeholder ID)

---

### 2.4 — Suppliers & Customers (Live CRUD)
- [x] **Suppliers** — Full CRUD: add, edit, deactivate suppliers with bank details
- [x] **Customers** — Full CRUD: add, edit, deactivate customers with credit limit tracking
- [x] **Outstanding Balance** — Show each customer's and supplier's pending payment balance on their profile

---

### 2.5 — Procurement (Purchase Invoices)
- [x] **Create Purchase Invoice** — Multi-line form: select supplier, add items, auto-calculate GST (CGST + SGST)
- [x] **View / List Invoices** — Paginated table with search and date filters
- [x] **Edit Invoice** — Allow editing of draft invoices before they are submitted
- [x] **Submit → Approve workflow** — Status flow: `Draft → Submitted → Approved → Posted`
- [x] **Post Invoice** — Posting must automatically trigger a stock IN movement (increase stock balance)
- [x] **Cancel Invoice** — Cancelling must automatically reverse the stock movement
- [ ] **Purchase Returns** — Create a purchase return against an existing posted invoice to reduce stock

---

### 2.6 — Sales (Sales Invoices)
- [x] **Create Sales Invoice** — Multi-line form: select customer, add items, choose type (GST / Non-GST / Proforma)
- [x] **Auto invoice numbering** — Generate sequential invoice numbers per financial year (e.g., INV-2425-0001)
- [x] **View / List Invoices** — Paginated table with search and filter by status/customer
- [x] **Submit → Approve → Post workflow** — Posting must reduce stock automatically
- [ ] **Sales Returns** — Create a return/credit note against an existing invoice to add back stock
- [x] **Printable Invoice (PDF)** — Generate a professional GST-compliant PDF invoice with company logo and details

---

### 2.7 — Payments
- [x] **Record Inward Payment** — Record payments received from customers with mode (Cash, Cheque, NEFT, UPI, etc.)
- [x] **Record Outward Payment** — Record payments made to suppliers
- [x] **Invoice Allocation** — Link a payment to one or more invoices to accurately track outstanding balance
- [ ] **Ledger View** — Customer/Supplier account statement: chronological list of all invoices and payments

---

### 2.8 — Inventory & Stock
- [x] **Stock Ledger** — View all stock movements per item (purchase, sale, production, adjustment)
- [x] **Current Stock Report** — Live view of quantity on hand for all items across all warehouses
- [x] **Stock Adjustment** — Manual entry to correct stock discrepancies with a reason/notes field
- [x] **Low Stock Alerts** — Highlight items that have fallen below their defined `min_stock_level`
- [ ] **Warehouse Transfer** — Move stock from one warehouse to another with a movement record

---

### 2.9 — Manufacturing
- [x] **Create Production Order** — Select a BOM, set planned quantity and production date
- [x] **Submit → Approve → Execute workflow** — On execution: auto-deduct raw materials (with wastage %), auto-add finished goods to stock
- [x] **Actual vs Planned** — Record the actual quantity produced versus what was planned
- [x] **Machine & Mould tracking** — Log which machine and mould were used per production run
- [ ] **Production Cost Report** — Calculate total raw material cost per production order

---

### 2.10 — Reports
- [x] **GST Report** — Monthly GSTR-1 style report of outward supplies with CGST/SGST breakdown, exportable to Excel/CSV
- [ ] **Purchase Register** — List all purchase invoices for a selected date range
- [ ] **Sales Register** — List all sales invoices for a selected date range
- [ ] **Profit & Loss (Basic)** — Revenue (sales) minus Cost of Goods Sold (purchases + production cost)
- [ ] **Accounts Receivable (AR)** — Aged list of customers with pending outstanding balances
- [ ] **Accounts Payable (AP)** — Aged list of suppliers with pending outstanding balances

---

### 2.11 — Audit & Security
- [ ] **Audit Log Viewer** — UI to browse the `audit_logs` table: who changed what record, and when
- [ ] **Row Level Security (RLS)** — Enable and write Supabase RLS policies so each company's data is isolated
- [ ] **Manager-only actions** — Restrict approval and posting actions strictly to the `manager` role in UI and database

---

## 🚀 Phase 3 — Advanced Analytics, Alerts & Mobile Experience

> Goal: Empower management with executive business intelligence, real-time alert notifications, and a responsive mobile/PWA experience for floor supervisors.

**Estimated Timeline:** 4–6 weeks (begins after Phase 2 is complete)

---

### 3.1 — Executive Analytics & Business Intelligence
- [ ] **Interactive Visual Analytics** — Revenue vs Expenses breakdown, monthly sales growth trends
- [ ] **Top Customers Ranking** — Ranked list of clients by revenue generated this month/quarter
- [ ] **Top Selling Paver Products** — Best-selling concrete items ranked by volume (sq.ft / pcs) and gross value
- [ ] **Plant Production Efficiency** — Planned vs actual production output and machine utilization trends
- [ ] **Cash Flow Summary Widget** — Real-time inflow (customer collections) vs outflow (vendor disbursements)

---

### 3.2 — Notifications & Operational Alerts
- [ ] **In-App Notification Center** — Actionable notifications for pending approvals, low raw material stock, and overdue receivables
- [ ] **Email Alerts** — Automatic email notifications to managers when purchase bills or production orders require approval
- [ ] **Low Stock Email Digest** — Daily automated morning digest of raw materials below safety thresholds
- [ ] **WhatsApp Invoice Sharing** *(Optional)* — Share sales invoice PDFs directly to customer WhatsApp contacts

---

### 3.3 — Mobile & PWA
- [ ] **Mobile Responsive Optimization** — Streamlined interface for factory floor supervisors on tablets and smartphones
- [ ] **Progressive Web App (PWA)** — Installable ERP application on mobile home screens with offline splash
- [ ] **Fast Offline View** — Cache dashboard and inventory balances for offline plant walk-throughs

---

## 📌 Key Technical Decisions

| Concern | Decision | Reason |
|---|---|---|
| Frontend Framework | React + Vite + TypeScript | Fast build, type-safe, modern |
| Styling | Tailwind CSS | Rapid, consistent UI development |
| Database & Auth | Supabase (PostgreSQL) | Managed, free tier, built-in auth and storage |
| Hosting | Cloudflare Pages | Free, globally fast CDN with auto-deploy |
| PDF Generation | jsPDF / Browser Print Engine | Client-side GST invoice printing without backend server overhead |
| Charts | Recharts | Lightweight, interactive React SVG chart library |
| Notifications | Supabase Edge Functions + Resend | Serverless email dispatch without managing server infrastructure |

---

*Last Updated: September 2026*  
*Maintained by: Development Team*
