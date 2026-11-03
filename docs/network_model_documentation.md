# Chapter 3: System Network Architecture

## Figure 4. Client-Server Network Model of the Proposed Management Information System

![Figure 4. Client-Server Network Model of the Proposed Management Information System.](file:///c:/Users/xianr/OneDrive/Desktop/Salon%20System/docs/figure_4_network_model.png)

*Figure 4. Client-Server Network Model of the Proposed Management Information System.*

---

### 1. Architectural Overview

The proposed **Management Information System with AI-Integrated Nail Customization and Recommendation for Candy & Rose Salon** is architected upon a modern, cloud-distributed **Multi-Tier Client-Server Network Model**. This architectural paradigm decouples presentation, application processing, data persistence, and external third-party microservices into logically distinct tiers. This separation of concerns guarantees high availability, rapid edge delivery, horizontal scalability, strict role-based data isolation, and comprehensive end-to-end transport layer security.

The network model is arranged along an east-west communication continuum comprising four foundational tiers:
1. **Tier 1: Client Systems (Presentation Layer)** — Cross-platform responsive client interfaces serving salon customers and internal administrators.
2. **Tier 2: Public Internet & Secure Transport Layer** — Encrypted wide-area network boundary governed by HTTPS/TLS 1.3 and Secure WebSockets (WSS).
3. **Tier 3: Web Application & Computing Tier (Vercel Cloud Infrastructure)** — High-performance Next.js full-stack serverless platform hosting dual web portals, API routing logic, core Salon MIS business functions, and the proprietary AI-Integrated Nail Customization and Recommendation Engine.
4. **Tier 4: Cloud Persistence, Storage & External Services** — Centralized relational database and storage engine (Supabase), federated identity provider (Google Authentication), and cloud transactional email infrastructure (Resend API).

---

### 2. Detailed Component Specifications

#### A. Client Tier (Presentation Layer)
- **Customer Client (Mobile, Tablet, Laptop, Desktop)**:
  - Accessible via any standard, standards-compliant web browser (Google Chrome, Apple Safari, Microsoft Edge, Mozilla Firefox) executing responsive HTML5, CSS3, and ECMAScript 6+ logic.
  - End-users interact with the public **Customer Web Portal**, providing access to the dynamic salon service catalog, interactive appointment reservation workflow, artisan nail gallery, personal appointment history, and the **AI-Integrated Nail Customization & Recommendation module**.
  - Employs zero client-side installation, maximizing accessibility across consumer mobile smartphones (iOS/Android) and workstations.
- **Administrator Workstation (Terminal / PC)**:
  - Dedicated desktop workstation or portable laptop utilized by authorized salon managers and reception personnel.
  - Operates the secure **Admin Management Dashboard**, providing real-time scheduling calendar visualization, pending appointment approvals/rejections, Point-of-Sale (POS) billing settlements, inventory tracking, staff attendance monitoring, and instant WebSocket notifications.
  - Governed by strict **Role-Based Access Control (RBAC)** to protect proprietary business intelligence.

#### B. Public Internet & Security Gateway (Transport Layer)
- **Transport Security**: All network packets traversing the public internet are encrypted under **Transport Layer Security (TLS 1.3 / SSL)** over standard **TCP Port 443**.
- **Real-Time Duplex Channel**: Employs **Secure WebSockets (`wss://`)** alongside standard HTTP REST channels, facilitating bi-directional, push-based communication between clients and backend listeners.
- **Edge Security & CDN**: Global Anycast DNS routing and Content Delivery Network (CDN) edge nodes inspect, cache static web assets, and defend against Distributed Denial of Service (DDoS) threats before requests reach core compute instances.

#### C. Web Application Tier — Vercel Platform (Next.js Framework)
- **Frontend Presentation Layer**: Built with React and Next.js, rendering fast, server-side rendered (SSR) and client-hydrated interfaces tailored for both the customer-facing portal and administrative dashboard.
- **Backend & Serverless API Routes (`/api/*`)**: Serverless Node.js edge functions handling sensitive backend workflows without persistent server overhead. Includes administrative OTP verification dispatchers, password recovery routines, and notification orchestration.
- **Salon Management Information System (MIS) Functions**:
  - *Appointment & Calendar Management*: Handles slot availability algorithms, pending-to-confirmed status transitions, and technician scheduling conflicts.
  - *Services & Dynamic Pricing*: Catalogs nail treatments, foot spas, and custom nail art tiers with accurate durations and transparent pricing formulas.
  - *Point-of-Sale (POS) & Billing*: Aggregates performed services into structured digital invoices and logs settlement transactions (Cash / E-Wallet).
  - *Inventory & Material Depletion*: Monitors nail lacquer, gel polishes, acrylic powders, and sanitation consumable balances with automated low-stock threshold triggers.
  - *Staff Rostering & Attendance*: Organizes stylist shifts and maintains auditable productivity and attendance records.
  - *Customer Relationship Management (CRM)*: Dynamically calculates customer lifetime spend, total salon visit counts, and appointment historical logs.
- **AI-Integrated Nail Customization & Recommendation Engine**:
  - *Intelligent Customizer*: Parameterizes nail attributes including shape (Almond, Coffin, Square, Oval, Stiletto), base texture and finish (Chrome, Glaze, 3D Gel, Matte, Jelly), color tones, and custom client inspiration uploads.
  - *Recommendation Algorithm*: Analyzes client aesthetic preferences, skin-tone compatibility, seasonal nail trends, and estimated wear longevity to compute tailored design recommendations and automatic itemized price estimations.

#### D. Database & Storage Tier — Supabase Infrastructure
- **PostgreSQL 15 Relational Engine**: Enterprise-grade SQL database enforcing relational integrity, foreign key constraints, and ACID transaction compliance. Stores core business tables (`appointments`, `customers`, `profiles`, `nail_designs`, `services`, `billings`, `inventory`, `staff_roster`).
- **Supabase Storage Engine**: S3-compatible cloud object storage buckets configured for public and authenticated asset access, maintaining high-resolution nail design portfolios, uploaded customer inspiration images, and branding assets.
- **Supabase Realtime Engine**: PostgreSQL Change Data Capture (CDC) listening service broadcasting database modifications over persistent WebSockets, ensuring instant appointment alerts on the Admin Dashboard with zero client polling.

#### E. Federated Authentication Service — Google Authentication
- Facilitates frictionless, cryptographic **Single Sign-On (SSO)** utilizing the **OAuth 2.0 and OpenID Connect (OIDC)** standards.
- Handled securely via Supabase Auth federated identity brokering. Upon successful user authentication with Google Identity Services, an authorization code is securely exchanged for a signed **JSON Web Token (JWT)** containing verified user claims, eliminating the storage of plaintext third-party passwords.

#### F. Transactional Email Notification Service — Resend API
- Cloud-hosted communication microservice integrated via the official Node.js SDK over authenticated HTTPS REST POST endpoints.
- Automates mission-critical system communications, including:
  1. Instant appointment booking confirmation receipts to clients.
  2. Appointment approval, status modification, or cancellation notifications.
  3. Time-sensitive administrative **One-Time Password (OTP)** verification codes for elevated system login.
  4. Secure password recovery and account activation notifications.
- Employs SPF, DKIM, and DMARC cryptographic signatures to guarantee high deliverability into user inboxes.

---

### 3. Network Communication Protocol Matrix

| Interface / Connection | Source Node | Destination Node | Protocol / Port | Data Payload & Functional Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Client Web Traffic** | Client Devices | Public Internet | `HTTPS / TLS 1.3` (Port 443) | Encrypted HTTP GET/POST requests for pages, static assets, and user form submissions. |
| **Edge Routing** | Public Internet | Vercel Web Server | `HTTPS / TLS 1.3` (Port 443) | Edge proxy routing, SSL termination, and execution of Next.js serverless functions. |
| **Database Operations** | Vercel Backend | Supabase Database | `HTTPS / PostgREST` (Port 443) | Relational CRUD queries, transaction settlements, appointment inserts, and inventory updates. |
| **Realtime WebSockets** | Admin Browser | Supabase Realtime | `WSS / TLS` (Port 443) | Full-duplex WebSocket channel streaming instant appointment creation and status change events. |
| **Media Assets & Inspo** | Vercel / Client | Supabase Storage | `HTTPS / REST` (Port 443) | Multipart file upload and CDN asset retrieval for nail design portfolio and customer inspo photos. |
| **Federated SSO Flow** | Client / Vercel | Google Identity | `OAuth 2.0 / HTTPS` (Port 443) | Identity authorization code redirect, token exchange, and cryptographically verified JWT claim ingestion. |
| **Email API Trigger** | Vercel Backend | Resend API Engine | `HTTPS REST POST` (Port 443) | Secure API call containing email recipient, HTML template parameters, and transactional payload. |
| **Outbound Email** | Resend API | Customer/Admin Inboxes | `SMTP / TLS` (Ports 587/465) | Encrypted message delivery of booking confirmations, calendar updates, and security OTP codes. |

---

### 4. How to Use in Your Capstone Paper (Chapter 3)
1. **High-Resolution Graphic**: Insert the generated image file `figure_4_network_model.png` (or import `figure_4_network_model.svg` for vector clarity) directly into Microsoft Word under Chapter 3: System Design and Methodology.
2. **Standard Caption**: Place the formal caption directly beneath the image:
   > **Figure 4. Client-Server Network Model of the Proposed Management Information System.**
3. **Descriptive Text**: Incorporate Sections 1 through 3 above directly into Chapter 3 to provide academic depth and technical rationale for your defense panel.
