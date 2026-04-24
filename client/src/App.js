import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CatalogPage from './pages/CatalogPage';
import LicensesPage from './pages/LicensesPage';
import RoyaltiesPage from './pages/RoyaltiesPage';
import PlatformsPage from './pages/PlatformsPage';
import ArtistsPage from './pages/ArtistsPage';
import ContractsPage from './pages/ContractsPage';
import PaymentsPage from './pages/PaymentsPage';
import AIPage from './pages/AIPage';
import Layout from './components/Layout';

function App() {
  const [isAuth, setIsAuth] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    const handleStorage = () => setIsAuth(!!localStorage.getItem('token'));
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleLogin = () => setIsAuth(true);
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuth(false);
  };

  if (!isAuth) {
    return (
      <>
        <Router>
          <Routes>
            <Route path="*" element={<Login onLogin={handleLogin} />} />
          </Routes>
        </Router>
        <ToastContainer theme="dark" position="top-right" />
      </>
    );
  }

  return (
    <Router>
      <Layout onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/licenses" element={<LicensesPage />} />
          <Route path="/royalties" element={<RoyaltiesPage />} />
          <Route path="/platforms" element={<PlatformsPage />} />
          <Route path="/artists" element={<ArtistsPage />} />
          <Route path="/contracts" element={<ContractsPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/ai/:feature" element={<AIPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
      <ToastContainer theme="dark" position="top-right" />
    </Router>
  );
}

export default App;
