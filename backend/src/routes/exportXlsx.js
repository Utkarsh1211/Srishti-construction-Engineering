const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { generateExport, XLSX_PATH } = require('../utils/xlsxExport');

const router = express.Router();
router.use(requireAuth);

router.post(
  '/generate',
  asyncHandler(async (req, res) => {
    const result = await generateExport();
    res.json({ success: true, ...result });
  })
);

router.get(
  '/download',
  asyncHandler(async (req, res) => {
    res.download(XLSX_PATH, 'srishti_construction_engineering.xlsx', (err) => {
      if (err && !res.headersSent) {
        res.status(404).json({ success: false, error: 'Export file not found — generate it first.' });
      }
    });
  })
);

module.exports = router;