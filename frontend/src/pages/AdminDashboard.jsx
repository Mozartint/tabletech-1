import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { LogOut, Plus, Trash2, Store } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    owner_email: '',
    owner_password: '',
    owner_full_name: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/admin/restaurants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRestaurants(response.data);
    } catch (error) {
      toast.error('Restoranlar yüklenemedi');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRestaurant = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/admin/restaurants`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Restoran başarıyla oluşturuldu');
      setDialogOpen(false);
      setFormData({
        name: '',
        address: '',
        phone: '',
        owner_email: '',
        owner_password: '',
        owner_full_name: ''
      });
      fetchRestaurants();
    } catch (error) {
      toast.error('Restoran oluşturulamadı');
      console.error(error);
    }
  };

  const handleDeleteRestaurant = async (id) => {
    if (!window.confirm('Bu restoranı silmek istediğinizden emin misiniz?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/admin/restaurants/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Restoran silindi');
      fetchRestaurants();
    } catch (error) {
      toast.error('Restoran silinemedi');
      console.error(error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900" data-testid="admin-dashboard-title">Admin Paneli</h1>
          <Button onClick={handleLogout} variant="outline" size="sm" className="gap-2" data-testid="logout-button">
            <LogOut className="w-4 h-4" />
            Çıkış
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Restoranlar</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600 rounded-full gap-2" data-testid="create-restaurant-button">
                <Plus className="w-4 h-4" />
                Yeni Restoran
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Yeni Restoran Ekle</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateRestaurant} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name">Restoran Adı</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="restaurant-name-input"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Adres</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="owner_full_name">Sahip Adı Soyadı</Label>
                  <Input
                    id="owner_full_name"
                    value={formData.owner_full_name}
                    onChange={(e) => setFormData({ ...formData, owner_full_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="owner_email">Sahip Email</Label>
                  <Input
                    id="owner_email"
                    type="email"
                    value={formData.owner_email}
                    onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="owner_password">Sahip Şifresi</Label>
                  <Input
                    id="owner_password"
                    type="password"
                    value={formData.owner_password}
                    onChange={(e) => setFormData({ ...formData, owner_password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" data-testid="submit-restaurant-button">
                  Oluştur
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.map((restaurant) => (
            <Card key={restaurant.id} className="shadow-sm hover:shadow-md transition-shadow" data-testid="restaurant-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Store className="w-5 h-5 text-orange-600" />
                    </div>
                    <CardTitle className="text-lg">{restaurant.name}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRestaurant(restaurant.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    data-testid="delete-restaurant-button"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-gray-600"><span className="font-medium">Adres:</span> {restaurant.address}</p>
                <p className="text-gray-600"><span className="font-medium">Telefon:</span> {restaurant.phone}</p>
                <div className="pt-2 mt-2 border-t">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    restaurant.subscription_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {restaurant.subscription_status === 'active' ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {restaurants.length === 0 && (
          <div className="text-center py-12">
            <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Henüz restoran eklenmemiş</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;