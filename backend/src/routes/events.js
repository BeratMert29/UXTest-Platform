import { Router } from 'express';
import { processBatch, getSessionEvents } from '../services/eventService.js';

const router = Router();

/**
 * POST /events
 * Batch event ingestion endpoint
 */
router.post('/', async (req, res) => {
  try {
    const { events } = req.body;
    
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ 
        error: 'Invalid request body. Expected { events: [...] }' 
      });
    }
    
    if (events.length === 0) {
      return res.json({ processed: 0, errors: [] });
    }
    
    // Validate event structure
    for (const event of events) {
      if (!event.sessionId || !event.testId || !event.type || !event.timestamp) {
        return res.status(400).json({
          error: 'Invalid event structure. Required: sessionId, testId, type, timestamp'
        });
      }
    }
    
    const result = await processBatch(events);
    
    res.json(result);
  } catch (error) {
    console.error('[Events] Error processing batch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /events/session/:sessionId
 * Get all events for a session (for debugging)
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const events = await getSessionEvents(req.params.sessionId);
    res.json(events);
  } catch (error) {
    console.error('[Events] Error fetching session events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
