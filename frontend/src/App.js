import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import KitchenDashboard from './pages/KitchenDashboard';
import CashierDashboard from './pages/CashierDashboard';
import QRMenu from './pages/QRMenu';
import { Toaster } from './components/ui/sonner';

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/owner" element={<OwnerDashboard />} />
          <Route path="/kitchen" element={<KitchenDashboard />} />
          <Route path="/cashier" element={<CashierDashboard />} />
          <Route path="/menu/:tableId" element={<QRMenu />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </>
  );
}

export default App;