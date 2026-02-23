import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import CashierDashboard from "./pages/CashierDashboard";
import KitchenDashboard from "./pages/KitchenDashboard";
import OwnerDashboard from "./pages/OwnerDashboard";
import QRMenu from "./pages/QRMenu";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* QR MENU - EN KRİTİK ROUTE */}
        <Route path="/menu/:tableId" element={<QRMenu />} />

        {/* Diğer sayfalar */}
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/cashier" element={<CashierDashboard />} />
        <Route path="/kitchen" element={<KitchenDashboard />} />
        <Route path="/owner" element={<OwnerDashboard />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
