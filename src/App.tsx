import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import UploadsPage from './components/UploadsPage';
import DonorsPage from './components/DonorsPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<UploadsPage />} />
          <Route path="/uploads" element={<UploadsPage />} />
          <Route path="/donors" element={<DonorsPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;