# Construction Ledger — Backend Setup (Google Apps Script)

## 1. Create the spreadsheet
1. Go to sheets.google.com → create a new blank spreadsheet.
2. Rename it something like "Construction Ledger DB".
3. Extensions → Apps Script. This opens the script editor bound to this sheet.

## 2. Add the code
1. Delete the default `Code.gs` boilerplate in the editor.
2. Paste in the contents of `Code.gs` from this project.

## 3. Initialize the sheets
1. In the Apps Script editor, select the `setupSheets` function from the
   function dropdown (top toolbar) and click **Run**.
2. First run will ask for permissions — approve them (it's your own script
   acting on your own spreadsheet).
3. Go back to the spreadsheet — you should now see 4 tabs: `Users`,
   `Clients`, `Projects`, `Transactions`, each with headers and `Users`
   pre-seeded with `admin` / `changeme123`.
4. **Change that default password** by editing the Users sheet directly, or
   add real users for your two people.

## 4. Deploy as a Web App
1. In Apps Script editor: **Deploy → New deployment**.
2. Click the gear icon next to "Select type" → choose **Web app**.
3. Settings:
   - Execute as: **Me**
   - Who has access: **Anyone** (auth is handled by the `login` action
     against the Users sheet, not by Google account)
4. Click **Deploy**, authorize again if prompted.
5. Copy the **Web app URL** — this is your API base URL, looks like:
   `https://script.google.com/macros/s/AKfycb.../exec`

Keep this URL — you'll paste it into the React Native app's config.

## 5. Redeploying after code changes
Apps Script Web App URLs are versioned. If you edit `Code.gs` later:
- Deploy → Manage deployments → pick the existing deployment → click the
  pencil (edit) → change version to **New version** → Deploy.
- This keeps the same URL, so you won't need to update the app.

## API reference (all requests are POST with JSON body, action in body)

| action | body params | returns |
|---|---|---|
| `login` | username, password | `{success, user}` |
| `getClients` | — | `{success, data: [...]}` |
| `addClient` | name, contact, address | `{success, client_id}` |
| `updateClient` | client_id, name?, contact?, address? | `{success}` |
| `deleteClient` | client_id | `{success}` |
| `getProjects` | client_id (optional filter) | `{success, data: [...]}` |
| `addProject` | client_id, project_name, start_date?, status? | `{success, project_id}` |
| `updateProject` | project_id, project_name?, start_date?, status? | `{success}` |
| `deleteProject` | project_id | `{success}` |
| `getTransactions` | project_id (optional filter) | `{success, data: [...]}` (includes running_balance) |
| `addTransaction` | project_id, client_id, date, type (credit/debit), amount, description, entered_by | `{success, txn_id}` |
| `updateTransaction` | txn_id, date?, type?, amount?, description? | `{success}` |
| `deleteTransaction` | txn_id | `{success}` |
| `getClientSummary` | client_id | `{success, data: {project_count, total_credit, total_debit, balance}}` |
| `exportXlsxUrl` | — | `{success, url}` — direct .xlsx download link for the whole DB |

Example call from the app:
```js
fetch(WEB_APP_URL, {
  method: 'POST',
  body: JSON.stringify({ action: 'addTransaction', project_id: 'pr_abc123', client_id: 'cl_xyz', date: '2026-07-17', type: 'debit', amount: 5000, description: 'Cement purchase', entered_by: 'u1' }),
}).then(r => r.json()).then(console.log);
```

## Notes on the xlsx requirement
The client can get an `.xlsx` copy two ways:
- **Manual**: open the Google Sheet → File → Download → Microsoft Excel (.xlsx). Zero code needed, always up to date.
- **In-app button**: use the `exportXlsxUrl` action to get a direct export link, and open it via `Linking.openURL(url)` in React Native — this downloads the .xlsx straight from Google's export endpoint. Note the client needs access permission on the sheet (share it with their Google account, view access is enough) for this URL to work in a browser.

## Security note
Because "Who has access" is set to Anyone, anyone with the Web App URL can
call these endpoints. There's no Google-account-level auth — access control
is entirely via the `login` action checking the Users sheet. This is fine
for a small internal tool with 2 known users, but don't share the URL
publicly. If you want stronger security later, we can add a shared secret
token check on every request.
