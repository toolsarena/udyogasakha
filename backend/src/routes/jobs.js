const express = require('express');
const { getDB } = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');
const { runScraper } = require('../services/scraper');
const { rankJobsForUser, rankJobsFallback, embedUser, embedJobs } = require('../services/ranker');

const router = express.Router();

// Browse all jobs (with 3-month filter)
router.get('/', (req, res) => {
  const { search, location, job_type, source, page = 1, limit = 30 } = req.query;
  const db = getDB();
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const cutoff = threeMonthsAgo.toISOString();

    let sql = 'SELECT id, title, company, location, job_type, salary, url, source, tags, posted_at FROM jobs WHERE (posted_at >= ? OR posted_at IS NULL)';
    const params = [cutoff];

    if (search) { sql += ' AND (title LIKE ? OR company LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (location) { sql += ' AND location LIKE ?'; params.push(`%${location}%`); }
    if (job_type) { sql += ' AND job_type LIKE ?'; params.push(`%${job_type}%`); }
    if (source) { sql += ' AND source = ?'; params.push(source); }

    const countSql = sql.replace(/SELECT .* FROM/, 'SELECT COUNT(*) as count FROM');
    const total = db.prepare(countSql).get(...params).count;

    sql += ' ORDER BY posted_at DESC LIMIT ? OFFSET ?';
    params.push(+limit, (+page - 1) * +limit);

    const jobs = db.prepare(sql).all(...params);
    res.json({ data: jobs, total, page: +page, limit: +limit });
  } finally {
    db.close();
  }
});

// Recommended jobs for logged-in user (two-tower ranking)
router.get('/recommended', authenticate, async (req, res) => {
  try {
    const { limit = 30 } = req.query;
    let result = rankJobsForUser(req.user.id, +limit);

    if (!result.hasEmbedding) {
      // Try to generate embedding first
      await embedUser(req.user.id);
      result = rankJobsForUser(req.user.id, +limit);
    }

    if (!result.hasEmbedding) {
      // Fallback to keyword matching
      const jobs = rankJobsFallback(req.user.id, +limit);
      return res.json({ data: jobs, method: 'keyword', total: jobs.length });
    }

    res.json({ data: result.jobs, method: 'two-tower', total: result.jobs.length });
  } catch (e) {
    console.error('Recommendation error:', e);
    res.status(500).json({ error: 'Recommendation failed' });
  }
});

// Get single job
router.get('/:id', (req, res) => {
  const db = getDB();
  try {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } finally {
    db.close();
  }
});

// Trigger scraper (admin only)
router.post('/scrape', authenticate, authorize('admin'), async (req, res) => {
  try {
    const count = await runScraper();
    // Embed new jobs in background
    embedJobs(30).catch(console.error);
    res.json({ message: `Scraped ${count} fresh jobs` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Trigger embedding generation (admin)
router.post('/embed', authenticate, authorize('admin'), async (req, res) => {
  try {
    const count = await embedJobs(+req.query.batch || 30);
    res.json({ message: `Embedded ${count} jobs` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Job stats
router.get('/stats/summary', (req, res) => {
  const db = getDB();
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const cutoff = threeMonthsAgo.toISOString();

    res.json({
      total: db.prepare('SELECT COUNT(*) as c FROM jobs WHERE posted_at >= ? OR posted_at IS NULL').get(cutoff).c,
      by_source: db.prepare('SELECT source, COUNT(*) as count FROM jobs WHERE posted_at >= ? OR posted_at IS NULL GROUP BY source').all(cutoff),
      embedded: db.prepare('SELECT COUNT(*) as c FROM jobs WHERE embedding IS NOT NULL AND (posted_at >= ? OR posted_at IS NULL)').get(cutoff).c,
    });
  } finally {
    db.close();
  }
});

module.exports = router;
