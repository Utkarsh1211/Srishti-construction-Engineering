# Srishti Construction & Engineering — Mobile App

React Native mobile application for **Srishti Construction & Engineering**, built with Expo.

The application provides the mobile interface for project management, financial ledgers, transactions, accounts, budget calculations, and authentication.

## Tech Stack

* React Native
* Expo
* JavaScript
* React Navigation
* Expo EAS
* REST API
* Custom API caching

## Project Structure

```text
app/
├── assets/
│   └── Application images, icons and branding assets
│
├── src/
│   ├── api/
│   │   ├── api.js
│   │   ├── cache.js
│   │   └── useCachedFetch.js
│   │
│   ├── components/
│   │   ├── AccountDropdown.js
│   │   ├── ActionSheet.js
│   │   ├── CategoryPicker.js
│   │   ├── Money.js
│   │   ├── ProjectCard.js
│   │   ├── SubcategoryPicker.js
│   │   └── TransactionRow.js
│   │
│   ├── constants/
│   │   └── categories.js
│   │
│   ├── context/
│   │   └── AuthContext.js
│   │
│   ├── screens/
│   │   ├── BudgetCalculatorScreen.js
│   │   ├── LoginScreen.js
│   │   ├── ProjectLedgerScreen.js
│   │   └── ProjectListScreen.js
│   │
│   ├── theme/
│   │   └── theme.js
│   │
│   ├── config.js
│   └── Navigation.js
│
├── App.js
├── app.json
├── eas.json
└── package.json
```

## Main Screens

### Login

Handles user authentication and session management.

### Project List

Displays available projects and provides navigation into individual project ledgers.

### Project Ledger

Provides project-level transaction management including:

* Credits
* Debits
* Withdrawals
* Categories
* Subcategories
* Accounts
* Running balances
* Transaction filtering

### Budget Calculator

Provides date-range financial summaries for reviewing money received and deductions during a selected period.

## API Layer

The frontend communicates with the backend through the API layer under `src/api`.

The application also uses a lightweight caching mechanism to reduce unnecessary API requests and improve the user experience.

## Configuration

Environment-specific API configuration is maintained through the application's configuration layer.

Do not commit production secrets or sensitive credentials to the repository.

## Development

Install dependencies:

```bash
npm install
```

Start the Expo development server:

```bash
npx expo start
```

## Build

Application builds are managed through Expo Application Services (EAS).

```bash
eas build
```

Refer to `eas.json` for the configured build profiles.
