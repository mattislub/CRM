import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './components/HomePage';
import DonorsPage from './components/DonorsPage';
import PdfListPage from './components/PdfListPage';
import DonationsPage from './components/DonationsPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/pdfs" element={<PdfListPage />} />
          <Route path="/donors" element={<DonorsPage />} />
          <Route path="/donations" element={<DonationsPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
