import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Home from './views/Home';
import ProductList from './views/ProductList';
import Admin from './views/Admin'; // 관리자 페이지 임포트

const AppRouter = () => {
  return (
    <Router>
      <Switch>
        <Route exact path="/" component={Home} />
        <Route path="/products" component={ProductList} />
        <Route path="/admin" component={Admin} /> {/* 관리자 페이지 설정 */}
        {/* 다른 라우트 추가 */}
      </Switch>
    </Router>
  );
};

export default AppRouter;
