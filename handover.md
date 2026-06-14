# Ashn POS - System Handover Document

This document provides essential instructions for the Shop Owner and System Administrator for the daily operation and maintenance of the Ashn POS Enterprise ERP System.

## 1. Hardware & Printer Setup

### Cashier POS Terminals
- **Browser Settings:** The Cashier Dashboard is highly optimized for Chrome and Edge.
- **80mm Thermal Printers:** 
  - Ensure the printer is set as the default printer in Windows/OS.
  - When the print dialog opens, set **Margins to "None"** or **"Minimum"**.
  - Ensure **"Headers and footers"** are UNCHECKED (Off).
  - Always run a "Test Print" at the start of the day to ensure paper alignment is correct.

## 2. Production Deployment Guide (For IT Admin)

This system is built for an **Ubuntu VPS** environment. Do not run the backend on a standard shared hosting platform.

- **Docker:** The recommended method for production deployment. Run `docker-compose up --build -d` to spin up PostgreSQL, Redis, Node Backend, and Nginx.
- **Process Management:** If Docker is not used for the backend, **PM2** must be used (`pm2 start src/server.js --name "ashn-pos"`).
- **Reverse Proxy & SSL:** Configure **Nginx** to route traffic to the Node.js port (e.g., 5000). You **MUST** secure the domains using **Let's Encrypt** SSL certificates. Modern browser APIs (like Web Bluetooth or Service Workers) will fail without HTTPS.

## 3. End-to-End Testing

Before processing real customers, the IT Admin and Shop Manager must complete the **End-to-End Testing** protocol.
Since the system handles real financial transactions and live inventory:
- Verify that a completed Order successfully triggers a POS receipt.
- Verify that Supplier Purchase Orders successfully restock Raw Materials.
- Ensure that the Kitchen Display System (KDS) receives orders instantly.

## 4. Daily Backups

Your data (Sales, Inventory, Customer details) is the most important part of this system.

- **Automated Script:** A backup script has been provided at `backend/scripts/backupDatabaseLocal.js`.
- **Cron Job:** The IT Admin must schedule a daily cron job on the Ubuntu VPS to execute this script at midnight (e.g., `0 0 * * * node /path/to/backend/scripts/backupDatabaseLocal.js`).
- **Offsite Backup:** It is highly recommended to sync the resulting SQL dumps to Google Drive or AWS S3.

---
*End of Document. Please keep this guide accessible to the IT Administrator and the Shop Manager.*
