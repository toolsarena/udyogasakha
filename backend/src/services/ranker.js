const fetch = require('node-fetch');
const { getDB } = require('../models/db');

const HF_API = 'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2';

// --- Embedding Generation ---

async function getEmbedding(text) {
  try {
    const res = await fetch(HF_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: text.substring(0, 512), options: { wait_for_model: true } }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch (e) {
    console.error('Embedding error:', e.message);
    return null;
  }
}

// --- User Tower: Build user embedding from profile ---

function buildUserText(user) {
  const parts = [user.headline || ''];
  const skills = safeParseJSON(user.skills);
  if (skills.length) parts.push('Skills: ' + skills.join(', '));
  if (user.experience_years) parts.push(`${user.experience_years} years experience`);
  if (user.education) parts.push(user.education);
  const locations = safeParseJSON(user.preferred_locations);
  if (locations.length) parts.push('Preferred: ' + locations.join(', '));
  const jobTypes = safeParseJSON(user.preferred_job_types);
  if (jobTypes.length) parts.push(jobTypes.join(', '));
  const cvKeys = safeParseJSON(user.cv_keywords);
  if (cvKeys.length) parts.push(cvKeys.join(', '));
  return parts.filter(Boolean).join('. ');
}

async function embedUser(userId) {
  const db = getDB();
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return null;
    const text = buildUserText(user);
    if (!text.trim()) return null;
    const emb = await getEmbedding(text);
    if (emb) {
      db.prepare('UPDATE users SET embedding = ? WHERE id = ?').run(JSON.stringify(emb), userId);
    }
    return emb;
  } finally {
    db.close();
  }
}

// --- Job Tower: Build job embedding ---

function buildJobText(job) {
  const parts = [job.title, job.company || '', job.location || ''];
  const tags = safeParseJSON(job.tags);
  if (tags.length) parts.push(tags.join(', '));
  if (job.description) parts.push(job.description.substring(0, 300));
  if (job.job_type) parts.push(job.job_type);
  return parts.filter(Boolean).join('. ');
}

async function embedJobs(batchSize = 20) {
  const db = getDB();
  try {
    const jobs = db.prepare('SELECT * FROM jobs WHERE embedding IS NULL LIMIT ?').all(batchSize);
    let count = 0;
    for (const job of jobs) {
      const text = buildJobText(job);
      const emb = await getEmbedding(text);
      if (emb) {
        db.prepare('UPDATE jobs SET embedding = ? WHERE id = ?').run(JSON.stringify(emb), job.id);
        count++;
      }
      // Rate limit: HF free tier
      await new Promise(r => setTimeout(r, 200));
    }
    console.log(`Embedded ${count}/${jobs.length} jobs`);
    return count;
  } finally {
    db.close();
  }
}

// --- Two-Tower Scoring: Cosine Similarity ---

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// --- Ranking Pipeline ---

function rankJobsForUser(userId, limit = 50) {
  const db = getDB();
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user || !user.embedding) return { jobs: [], hasEmbedding: false };

    const userEmb = safeParseJSON(user.embedding);
    if (!userEmb.length) return { jobs: [], hasEmbedding: false };

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const cutoff = threeMonthsAgo.toISOString();

    // Get jobs with embeddings, not older than 3 months
    const jobs = db.prepare(`SELECT * FROM jobs WHERE embedding IS NOT NULL AND (posted_at >= ? OR posted_at IS NULL) ORDER BY posted_at DESC LIMIT 500`).all(cutoff);

    const userSkills = safeParseJSON(user.skills).map(s => s.toLowerCase());
    const userLocations = safeParseJSON(user.preferred_locations).map(l => l.toLowerCase());
    const userJobTypes = safeParseJSON(user.preferred_job_types).map(t => t.toLowerCase());

    const scored = jobs.map(job => {
      const jobEmb = safeParseJSON(job.embedding);

      // Two-tower semantic similarity (primary signal)
      const semanticScore = cosineSimilarity(userEmb, jobEmb);

      // Skill match boost
      const jobTags = safeParseJSON(job.tags).map(t => t.toLowerCase());
      const jobText = (job.title + ' ' + job.description).toLowerCase();
      let skillMatch = 0;
      for (const skill of userSkills) {
        if (jobTags.includes(skill) || jobText.includes(skill)) skillMatch++;
      }
      const skillScore = userSkills.length > 0 ? skillMatch / userSkills.length : 0;

      // Location match boost
      let locationScore = 0;
      if (userLocations.length > 0 && job.location) {
        const jobLoc = job.location.toLowerCase();
        if (userLocations.some(l => jobLoc.includes(l) || l.includes('remote') && jobLoc.includes('remote'))) {
          locationScore = 1;
        }
      }

      // Job type match boost
      let typeScore = 0;
      if (userJobTypes.length > 0 && job.job_type) {
        if (userJobTypes.some(t => job.job_type.toLowerCase().includes(t))) {
          typeScore = 1;
        }
      }

      // Recency boost (newer = higher)
      let recencyScore = 0.5;
      if (job.posted_at) {
        const age = (Date.now() - new Date(job.posted_at).getTime()) / (1000 * 60 * 60 * 24);
        recencyScore = Math.max(0, 1 - (age / 90)); // Linear decay over 90 days
      }

      // Weighted final score
      const finalScore =
        semanticScore * 0.45 +   // Two-tower embedding similarity
        skillScore * 0.25 +       // Explicit skill match
        recencyScore * 0.15 +     // Freshness
        locationScore * 0.08 +    // Location preference
        typeScore * 0.07;         // Job type preference

      return { ...job, score: finalScore, semanticScore, skillScore, recencyScore };
    });

    scored.sort((a, b) => b.score - a.score);
    return { jobs: scored.slice(0, limit), hasEmbedding: true };
  } finally {
    db.close();
  }
}

// Fallback: keyword-based ranking when no embeddings
function rankJobsFallback(userId, limit = 50) {
  const db = getDB();
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const cutoff = threeMonthsAgo.toISOString();

    const jobs = db.prepare('SELECT * FROM jobs WHERE posted_at >= ? OR posted_at IS NULL ORDER BY posted_at DESC LIMIT 200').all(cutoff);

    if (!user) return jobs.slice(0, limit);

    const userSkills = safeParseJSON(user.skills).map(s => s.toLowerCase());
    const cvKeys = safeParseJSON(user.cv_keywords).map(k => k.toLowerCase());
    const allKeywords = [...userSkills, ...cvKeys];

    if (allKeywords.length === 0) return jobs.slice(0, limit);

    const scored = jobs.map(job => {
      const text = (job.title + ' ' + job.description + ' ' + (job.tags || '')).toLowerCase();
      let matches = 0;
      for (const kw of allKeywords) {
        if (text.includes(kw)) matches++;
      }
      const score = allKeywords.length > 0 ? matches / allKeywords.length : 0;
      return { ...job, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  } finally {
    db.close();
  }
}

function safeParseJSON(str) {
  try { return JSON.parse(str || '[]'); } catch { return []; }
}

module.exports = { getEmbedding, embedUser, embedJobs, rankJobsForUser, rankJobsFallback, cosineSimilarity };
