import React from 'react';
import CrudPage from '../components/CrudPage';
import { artistsAPI } from '../services/api';

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'role', label: 'Role' },
  { key: 'pro', label: 'PRO' },
  { key: 'publisher', label: 'Publisher' },
  { key: 'defaultSplit', label: 'Split %', type: 'percent' },
  { key: 'totalEarnings', label: 'Total Earnings', type: 'currency' },
  { key: 'catalogCount', label: 'Songs', type: 'number' },
  { key: 'status', label: 'Status', type: 'status' },
];

const formFields = [
  { key: 'name', label: 'Name', required: true },
  { key: 'role', label: 'Role', type: 'select', options: ['Artist', 'Songwriter', 'Producer', 'Artist/Songwriter', 'Artist/Producer', 'Songwriter/Producer', 'Songwriter/Vocalist', 'Songwriter/Arranger'], required: true },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone' },
  { key: 'ipi', label: 'IPI Number' },
  { key: 'pro', label: 'PRO', type: 'select', options: ['ASCAP', 'BMI', 'SESAC', 'PRS', 'GEMA', 'SOCAN'] },
  { key: 'publisher', label: 'Publisher' },
  { key: 'defaultSplit', label: 'Default Split (%)', type: 'percent' },
  { key: 'totalEarnings', label: 'Total Earnings ($)', type: 'currency' },
  { key: 'catalogCount', label: 'Catalog Count', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'] },
];

export default function ArtistsPage() {
  return <CrudPage title="Artists & Writers" icon="🎤" api={artistsAPI} columns={columns} formFields={formFields} defaultValues={{ status: 'active' }} />;
}
