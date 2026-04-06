const fetch = require('node-fetch');
const { getDB } = require('../models/db');

const THREE_MONTHS_AGO = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString();
};

// Arbeitnow - free, no auth
async function scrapeArbeitnow(page = 1) {
  try {
    const res = await fetch(`https://www.arbeitnow.com/api/job-board-api?page=${page}`);
    const data = await res.json();
    return (data.data || []).map(j => ({
      external_id: `arbeitnow_${j.slug}`,
      source: 'arbeitnow',
      title: j.title,
      company: j.company_name,
      description: j.description?.replace(/<[^>]*>/g, ' ').substring(0, 2000) || '',
      location: j.location || 'Remote',
      job_type: j.remote ? 'Remote' : 'On-site',
      salary: null,
      url: j.url,
      tags: JSON.stringify(j.tags || []),
      posted_at: j.created_at ? new Date(j.created_at * 1000).toISOString() : new Date().toISOString(),
    }));
  } catch (e) {
    console.error('Arbeitnow scrape error:', e.message);
    return [];
  }
}

// Remotive - free, no auth, remote jobs
async function scrapeRemotive() {
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs?limit=100');
    const data = await res.json();
    return (data.jobs || []).map(j => ({
      external_id: `remotive_${j.id}`,
      source: 'remotive',
      title: j.title,
      company: j.company_name,
      description: j.description?.replace(/<[^>]*>/g, ' ').substring(0, 2000) || '',
      location: j.candidate_required_location || 'Worldwide',
      job_type: j.job_type || 'Full-time',
      salary: j.salary || null,
      url: j.url,
      tags: JSON.stringify(j.tags || []),
      posted_at: j.publication_date || new Date().toISOString(),
    }));
  } catch (e) {
    console.error('Remotive scrape error:', e.message);
    return [];
  }
}

// FindWork.dev - free, tech jobs
async function scrapeFindwork() {
  try {
    const res = await fetch('https://findwork.dev/api/jobs/', {
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map(j => ({
      external_id: `findwork_${j.id}`,
      source: 'findwork',
      title: j.role,
      company: j.company_name,
      description: j.text?.substring(0, 2000) || '',
      location: j.location || 'Remote',
      job_type: j.employment_type || 'Full-time',
      salary: null,
      url: j.url,
      tags: JSON.stringify(j.keywords || []),
      posted_at: j.date_posted || new Date().toISOString(),
    }));
  } catch (e) {
    console.error('Findwork scrape error:', e.message);
    return [];
  }
}

function saveJobs(jobs) {
  const db = getDB();
  try {
    const stmt = db.prepare(`INSERT OR IGNORE INTO jobs (external_id, source, title, company, description, location, job_type, salary, url, tags, posted_at)
      VALUES (@external_id, @source, @title, @company, @description, @location, @job_type, @salary, @url, @tags, @posted_at)`);
    const tx = db.transaction((jobs) => {
      let count = 0;
      for (const j of jobs) {
        const r = stmt.run(j);
        if (r.changes > 0) count++;
      }
      return count;
    });
    const inserted = tx(jobs);
    console.log(`Saved ${inserted} new jobs out of ${jobs.length} scraped`);
    return inserted;
  } finally {
    db.close();
  }
}

function cleanOldJobs() {
  const db = getDB();
  try {
    const cutoff = THREE_MONTHS_AGO();
    const r = db.prepare('DELETE FROM jobs WHERE posted_at < ? OR scraped_at < ?').run(cutoff, cutoff);
    console.log(`Cleaned ${r.changes} expired jobs`);
  } finally {
    db.close();
  }
}

async function runScraper() {
  console.log('Starting job scraper...');
  cleanOldJobs();

  const [arbeitnow1, arbeitnow2, remotive, findwork] = await Promise.all([
    scrapeArbeitnow(1),
    scrapeArbeitnow(2),
    scrapeRemotive(),
    scrapeFindwork(),
  ]);

  const allJobs = [...arbeitnow1, ...arbeitnow2, ...remotive, ...findwork];
  console.log(`Scraped ${allJobs.length} total jobs`);

  // Filter out jobs older than 3 months
  const cutoff = THREE_MONTHS_AGO();
  const fresh = allJobs.filter(j => !j.posted_at || j.posted_at >= cutoff);

  if (fresh.length > 0) saveJobs(fresh);
  return fresh.length;
}

module.exports = { runScraper, cleanOldJobs };
