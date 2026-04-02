import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createTest } from '../api/client';

const DRAFT_KEY = 'uxtest_draft_create';

function loadDraft() {
  try {
    const stored = localStorage.getItem(DRAFT_KEY);
    if (stored) return JSON.parse(stored);
  } catch(e) {}
  return null;
}

function saveDraft(form, tasks) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, tasks }));
  } catch(e) {}
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch(e) {}
}

function CreateTest() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const draft = loadDraft();
  const [form, setForm] = useState(draft?.form || {
    name: '',
    description: '',
    targetUrl: '',
    hasVariantB: false
  });
  const [tasks, setTasks] = useState(draft?.tasks || [{ title: '', description: '' }]);

  // Auto-save draft on form/tasks change
  useEffect(() => {
    saveDraft(form, tasks);
  }, [form, tasks]);

  const addTask = () => {
    setTasks([...tasks, { title: '', description: '' }]);
  };

  const removeTask = (index) => {
    if (tasks.length > 1) {
      setTasks(tasks.filter((_, i) => i !== index));
    }
  };

  const updateTask = (index, field, value) => {
    const newTasks = [...tasks];
    newTasks[index][field] = value;
    setTasks(newTasks);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.targetUrl) {
      setError('Name and Target URL are required');
      return;
    }
    if (!tasks[0].title) {
      setError('At least one task is required');
      return;
    }

    setLoading(true);
    try {
      await createTest({
        projectId: 'demo-project',
        name: form.name,
        description: form.description,
        targetUrl: form.targetUrl,
        variants: form.hasVariantB ? ['A', 'B'] : ['A'],
        tasks: tasks.filter(t => t.title.trim())
      });
      clearDraft();
      navigate('/');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div>
      <Link to="/" className="back-link">← Back</Link>
      <div className="page-header">
        <h1 className="page-title">Create Test</h1>
      </div>

      <form onSubmit={handleSubmit} className="form-card">
        {error && <div className="error">{error}</div>}

        <div className="section">
          <h3>Test Details</h3>

          <div className="field">
            <label>Test Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              placeholder="e.g., Checkout Flow"
            />
          </div>

          <div className="field">
            <label>Description</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
              placeholder="Brief description"
            />
          </div>

          <div className="field">
            <label>Target URL *</label>
            <input
              type="url"
              value={form.targetUrl}
              onChange={e => setForm({...form, targetUrl: e.target.value})}
              placeholder="https://example.com"
            />
          </div>

          <div className="field checkbox">
            <label>
              <input
                type="checkbox"
                checked={form.hasVariantB}
                onChange={e => setForm({...form, hasVariantB: e.target.checked})}
              />
              Enable A/B Testing
            </label>
          </div>
        </div>

        <div className="section">
          <div className="section-header">
            <h3>Tasks</h3>
            <button type="button" onClick={addTask} className="btn-add">+ Add Task</button>
          </div>

          {tasks.map((task, index) => (
            <div key={index} className="task-item">
              <div className="task-number">{index + 1}</div>
              <div className="task-fields">
                <input
                  type="text"
                  value={task.title}
                  onChange={e => updateTask(index, 'title', e.target.value)}
                  placeholder="Task title *"
                />
                <input
                  type="text"
                  value={task.description}
                  onChange={e => updateTask(index, 'description', e.target.value)}
                  placeholder="Task description (optional)"
                />
              </div>
              {tasks.length > 1 && (
                <button type="button" onClick={() => removeTask(index)} className="btn-remove">×</button>
              )}
            </div>
          ))}
        </div>

        <div className="actions">
          <button type="button" onClick={() => navigate('/')} className="btn-cancel">Cancel</button>
          <button type="submit" disabled={loading} className="btn-submit">
            {loading ? 'Creating...' : 'Create Test'}
          </button>
        </div>
      </form>

      <style>{`
        .form-card {
          background: var(--bg-raised);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 2rem;
          max-width: 600px;
        }
        .error {
          background: var(--danger-dim);
          border: 1px solid rgba(239,68,68,0.2);
          color: var(--danger);
          padding: 0.75rem;
          border-radius: var(--radius-md);
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }
        .section {
          margin-bottom: 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid var(--border);
        }
        .section:last-of-type { border-bottom: none; }
        .section h3 {
          font-family: var(--font-display);
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-2);
          margin: 0 0 1.25rem;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .section-header h3 { margin: 0; }
        .btn-add {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-2);
          padding: 0.375rem 0.75rem;
          border-radius: var(--radius-md);
          font-size: 0.8rem;
          cursor: pointer;
          font-family: var(--font-body);
          transition: border-color 0.15s;
        }
        .btn-add:hover {
          border-color: var(--border-focus);
          color: var(--text);
        }

        .field { margin-bottom: 1rem; }
        .field label {
          display: block;
          font-size: 0.875rem;
          margin-bottom: 0.375rem;
          color: var(--text-2);
        }
        .field input[type="text"],
        .field input[type="url"] {
          width: 100%;
          padding: 0.625rem 0.75rem;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          color: var(--text);
          font-size: 0.875rem;
          font-family: var(--font-body);
          transition: border-color 0.15s;
        }
        .field input:focus {
          outline: none;
          border-color: var(--border-focus);
        }
        .field.checkbox label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          color: var(--text-2);
        }
        .field.checkbox input { width: auto; }

        .task-item {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
          margin-bottom: 0.75rem;
          padding: 0.75rem;
          background: var(--bg-active);
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
        }
        .task-number {
          width: 26px;
          height: 26px;
          background: var(--bg-active);
          border: 1px solid var(--border);
          color: var(--text-2);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          flex-shrink: 0;
        }
        .task-fields {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .task-fields input {
          width: 100%;
          padding: 0.5rem 0.625rem;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text);
          font-size: 0.875rem;
          font-family: var(--font-body);
          transition: border-color 0.15s;
        }
        .task-fields input:focus {
          outline: none;
          border-color: var(--border-focus);
        }
        .btn-remove {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-3);
          width: 26px;
          height: 26px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 1.1rem;
          line-height: 1;
          transition: all 0.15s;
        }
        .btn-remove:hover {
          border-color: var(--danger);
          color: var(--danger);
        }

        .actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
        }
        .btn-cancel, .btn-submit {
          padding: 0.625rem 1.25rem;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          font-family: var(--font-body);
        }
        .btn-cancel {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-2);
          transition: border-color 0.15s;
        }
        .btn-cancel:hover {
          border-color: var(--border-focus);
          color: var(--text);
        }
        .btn-submit {
          background: var(--accent);
          border: none;
          color: white;
          transition: opacity 0.15s;
        }
        .btn-submit:hover { opacity: 0.88; }
        .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

export default CreateTest;
