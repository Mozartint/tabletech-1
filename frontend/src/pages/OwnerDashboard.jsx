import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { LogOut, Plus, Trash2, QrCode, UtensilsCrossed, Table as TableIcon, ShoppingBag, Download, TrendingUp, DollarSign, Clock, Award } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('menu');
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [itemDialog, setItemDialog] = useState(false);
  const [tableDialog, setTableDialog] = useState(false);
  
  const [categoryForm, setCategoryForm] = useState({ name: '', order: 0 });
  const [itemForm, setItemForm] = useState({
    category_id: '',
    name: '',
    description: '',
    price: '',
    image_url: '',
    available: true
  });
  const [tableForm, setTableForm] = useState({ table_number: '' });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (activeTab === 'menu') {
        const [categoriesRes, itemsRes] = await Promise.all([
          axios.get(`${API}/owner/menu/categories`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/owner/menu/items`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setCategories(categoriesRes.data);
        setMenuItems(itemsRes.data);
      } else if (activeTab === 'tables') {
        const res = await axios.get(`${API}/owner/tables`, { headers: { Authorization: `Bearer ${token}` } });
        setTables(res.data);
      } else if (activeTab === 'orders') {
        const res = await axios.get(`${API}/owner/orders`, { headers: { Authorization: `Bearer ${token}` } });
        setOrders(res.data);
      }
    } catch (error) {
      toast.error('Veri yüklenemedi');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/owner/menu/categories`, categoryForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Kategori eklendi');
      setCategoryDialog(false);
      setCategoryForm({ name: '', order: 0 });
      fetchData();
    } catch (error) {
      toast.error('Kategori eklenemedi');
      console.error(error);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/owner/menu/categories/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Kategori silindi');
      fetchData();
    } catch (error) {
      toast.error('Kategori silinemedi');
      console.error(error);
    }
  };

  const handleCreateMenuItem = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/owner/menu/items`, {
        ...itemForm,
        price: parseFloat(itemForm.price)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Ürün eklendi');
      setItemDialog(false);
      setItemForm({
        category_id: '',
        name: '',
        description: '',
        price: '',
        image_url: '',
        available: true
      });
      fetchData();
    } catch (error) {
      toast.error('Ürün eklenemedi');
      console.error(error);
    }
  };

  const handleDeleteMenuItem = async (id) => {
    if (!window.confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/owner/menu/items/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Ürün silindi');
      fetchData();
    } catch (error) {
      toast.error('Ürün silinemedi');
      console.error(error);
    }
  };

  const handleCreateTable = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/owner/tables`, tableForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Masa eklendi ve QR kod oluşturuldu');
      setTableDialog(false);
      setTableForm({ table_number: '' });
      fetchData();
    } catch (error) {
      toast.error('Masa eklenemedi');
      console.error(error);
    }
  };

  const handleDeleteTable = async (id) => {
    if (!window.confirm('Bu masayı silmek istediğinizden emin misiniz?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/owner/tables/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Masa silindi');
      fetchData();
    } catch (error) {
      toast.error('Masa silinemedi');
      console.error(error);
    }
  };

  const downloadQRCode = (qrCode, tableName) => {
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `masa-${tableName}-qr.png`;
    link.click();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getItemsByCategory = (categoryId) => {
    return menuItems.filter(item => item.category_id === categoryId);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'Bekliyor', color: 'bg-yellow-100 text-yellow-800' },
      preparing: { label: 'Hazırlanıyor', color: 'bg-blue-100 text-blue-800' },
      ready: { label: 'Hazır', color: 'bg-green-100 text-green-800' },
      completed: { label: 'Tamamlandı', color: 'bg-gray-100 text-gray-800' }
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
          <h1 className="text-2xl font-bold text-gray-900" data-testid="owner-dashboard-title">Restoran Yönetimi</h1>
          <Button onClick={handleLogout} variant="outline" size="sm" className="gap-2" data-testid="logout-button">
            <LogOut className="w-4 h-4" />
            Çıkış
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="menu" className="gap-2" data-testid="menu-tab">
              <UtensilsCrossed className="w-4 h-4" />
              Menü
            </TabsTrigger>
            <TabsTrigger value="tables" className="gap-2" data-testid="tables-tab">
              <TableIcon className="w-4 h-4" />
              Masalar
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2" data-testid="orders-tab">
              <ShoppingBag className="w-4 h-4" />
              Siparişler
            </TabsTrigger>
          </TabsList>

          <TabsContent value="menu">
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Kategoriler</h2>
                <Dialog open={categoryDialog} onOpenChange={setCategoryDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-orange-500 hover:bg-orange-600 rounded-full gap-2" data-testid="add-category-button">
                      <Plus className="w-4 h-4" />
                      Kategori Ekle
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Yeni Kategori</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateCategory} className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="cat-name">Kategori Adı</Label>
                        <Input
                          id="cat-name"
                          value={categoryForm.name}
                          onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                          required
                          data-testid="category-name-input"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cat-order">Sıralama</Label>
                        <Input
                          id="cat-order"
                          type="number"
                          value={categoryForm.order}
                          onChange={(e) => setCategoryForm({ ...categoryForm, order: parseInt(e.target.value) })}
                        />
                      </div>
                      <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" data-testid="submit-category-button">
                        Ekle
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {categories.map((cat) => (
                  <Card key={cat.id} className="shadow-sm" data-testid="category-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-base">{cat.name}</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="text-red-500 hover:text-red-600"
                        data-testid="delete-category-button"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-500">{getItemsByCategory(cat.id).length} ürün</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-between items-center mt-8">
                <h2 className="text-xl font-semibold">Menü Ürünleri</h2>
                <Dialog open={itemDialog} onOpenChange={setItemDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-orange-500 hover:bg-orange-600 rounded-full gap-2" data-testid="add-item-button">
                      <Plus className="w-4 h-4" />
                      Ürün Ekle
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Yeni Ürün</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateMenuItem} className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="item-category">Kategori</Label>
                        <Select
                          value={itemForm.category_id}
                          onValueChange={(value) => setItemForm({ ...itemForm, category_id: value })}
                        >
                          <SelectTrigger data-testid="item-category-select">
                            <SelectValue placeholder="Kategori seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="item-name">Ürün Adı</Label>
                        <Input
                          id="item-name"
                          value={itemForm.name}
                          onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                          required
                          data-testid="item-name-input"
                        />
                      </div>
                      <div>
                        <Label htmlFor="item-desc">Açıklama</Label>
                        <Textarea
                          id="item-desc"
                          value={itemForm.description}
                          onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="item-price">Fiyat (₺)</Label>
                        <Input
                          id="item-price"
                          type="number"
                          step="0.01"
                          value={itemForm.price}
                          onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                          required
                          data-testid="item-price-input"
                        />
                      </div>
                      <div>
                        <Label htmlFor="item-image">Görsel URL (opsiyonel)</Label>
                        <Input
                          id="item-image"
                          value={itemForm.image_url}
                          onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={itemForm.available}
                          onCheckedChange={(checked) => setItemForm({ ...itemForm, available: checked })}
                        />
                        <Label>Stokta var</Label>
                      </div>
                      <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" data-testid="submit-item-button">
                        Ekle
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {menuItems.map((item) => (
                  <Card key={item.id} className="shadow-sm hover:shadow-md transition-shadow overflow-hidden" data-testid="menu-item-card">
                    {item.image_url && (
                      <img src={item.image_url} alt={item.name} className="w-full h-40 object-cover" />
                    )}
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base">{item.name}</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMenuItem(item.id)}
                          className="text-red-500 hover:text-red-600"
                          data-testid="delete-item-button"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-gray-600">{item.description}</p>
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-lg font-semibold text-orange-600">{item.price} ₺</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {item.available ? 'Stokta' : 'Tükendi'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tables">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Masalar ve QR Kodlar</h2>
                <Dialog open={tableDialog} onOpenChange={setTableDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-orange-500 hover:bg-orange-600 rounded-full gap-2" data-testid="add-table-button">
                      <Plus className="w-4 h-4" />
                      Masa Ekle
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Yeni Masa</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateTable} className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="table-number">Masa Numarası</Label>
                        <Input
                          id="table-number"
                          value={tableForm.table_number}
                          onChange={(e) => setTableForm({ table_number: e.target.value })}
                          required
                          placeholder="Örn: 1, A1, VIP-1"
                          data-testid="table-number-input"
                        />
                      </div>
                      <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" data-testid="submit-table-button">
                        Oluştur (QR otomatik oluşturulacak)
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tables.map((table) => (
                  <Card key={table.id} className="shadow-sm" data-testid="table-card">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">Masa {table.table_number}</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTable(table.id)}
                          className="text-red-500 hover:text-red-600"
                          data-testid="delete-table-button"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
                        <img src={table.qr_code} alt={`QR Masa ${table.table_number}`} className="w-48 h-48" />
                      </div>
                      <Button
                        onClick={() => downloadQRCode(table.qr_code, table.table_number)}
                        variant="outline"
                        className="w-full gap-2"
                        data-testid="download-qr-button"
                      >
                        <Download className="w-4 h-4" />
                        QR Kodu İndir
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {tables.length === 0 && (
                <div className="text-center py-12">
                  <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Henüz masa eklenmemiş</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Tüm Siparişler</h2>
              
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id} className="shadow-sm" data-testid="order-card">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">Masa {order.table_number}</CardTitle>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(order.created_at).toLocaleString('tr-TR')}
                          </p>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(order.status)}
                          <p className="text-sm text-gray-500 mt-1">
                            {order.payment_method === 'cash' ? 'Kasada Ödeme' : 'Online Ödeme'}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{item.quantity}x {item.name}</span>
                            <span>{(item.price * item.quantity).toFixed(2)} ₺</span>
                          </div>
                        ))}
                        <div className="pt-2 border-t flex justify-between font-semibold">
                          <span>Toplam</span>
                          <span className="text-orange-600">{order.total_amount.toFixed(2)} ₺</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {orders.length === 0 && (
                <div className="text-center py-12">
                  <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Henüz sipariş yok</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default OwnerDashboard;