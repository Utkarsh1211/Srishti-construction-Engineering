const express = require('express');
const pool = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { CREDIT_CATEGORY, isValidCategory, isValidSubcategory } = require('../constants/categories');

const router = express.Router();
router.use(requireAuth);

async function getProject(id) {
  const res = await pool.query('select * from projects where project_id = $1', [id]);
  return res.rows[0] || null;
}
// Blocks editing/deleting a transaction that falls on or before an account's
// opening-balance cutoff date — those amounts are already baked into
// opening_balance, so changing them here would make the balance wrong
// without anyone noticing.
async function assertEditableTransaction(txn) {
  const project = await getProject(txn.project_id);
  if (project.project_id) {
    if (new Date(txn.date) < new Date('2026-08-31')) {
      const err = new Error(
        `This entry is dated on or before the cutoff date(${new Date('2026-08-31').toISOString().split('T')[0]}) and can't be edited or deleted.`
      );
      err.statusCode = 400;
      throw err;
    }
  }
}

// Resolves the final category/subcategory for a transaction, enforcing:
// - credit always forces category='Client Payment', subcategory=null (server-controlled, not client-trusted)
// - debit/withdrawal must use a valid category from EXPENSE_CATEGORIES, with subcategory
//   required/forbidden depending on that category's own subcategory list
function resolveCategoryFields(type, category, subcategory) {
  if (type === 'credit') {
    return { category: CREDIT_CATEGORY, subcategory: null, error: null };
  }
  if (!category || !isValidCategory(category)) {
    return { error: 'Unknown or missing category: ' + category };
  }
  if (!isValidSubcategory(category, subcategory)) {
    return { error: `Invalid subcategory "${subcategory}" for category "${category}"` };
  }
  return { category, subcategory: subcategory || null, error: null };
}

// GET /api/transactions?project_id=...
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { project_id } = req.query;

    if (!project_id) {
      const result = await pool.query(`
        select *,
          sum(case when type = 'credit' then amount else -amount end)
            over (partition by project_id order by date, created_at
                  rows between unbounded preceding and current row) as running_balance
        from transactions
        order by date asc, created_at asc
      `);
      return res.json({ success: true, data: result.rows });
    }

    const project = await getProject(project_id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    if (project.kind === 'account') {
      const result = await pool.query(
        `select * from transactions t LEFT JOIN projects p on p.project_id= t.project_id where t.account_id=$1 order by t.date asc, t.created_at asc`,
        [project_id]
      );

      let balance = 0;
      const rows = result.rows.map((txn) => {
        if (txn.type === 'credit') balance += Number(txn.amount);
        if (txn.type === 'withdrawal') balance -= Number(txn.amount);
        if (txn.type === 'debit') balance -= Number(txn.amount);
        return { ...txn, running_balance: balance };
      });
      return res.json({ success: true, data: rows });
    }

    const result = await pool.query(
      `select *,
         sum(case when type = 'credit' then amount else -amount end)
           over (order by date, created_at
                 rows between unbounded preceding and current row) as running_balance
       from transactions
       where project_id = $1
       order by date asc, created_at asc`,
      [project_id]
    );
    res.json({ success: true, data: result.rows });
  })
);

// POST /api/transactions
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { project_id,project_code , date, type, category, subcategory, detail, amount, entered_by, received_into_project_id, account_id } = req.body;


    if (!project_id || !type || !amount) {
      return res.status(400).json({ success: false, error: 'project_id, type, and amount are required' });
    }
    
    if (!['credit', 'debit', 'withdrawal'].includes(type)) {
      return res.status(400).json({ success: false, error: "type must be 'credit', 'debit', or 'withdrawal'" });
    }

    const resolved = resolveCategoryFields(type, category, subcategory);
    if (resolved.error) {
      return res.status(400).json({ success: false, error: resolved.error });
    }

    const project = await getProject(project_id);

    if (project.kind === 'account') {
  if (type !== 'withdrawal') {
    return res.status(400).json({
      success: false,
      error: 'Accounts only support withdrawals'
    });
  }
}

if (project.kind === 'loan') {
  if (!['credit', 'debit'].includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'Loans only support credit and debit'
    });
  }
}

if (project.kind === 'site') {
  if (!['credit', 'debit'].includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'Sites only support credit and debit'
    });
  }
}
    if (!project) {
      return res.status(400).json({ success: false, error: 'Project not found' });
    }

    let receivedInto = null;

    if (project.kind === 'account') {
      if (type !== 'withdrawal') {
        return res.status(400).json({ success: false, error: 'Only withdrawal entries can be added directly to an account' });
      }
    } else if (project.kind === 'loan') {
      if (type === 'withdrawal') {
        return res.status(400).json({ success: false, error: 'Withdrawal is not valid for the loan project' });
      }
    } else {
      if (type === 'credit') {
        if (!received_into_project_id) {
          return res.status(400).json({ success: false, error: 'received_into_project_id is required for credit entries' });
        }
        const targetAccount = await getProject(received_into_project_id);
        if (!targetAccount || targetAccount.kind !== 'account') {
          return res.status(400).json({ success: false, error: 'received_into_project_id must reference a valid account' });
        }
        receivedInto = received_into_project_id;
      }
    }

    const result = await pool.query(
      `insert into transactions (project_id, project_code, date, type, category, subcategory, detail, amount, entered_by, received_into_project_id, account_id)
       values ($1, $2, coalesce($3, now()), $4, $5, $6, $7, $8, $9, $10, $11)
       returning *`,
      [project_id, project_code, date || null, type, resolved.category, resolved.subcategory, detail || null, Number(amount), entered_by || null, receivedInto, account_id]
    );

    res.status(201).json({ success: true, txn_id: result.rows[0].txn_id, data: result.rows[0] });
  })
);

// PATCH /api/transactions/:id
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { date, type, category, subcategory, detail, amount, received_into_project_id, account_id } = req.body;

    const existingRes = await pool.query('select * from transactions where txn_id = $1', [id]);
    try {
      await assertEditableTransaction(existing);
    } catch (err) {
      return res.status(err.statusCode || 400).json({ success: false, error: err.message });
    }
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }
    const existing = existingRes.rows[0];
    const project = await getProject(existing.project_id);
    const effectiveType = type || existing.type;

    if (type && !['credit', 'debit', 'withdrawal'].includes(type)) {
      return res.status(400).json({ success: false, error: "type must be 'credit', 'debit', or 'withdrawal'" });
    }
      if (project.kind === 'account') {
  if (type !== 'withdrawal') {
    return res.status(400).json({
      success: false,
      error: 'Accounts only support withdrawals'
    });
  }
}

if (project.kind === 'loan') {
  if (!['credit', 'debit'].includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'Loans only support credit and debit'
    });
  }
}

if (project.kind === 'site') {
  if (!['credit', 'debit'].includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'Sites only support credit and debit'
    });
  }
}
    if (project.kind === 'account' && effectiveType !== 'withdrawal') {
      return res.status(400).json({ success: false, error: 'Only withdrawal entries are valid on an account' });
    }
    if (project.kind === 'loan' && effectiveType === 'withdrawal') {
      return res.status(400).json({ success: false, error: 'Withdrawal is not valid for the loan project' });
    }

    let resolvedCategory = existing.category;
    let resolvedSubcategory = existing.subcategory;
    if (category !== undefined || subcategory !== undefined || type !== undefined) {
      const resolved = resolveCategoryFields(
        effectiveType,
        category !== undefined ? category : existing.category,
        subcategory !== undefined ? subcategory : existing.subcategory
      );
      if (resolved.error) {
        return res.status(400).json({ success: false, error: resolved.error });
      }
      resolvedCategory = resolved.category;
      resolvedSubcategory = resolved.subcategory;
    }

    if (project.kind === 'site' && effectiveType === 'credit') {
      const targetId = received_into_project_id !== undefined ? received_into_project_id : existing.received_into_project_id;
      if (!targetId) {
        return res.status(400).json({ success: false, error: 'received_into_project_id is required for credit entries' });
      }
      const targetAccount = await getProject(targetId);
      if (!targetAccount || targetAccount.kind !== 'account') {
        return res.status(400).json({ success: false, error: 'received_into_project_id must reference a valid account' });
      }
    }

    const result = await pool.query(
      `update transactions set
         date = coalesce($1, date),
         type = coalesce($2, type),
         category = $3,
         subcategory = $4,
         detail = coalesce($5, detail),
         amount = coalesce($6, amount),
         received_into_project_id = coalesce($7, received_into_project_id),
         account_id = coalesce($8, account_id)
       where txn_id = $9
       returning *`,
      [date, type, resolvedCategory, resolvedSubcategory, detail, amount !== undefined ? Number(amount) : null, received_into_project_id, account_id, id]
    );

    res.json({ success: true, data: result.rows[0] });
  })
);

// DELETE /api/transactions/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existingRes = await pool.query('select * from transactions where txn_id = $1', [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }
    try {
      await assertEditableTransaction(existingRes.rows[0]);
    } catch (err) {
      return res.status(err.statusCode || 400).json({ success: false, error: err.message });
    }

    await pool.query('delete from transactions where txn_id = $1', [id]);
    res.json({ success: true });
  })
);

router.get('/meta/categories', (req, res) => {
  const { EXPENSE_CATEGORIES } = require('../constants/categories');
  res.json({ success: true, data: EXPENSE_CATEGORIES });
});


// GET /api/projects/:id/period-summary
// Like /summary but scoped to a date range. The "balance" field is always
// total_credit minus total_debit (or minus total_withdrawal for accounts).
router.get(
  '/:id/period-summary',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ success: false, error: 'from and to date query params are required' });
    }

    const project = await getProject(id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // date < (to + 1 day), not date <= to — transactions carry full timestamps,
    // so a plain <= comparison silently excludes anything after midnight on
    // the last day of the range. Verified against real timestamped data.
    if (project.kind === 'account') {
      const [creditRes, withdrawalRes, debitRes] = await Promise.all([
        pool.query(
          `select coalesce(sum(amount), 0) as total from transactions
           where account_id = $1 and type = 'credit'
             and date >= $2::date and date < ($3::date + interval '1 day')`,
          [id, from, to]
        ),
        pool.query(
          `select coalesce(sum(amount), 0) as total from transactions
           where account_id = $1 and type = 'withdrawal'
             and date >= $2::date and date < ($3::date + interval '1 day')`,
          [id, from, to]
        ),
        pool.query(
          `select coalesce(sum(amount), 0) as total from transactions
           where account_id = $1 and type = 'debit'
             and date >= $2::date and date < ($3::date + interval '1 day')`,
          [id, from, to]
        )
      ]);
      const total_credit = Number(creditRes.rows[0].total);
      const total_withdrawal = Number(withdrawalRes.rows[0].total);
      const total_debit = Number(debitRes.rows[0].total);
      return res.json({
        success: true,
        data: { project_id: id, kind: 'account', from, to, total_credit, total_withdrawal, total_debit, leftover: total_credit - total_withdrawal - total_debit }
      });
    }

    const totalsRes = await pool.query(
      `select
         coalesce(sum(amount) filter (where type = 'credit'), 0) as total_credit,
         coalesce(sum(amount) filter (where type = 'debit'), 0) as total_debit
       from transactions
       where project_id = $1 and date >= $2::date and date < ($3::date + interval '1 day')`,
      [id, from, to]
    );
    const total_credit = Number(totalsRes.rows[0].total_credit);
    const total_debit = Number(totalsRes.rows[0].total_debit);
    res.json({
      success: true,
      data: { project_id: id, kind: project.kind, from, to, total_credit, total_debit, leftover: total_credit - total_debit }
    });
  })
);

module.exports = router;