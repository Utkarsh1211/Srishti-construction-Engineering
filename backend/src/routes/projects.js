const express = require('express');
const pool = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/projects
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await pool.query(`SELECT
  p.*,

  COALESCE(s.total_credit, 0) AS total_credit,
  COALESCE(s.total_debit, 0) AS total_debit,
  COALESCE(s.total_withdrawal, 0) AS total_withdrawal,

  CASE
    WHEN p.kind = $1
      THEN COALESCE(s.total_credit, 0)
         - COALESCE(s.total_debit, 0)

    WHEN p.kind = $2
      THEN COALESCE(s.total_credit, 0)
         - COALESCE(s.total_withdrawal, 0)

    WHEN p.kind = $3
      THEN COALESCE(s.total_credit, 0)
         - COALESCE(s.total_debit, 0)

    ELSE 0
  END AS balance

FROM projects p

LEFT JOIN (
  SELECT
    p2.project_id,

    SUM(
      CASE
        WHEN t.type = $4
        THEN t.amount
        ELSE 0
      END
    ) AS total_credit,

    SUM(
      CASE
        WHEN t.type = $5
        THEN t.amount
        ELSE 0
      END
    ) AS total_debit,

    SUM(
      CASE
        WHEN t.type = $6
        THEN t.amount
        ELSE 0
      END
    ) AS total_withdrawal

  FROM projects p2
  LEFT JOIN transactions t
    ON t.project_id = p2.project_id
  GROUP BY p2.project_id
) s
  ON s.project_id = p.project_id

ORDER BY p.start_date DESC;`,['site', 'account', 'loan','credit', 'debit', 'withdrawal']);
    res.json({ success: true, data: result.rows });
  })
);

// GET /api/projects/company-summary
// Company-wide operational position: site credits minus site debits minus
// everything partners have already withdrawn from either account. This is
// deliberately NOT the same as summing every project's own balance — it's
// "where do we actually stand after partners took their share."
router.get(
  '/company-summary',
  asyncHandler(async (req, res) => {
    const result = await pool.query(`
      select
        coalesce((select sum(t.amount) from transactions t join projects p on p.project_id = t.project_id where p.kind = 'site' and t.type = 'credit'), 0) as site_credits,
        coalesce((select sum(t.amount) from transactions t join projects p on p.project_id = t.project_id where p.kind = 'site' and t.type = 'debit'), 0) as site_debits,
        coalesce((select sum(t.amount) from transactions t join projects p on p.project_id = t.project_id where p.kind = 'account' and t.type = 'withdrawal'), 0) as total_withdrawals,
        coalesce((select sum(t.amount) from transactions t join projects p on p.project_id = t.project_id where p.kind = 'loan' and t.type = 'debit'), 0) as total_loan_repaid,
        coalesce((select sum(t.amount) from transactions t join projects p on p.project_id = t.project_id where p.kind = 'loan' and t.type = 'credit'), 0) as total_loan_received
    `);
    const row = result.rows[0];
    const site_credits = Number(row.site_credits);
    const site_debits = Number(row.site_debits);
    const total_withdrawals = Number(row.total_withdrawals);
    const total_loan_repaid = Number(row.total_loan_repaid);
    const total_loan_received = Number(row.total_loan_received);
    res.json({
      success: true,
      data: {
        site_credits,
        site_debits,
        total_withdrawals,
        total_loan_repaid,
        total_loan_received,
        balance: site_credits - site_debits - total_withdrawals - total_loan_repaid + total_loan_received
      }
    });
  })
);

// GET /api/projects/:accountid/current-balance
// Shape differs by project kind — see comments below.
router.get(
  '/:id/current-balance',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const projectRes = await pool.query('select * from projects where project_id = $1', [id]);
    if (projectRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    const project = projectRes.rows[0];

  if (project.kind === 'account') {
  const asOf = project.opening_balance_as_of || '1900-01-01';
  const [creditRes, debitRes, withdrawalRes] = await Promise.all([
    pool.query(
      `select coalesce(sum(amount), 0) as total from transactions
       where account_id = $1 and type = 'credit' and date >= ($2::date + interval '1 day')`,
      [id, asOf]
    ),
    pool.query(
      `select coalesce(sum(amount), 0) as total from transactions
       where account_id = $1 and type = 'debit' and date >= ($2::date + interval '1 day')`,
      [id, asOf]
    ),
    pool.query(
      `select coalesce(sum(amount), 0) as total from transactions
       where account_id = $1 and type = 'withdrawal' and date >= ($2::date + interval '1 day')`,
      [id, asOf]
    )
  ]);
  const total_credit = Number(creditRes.rows[0].total);
  const total_debit = Number(debitRes.rows[0].total);
  const total_withdrawal = Number(withdrawalRes.rows[0].total);
  const opening_balance = Number(project.opening_balance);

  return res.json({
    success: true,
    data: {
      current_balance: opening_balance + total_credit - total_debit - total_withdrawal
    }
  });
}
  return res.status(400).json({ success: false, error: 'Current balance is only available for account projects' });
  })
);


// POST /api/projects
// Always creates kind='site' — the 'kind' field is never accepted from the
// request body. Accounts and the loan project are fixed, seeded once via
// migration, not created through this endpoint.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { project_name, project_code, start_date, status } = req.body;
    if (!project_name || !project_name.trim()) {
      return res.status(400).json({ success: false, error: 'project_name is required' });
    }
    const result = await pool.query(
      `insert into projects (project_name, project_code, start_date, status, kind)
       values ($1, $2, coalesce($3, current_date), coalesce($4, 'active'), 'site')
       returning *`,
      [project_name.trim(), project_code || null, start_date || null, status || null]
    );
    res.status(201).json({ success: true, project_id: result.rows[0].project_id, data: result.rows[0] });
  })
);

// PATCH /api/projects/:id
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { project_name, start_date, status } = req.body;

    const result = await pool.query(
      `update projects set
         project_name = coalesce($1, project_name),
         start_date = coalesce($2, start_date),
         status = coalesce($3, status)
       where project_id = $4
       returning *`,
      [project_name, start_date, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  })
);

// DELETE /api/projects/:id
// The 3 pinned projects (2 accounts + loan) are structural — block deletion.
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const client = await pool.connect();
    try {
      await client.query('begin');

      const projectRes = await client.query('select * from projects where project_id = $1 for update', [id]);
      if (projectRes.rows.length === 0) {
        await client.query('rollback');
        return res.status(404).json({ success: false, error: 'Project not found' });
      }
      const project = projectRes.rows[0];

      if (project.kind !== 'site') {
        await client.query('rollback');
        return res.status(400).json({ success: false, error: 'This project is fixed and cannot be deleted' });
      }

      if (new Date(project.start_date) < new Date('2026-08-31')) {
        await client.query('rollback');
        return res.status(400).json({ success: false, error: 'Projects created before 31-08-2026 cannot be deleted' });
      }

      // Delete children first, explicitly — don't depend on ON DELETE CASCADE
      // being configured correctly on the FK. This also catches any
      // transaction that references this project via received_into_project_id
      // or account_id (rather than project_id), which cascade wouldn't touch
      // even if it were configured, since those are separate FK columns.
      const deletedTxns = await client.query(
        `delete from transactions
         where project_id = $1
         returning txn_id`,
        [id]
      );

      const deletedProject = await client.query('delete from projects where project_id = $1 returning project_id', [id]);

      await client.query('commit');
      res.json({
        success: true,
        deleted: deletedProject.rows.length > 0,
        transactions_deleted: deletedTxns.rows.length
      });
    } catch (err) {
      await client.query('rollback');
      throw err;
    } finally {
      client.release();
    }
  })
);

module.exports = router;