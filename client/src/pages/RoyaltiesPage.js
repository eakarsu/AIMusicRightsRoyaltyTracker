import React, { useRef, useState } from 'react';
import CrudPage from '../components/CrudPage';
import { royaltiesAPI } from '../services/api';
import { toast } from 'react-toastify';

const columns = [
  { key: 'songTitle', label: 'Song' },
  { key: 'platform', label: 'Platform' },
  { key: 'streams', label: 'Streams', type: 'number' },
  { key: 'period', label: 'Period' },
  { key: 'totalRoyalty', label: 'Total Royalty', type: 'currency' },
  { key: 'artistShare', label: 'Artist Share', type: 'currency' },
  { key: 'status', label: 'Status', type: 'status' },
];

const formFields = [
  { key: 'songTitle', label: 'Song Title', required: true },
  { key: 'platform', label: 'Platform', type: 'select', options: ['Spotify', 'Apple Music', 'YouTube Music', 'Tidal', 'Amazon Music', 'Deezer', 'Pandora', 'SoundCloud', 'SiriusXM'], required: true },
  { key: 'streams', label: 'Streams', type: 'number' },
  { key: 'downloads', label: 'Downloads', type: 'number' },
  { key: 'period', label: 'Period' },
  { key: 'ratePerStream', label: 'Rate Per Stream ($)', type: 'currency' },
  { key: 'totalRoyalty', label: 'Total Royalty ($)', type: 'currency' },
  { key: 'artistShare', label: 'Artist Share ($)', type: 'currency' },
  { key: 'labelShare', label: 'Label Share ($)', type: 'currency' },
  { key: 'publisherShare', label: 'Publisher Share ($)', type: 'currency' },
  { key: 'status', label: 'Status', type: 'select', options: ['calculated', 'pending', 'paid'] },
  { key: 'paymentDate', label: 'Payment Date', type: 'date' },
];

function CSVImportButton({ onImported }) {
  const fileRef = useRef();
  const [importing, setImporting] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await royaltiesAPI.importCSV(formData);
      toast.success(`Imported ${data.imported} records`);
      if (data.errors && data.errors.length > 0) {
        toast.warning(`${data.errors.length} rows had errors`);
      }
      if (onImported) onImported();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <>
      <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} />
      <button
        className="btn btn-secondary"
        onClick={() => fileRef.current.click()}
        disabled={importing}
        style={{ whiteSpace: 'nowrap' }}
      >
        {importing ? '⏳ Importing...' : '📥 Import CSV'}
      </button>
    </>
  );
}

export default function RoyaltiesPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <CrudPage
      key={refreshKey}
      title="Royalty Calculations"
      icon="💰"
      api={royaltiesAPI}
      columns={columns}
      formFields={formFields}
      defaultValues={{ status: 'calculated' }}
      extraActions={<CSVImportButton onImported={() => setRefreshKey(k => k + 1)} />}
    />
  );
}
