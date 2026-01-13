import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let db = null;
let SQL = null;

const DB_PATH = join(__dirname, '../../data/uxtest.db');

export async function getDatabase() {
  if (db) return db;
  
  // Initialize SQL.js
  if (!SQL) {
    SQL = await initSqlJs();
  }
  
  // Ensure data directory exists
  mkdirSync(dirname(DB_PATH), { recursive: true });
  
  // Load existing database or create new one
  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  
  return db;
}

export async function initDatabase() {
  const db = await getDatabase();
  
  // Run schema
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  db.run(schema);
  
  saveDatabase();
  console.log('[DB] Database initialized');
  return db;
}

export async function seedDatabase() {
  const db = await getDatabase();
  
  // Check if demo project exists
  const result = db.exec("SELECT id FROM projects WHERE id = 'demo-project'");
  
  if (result.length === 0) {
    // Insert demo project
    db.run("INSERT INTO projects (id, name) VALUES ('demo-project', 'Demo Project')");
    
    // Insert demo tests
    const tests = [
      {
        id: 'test-checkout',
        name: 'Checkout Flow',
        description: 'Test if users can complete the checkout process',
        target_url: 'https://example.com',
        instructions: 'Try to find and click the checkout button, then complete the purchase form.',
        variants: '["A", "B"]',
        is_active: 1
      },
      {
        id: 'test-signup',
        name: 'Sign Up Form',
        description: 'Measure time to complete registration',
        target_url: 'https://github.com/signup',
        instructions: 'Navigate to the sign up page and fill out the registration form.',
        variants: '["A"]',
        is_active: 0
      },
      {
        id: 'test-search',
        name: 'Product Search',
        description: 'Can users find products using search?',
        target_url: 'https://www.google.com',
        instructions: 'Use the search bar to find information about "UX testing tools".',
        variants: '["A", "B"]',
        is_active: 1
      }
    ];
    
    const stmt = db.prepare(`
      INSERT INTO tests (id, project_id, name, description, target_url, instructions, variants, is_active) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const test of tests) {
      stmt.run([test.id, 'demo-project', test.name, test.description, test.target_url, test.instructions, test.variants, test.is_active]);
    }
    stmt.free();
    
    // Insert demo tasks
    const tasks = [
      { id: 'task-1', test_id: 'test-checkout', title: 'Find the product', description: 'Navigate to a product you want to buy', order_index: 0 },
      { id: 'task-2', test_id: 'test-checkout', title: 'Add to cart', description: 'Add the product to your shopping cart', order_index: 1 },
      { id: 'task-3', test_id: 'test-checkout', title: 'Complete checkout', description: 'Fill in the checkout form and submit', order_index: 2 },
      { id: 'task-4', test_id: 'test-signup', title: 'Find sign up', description: 'Navigate to the registration page', order_index: 0 },
      { id: 'task-5', test_id: 'test-signup', title: 'Fill the form', description: 'Complete all required fields', order_index: 1 },
      { id: 'task-6', test_id: 'test-search', title: 'Use search', description: 'Type a search query in the search bar', order_index: 0 },
      { id: 'task-7', test_id: 'test-search', title: 'Find result', description: 'Click on a relevant search result', order_index: 1 },
    ];
    
    const taskStmt = db.prepare('INSERT INTO tasks (id, test_id, title, description, order_index) VALUES (?, ?, ?, ?, ?)');
    for (const task of tasks) {
      taskStmt.run([task.id, task.test_id, task.title, task.description, task.order_index]);
    }
    taskStmt.free();
    
    saveDatabase();
    console.log('[DB] Demo data seeded');
  }
}

export function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(DB_PATH, buffer);
  }
}

export function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

// Helper to run queries and get results as objects
export function query(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Helper to run a query and get first result
export function queryOne(sql, params = []) {
  const results = query(sql, params);
  return results.length > 0 ? results[0] : null;
}

// Helper to run insert/update/delete
export function run(sql, params = []) {
  db.run(sql, params);
  saveDatabase();
}
