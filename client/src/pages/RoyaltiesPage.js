import React from 'react';
import CrudPage from '../components/CrudPage';
import { royaltiesAPI } from '../services/api';

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

export default function RoyaltiesPage() {
  return <CrudPage title="Royalty Calculations" icon="💰" api={royaltiesAPI} columns={columns} formFields={formFields} defaultValues={{ status: 'calculated' }} />;
}
