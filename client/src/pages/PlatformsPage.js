import React from 'react';
import CrudPage from '../components/CrudPage';
import { platformsAPI } from '../services/api';

const columns = [
  { key: 'platformName', label: 'Platform' },
  { key: 'songTitle', label: 'Song' },
  { key: 'totalStreams', label: 'Total Streams', type: 'number' },
  { key: 'totalRevenue', label: 'Revenue', type: 'currency' },
  { key: 'monthlyListeners', label: 'Monthly Listeners', type: 'number' },
  { key: 'region', label: 'Region' },
  { key: 'status', label: 'Status', type: 'status' },
];

const formFields = [
  { key: 'platformName', label: 'Platform Name', type: 'select', options: ['Spotify', 'Apple Music', 'YouTube Music', 'Tidal', 'Amazon Music', 'Deezer', 'Pandora', 'SoundCloud', 'SiriusXM'], required: true },
  { key: 'songTitle', label: 'Song Title', required: true },
  { key: 'externalId', label: 'External ID' },
  { key: 'totalStreams', label: 'Total Streams', type: 'number' },
  { key: 'totalRevenue', label: 'Total Revenue ($)', type: 'currency' },
  { key: 'monthlyListeners', label: 'Monthly Listeners', type: 'number' },
  { key: 'region', label: 'Region' },
  { key: 'apiEndpoint', label: 'API Endpoint' },
  { key: 'status', label: 'Status', type: 'select', options: ['connected', 'syncing', 'error', 'disconnected'] },
];

export default function PlatformsPage() {
  return <CrudPage title="Platform Integrations" icon="🔗" api={platformsAPI} columns={columns} formFields={formFields} defaultValues={{ status: 'connected' }} />;
}
