import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createTest } from '../api/client';

function CreateTest() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    targetUrl: '',
    hasVariantB: false
  });
  const [tasks, setTasks] = useState([{ title: '', description: '' }]);
  
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
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          border-radius: 12px;
          padding: 1.5rem;
          max-width: 600px;
        }
        .error {
          background: rgba(244,63,94,0.1);
          border: 1px solid rgba(244,63,94,0.3);
          color: var(--accent-rose);
          padding: 0.75rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }
        .section {
          margin-bottom: 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid var(--border-primary);
        }
        .section:last-of-type { border-bottom: none; }
        .section h3 {
          font-size: 1rem;
          margin: 0 0 1rem;
          color: var(--text-primary);
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .section-header h3 { margin: 0; }
        .btn-add {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          color: var(--accent-blue);
          padding: 0.375rem 0.75rem;
          border-radius: 6px;
          font-size: 0.8rem;
          cursor: pointer;
        }
        .btn-add:hover { background: var(--bg-hover); }
        
        .field { margin-bottom: 1rem; }
        .field label { display: block; font-size: 0.875rem; margin-bottom: 0.375rem; color: var(--text-primary); }
        .field input[type="text"],
        .field input[type="url"] {
          width: 100%;
          padding: 0.625rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 0.9rem;
        }
        .field input:focus { outline: none; border-color: var(--accent-blue); }
        .field.checkbox label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }
        .field.checkbox input { width: auto; }
        
        .task-item {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
          margin-bottom: 0.75rem;
          padding: 0.75rem;
          background: var(--bg-secondary);
          border-radius: 8px;
        }
        .task-number {
          width: 28px;
          height: 28px;
          background: var(--accent-blue);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 600;
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
          padding: 0.5rem;
          background: var(--bg-primary);
          border: 1px solid var(--border-primary);
          border-radius: 4px;
          color: var(--text-primary);
          font-size: 0.875rem;
        }
        .task-fields input:focus { outline: none; border-color: var(--accent-blue); }
        .btn-remove {
          background: rgba(244,63,94,0.1);
          border: none;
          color: var(--accent-rose);
          width: 28px;
          height: 28px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1.2rem;
          line-height: 1;
        }
        .btn-remove:hover { background: rgba(244,63,94,0.2); }
        
        .actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-primary);
        }
        .btn-cancel, .btn-submit {
          padding: 0.625rem 1.25rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
        }
        .btn-cancel {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          color: var(--text-secondary);
        }
        .btn-submit {
          background: var(--accent-blue);
          border: none;
          color: white;
        }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

export default CreateTest;
