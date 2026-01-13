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
    instructions: '',
    hasVariantB: false
  });
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.targetUrl) {
      setError('Name and Target URL are required');
      return;
    }
    
    setLoading(true);
    try {
      await createTest({
        projectId: 'demo-project',
        name: form.name,
        description: form.description,
        targetUrl: form.targetUrl,
        instructions: form.instructions,
        variants: form.hasVariantB ? ['A', 'B'] : ['A']
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
        
        <div className="field">
          <label>Task Instructions</label>
          <textarea
            value={form.instructions}
            onChange={e => setForm({...form, instructions: e.target.value})}
            placeholder="What should testers do?"
            rows={3}
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
          max-width: 500px;
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
        .field { margin-bottom: 1rem; }
        .field label { display: block; font-size: 0.875rem; margin-bottom: 0.375rem; color: var(--text-primary); }
        .field input[type="text"],
        .field input[type="url"],
        .field textarea {
          width: 100%;
          padding: 0.625rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 0.9rem;
        }
        .field input:focus, .field textarea:focus {
          outline: none;
          border-color: var(--accent-blue);
        }
        .field.checkbox label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }
        .field.checkbox input { width: auto; }
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
