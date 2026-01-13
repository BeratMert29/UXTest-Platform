import { Router } from 'express';
import { getDatabase, query, run } from '../db/database.js';

const router = Router();

/**
 * GET /projects
 * List all projects
 */
router.get('/', async (req, res) => {
  try {
    await getDatabase();
    
    const projects = query(`
      SELECT p.id, p.name, p.created_at,
        (SELECT COUNT(*) FROM tests t WHERE t.project_id = p.id) as test_count
      FROM projects p
      ORDER BY p.created_at DESC
    `);
    
    res.json(projects.map(p => ({
      id: p.id,
      name: p.name,
      createdAt: p.created_at,
      testCount: p.test_count
    })));
  } catch (error) {
    console.error('[Projects] Error listing projects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /projects
 * Create a new project
 */
router.post('/', async (req, res) => {
  try {
    await getDatabase();
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    
    const id = `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    run('INSERT INTO projects (id, name) VALUES (?, ?)', [id, name]);
    
    res.status(201).json({ id, name });
  } catch (error) {
    console.error('[Projects] Error creating project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
