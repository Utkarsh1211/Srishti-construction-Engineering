# Srishti Construction & Engineering

A purpose-built financial and project management application for **Srishti Construction & Engineering**.

The application helps manage construction projects, financial transactions, accounts, loans, expenses, withdrawals, and project-level balances through a centralized system.

It consists of a mobile application for day-to-day operations and a backend service responsible for authentication, data management, business logic, reporting, and exports.

## Features

* Project and site management
* Project-wise financial ledger
* Credit and debit transaction tracking
* Account management
* Account withdrawals
* Loan tracking
* Expense categorization
* Transaction filtering
* Running balances
* Date-range budget calculations
* Financial summaries
* Excel data export
* Authentication
* Cached API data for improved mobile experience

## Architecture

The application follows a mobile client + backend architecture:

```text
┌──────────────────────────────┐
│       Mobile Application     │
│                              │
│     React Native + Expo      │
│                              │
│  Projects / Ledger / Budget  │
└──────────────┬───────────────┘
               │
               │ REST API
               ▼
┌──────────────────────────────┐
│           Backend            │
│                              │
│       Node.js + Express      │
│                              │
│ Authentication / Business    │
│ Logic / Reports / Exports    │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│        PostgreSQL            │
│                              │
│ Projects / Transactions      │
│ Accounts / Loans / Users     │
└──────────────────────────────┘
```

## Repository Structure

```text
srishti-construction-engineering/
│
├── app/
│   └── React Native / Expo mobile application
│
├── backend/
│   └── Node.js / Express backend and PostgreSQL integration
│
├── README.md
└── .gitignore
```

## Applications

### Mobile Application

The `app` directory contains the React Native application used for managing projects, transactions, accounts, and financial information.

See [`app/README.md`](./app/README.md).

### Backend

The `backend` directory contains the Node.js API, PostgreSQL integration, authentication, business logic, reporting, and Excel export functionality.

See [`backend/README.md`](./backend/README.md).

## Technology Overview

### Mobile

* React Native
* Expo
* JavaScript
* Expo EAS
* REST API integration

### Backend

* Node.js
* Express
* PostgreSQL
* Docker
* JWT authentication
* Excel export

### Infrastructure

* Docker
* PostgreSQL
* REST APIs
* Environment-based configuration

## Purpose

This system was built specifically for the operational and financial requirements of **Srishti Construction & Engineering**, replacing fragmented manual tracking with a centralized digital workflow.

The application is intentionally designed around the company's actual project, account, transaction, loan, withdrawal, and reporting workflows.
