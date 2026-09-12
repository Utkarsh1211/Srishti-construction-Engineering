# Srishti Construction & Engineering — Backend

Node.js backend service for the Srishti Construction & Engineering application.

The backend provides the REST API used by the mobile application and manages authentication, projects, transactions, accounts, financial calculations, database access, and Excel exports.

## Tech Stack

* Node.js
* Express
* PostgreSQL
* Docker
* JWT
* ExcelJS
* REST API

## Architecture

```text
Mobile App
    │
    │ REST API
    ▼
Express Server
    │
    ├── Authentication
    ├── Project Management
    ├── Transaction Management
    ├── Financial Summaries
    └── Excel Export
    │
    ▼
PostgreSQL
```

## Project Structure

```text
backend/
├── db/
│   ├── init.sql
│   ├── importExpense.js
│   ├── importIncome.js
│   ├── projectCode.js
│   └── data.xlsx
│
├── exports/
│   └── Generated Excel exports
│
├── src/
│   ├── constants/
│   │   └── categories.js
│   │
│   ├── middleware/
│   │   ├── auth.js
│   │   └── errorHandler.js
│   │
│   ├── routes/
│   │   ├── auth.js
│   │   ├── exportXlsx.js
│   │   ├── projects.js
│   │   └── transactions.js
│   │
│   ├── utils/
│   │   ├── asyncHandler.js
│   │   └── xlsxExport.js
│   │
│   ├── db.js
│   ├── index.js
│   └── server.js
│
├── docker-compose.yml
├── openapi.yaml
└── package.json
```

## API Modules

### Authentication

Handles user authentication and authorization.

### Projects

Provides project and account management APIs.

### Transactions

Handles financial transactions including:

* Credits
* Debits
* Withdrawals
* Categories
* Subcategories
* Account associations
* Project associations

### Financial Summaries

Provides date-range calculations used by the budget calculator to analyze money entering and leaving accounts.

### Excel Export

Generates Excel reports containing transaction and financial data.

## Database

PostgreSQL is used as the primary database.

The database schema and initialization SQL are maintained under:

```text
db/init.sql
```

For local development, PostgreSQL can be run using Docker Compose.

## Environment Variables

Create a `.env` file based on `.env.example`.

Typical configuration includes:

```text
DATABASE_URL
JWT_SECRET
PORT
```

Do not commit `.env` files containing secrets.

## Local Development

Install dependencies:

```bash
npm install
```

Start PostgreSQL:

```bash
docker compose up -d
```

Start the backend:

```bash
npm run dev
```

The exact available scripts are defined in `package.json`.

## API Documentation

The API contract is maintained in:

```text
openapi.yaml
```

## Data Import

The `db` directory contains scripts used for importing and preparing historical company data.

These scripts are primarily development/data-migration utilities and are not part of the runtime API.

## Docker

The local database environment is containerized using Docker Compose.

This allows the application backend to run against a reproducible PostgreSQL development environment without requiring a locally installed PostgreSQL server.
