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
- [ ] **GST Report** — Monthly GSTR-1 style report of outward supplies with CGST/SGST breakdown, exportable to Excel/CSV
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

## 🤖 Phase 3 — AI Copilot & Advanced Features (FUTURE)

> Goal: Add a Gemini-powered AI assistant that allows staff to interact with the ERP using plain English commands. Also add advanced analytics, notifications, and a mobile experience.

**Estimated Timeline:** 6–10 weeks (begins after Phase 2 is complete)  
**AI Engine:** Google Gemini API (Free Tier — $0/month for current usage levels)

---

### 3.1 — AI Copilot Chat Interface
- [ ] **Chat Widget** — Floating chat button in the bottom-right corner of every page
- [ ] **Conversation History** — Chat context is saved per session so the AI remembers previous messages
- [ ] **Voice Input** — Allow users to speak commands using the browser's built-in Web Speech API
- [ ] **Typing Indicator** — "AI is thinking..." animation while waiting for the response
- [ ] **Error Handling** — Graceful fallback message when the AI API is unavailable or quota is exceeded

---

### 3.2 — AI Function Calling (Real Actions)
> The AI will be able to perform real database operations on behalf of the user using structured function calls.

- [ ] **Add Stock** — *"Add 200 bags of cement to the main warehouse"*
- [ ] **Create Customer** — *"Add a new customer: Ramesh Builders, phone 9876543210, from Pune"*
- [ ] **Create Supplier** — *"Add a supplier: ShivShakti Cement, from Nagpur"*
- [ ] **Create Purchase Invoice** — *"Record a purchase of 500 bags of cement from UltraTech at ₹320 per bag"*
- [ ] **Create Sales Invoice** — *"Create an invoice for ABC Contractors for 1000 paver blocks at ₹25 each"*
- [ ] **Record Payment** — *"Mark ₹50,000 received from ABC Contractors against Invoice #INV-0012"*
- [ ] **Create Production Order** — *"Schedule production of 5000 paver blocks for tomorrow, morning shift"*
- [ ] **Stock Adjustment** — *"Reduce cement stock by 10 bags due to damage"*

---

### 3.3 — AI Query & Reporting
> The AI fetches and summarizes live data from the database on request.

- [ ] **Stock Query** — *"How many bags of cement do we have right now?"*
- [ ] **Sales Query** — *"What were our total sales this week?"*
- [ ] **Outstanding Query** — *"Which customers owe us money?"*
- [ ] **Low Stock Query** — *"Which items are running low and need to be reordered?"*
- [ ] **Profitability Query** — *"What is our gross profit this month?"*
- [ ] **Natural Language Summary** — AI generates a short business health paragraph for the day/week

---

### 3.4 — AI Safety & Confirmation
- [ ] **Destructive action confirmation** — Before deleting or cancelling, AI asks: *"Are you sure you want to cancel Invoice #INV-0015? This will reverse the stock movement."*
- [ ] **Role-based AI access** — Accountants cannot issue AI commands that require manager-level approval
- [ ] **AI Action Audit Log** — Every action performed by the AI is recorded in the audit log with the tag `performed_by: AI Copilot`

---

### 3.5 — Advanced Analytics Dashboard
- [ ] **Interactive Charts** — Revenue vs Expenses bar chart, monthly sales trend line chart
- [ ] **Top Customers** — Ranked list of customers by revenue generated this month/quarter
- [ ] **Top Selling Items** — Best-selling products ranked by quantity and by total value
- [ ] **Production Efficiency Chart** — Planned vs actual production quantities over time
- [ ] **Cash Flow Widget** — Net summary of money in (customers) vs money out (suppliers) this month

---

### 3.6 — Notifications & Alerts
- [ ] **In-app Notifications** — Bell icon showing pending approvals, low stock alerts, overdue payments
- [ ] **Email Alerts** — Notify the manager by email when a document is submitted for approval
- [ ] **Low Stock Email Alert** — Automated daily email listing items below minimum stock level
- [ ] **WhatsApp / SMS Alerts** *(Optional)* — Send invoice PDF links to customers via WhatsApp using Twilio or Meta Cloud API

---

### 3.7 — Mobile & PWA
- [ ] **Responsive Design Audit** — Ensure all pages are fully usable on mobile screen sizes
- [ ] **Progressive Web App (PWA)** — Allow users to install the ERP as an icon on their phone's home screen
- [ ] **Offline Caching (basic)** — Cache the dashboard data so it is viewable without internet for quick reference

---

## 📌 Key Technical Decisions

| Concern | Decision | Reason |
|---|---|---|
| Frontend Framework | React + Vite + TypeScript | Fast build, type-safe, modern |
| Styling | Tailwind CSS | Rapid, consistent UI development |
| Database & Auth | Supabase (PostgreSQL) | Managed, free tier, built-in auth and storage |
| Hosting | Cloudflare Pages | Free, globally fast CDN with auto-deploy |
| AI Engine | Google Gemini API (Free Tier) | Generous free quota, excellent function calling support |
| PDF Generation | jsPDF or react-pdf | Client-side PDF without needing a backend server |
| Charts | Recharts | Lightweight and React-native compatible |
| Notifications | Supabase Edge Functions + Resend | Serverless email sending without a separate backend |

---

*Last Updated: September 2026*  
*Maintained by: Development Team*
