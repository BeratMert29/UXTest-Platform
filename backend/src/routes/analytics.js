import { Router } from 'express';
import { computeAnalytics } from '../services/analyticsService.js';

const router = Router();

/**
 * GET /analytics/:testId
 * Get computed analytics for a test
 */
router.get('/:testId', async (req, res) => {
  try {
    const analytics = await computeAnalytics(req.params.testId);
    
    if (!analytics) {
      return res.status(404).json({ error: 'Test not found' });
    }
    
    res.json(analytics);
  } catch (error) {
    console.error('[Analytics] Error computing analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
