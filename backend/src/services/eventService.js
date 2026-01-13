import { getDatabase, run, saveDatabase } from '../db/database.js';

/**
 * Process a batch of events from the SDK
 */
export async function processBatch(events) {
  const db = await getDatabase();
  const results = { processed: 0, errors: [] };
  
  for (const event of events) {
    try {
      // Extract session metadata from task_started events
      if (event.type === 'task_started') {
        const payload = event.payload || {};
        const timestamp = Math.floor(event.timestamp / 1000);
        
        // Check if session exists
        const existing = db.exec(`SELECT id FROM sessions WHERE id = '${event.sessionId}'`);
        
        if (existing.length === 0 || existing[0].values.length === 0) {
          db.run(`
            INSERT INTO sessions (id, test_id, variant, started_at, user_agent, screen_width, screen_height, language)
            VALUES (?, ?, ?, datetime(?, 'unixepoch'), ?, ?, ?, ?)
          `, [
            event.sessionId,
            event.testId,
            event.variant || 'A',
            timestamp,
            payload.userAgent || null,
            payload.screenWidth || null,
            payload.screenHeight || null,
            payload.language || null
          ]);
        }
      }
      
      // Insert the event
      db.run(`
        INSERT INTO events (session_id, type, payload, timestamp)
        VALUES (?, ?, ?, ?)
      `, [
        event.sessionId,
        event.type,
        event.payload ? JSON.stringify(event.payload) : null,
        event.timestamp
      ]);
      
      // Update session on completion or abandonment
      if (event.type === 'task_completed' || event.type === 'task_abandoned') {
        const outcome = event.type === 'task_completed' ? 'completed' : 'abandoned';
        const timestamp = Math.floor(event.timestamp / 1000);
        
        db.run(`
          UPDATE sessions 
          SET ended_at = datetime(?, 'unixepoch'),
              outcome = ?,
              duration_ms = ?
          WHERE id = ?
        `, [timestamp, outcome, event.duration || null, event.sessionId]);
      }
      
      results.processed++;
    } catch (error) {
      results.errors.push({
        sessionId: event.sessionId,
        type: event.type,
        error: error.message
      });
    }
  }
  
  saveDatabase();
  return results;
}

/**
 * Get events for a specific session
 */
export async function getSessionEvents(sessionId) {
  const db = await getDatabase();
  
  const stmt = db.prepare(`
    SELECT id, type, payload, timestamp, received_at
    FROM events
    WHERE session_id = ?
    ORDER BY timestamp ASC
  `);
  stmt.bind([sessionId]);
  
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  
  return results;
}
