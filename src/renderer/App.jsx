import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './views/Home';
import ProductList from './views/ProductList';
import Admin from './views/Admin';
import PaymentAdmin from './views/PaymentAdmin';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/products" element={<Layout><ProductList /></Layout>} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/payment-admin" element={<PaymentAdmin />} />
      </Routes>
    </Router>
  );
};

export default App;
