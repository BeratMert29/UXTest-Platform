import { Router } from 'express';
import { getDatabase, query, queryOne, run } from '../db/database.js';
import { getProjectSummary } from '../services/analyticsService.js';

const router = Router();

/**
 * GET /tests - List all tests
 */
router.get('/', async (req, res) => {
  try {
    const projectId = req.query.projectId || 'demo-project';
    const tests = await getProjectSummary(projectId);
    res.json(tests);
  } catch (error) {
    console.error('[Tests] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /tests/:id - Get test with tasks
 */
router.get('/:id', async (req, res) => {
  try {
    await getDatabase();
    const test = queryOne(`
      SELECT id, project_id, name, description, target_url, instructions, timeout_ms, variants, is_active, created_at
      FROM tests WHERE id = ?
    `, [req.params.id]);
    
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
    
    // Get tasks for this test
    const tasks = query(`
      SELECT id, title, description, order_index
      FROM tasks WHERE test_id = ?
      ORDER BY order_index ASC
    `, [req.params.id]);
    
    res.json({
      id: test.id,
      projectId: test.project_id,
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
    console.error('[Tests] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /tests - Create test with tasks
 */
router.post('/', async (req, res) => {
  try {
    await getDatabase();
    const { projectId, name, description, targetUrl, instructions, timeoutMs, variants, tasks } = req.body;
    
    if (!projectId || !name) {
      return res.status(400).json({ error: 'projectId and name are required' });
    }
    
    const testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    run(`
      INSERT INTO tests (id, project_id, name, description, target_url, instructions, timeout_ms, variants)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [testId, projectId, name, description || null, targetUrl || null, instructions || null, timeoutMs || 300000, JSON.stringify(variants || ['A'])]);
    
    // Insert tasks if provided
    const createdTasks = [];
    if (tasks && Array.isArray(tasks)) {
      tasks.forEach((task, index) => {
        const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        run(`INSERT INTO tasks (id, test_id, title, description, order_index) VALUES (?, ?, ?, ?, ?)`,
          [taskId, testId, task.title, task.description || null, index]);
        createdTasks.push({ id: taskId, title: task.title, description: task.description, orderIndex: index });
      });
    }
    
    res.status(201).json({
      id: testId,
      projectId,
      name,
      description,
      targetUrl,
      instructions,
      timeoutMs: timeoutMs || 300000,
      variants: variants || ['A'],
      isActive: true,
      tasks: createdTasks
    });
  } catch (error) {
    console.error('[Tests] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /tests/:id - Update test
 */
router.patch('/:id', async (req, res) => {
  try {
    await getDatabase();
    const { name, description, targetUrl, instructions, timeoutMs, variants, isActive, tasks } = req.body;
    
    const existing = queryOne('SELECT id FROM tests WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Test not found' });
    }
    
    const updates = [];
    const params = [];
    
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (targetUrl !== undefined) { updates.push('target_url = ?'); params.push(targetUrl); }
    if (instructions !== undefined) { updates.push('instructions = ?'); params.push(instructions); }
    if (timeoutMs !== undefined) { updates.push('timeout_ms = ?'); params.push(timeoutMs); }
    if (variants !== undefined) { updates.push('variants = ?'); params.push(JSON.stringify(variants)); }
    if (isActive !== undefined) { updates.push('is_active = ?'); params.push(isActive ? 1 : 0); }
    
    if (updates.length > 0) {
      params.push(req.params.id);
      run(`UPDATE tests SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    
    // Update tasks if provided
    if (tasks && Array.isArray(tasks)) {
      // Delete existing tasks
      run('DELETE FROM tasks WHERE test_id = ?', [req.params.id]);
      
      // Insert new tasks
      tasks.forEach((task, index) => {
        const taskId = task.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        run(`INSERT INTO tasks (id, test_id, title, description, order_index) VALUES (?, ?, ?, ?, ?)`,
          [taskId, req.params.id, task.title, task.description || null, index]);
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('[Tests] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /tests/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    await getDatabase();
    
    const existing = queryOne('SELECT id FROM tests WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Test not found' });
    }
    
    run('DELETE FROM tasks WHERE test_id = ?', [req.params.id]);
    run('DELETE FROM tests WHERE id = ?', [req.params.id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('[Tests] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
