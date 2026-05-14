import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';

export default function CrudPage({ title, icon, api, columns, formFields, defaultValues = {}, extraActions }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const LIMIT = 20;

  const fetchItems = useCallback(async (p = page) => {
    try {
      const { data } = await api.getAll(p, LIMIT);
      if (data.data) {
        setItems(data.data);
        setPagination({ total: data.total, totalPages: data.totalPages });
      } else {
        setItems(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [api, page]);

  useEffect(() => { fetchItems(1); setPage(1); }, [api]);

  const handleRowClick = async (item) => {
    try {
      const { data } = await api.getById(item.id);
      setSelected(data);
    } catch {
      setSelected(item);
    }
  };

  const handleNew = () => {
    setFormData(defaultValues);
    setIsEditing(false);
    setShowForm(true);
  };

  const handleEdit = () => {
    setFormData({ ...selected });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await api.delete(selected.id);
      toast.success('Deleted successfully');
      setSelected(null);
      fetchItems();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.update(formData.id, formData);
        toast.success('Updated successfully');
      } else {
        await api.create(formData);
        toast.success('Created successfully');
      }
      setShowForm(false);
      setSelected(null);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatValue = (value, col) => {
    if (value === null || value === undefined) return '-';
    if (col.type === 'currency') return `$${parseFloat(value).toLocaleString()}`;
    if (col.type === 'number') return parseInt(value).toLocaleString();
    if (col.type === 'status') return <span className={`status-badge status-${value}`}>{value}</span>;
    if (col.type === 'date') return value ? new Date(value).toLocaleDateString() : '-';
    if (col.type === 'percent') return `${value}%`;
    return String(value);
  };

  if (selected) {
    return (
      <div>
        <button className="back-btn" onClick={() => setSelected(null)}>← Back to list</button>
        <div className="detail-panel">
          <div className="detail-header">
            <h2>{icon} {selected[columns[0]?.key] || 'Detail'}</h2>
            <div className="detail-actions">
              <button className="btn btn-primary btn-sm" onClick={handleEdit}>✏️ Edit</button>
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>🗑️ Delete</button>
            </div>
          </div>
          <div className="detail-grid">
            {formFields.map(field => (
              <div className="detail-item" key={field.key}>
                <label>{field.label}</label>
                <div className="value">
                  {field.type === 'status' ? (
                    <span className={`status-badge status-${selected[field.key]}`}>{selected[field.key] || '-'}</span>
                  ) : field.key.includes('amount') || field.key.includes('fee') || field.key.includes('value') || field.key.includes('Share') || field.key.includes('Royalty') || field.key.includes('Revenue') || field.key.includes('Earnings') ? (
                    `$${parseFloat(selected[field.key] || 0).toLocaleString()}`
                  ) : (
                    String(selected[field.key] ?? '-')
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{icon} {title}</h1>
          <p>Manage and track all {title.toLowerCase()} ({pagination.total} total)</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {extraActions}
          <button className="btn btn-primary" onClick={handleNew}>+ New {title.replace(/s$/, '')}</button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner" style={{ margin: '0 auto', width: 40, height: 40, border: '3px solid #334155', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div></div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="icon">{icon}</div>
          <h3>No {title} Yet</h3>
          <p>Click the button above to add your first item.</p>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map(col => <th key={col.key}>{col.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} onClick={() => handleRowClick(item)}>
                  {columns.map(col => (
                    <td key={col.key}>{formatValue(item[col.key], col)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16, padding: '12px 0' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { const p = page - 1; setPage(p); fetchItems(p); }}
            disabled={page <= 1}
          >← Prev</button>
          <span style={{ color: '#94a3b8', fontSize: 14 }}>Page {page} of {pagination.totalPages}</span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { const p = page + 1; setPage(p); fetchItems(p); }}
            disabled={page >= pagination.totalPages}
          >Next →</button>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{isEditing ? 'Edit' : 'New'} {title.replace(/s$/, '')}</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formFields.map(field => (
                  <div className="form-group" key={field.key}>
                    <label>{field.label}</label>
                    {field.type === 'select' ? (
                      <select value={formData[field.key] || ''} onChange={e => handleChange(field.key, e.target.value)}>
                        <option value="">Select...</option>
                        {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea value={formData[field.key] || ''} onChange={e => handleChange(field.key, e.target.value)} />
                    ) : (
                      <input
                        type={field.type === 'currency' || field.type === 'percent' ? 'number' : (field.type || 'text')}
                        step={field.type === 'currency' ? '0.01' : field.type === 'percent' ? '0.1' : undefined}
                        value={formData[field.key] || ''}
                        onChange={e => handleChange(field.key, e.target.value)}
                        required={field.required}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{isEditing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
