const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const pool = require("../db");

const EXPORT_DIR = path.join(__dirname, "..", "..", "exports");
const XLSX_PATH = path.join(EXPORT_DIR, "srishti_construction_and_engineering_data.xlsx");
const STATE_PATH = path.join(EXPORT_DIR, "export-state.json");

const COLUMNS = [
  { header: "Date", key: "date", width: 14 },
  { header: "Amount", key: "amount", width: 14 },
  { header: "Type", key: "type", width: 14 },
  { header: "Detail", key: "detail", width: 36 },
  { header: "Category", key: "category", width: 26 },
  { header: "Running Balance", key: "running_balance", width: 18 },
];

const TAB_COLORS = [
  "FF4F81BD", // Blue
  "FF70AD47", // Green
  "FF8064A2", // Purple
  "FFF79646", // Orange
  "FF4BACC6", // Teal
  "FFC0504D", // Red
  "FF9BBB59", // Olive Green
];

const HEADER_COLOR = "FF1F4E78";

const CREDIT_COLOR = "FF008000";
const DEBIT_COLOR = "FFC00000";
const WITHDRAWAL_COLOR = "FFC00000";

const LIGHT_ROW_COLOR = "FFF7F9FC";

// Amount is signed (credit positive, debit/withdrawal negative) so the type
// is readable from the number itself without needing a separate column.
function formatRow(txn, runningBalance) {
  const amount = Number(txn.amount);

  return {
    date: new Date(txn.date).toISOString().slice(0, 10),
    amount: txn.type === "credit" ? amount : -amount,
    type: txn.type,
    detail: txn.detail || "",
    category: txn.category,
    running_balance: runningBalance,
  };
}

// Applying `columns` (with its `key` mapping) is required every time a
// sheet is touched, not just on creation — that key mapping only lives in
// ExcelJS's in-memory model, not in the actual .xlsx file, so a sheet
// reloaded from disk has lost it and addRow(keyedObject) silently no-ops
// without this.
function prepareSheet(workbook, name) {
  let sheet = workbook.getWorksheet(name);

  const isNewSheet = !sheet;

  if (!sheet) {
    sheet = workbook.addWorksheet(name);

    // Give every project tab a different color
    const colorIndex = (workbook.worksheets.length - 1) % TAB_COLORS.length;

    sheet.properties.tabColor = {
      argb: TAB_COLORS[colorIndex],
    };
  }

  // Required for ExcelJS keyed object mapping
  sheet.columns = COLUMNS;

  const headerRow = sheet.getRow(1);

  // Header styling
  headerRow.font = {
    bold: true,
    color: {
      argb: "FFFFFFFF",
    },
    size: 11,
  };

  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: HEADER_COLOR,
    },
  };

  headerRow.alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  headerRow.height = 24;

  // Freeze header row
  sheet.views = [
    {
      state: "frozen",
      ySplit: 1,
    },
  ];

  // Add filters
  sheet.autoFilter = {
    from: "A1",
    to: "F1",
  };

  return sheet;
}

function styleTransactionRow(row, txn) {
  // Date
  row.getCell("A").alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  // Amount
  const amountCell = row.getCell("B");

  amountCell.numFmt = "#,##0.00";

  amountCell.alignment = {
    horizontal: "right",
    vertical: "middle",
  };

  // Credit / Debit colors
  if (txn.type === "credit") {
    amountCell.font = {
      bold: true,
      color: {
        argb: CREDIT_COLOR,
      },
    };
  }

  if (txn.type === "debit") {
    amountCell.font = {
      bold: true,
      color: {
        argb: DEBIT_COLOR,
      },
    };
  }
  if (txn.type === "withdrawal") {
    amountCell.font = {
      bold: true,
      color: {
        argb: WITHDRAWAL_COLOR,
      },
    };
  }
  // Type column
  const typeCell = row.getCell("C");

  typeCell.font = {
    bold: true,
    color: {
      argb: txn.type === "credit" ? CREDIT_COLOR : txn.type === "withdrawal" ? WITHDRAWAL_COLOR : DEBIT_COLOR,
    },
  };

  typeCell.alignment = {
    horizontal: "center",
  };

  // Detail column
  row.getCell("D").alignment = {
    vertical: "middle",
    wrapText: true,
  };

  // Category
  row.getCell("E").alignment = {
    vertical: "middle",
  };

  // Running balance
  const balanceCell = row.getCell("F");

  balanceCell.numFmt = "#,##0.00";

  balanceCell.font = {
    bold: true,
  };

  balanceCell.alignment = {
    horizontal: "right",
    vertical: "middle",
  };

  // Negative balance → red
  if (Number(balanceCell.value) < 0) {
    balanceCell.font = {
      bold: true,
      color: {
        argb: txn.type === "debit" ? DEBIT_COLOR : WITHDRAWAL_COLOR,
      },
    };
  }

  // Alternating row color
  if (row.number % 2 === 0) {
    row.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: LIGHT_ROW_COLOR,
        },
      };
    });
  }

  // Borders for clean ledger appearance
  row.eachCell((cell) => {
    cell.border = {
      bottom: {
        style: "thin",
        color: {
          argb: "FFE0E0E0",
        },
      },
    };
  });

  row.height = 22;
}

async function buildFullWorkbook() {
  const workbook = new ExcelJS.Workbook();
  const projectsRes = await pool.query(
    "select * from projects order by project_name",
  );

  for (const project of projectsRes.rows) {
    const sheet = prepareSheet(workbook, project.project_name);
    const txnRes = await pool.query(
      "select * from transactions where project_id = $1 order by date asc, created_at asc",
      [project.project_id],
    );

    let balance = 0;
    for (const txn of txnRes.rows) {
      if (txn.type === "credit") balance += Number(txn.amount);
      if (txn.type === "debit") balance -= Number(txn.amount);
      if (txn.type === "withdrawal") balance -= Number(txn.amount);
      const row = sheet.addRow(formatRow(txn, balance));
      styleTransactionRow(row, txn);
    }
  }
  return workbook;
}

// Recomputes the starting balance for new rows directly from the DB
// (credit/debit only, up to the watermark) rather than trusting a stored
// number — avoids drift if older rows were ever edited or deleted between
// export runs.
async function computeStartingBalance(projectId, beforeIso) {
  const res = await pool.query(
    `select
       coalesce(sum(amount) filter (where type = 'credit'), 0) -
       coalesce(sum(amount) filter (where type = 'debit' or type = 'withdrawal'), 0) as balance
     from transactions
     where project_id = $1 and created_at <= $2`,
    [projectId, beforeIso],
  );
  return Number(res.rows[0].balance);
}

async function appendIncremental(workbook, sinceIso) {
  const projectsRes = await pool.query(
    "select * from projects order by project_name",
  );
  let appendedCount = 0;

  for (const project of projectsRes.rows) {
    const txnRes = await pool.query(
      `select * from transactions
       where project_id = $1 and created_at > $2
       order by date asc, created_at asc`,
      [project.project_id, sinceIso],
    );
    if (txnRes.rows.length === 0) continue;

    const sheet = prepareSheet(workbook, project.project_name);
    let balance = await computeStartingBalance(project.project_id, sinceIso);

    for (const txn of txnRes.rows) {
      if (txn.type === "credit") {
        balance += Number(txn.amount);
      }

      if (txn.type === "debit") {
        balance -= Number(txn.amount);
      }
      if (txn.type === "withdrawal") {
        balance -= Number(txn.amount);
      }

      const row = sheet.addRow(formatRow(txn, balance));

      styleTransactionRow(row, txn);

      appendedCount++;
    }
  }
  return appendedCount;
}

/**
 * Generates or incrementally updates the xlsx export.
 * - rebuild: true forces a full regenerate (needed after edits/deletes to
 *   already-exported rows, since incremental mode only ever appends).
 * - Otherwise: appends only transactions created since the last run.
 */
async function generateExport() {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });

  const workbook = await buildFullWorkbook();

  await workbook.xlsx.writeFile(XLSX_PATH);

  return {
    mode: 'full-rebuild'
  };
}
module.exports = { generateExport, XLSX_PATH, EXPORT_DIR };
