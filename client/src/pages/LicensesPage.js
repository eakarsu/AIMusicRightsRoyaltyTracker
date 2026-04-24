import React from 'react';
import CrudPage from '../components/CrudPage';
import { licensesAPI } from '../services/api';

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

export default function LicensesPage() {
  return <CrudPage title="Rights & Licenses" icon="📄" api={licensesAPI} columns={columns} formFields={formFields} defaultValues={{ status: 'active' }} />;
}
