// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);

  // Postgres check-constraint / foreign-key violations get a friendlier status
  if (err.code === '23503') {
    return res.status(400).json({ success: false, error: 'Referenced record does not exist' });
  }
  if (err.code === '23514') {
    return res.status(400).json({ success: false, error: 'Value violates a data constraint' });
  }

  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
}

module.exports = errorHandler;
