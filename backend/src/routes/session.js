import { Router } from 'express';
import { getDatabase, query, queryOne } from '../db/database.js';

const router = Router();

/**
 * GET /session/:code
 *
 * Look up a test by its session code.
 * The session code is the first 6 uppercase alphanumeric characters of the test ID
 * (dashes stripped). e.g. test id "test-checkout" -> code "TESTCH"
 * Lookup is case-insensitive using UPPER(REPLACE(id, '-', '')) LIKE '<code>%'
 */
router.get('/:code', async (req, res) => {
  try {
    await getDatabase();

    const rawCode = req.params.code.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (!rawCode || rawCode.length < 4) {
      return res.status(400).json({ error: 'Session code must be at least 4 alphanumeric characters' });
    }

    // Find test by its stored session_code (exact match, case-insensitive)
    const test = queryOne(
      `SELECT id, project_id, name, description, target_url, instructions, timeout_ms, variants, is_active, created_at, session_code
       FROM tests
       WHERE UPPER(session_code) = ?`,
      [rawCode]
    );

    if (!test) {
      return res.status(404).json({ error: 'No test found for session code' });
    }

    // Fetch tasks for this test
    const tasks = query(
      `SELECT id, title, description, order_index
       FROM tasks WHERE test_id = ?
       ORDER BY order_index ASC`,
      [test.id]
    );

    res.json({
      id: test.id,
      projectId: test.project_id,
      sessionCode: test.session_code,
      name: test.name,
      description: test.description,
      targetUrl: test.target_url,
      instructions: test.instructions,
      timeoutMs: test.timeout_ms,
      variants: JSON.parse(test.variants || '["A"]'),
      isActive: Boolean(test.is_active),
      createdAt: test.created_at,
      tasks: tasks.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        orderIndex: t.order_index
      }))
    });
  } catch (error) {
    console.error('[Session] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
