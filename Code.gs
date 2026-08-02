/**
 * CONSTRUCTION LEDGER - Google Apps Script Backend
 * -------------------------------------------------
 * Deploy this as a Web App (Deploy > New deployment > Web app).
 * Execute as: Me
 * Who has access: Anyone with the link (auth is handled manually via the Users sheet)
 *
 * This script turns a bound Google Spreadsheet into a REST-like API that the
 * React Native app talks to over HTTPS (fetch/POST with JSON bodies).
 *
 * SHEETS EXPECTED (auto-created by setupSheets() if missing):
 *   Users        | user_id | username | password | name
 *   Clients      | client_id | name | contact | address | created_at
 *   Projects     | project_id | client_id | project_name | start_date | status
 *   Transactions | txn_id | project_id | client_id | date | type | amount | description | entered_by | created_at
 */

const SHEET_NAMES = {
  USERS: 'Users',
  CLIENTS: 'Clients',
  PROJECTS: 'Projects',
  TRANSACTIONS: 'Transactions'
};

const HEADERS = {
  Users: ['user_id', 'username', 'password', 'name'],
  Clients: ['client_id', 'name', 'contact', 'address', 'created_at'],
  Projects: ['project_id', 'client_id', 'project_name', 'start_date', 'status'],
  Transactions: ['txn_id', 'project_id', 'client_id', 'date', 'type', 'amount', 'description', 'entered_by', 'created_at']
};

// ---------- ENTRY POINTS ----------

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000); // wait up to 10s for other concurrent writes

  try {
    const action = (e.parameter && e.parameter.action) || (getBody(e) && getBody(e).action);
    const body = method === 'POST' ? getBody(e) : e.parameter;

    let result;
    switch (action) {
      case 'login':
        result = login(body);
        break;
      case 'getClients':
        result = getClients();
        break;
      case 'addClient':
        result = addClient(body);
        break;
      case 'updateClient':
        result = updateClient(body);
        break;
      case 'deleteClient':
        result = deleteClient(body);
        break;
      case 'getProjects':
        result = getProjects(body.client_id);
        break;
      case 'addProject':
        result = addProject(body);
        break;
      case 'updateProject':
        result = updateProject(body);
        break;
      case 'deleteProject':
        result = deleteProject(body);
        break;
      case 'getTransactions':
        result = getTransactions(body.project_id);
        break;
      case 'addTransaction':
        result = addTransaction(body);
        break;
      case 'updateTransaction':
        result = updateTransaction(body);
        break;
      case 'deleteTransaction':
        result = deleteTransaction(body);
        break;
      case 'getClientSummary':
        result = getClientSummary(body.client_id);
        break;
      case 'exportXlsxUrl':
        result = exportXlsxUrl();
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  } finally {
    lock.releaseLock();
  }
}

function getBody(e) {
  if (!e.postData || !e.postData.contents) return {};
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    return {};
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------- SETUP ----------

/**
 * Run this once manually from the Apps Script editor to create all sheets
 * with correct headers. Safe to re-run; it won't duplicate existing sheets.
 */
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEADERS).forEach(function (name) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    const headerRange = sheet.getRange(1, 1, 1, HEADERS[name].length);
    headerRange.setValues([HEADERS[name]]);
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  });

  // Seed a default user if Users sheet is empty
  const usersSheet = ss.getSheetByName(SHEET_NAMES.USERS);
  if (usersSheet.getLastRow() < 2) {
    usersSheet.appendRow(['u1', 'admin', 'changeme123', 'Admin']);
  }
}

// ---------- HELPERS ----------

function getSheet(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('Sheet not found: ' + name);
  return sheet;
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  const rows = data.slice(1);
  return rows
    .filter(function (row) { return row.some(function (cell) { return cell !== ''; }); })
    .map(function (row) {
      const obj = {};
      headers.forEach(function (h, i) { obj[h] = row[i]; });
      return obj;
    });
}

function findRowIndexById(sheet, idColName, idValue) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf(idColName);
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(idValue)) return i + 1; // 1-indexed row
  }
  return -1;
}

function generateId(prefix) {
  return prefix + '_' + Utilities.getUuid().split('-')[0];
}

function nowIso() {
  return new Date().toISOString();
}

// ---------- AUTH ----------

function login(body) {
  const sheet = getSheet(SHEET_NAMES.USERS);
  const users = sheetToObjects(sheet);
  const match = users.find(function (u) {
    return u.username === body.username && String(u.password) === String(body.password);
  });
  if (!match) return { success: false, error: 'Invalid username or password' };
  return { success: true, user: { user_id: match.user_id, username: match.username, name: match.name } };
}

// ---------- CLIENTS ----------

function getClients() {
  const sheet = getSheet(SHEET_NAMES.CLIENTS);
  return { success: true, data: sheetToObjects(sheet) };
}

function addClient(body) {
  const sheet = getSheet(SHEET_NAMES.CLIENTS);
  const client_id = generateId('cl');
  sheet.appendRow([client_id, body.name, body.contact || '', body.address || '', nowIso()]);
  return { success: true, client_id: client_id };
}

function updateClient(body) {
  const sheet = getSheet(SHEET_NAMES.CLIENTS);
  const row = findRowIndexById(sheet, 'client_id', body.client_id);
  if (row === -1) return { success: false, error: 'Client not found' };
  if (body.name !== undefined) sheet.getRange(row, 2).setValue(body.name);
  if (body.contact !== undefined) sheet.getRange(row, 3).setValue(body.contact);
  if (body.address !== undefined) sheet.getRange(row, 4).setValue(body.address);
  return { success: true };
}

function deleteClient(body) {
  const sheet = getSheet(SHEET_NAMES.CLIENTS);
  const row = findRowIndexById(sheet, 'client_id', body.client_id);
  if (row === -1) return { success: false, error: 'Client not found' };
  sheet.deleteRow(row);
  return { success: true };
}

// ---------- PROJECTS ----------

function getProjects(client_id) {
  const sheet = getSheet(SHEET_NAMES.PROJECTS);
  let projects = sheetToObjects(sheet);
  if (client_id) {
    projects = projects.filter(function (p) { return String(p.client_id) === String(client_id); });
  }
  return { success: true, data: projects };
}

function addProject(body) {
  const sheet = getSheet(SHEET_NAMES.PROJECTS);
  const project_id = generateId('pr');
  sheet.appendRow([
    project_id,
    body.client_id,
    body.project_name,
    body.start_date || nowIso(),
    body.status || 'active'
  ]);
  return { success: true, project_id: project_id };
}

function updateProject(body) {
  const sheet = getSheet(SHEET_NAMES.PROJECTS);
  const row = findRowIndexById(sheet, 'project_id', body.project_id);
  if (row === -1) return { success: false, error: 'Project not found' };
  if (body.project_name !== undefined) sheet.getRange(row, 3).setValue(body.project_name);
  if (body.start_date !== undefined) sheet.getRange(row, 4).setValue(body.start_date);
  if (body.status !== undefined) sheet.getRange(row, 5).setValue(body.status);
  return { success: true };
}

function deleteProject(body) {
  const sheet = getSheet(SHEET_NAMES.PROJECTS);
  const row = findRowIndexById(sheet, 'project_id', body.project_id);
  if (row === -1) return { success: false, error: 'Project not found' };
  sheet.deleteRow(row);
  return { success: true };
}

// ---------- TRANSACTIONS ----------

function getTransactions(project_id) {
  const sheet = getSheet(SHEET_NAMES.TRANSACTIONS);
  let txns = sheetToObjects(sheet);
  if (project_id) {
    txns = txns.filter(function (t) { return String(t.project_id) === String(project_id); });
  }
  // sort by date ascending, then compute running balance
  txns.sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
  let balance = 0;
  txns.forEach(function (t) {
    const amt = Number(t.amount) || 0;
    balance += t.type === 'credit' ? amt : -amt;
    t.running_balance = balance;
  });
  return { success: true, data: txns };
}

function addTransaction(body) {
  const sheet = getSheet(SHEET_NAMES.TRANSACTIONS);
  const txn_id = generateId('tx');
  sheet.appendRow([
    txn_id,
    body.project_id,
    body.client_id,
    body.date || nowIso(),
    body.type, // 'credit' or 'debit'
    Number(body.amount),
    body.description || '',
    body.entered_by || '',
    nowIso()
  ]);
  return { success: true, txn_id: txn_id };
}

function updateTransaction(body) {
  const sheet = getSheet(SHEET_NAMES.TRANSACTIONS);
  const row = findRowIndexById(sheet, 'txn_id', body.txn_id);
  if (row === -1) return { success: false, error: 'Transaction not found' };
  if (body.date !== undefined) sheet.getRange(row, 4).setValue(body.date);
  if (body.type !== undefined) sheet.getRange(row, 5).setValue(body.type);
  if (body.amount !== undefined) sheet.getRange(row, 6).setValue(Number(body.amount));
  if (body.description !== undefined) sheet.getRange(row, 7).setValue(body.description);
  return { success: true };
}

function deleteTransaction(body) {
  const sheet = getSheet(SHEET_NAMES.TRANSACTIONS);
  const row = findRowIndexById(sheet, 'txn_id', body.txn_id);
  if (row === -1) return { success: false, error: 'Transaction not found' };
  sheet.deleteRow(row);
  return { success: true };
}

// ---------- SUMMARY ----------

function getClientSummary(client_id) {
  const projSheet = getSheet(SHEET_NAMES.PROJECTS);
  const txnSheet = getSheet(SHEET_NAMES.TRANSACTIONS);

  const projects = sheetToObjects(projSheet).filter(function (p) {
    return String(p.client_id) === String(client_id);
  });
  const allTxns = sheetToObjects(txnSheet).filter(function (t) {
    return String(t.client_id) === String(client_id);
  });

  let totalCredit = 0;
  let totalDebit = 0;
  allTxns.forEach(function (t) {
    const amt = Number(t.amount) || 0;
    if (t.type === 'credit') totalCredit += amt;
    else totalDebit += amt;
  });

  return {
    success: true,
    data: {
      client_id: client_id,
      project_count: projects.length,
      total_credit: totalCredit,
      total_debit: totalDebit,
      balance: totalCredit - totalDebit
    }
  };
}

// ---------- XLSX EXPORT ----------

/**
 * Returns a direct download URL that exports the whole spreadsheet as .xlsx.
 * Requires the requester to be logged into a Google account with access
 * (works great opened in a browser; for in-app download see notes in README).
 */
function exportXlsxUrl() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const id = ss.getId();
  const url = 'https://docs.google.com/spreadsheets/d/' + id + '/export?format=xlsx';
  return { success: true, url: url };
}
