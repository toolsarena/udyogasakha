const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/opportunities', require('./routes/opportunities'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/trust', require('./routes/trust'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/jobs', require('./routes/jobs'));

// Health check
app.get('/', (req, res) => res.json({ status: 'UdyogaSakha API running' }));

// Auto-scrape on startup + every 6 hours
const { runScraper } = require('./services/scraper');
const { embedJobs } = require('./services/ranker');

setTimeout(async () => {
  try {
    await runScraper();
    await embedJobs(50);
  } catch (e) { console.error('Startup scrape error:', e.message); }
}, 5000);

cron.schedule('0 */6 * * *', async () => {
  try {
    await runScraper();
    await embedJobs(50);
  } catch (e) { console.error('Cron scrape error:', e.message); }
});

if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(PORT, () => console.log(`UdyogaSakha API running on port ${PORT}`));
}
