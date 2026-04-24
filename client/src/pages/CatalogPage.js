import React from 'react';
import CrudPage from '../components/CrudPage';
import { catalogAPI } from '../services/api';

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'artist', label: 'Artist' },
  { key: 'genre', label: 'Genre' },
  { key: 'album', label: 'Album' },
  { key: 'releaseDate', label: 'Release Date', type: 'date' },
  { key: 'estimatedValue', label: 'Est. Value', type: 'currency' },
  { key: 'status', label: 'Status', type: 'status' },
];

const formFields = [
  { key: 'title', label: 'Title', required: true },
  { key: 'artist', label: 'Artist', required: true },
  { key: 'album', label: 'Album' },
  { key: 'genre', label: 'Genre', type: 'select', options: ['Pop', 'Rock', 'R&B', 'Hip-Hop', 'Electronic', 'EDM', 'Jazz', 'Country', 'Indie', 'Metal', 'Ambient', 'Classical'] },
  { key: 'releaseDate', label: 'Release Date', type: 'date' },
  { key: 'isrc', label: 'ISRC Code' },
  { key: 'duration', label: 'Duration (seconds)', type: 'number' },
  { key: 'bpm', label: 'BPM', type: 'number' },
  { key: 'key', label: 'Musical Key' },
  { key: 'estimatedValue', label: 'Estimated Value ($)', type: 'currency' },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'archived'] },
];

export default function CatalogPage() {
  return <CrudPage title="Music Catalog" icon="🎵" api={catalogAPI} columns={columns} formFields={formFields} defaultValues={{ status: 'active' }} />;
}
