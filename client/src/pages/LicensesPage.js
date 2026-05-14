import React, { useState } from 'react';
import CrudPage from '../components/CrudPage';
import { licensesAPI } from '../services/api';
import { toast } from 'react-toastify';

const columns = [
  { key: 'songTitle', label: 'Song' },
  { key: 'licenseType', label: 'License Type' },
  { key: 'licensee', label: 'Licensee' },
  { key: 'territory', label: 'Territory' },
  { key: 'fee', label: 'Fee', type: 'currency' },
  { key: 'royaltyRate', label: 'Royalty Rate', type: 'percent' },
  { key: 'status', label: 'Status', type: 'status' },
];

const formFields = [
  { key: 'songTitle', label: 'Song Title', required: true },
  { key: 'licenseType', label: 'License Type', type: 'select', options: ['Mechanical', 'Sync', 'Performance', 'Master Use', 'Print', 'Grand Rights'], required: true },
  { key: 'licensee', label: 'Licensee', required: true },
  { key: 'licensor', label: 'Licensor', required: true },
  { key: 'territory', label: 'Territory' },
  { key: 'startDate', label: 'Start Date', type: 'date' },
  { key: 'endDate', label: 'End Date', type: 'date' },
  { key: 'fee', label: 'License Fee ($)', type: 'currency' },
  { key: 'royaltyRate', label: 'Royalty Rate (%)', type: 'percent' },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'pending', 'expired', 'terminated'] },
  { key: 'terms', label: 'Terms', type: 'textarea' },
];

function ConflictChecker() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ territory: '', start_date: '', end_date: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const check = async () => {
    if (!form.territory) { toast.error('Territory is required'); return; }
    setLoading(true);
    try {
      const { data } = await licensesAPI.checkConflicts(form);
      setResult(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Conflict check failed');
    } finally {
      setLoading(false);
    }
  };

  const structured = result?.structured;
  const conflictsFound = structured?.conflicts_found || (result?.overlapping_licenses?.length > 0);

  return (
    <>
      <button className="btn btn-secondary" onClick={() => setShowModal(true)}>
        🔍 Check Conflicts
      </button>
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>🔍 Rights Conflict Checker</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Territory *</label>
                <input type="text" value={form.territory} onChange={e => setForm(f => ({ ...f, territory: e.target.value }))} placeholder="e.g. Worldwide, North America, Europe" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>
              <button className="btn btn-primary" onClick={check} disabled={loading} style={{ marginTop: 8 }}>
                {loading ? '🔄 Checking...' : '🔍 Check for Conflicts'}
              </button>

              {result && (
                <div style={{ marginTop: 20 }}>
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    background: conflictsFound ? 'rgba(231, 76, 60, 0.1)' : 'rgba(39, 174, 96, 0.1)',
                    border: `1px solid ${conflictsFound ? 'rgba(231, 76, 60, 0.3)' : 'rgba(39, 174, 96, 0.3)'}`,
                    marginBottom: 12
                  }}>
                    <strong style={{ color: conflictsFound ? '#e74c3c' : '#27ae60' }}>
                      {conflictsFound ? '⚠ Conflicts Detected' : '✅ No Conflicts Found'}
                    </strong>
                    {result.overlapping_licenses?.length > 0 && (
                      <div style={{ marginTop: 8, color: '#94a3b8', fontSize: 13 }}>
                        {result.overlapping_licenses.length} overlapping license(s) found
                      </div>
                    )}
                  </div>

                  {structured?.conflicts && structured.conflicts.length > 0 && (
                    <div>
                      <h4 style={{ color: '#e2e8f0', marginBottom: 8, fontSize: 14 }}>Conflicts:</h4>
                      {structured.conflicts.map((c, i) => (
                        <div key={i} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 6, marginBottom: 8, fontSize: 13 }}>
                          <div><strong>Type:</strong> {c.conflict_type}</div>
                          <div><strong>Territory:</strong> {c.territory}</div>
                          {c.overlap_period && <div><strong>Overlap:</strong> {c.overlap_period}</div>}
                        </div>
                      ))}
                    </div>
                  )}

                  {structured?.resolution_options?.length > 0 && (
                    <div>
                      <h4 style={{ color: '#e2e8f0', marginBottom: 8, fontSize: 14 }}>Resolution Options:</h4>
                      <ul style={{ paddingLeft: 20, color: '#94a3b8', fontSize: 13 }}>
                        {structured.resolution_options.map((opt, i) => <li key={i}>{opt}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function LicensesPage() {
  return (
    <CrudPage
      title="Rights & Licenses"
      icon="📄"
      api={licensesAPI}
      columns={columns}
      formFields={formFields}
      defaultValues={{ status: 'active' }}
      extraActions={<ConflictChecker />}
    />
  );
}
