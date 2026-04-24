import React from 'react';
import CrudPage from '../components/CrudPage';
import { paymentsAPI } from '../services/api';

const columns = [
  { key: 'payee', label: 'Payee' },
  { key: 'amount', label: 'Amount', type: 'currency' },
  { key: 'songTitle', label: 'Song' },
  { key: 'platform', label: 'Platform' },
  { key: 'period', label: 'Period' },
  { key: 'paymentMethod', label: 'Method' },
  { key: 'status', label: 'Status', type: 'status' },
];

const formFields = [
  { key: 'payee', label: 'Payee', required: true },
  { key: 'amount', label: 'Amount ($)', type: 'currency', required: true },
  { key: 'currency', label: 'Currency', type: 'select', options: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'] },
  { key: 'paymentMethod', label: 'Payment Method', type: 'select', options: ['Wire Transfer', 'ACH', 'Check', 'PayPal', 'Crypto'] },
  { key: 'reference', label: 'Reference' },
  { key: 'songTitle', label: 'Song Title' },
  { key: 'period', label: 'Period' },
  { key: 'platform', label: 'Platform' },
  { key: 'status', label: 'Status', type: 'select', options: ['pending', 'processing', 'completed', 'failed'] },
  { key: 'paymentDate', label: 'Payment Date', type: 'date' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function PaymentsPage() {
  return <CrudPage title="Payments" icon="💳" api={paymentsAPI} columns={columns} formFields={formFields} defaultValues={{ status: 'pending', currency: 'USD' }} />;
}
