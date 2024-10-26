import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './views/Home';
import ProductList from './views/ProductList';
import Admin from './views/Admin'; // 관리자 페이지 임포트

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/products" element={<Layout><ProductList /></Layout>} />
        <Route path="/admin" element={<Admin />} /> {/* 관리자 페이지는 Layout 없이 렌더링 */}
      </Routes>
    </Router>
  );
};

export default App;
