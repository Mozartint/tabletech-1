import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { LogOut, Wallet, CheckCircle2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CashierDashboard = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/cashier/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const handlePayment = async (orderId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/cashier/orders/${orderId}/payment`,
        { payment_status: 'paid' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Ödeme onaylandı');
      fetchOrders();
    } catch (error) {
      toast.error('Ödeme onaylanamadı');
      console.error(error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'Bekliyor', color: 'bg-yellow-100 text-yellow-800' },
      preparing: { label: 'Hazırlanıyor', color: 'bg-blue-100 text-blue-800' },
      ready: { label: 'Hazır', color: 'bg-green-100 text-green-800' }
    };
    const s = statusMap[status] || statusMap.pending;
    return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>;
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900" data-testid="cashier-dashboard-title">Kasa Paneli</h1>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm" className="gap-2" data-testid="logout-button">
            <LogOut className="w-4 h-4" />
            Çıkış
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Ödeme Bekleyen Siparişler</h2>
          <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-full font-medium">
            {orders.length} Sipariş
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => (
            <Card key={order.id} className="shadow-sm hover:shadow-md transition-shadow" data-testid="cashier-order-card">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl font-bold">Masa {order.table_number}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(order.created_at).toLocaleString('tr-TR')}
                    </p>
                  </div>
                  {getStatusBadge(order.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.name}</span>
                      <span className="font-medium">{(item.price * item.quantity).toFixed(2)} ₺</span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t-2 border-orange-200">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-semibold">Toplam Tutar</span>
                    <span className="text-2xl font-bold text-orange-600">{order.total_amount.toFixed(2)} ₺</span>
                  </div>

                  <Button
                    onClick={() => handlePayment(order.id)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold h-12 gap-2"
                    data-testid="confirm-payment-button"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Ödeme Onaylı
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {orders.length === 0 && (
          <div className="text-center py-20">
            <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-500">Ödeme bekleyen sipariş yok</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default CashierDashboard;