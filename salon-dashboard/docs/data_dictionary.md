# Salon System Data Dictionary (Complete)

The following sections present a comprehensive Data Dictionary for the **Salon Management System**, serving as the technical cornerstone for the system's database architecture. This documentation provides a rigorous definition of each entity and its constituent attributes, explicitly detailing field identifiers, data types, storage dimensions, and functional descriptions. By establishing a standardized schema, this reference ensures semantic consistency and data integrity across the unified platform shared by both the administrative dashboard and the customer portal. The dictionary encompasses a normalized set of relational tables, including **profiles, customers, services, appointments, billing, staff, and inventory**, which collectively facilitate the system's primary operational workflows. Consequently, this detailed mapping aids developers and academic researchers in understanding the underlying data persistence layer, ensuring the system's long-term maintainability and providing a reliable framework for future technical iterations.

---

## 1. profiles
The **profiles** table is responsible for managing the personal and professional data of internal users, specifically administrators. It links directly to the system's authentication layer and stores essential information such as full names, contact emails, phone numbers, and profile bios. Additionally, this table tracks the assigned system roles to manage permissions and maintains timestamps for when a profile was initially created or last modified, ensuring a clear audit trail for user accounts.

| Field Name | Data Type | Size | Description |
| :--- | :--- | :--- | :--- |
| **id** | UUID | --- | Primary key, linked to auth.users.id |
| **name** | TEXT | --- | Full name of the user |
| **email** | TEXT | --- | User email address |
| **image_url** | TEXT | --- | URL to profile image |
| **phone** | TEXT | --- | Contact number |
| **role** | TEXT | --- | System role (Administrator, Staff) |
| **bio** | TEXT | --- | Short biography or notes |
| **created_at** | TIMESTAMP | --- | Record creation date |
| **updated_at** | TIMESTAMP | --- | Last update date |

---

## 2. customers
The **customers** table serves as the primary registry for all salon clients, storing both their contact information and their engagement history. It tracks key metrics such as the total number of visits and the lifetime expenditure of each client, which allows the system to automatically categorize them into membership levels like Regular or VIP. The table also maintains the customer's current status (Active or Inactive) and records their last visit date to help the salon management identify loyal patrons or those who may need follow-up engagement.

| Field Name | Data Type | Size | Description |
| :--- | :--- | :--- | :--- |
| **id** | UUID | --- | Primary key for the customer |
| **name** | TEXT | --- | Customer's full name |
| **email** | TEXT | --- | Customer email address |
| **phone** | TEXT | --- | Contact number |
| **visits** | INT | --- | Total number of visits |
| **last_visit** | TEXT | --- | Date of most recent visit |
| **total_spent** | DECIMAL | --- | Lifetime expenditure |
| **status** | TEXT | --- | Account status (Active, Inactive) |
| **membership_type**| TEXT | --- | Level (New, Regular, VIP) |
| **created_at** | TIMESTAMP | --- | Record creation date |

---

## 3. services
The **services** table acts as the salon's digital menu, detailing every treatment or procedure offered to customers. Each record defines the service name, its base price, and the estimated duration required to complete it, which is critical for the booking system's scheduling logic. Services are further organized by categories—such as Hair or Nails—and can be restricted by role to ensure only qualified personnel are assigned to specific treatments, while a status field manages the visibility of the service on the Customer Portal.

| Field Name | Data Type | Size | Description |
| :--- | :--- | :--- | :--- |
| **id** | UUID | --- | Primary key for the service |
| **name** | TEXT | --- | Service name |
| **price** | DECIMAL | --- | Service cost |
| **duration** | TEXT | --- | Estimated time (e.g., 1h, 30m) |
| **category** | TEXT | --- | Service grouping |
| **status** | TEXT | --- | Availability status |
| **required_role** | TEXT | --- | Staff role required for service |
| **created_at** | TIMESTAMP | --- | Record creation date |

---

## 4. staff
The **staff** table manages the internal roster of salon employees who perform the various services. It tracks each staff member's contact details, professional role, and performance ratings provided by the management or customers. Importantly, this table stores each individual's working schedule and their current availability status (e.g., Present or On Leave), which the administrator uses to ensure that appointments are only booked during active shifts.

| Field Name | Data Type | Size | Description |
| :--- | :--- | :--- | :--- |
| **id** | UUID | --- | Primary key for staff member |
| **name** | TEXT | --- | Staff member's name |
| **role** | TEXT | --- | Job title/role |
| **email** | TEXT | --- | Contact email |
| **phone** | TEXT | --- | Contact number |
| **rating** | DECIMAL | --- | Performance rating |
| **schedule** | TEXT | --- | Working hours summary |
| **status** | TEXT | --- | Current status (Present, On Leave) |
| **created_at** | TIMESTAMP | --- | Record creation date |

---

## 5. appointments
The **appointments** table is the core engine of the system, capturing every booking made by customers. It establishes relationships between customers, services, and staff members, while storing precise details like the scheduled date, time, and duration of the visit. The table tracks the lifecycle of a booking through various statuses—from initial request (Pending) to completion or cancellation—and records the source of the booking to distinguish between online requests and manual walk-ins.

| Field Name | Data Type | Size | Description |
| :--- | :--- | :--- | :--- |
| **id** | UUID | --- | Primary key for appointment |
| **customer_name** | TEXT | --- | Redundant customer name |
| **customer_id** | UUID | --- | Foreign key to customers.id |
| **service_name** | TEXT | --- | Redundant service name |
| **service_id** | UUID | --- | Foreign key to services.id |
| **staff_name** | TEXT | --- | Redundant staff name |
| **staff_id** | UUID | --- | Foreign key to staff.id |
| **appointment_date**| DATE | --- | Date of booking |
| **appointment_time**| TIME | --- | Scheduled time |
| **date** | TEXT | --- | Legacy date field |
| **time** | TEXT | --- | Legacy time field |
| **duration** | TEXT | --- | Booking length |
| **price** | DECIMAL | --- | Agreed service price |
| **status** | TEXT | --- | Booking status (Pending, Completed, etc.) |
| **payment_method** | TEXT | --- | Selected payment option |
| **source** | TEXT | --- | Booking source (Walk-in, Online) |
| **notes** | TEXT | --- | Additional appointment notes |
| **created_at** | TIMESTAMP | --- | Record creation date |

---

## 6. notifications
The **notifications** table manages the internal alert system used to keep the administrator informed of critical events. It stores short summaries and detailed messages regarding new appointment requests, low inventory levels, or other system updates. Each notification is categorized by type and includes a read status flag, allowing the administrator to clear their dashboard while maintaining a historical log of all system communication and alerts.

| Field Name | Data Type | Size | Description |
| :--- | :--- | :--- | :--- |
| **id** | UUID | --- | Primary key |
| **title** | TEXT | --- | Notification title |
| **message** | TEXT | --- | Alert message details |
| **type** | TEXT | --- | Notification category |
| **is_read** | BOOLEAN | --- | Read status flag |
| **created_at** | TIMESTAMP | --- | Record creation date |

---

## 7. inventory
The **inventory** table provides real-time tracking of the salon's physical supplies and professional products. It monitors current stock quantities against a predefined reorder level, enabling the system to warn management when supplies are running low. Beyond just quantities, the table stores unit costs and categories for every item, providing a clear overview of the salon's overhead investment and current stock health for various supply types like nail polishes or salon tools.

| Field Name | Data Type | Size | Description |
| :--- | :--- | :--- | :--- |
| **id** | UUID | --- | Primary key for inventory item |
| **name** | TEXT | --- | Item/Supply name |
| **category** | TEXT | --- | Supply category (e.g., Polish, Tools) |
| **quantity** | INT | --- | Current stock amount |
| **unit** | TEXT | --- | Measurement unit (bottle, pc, etc.) |
| **reorder_level** | INT | --- | Minimum stock threshold for alerts |
| **cost_price** | DECIMAL | --- | Unit purchase cost |
| **status** | TEXT | --- | Stock status (In Stock, Low Stock) |
| **created_at** | TIMESTAMP | --- | Record creation date |

---

## 8. billing
The **billing** table handles the financial documentation for every completed appointment. It links a specific transaction to a customer and their service record, capturing the final amount charged and the payment method used (such as Cash or GCash). This table is vital for revenue tracking as it records the status of the invoice and any additional internal notes, ensuring that all services provided are accurately accounted for and reconciled in the salon's financial reports.

| Field Name | Data Type | Size | Description |
| :--- | :--- | :--- | :--- |
| **id** | UUID | --- | Primary key for transaction |
| **customer_id** | UUID | --- | Foreign key to customers.id |
| **appointment_id** | UUID | --- | Foreign key to appointments.id |
| **amount** | DECIMAL | --- | Total billed amount |
| **cash_received** | DECIMAL | --- | Amount paid by customer |
| **payment_method** | TEXT | --- | Payment mode used |
| **status** | TEXT | --- | Payment status (Paid, Pending) |
| **notes** | TEXT | --- | Internal billing notes |
| **created_at** | TIMESTAMP | --- | Record creation date |

---

## 9. nail_designs
The **nail_designs** table serves as a visual portfolio and technical record for custom nail art. It stores detailed attributes about each design, including the nail shape, primary and secondary colors, finish textures, and whether it features gradient effects. The table also holds structured JSON data for complex art details and links to image URLs, allowing the customer to browse a gallery of "trending" designs and inspiration directly through the portal.

| Field Name | Data Type | Size | Description |
| :--- | :--- | :--- | :--- |
| **id** | UUID | --- | Primary key for design |
| **name** | TEXT | --- | Design description |
| **shape** | TEXT | --- | Nail shape |
| **primary_color** | TEXT | --- | Main design color |
| **secondary_color**| TEXT | --- | Accent color |
| **is_gradient** | BOOLEAN | --- | Gradient effect flag |
| **texture** | TEXT | --- | Finish (Matte, Glossy) |
| **art_data** | JSONB | --- | Structured art details |
| **image_url** | TEXT | --- | Link to art image |
| **customer_id** | UUID | --- | Foreign key to customers.id |
| **is_trending** | BOOLEAN | --- | Featured design flag |
| **created_at** | TIMESTAMP | --- | Record creation date |
| **preview_url** | TEXT | --- | Alternative preview link |

---

## 10. studio_configurations
The **studio_configurations** table is designed to store flexible user-specific or system-wide settings that define the dashboard's environment. It allows the administrator to save named configuration sets containing various behavioral or visual settings in a JSON format. This table ensures that specific user preferences or studio-wide operational rules are persisted and can be updated without altering the core database schema.

| Field Name | Data Type | Size | Description |
| :--- | :--- | :--- | :--- |
| **id** | UUID | --- | Primary key |
| **user_id** | UUID | --- | Foreign key to auth.users.id |
| **config_name** | TEXT | --- | Name of config set |
| **settings** | JSONB | --- | Settings payload |
| **updated_at** | TIMESTAMP | --- | Last modification date |
| **created_at** | TIMESTAMP | --- | Record creation date |

---

## 11. attendance
The **attendance** table logs the daily presence and punctuality of the salon's staff members. Each entry records the date, the staff member's identifier, and their status for that day, such as whether they were present, absent, or on leave. This table provides the administrator with the data necessary to monitor personnel availability and can be used to generate internal reports on staff reliability and labor consistency.

| Field Name | Data Type | Size | Description |
| :--- | :--- | :--- | :--- |
| **id** | UUID | --- | Primary key for attendance log |
| **staff_id** | UUID | --- | Foreign key to staff.id |
| **staff_name** | VARCHAR | 255 | Redundant staff name |
| **date** | DATE | --- | Attendance date |
| **status** | TEXT | --- | Status (Present, Absent, etc.) |
| **created_at** | TIMESTAMP | --- | Record creation date |

---

## 12. salon_settings
The **salon_settings** table acts as the global configuration hub for the entire system's branding and contact information. It stores key-value pairs that define the salon's name, physical address, tagline, and logo URLs, which are dynamically pulled by both the Dashboard and the Customer Portal. This centralized management ensures that any change to the salon's business details is instantly synchronized across all digital interfaces without manual code updates.

| Field Name | Data Type | Size | Description |
| :--- | :--- | :--- | :--- |
| **id** | UUID | --- | Primary key |
| **key** | TEXT | --- | Unique setting identifier |
| **value** | JSONB | --- | Setting value payload |
| **setting_label** | TEXT | --- | Display name for setting |
| **name** | VARCHAR | 255 | Salon name |
| **phone** | VARCHAR | 20 | Salon contact number |
| **address** | VARCHAR | 500 | Salon physical address |
| **logo_url** | VARCHAR | 255 | Salon logo URL |
| **email** | VARCHAR | 255 | Salon contact email |
| **tagline** | VARCHAR | 255 | Salon brand tagline |
| **created_at** | TIMESTAMP | --- | Record creation date |

---

## 13. payment_methods
The **payment_methods** table lists and configures the different ways customers can pay for their services. It defines the name and type of each method (e.g., E-Wallet or Cash) and maintains an active status to control which options are presented during the checkout process. This table allows the administrator to easily add or disable specific payment channels as the salon's financial operations evolve.

| Field Name | Data Type | Size | Description |
| :--- | :--- | :--- | :--- |
| **id** | UUID | --- | Primary key for payment mode |
| **name** | TEXT | --- | Method name (e.g., GCash, Cash) |
| **type** | TEXT | --- | Category (Cash, E-Wallet) |
| **status** | TEXT | --- | Availability status |
| **icon** | TEXT | --- | Icon identifier |
| **created_at** | TIMESTAMP | --- | Record creation date |

---

## 14. messages
The **messages** table captures all external inquiries submitted through the contact forms on the Customer Portal. It records the sender's name and contact information along with the subject and body of their message, providing a structured way for the administrator to track and respond to customer questions or feedback. This table ensures that no customer communication is lost and maintains a history of external outreach to the salon.

| Field Name | Data Type | Size | Description |
| :--- | :--- | :--- | :--- |
| **id** | UUID | --- | Primary key |
| **name** | TEXT | --- | Sender's full name |
| **email** | TEXT | --- | Sender's email address |
| **subject** | TEXT | --- | Message subject |
| **message** | TEXT | --- | Message content body |
| **created_at** | TIMESTAMP | --- | Record creation date |

---

## 15. admin_otps
The **admin_otps** table manages the secure authentication process for administrators via One-Time Passwords (OTP). It stores generated codes linked to a specific user's email, along with precise expiration timestamps to ensure the codes are only valid for a short window. The table also tracks whether a code has already been used, providing a critical layer of security that prevents unauthorized access to the sensitive management dashboard.

| Field Name | Data Type | Size | Description |
| :--- | :--- | :--- | :--- |
| **id** | UUID | --- | Primary key for OTP record |
| **user_id** | UUID | --- | Foreign key to auth.users.id |
| **email** | TEXT | --- | Target email for verification |
| **otp_code** | TEXT | --- | Generated OTP code |
| **expires_at** | TIMESTAMP | --- | Expiration timestamp |
| **is_used** | BOOLEAN | --- | Usage flag |
| **created_at** | TIMESTAMP | --- | Generation timestamp |
