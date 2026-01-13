import { getDatabase, query, queryOne } from '../db/database.js';

/**
 * Compute analytics for a specific test
 */
export async function computeAnalytics(testId) {
  await getDatabase();
  
  // Get test info
  const test = queryOne('SELECT * FROM tests WHERE id = ?', [testId]);
  
  if (!test) {
    return null;
  }
  
  const variants = JSON.parse(test.variants || '["A"]');
  const analytics = {
    testId: testId,
    testName: test.name,
    description: test.description,
    sampleSize: 0,
    variants: {},
    computedAt: new Date().toISOString()
  };
  
  for (const variant of variants) {
    const variantStats = await computeVariantStats(testId, variant);
    analytics.variants[variant] = variantStats;
    analytics.sampleSize += variantStats.sessions;
  }
  
  return analytics;
}

/**
 * Compute stats for a specific variant
 */
async function computeVariantStats(testId, variant) {
  // Base session counts
  const sessionCounts = queryOne(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN outcome = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN outcome = 'abandoned' THEN 1 ELSE 0 END) as abandoned
    FROM sessions
    WHERE test_id = ? AND variant = ?
  `, [testId, variant]);
  
  // Completion time stats (only completed sessions)
  const timeStats = queryOne(`
    SELECT 
      AVG(duration_ms) as avg_time,
      MIN(duration_ms) as min_time,
      MAX(duration_ms) as max_time
    FROM sessions
    WHERE test_id = ? AND variant = ? AND outcome = 'completed' AND duration_ms IS NOT NULL
  `, [testId, variant]);
  
  // Median completion time
  const medianTime = queryOne(`
    SELECT duration_ms
    FROM sessions
    WHERE test_id = ? AND variant = ? AND outcome = 'completed' AND duration_ms IS NOT NULL
    ORDER BY duration_ms
    LIMIT 1
    OFFSET (
      SELECT COUNT(*) / 2 
      FROM sessions 
      WHERE test_id = ? AND variant = ? AND outcome = 'completed' AND duration_ms IS NOT NULL
    )
  `, [testId, variant, testId, variant]);
  
  // Error counts by type
  const errorCounts = query(`
    SELECT e.type, COUNT(*) as count
    FROM events e
    JOIN sessions s ON e.session_id = s.id
    WHERE s.test_id = ? AND s.variant = ? AND e.type IN ('validation_error', 'api_error', 'error')
    GROUP BY e.type
  `, [testId, variant]);
  
  const errors = {};
  for (const row of errorCounts) {
    errors[row.type] = row.count;
  }
  
  // Time distribution buckets
  const timeBuckets = query(`
    SELECT 
      CASE
        WHEN duration_ms < 30000 THEN '0-30s'
        WHEN duration_ms < 60000 THEN '30-60s'
        WHEN duration_ms < 120000 THEN '60-120s'
        ELSE '120s+'
      END as bucket,
      COUNT(*) as count
    FROM sessions
    WHERE test_id = ? AND variant = ? AND outcome = 'completed' AND duration_ms IS NOT NULL
    GROUP BY bucket
  `, [testId, variant]);
  
  // Ensure all buckets exist with proper order
  const timeDistribution = [
    { bucket: '0-30s', count: 0 },
    { bucket: '30-60s', count: 0 },
    { bucket: '60-120s', count: 0 },
    { bucket: '120s+', count: 0 }
  ];
  
  for (const bucket of timeBuckets) {
    const idx = timeDistribution.findIndex(t => t.bucket === bucket.bucket);
    if (idx !== -1) {
      timeDistribution[idx].count = bucket.count;
    }
  }
  
  const total = sessionCounts?.total || 0;
  const completed = sessionCounts?.completed || 0;
  const abandoned = sessionCounts?.abandoned || 0;
  
  return {
    sessions: total,
    completed: completed,
    abandoned: abandoned,
    completionRate: total > 0 ? Math.round((completed / total) * 100 * 10) / 10 : 0,
    abandonRate: total > 0 ? Math.round((abandoned / total) * 100 * 10) / 10 : 0,
    avgCompletionTimeMs: Math.round(timeStats?.avg_time || 0),
    medianCompletionTimeMs: medianTime?.duration_ms || 0,
    minCompletionTimeMs: timeStats?.min_time || 0,
    maxCompletionTimeMs: timeStats?.max_time || 0,
    errors: errors,
    timeDistribution: timeDistribution
  };
}

/**
 * Get summary stats for all tests in a project
 */
export async function getProjectSummary(projectId) {
  await getDatabase();
  
  const tests = query(`
    SELECT t.id, t.name, t.description, t.target_url, t.instructions, t.variants, t.is_active, t.created_at,
      (SELECT COUNT(*) FROM sessions s WHERE s.test_id = t.id) as total_sessions,
      (SELECT COUNT(*) FROM sessions s WHERE s.test_id = t.id AND s.outcome = 'completed') as completed_sessions
    FROM tests t
    WHERE t.project_id = ?
    ORDER BY t.created_at DESC
  `, [projectId]);
  
  return tests.map(test => ({
    id: test.id,
    name: test.name,
    description: test.description,
    targetUrl: test.target_url,
    instructions: test.instructions,
    variants: JSON.parse(test.variants || '["A"]'),
    isActive: Boolean(test.is_active),
    createdAt: test.created_at,
    totalSessions: test.total_sessions,
    completionRate: test.total_sessions > 0 
      ? Math.round((test.completed_sessions / test.total_sessions) * 100 * 10) / 10 
      : 0
  }));
}
