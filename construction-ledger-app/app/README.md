# Construction Ledger — Mobile App (React Native / Expo)

## What's included
- **Login** — checked against the `Users` sheet in your backend.
- **Client list** — search, add client, live balance per client, one-tap `.xlsx` export.
- **Client detail** — client summary (received / spent / balance) + list of projects, add project.
- **Project ledger** — full transaction history with running balance, tap an entry to edit, long-press to delete, floating button to add a credit or debit entry.

## 1. Point it at your backend
Open `src/config.js` and replace the placeholder with your real Apps Script
Web App URL (see the top-level `README.md` for how to deploy that):

```js
export const API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
```

## 2. Install dependencies
```bash
npm install
```

## 3. Run it
```bash
npx expo start
```
Scan the QR code with the **Expo Go** app on your phone (iOS or Android), or
press `a` / `i` in the terminal to open an Android/iOS simulator if you have
one set up.

## 4. Log in
Use the default seeded account from the backend setup:
- Username: `admin`
- Password: `changeme123`

(Change this in the `Users` sheet before handing the app to the client.)

## Project structure
```
App.js                        entry point
src/
  config.js                   API_URL — edit this
  Navigation.js                auth-aware stack navigator
  api/api.js                  all backend calls
  context/AuthContext.js      login state, persisted via AsyncStorage
  theme/theme.js              colors, spacing, type scale
  components/
    Money.js                  formatted ₹ amount with credit/debit coloring
    ClientCard.js
    TransactionRow.js
  screens/
    LoginScreen.js
    ClientListScreen.js
    ClientDetailScreen.js     shows a client's projects
    ProjectLedgerScreen.js    transaction list + add/edit modal
```

## Notes
- Amounts are formatted in ₹ (Indian numbering). Change the locale/currency
  symbol in `src/components/Money.js` if needed.
- The `.xlsx` export button opens Google's direct export link in the device
  browser — the logged-in Google account needs at least view access to the
  spreadsheet for that link to work. Share the sheet with the client's
  Google account (view access) once, and it'll always reflect live data.
- Two users, ~10 entries/day is well within what this Apps Script backend
  can handle with no scaling concerns.
- To add a third/fourth user later, just add a row to the `Users` sheet —
  no app changes needed.

## Next steps you might want
- Push notifications when a large debit is entered
- A basic role field (e.g. "viewer" vs "editor") if the client wants
  read-only access for someone
- PDF ledger export per project, in addition to the xlsx
