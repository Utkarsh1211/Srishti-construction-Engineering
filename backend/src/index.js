require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const projectsRoutes = require('./routes/projects');
const transactionsRoutes = require('./routes/transactions');
const errorHandler = require('./middleware/errorHandler');
const exportXlsxRoutes = require('./routes/exportXlsx');

const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

// Load Swagger documentation
const swaggerDocument = YAML.load(path.join(__dirname, '../openapi.yaml'));

const app = express();

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ success: true, status: 'ok' }));

//db health check endpoint
app.get('/db-health', async (req, res) => {
  try {
    const result = await require('./db').query('SELECT 1');
    if (result.rowCount === 1) {
      res.json({ success: true, status: 'ok' });
    } else {
      res.status(500).json({ success: false, error: 'Database health check failed' });
    }
  } catch (err) {
    console.error('Database health check error:', err);
    res.status(500).json({ success: false, error: 'Database health check failed' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/export/xlsx', exportXlsxRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Srishti Construction Engineering backend server listening on port ${PORT}`);
});
