import React from 'react';
import CrudPage from '../components/CrudPage';
import { contractsAPI } from '../services/api';

const columns = [
  { key: 'contractName', label: 'Contract' },
  { key: 'partyA', label: 'Party A' },
  { key: 'partyB', label: 'Party B' },
  { key: 'contractType', label: 'Type' },
  { key: 'value', label: 'Value', type: 'currency' },
  { key: 'royaltyRate', label: 'Royalty %', type: 'percent' },
  { key: 'status', label: 'Status', type: 'status' },
];

const formFields = [
  { key: 'contractName', label: 'Contract Name', required: true },
  { key: 'partyA', label: 'Party A', required: true },
  { key: 'partyB', label: 'Party B', required: true },
  { key: 'contractType', label: 'Type', type: 'select', options: ['Recording', 'Publishing', 'Distribution', 'Sync', 'Management', 'Merchandise', 'Performance', 'Brand Partnership', 'Touring', 'Sample Clearance', 'Production', 'Administration', 'Promotion'] },
  { key: 'startDate', label: 'Start Date', type: 'date' },
  { key: 'endDate', label: 'End Date', type: 'date' },
  { key: 'value', label: 'Value ($)', type: 'currency' },
  { key: 'royaltyRate', label: 'Royalty Rate (%)', type: 'percent' },
  { key: 'territory', label: 'Territory' },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'pending', 'expired', 'terminated'] },
  { key: 'terms', label: 'Terms', type: 'textarea' },
];

export default function ContractsPage() {
  return <CrudPage title="Contracts" icon="📋" api={contractsAPI} columns={columns} formFields={formFields} defaultValues={{ status: 'active' }} />;
}
