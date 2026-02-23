import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Store, LogOut, Plus, Trash2, TrendingUp, 
  DollarSign, ShoppingBag, ChefHat, CreditCard, 
  UserCheck, Settings, ChevronDown, ChevronUp
} from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [restaurants, setRestaurants] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [analytics, setAnalytics] = useState({ daily_orders: [], restaurant_stats: [] });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedRestaurant, setExpandedRestaurant] = useState(null);
  
  // Restoran ekleme form state'i
  const [newRestaurant, setNewRestaurant] = useState({
    name: '',
    address: '',
    phone: '',
    owner_email: '',
    owner_password: '',
    owner_full_name: '',
    // Kasa bilgileri
    kasa_enabled: false,
    kasa_email: '',
    kasa_password: '',
    // Mutfak bilgileri
    mutfak_enabled: false,
    mutfak_email: '',
    mutfak_password: ''
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [token, navigate]);

  const fetchData = async () => {
    try {
      const [restRes, userRes, orderRes, statsRes, analyticsRes] = await Promise.all([
        fetch('/api/admin/restaurants', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/orders', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/analytics', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const [restData, userData, orderData, statsData, analyticsData] = await Promise.all([
        restRes.json(),
        userRes.json(),
        orderRes.json(),
        statsRes.json(),
        analyticsRes.json()
      ]);

      setRestaurants(restData);
      setUsers(userData);
      setOrders(orderData);
      setStats(statsData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Veri çekme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleAddRestaurant = async (e) => {
    e.preventDefault();
    
    // Eğer kasa/mutfak seçili değilse boş string gönder (opsiyonel olması için)
    const payload = {
      ...newRestaurant,
      kasa_email: newRestaurant.kasa_enabled ? newRestaurant.kasa_email : null,
      kasa_password: newRestaurant.kasa_enabled ? newRestaurant.kasa_password : null,
      mutfak_email: newRestaurant.mutfak_enabled ? newRestaurant.mutfak_email : null,
      mutfak_password: newRestaurant.mutfak_enabled ? newRestaurant.mutfak_password : null,
    };

    try {
      const response = await fetch('/api/admin/restaurants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setShowAddModal(false);
        setNewRestaurant({
          name: '',
          address: '',
          phone: '',
          owner_email: '',
          owner_password: '',
          owner_full_name: '',
          kasa_enabled: false,
          kasa_email: '',
          kasa_password: '',
          mutfak_enabled: false,
          mutfak_email: '',
          mutfak_password: ''
        });
        fetchData();
        alert('Restoran ve kullanıcılar başarıyla eklendi!');
      } else {
        const error = await response.json();
        alert('Hata: ' + error.detail);
      }
    } catch (error) {
      console.error('Restoran ekleme hatası:', error);
      alert('Restoran eklenirken bir hata oluştu');
    }
  };

  const handleDeleteRestaurant = async (id) => {
    if (!window.confirm('Bu restoranı silmek istediğinize emin misiniz?')) return;

    try {
      const response = await fetch(`/api/admin/restaurants/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Silme hatası:', error);
    }
  };

  const getRestaurantStaff = (restaurantId) => {
    return users.filter(u => u.restaurant_id === restaurantId);
  };

  const toggleExpandRestaurant = (restaurantId) => {
    if (expandedRestaurant === restaurantId) {
      setExpandedRestaurant(null);
    } else {
      setExpandedRestaurant(restaurantId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Store className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold">Süper Admin Paneli</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Navigation Tabs */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'overview' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span>Genel Bakış</span>
          </button>
          <button
            onClick={() => setActiveTab('restaurants')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'restaurants' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            <Store className="w-5 h-5" />
            <span>Restoranlar</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'users' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Kullanıcılar</span>
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Toplam Restoran</p>
                    <p className="text-3xl font-bold mt-1">{stats.total_restaurants || 0}</p>
                  </div>
                  <Store className="w-10 h-10 text-blue-500" />
                </div>
              </div>
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Aktif Restoran</p>
                    <p className="text-3xl font-bold mt-1 text-green-400">{stats.active_restaurants || 0}</p>
                  </div>
                  <UserCheck className="w-10 h-10 text-green-500" />
                </div>
              </div>
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Toplam Sipariş</p>
                    <p className="text-3xl font-bold mt-1">{stats.total_orders || 0}</p>
                  </div>
                  <ShoppingBag className="w-10 h-10 text-purple-500" />
                </div>
              </div>
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Toplam Gelir</p>
                    <p className="text-3xl font-bold mt-1 text-green-400">₺{stats.total_revenue?.toFixed(2) || '0.00'}</p>
                  </div>
                  <DollarSign className="w-10 h-10 text-yellow-500" />
                </div>
              </div>
            </div>

            {/* Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h3 className="text-lg font-semibold mb-4">Son 7 Gün Siparişleri</h3>
                <div className="space-y-3">
                  {analytics.daily_orders?.map((day, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-gray-400">{day.date}</span>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm">{day.orders} sipariş</span>
                        <span className="text-green-400 text-sm">₺{day.revenue}</span>
                        <div className="w-32 bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${Math.min((day.orders / 50) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h3 className="text-lg font-semibold mb-4">En Çok Sipariş Alan Restoranlar</h3>
                <div className="space-y-3">
                  {analytics.restaurant_stats?.slice(0, 5).map((rest, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-gray-300">{rest.name}</span>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-400">{rest.orders} sipariş</span>
                        <span className="text-green-400 text-sm">₺{rest.revenue}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Restaurants Tab */}
        {activeTab === 'restaurants' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Restoran Yönetimi</h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Yeni Restoran Ekle</span>
              </button>
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left">Restoran Adı</th>
                    <th className="px-6 py-4 text-left">Adres</th>
                    <th className="px-6 py-4 text-left">Telefon</th>
                    <th className="px-6 py-4 text-left">Durum</th>
                    <th className="px-6 py-4 text-left">Personel</th>
                    <th className="px-6 py-4 text-left">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {restaurants.map((restaurant) => {
                    const staff = getRestaurantStaff(restaurant.id);
                    const owner = staff.find(u => u.role === 'owner');
                    const kitchen = staff.find(u => u.role === 'kitchen');
                    const cashier = staff.find(u => u.role === 'cashier');
                    
                    return (
                      <React.Fragment key={restaurant.id}>
                        <tr className="hover:bg-gray-750">
                          <td className="px-6 py-4 font-medium">{restaurant.name}</td>
                          <td className="px-6 py-4 text-gray-400">{restaurant.address}</td>
                          <td className="px-6 py-4 text-gray-400">{restaurant.phone}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-sm ${
                              restaurant.subscription_status === 'active' 
                                ? 'bg-green-600/20 text-green-400 border border-green-600' 
                                : 'bg-red-600/20 text-red-400 border border-red-600'
                            }`}>
                              {restaurant.subscription_status === 'active' ? 'Aktif' : 'Pasif'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-400">
                                {staff.length} kullanıcı
                              </span>
                              <button
                                onClick={() => toggleExpandRestaurant(restaurant.id)}
                                className="text-blue-400 hover:text-blue-300"
                              >
                                {expandedRestaurant === restaurant.id ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleDeleteRestaurant(restaurant.id)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                        
                        {/* Expanded Details */}
                        {expandedRestaurant === restaurant.id && (
                          <tr className="bg-gray-750">
                            <td colSpan="6" className="px-6 py-4">
                              <div className="bg-gray-900 rounded-lg p-4 space-y-3">
                                <h4 className="font-semibold text-gray-300 mb-2">Kullanıcı Hesapları</h4>
                                
                                {/* Owner */}
                                {owner && (
                                  <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                      <UserCheck className="w-5 h-5 text-blue-500" />
                                      <div>
                                        <p className="font-medium">{owner.full_name}</p>
                                        <p className="text-sm text-gray-400">{owner.email}</p>
                                      </div>
                                    </div>
                                    <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-sm border border-blue-600">
                                      Owner
                                    </span>
                                  </div>
                                )}
                                
                                {/* Kitchen */}
                                {kitchen && (
                                  <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                      <ChefHat className="w-5 h-5 text-orange-500" />
                                      <div>
                                        <p className="font-medium">{kitchen.full_name}</p>
                                        <p className="text-sm text-gray-400">{kitchen.email}</p>
                                      </div>
                                    </div>
                                    <span className="px-3 py-1 bg-orange-600/20 text-orange-400 rounded-full text-sm border border-orange-600">
                                      Mutfak
                                    </span>
                                  </div>
                                )}
                                
                                {/* Cashier */}
                                {cashier && (
                                  <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                      <CreditCard className="w-5 h-5 text-green-500" />
                                      <div>
                                        <p className="font-medium">{cashier.full_name}</p>
                                        <p className="text-sm text-gray-400">{cashier.email}</p>
                                      </div>
                                    </div>
                                    <span className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-sm border border-green-600">
                                      Kasa
                                    </span>
                                  </div>
                                )}
                                
                                {!kitchen && !cashier && (
                                  <p className="text-gray-500 text-sm italic">
                                    Bu restorana henüz mutfak veya kasa kullanıcısı eklenmemiş.
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Tüm Kullanıcılar</h2>
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left">Ad Soyad</th>
                    <th className="px-6 py-4 text-left">E-posta</th>
                    <th className="px-6 py-4 text-left">Rol</th>
                    <th className="px-6 py-4 text-left">Restoran</th>
                    <th className="px-6 py-4 text-left">Kayıt Tarihi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {users.map((user) => {
                    const restaurant = restaurants.find(r => r.id === user.restaurant_id);
                    return (
                      <tr key={user.id} className="hover:bg-gray-750">
                        <td className="px-6 py-4 font-medium">{user.full_name}</td>
                        <td className="px-6 py-4 text-gray-400">{user.email}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-sm ${
                            user.role === 'admin' ? 'bg-purple-600/20 text-purple-400 border border-purple-600' :
                            user.role === 'owner' ? 'bg-blue-600/20 text-blue-400 border border-blue-600' :
                            user.role === 'kitchen' ? 'bg-orange-600/20 text-orange-400 border border-orange-600' :
                            'bg-green-600/20 text-green-400 border border-green-600'
                          }`}>
                            {user.role === 'admin' ? 'Admin' :
                             user.role === 'owner' ? 'Owner' :
                             user.role === 'kitchen' ? 'Mutfak' : 'Kasa'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {restaurant ? restaurant.name : '-'}
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {new Date(user.created_at).toLocaleDateString('tr-TR')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Restaurant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Yeni Restoran Ekle</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRestaurant} className="space-y-6">
              {/* Restoran Bilgileri */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-blue-400 flex items-center">
                  <Store className="w-5 h-5 mr-2" />
                  Restoran Bilgileri
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Restoran Adı</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                      value={newRestaurant.name}
                      onChange={(e) => setNewRestaurant({...newRestaurant, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Telefon</label>
                    <input
                      type="tel"
                      required
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                      value={newRestaurant.phone}
                      onChange={(e) => setNewRestaurant({...newRestaurant, phone: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Adres</label>
                  <textarea
                    required
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    rows="2"
                    value={newRestaurant.address}
                    onChange={(e) => setNewRestaurant({...newRestaurant, address: e.target.value})}
                  />
                </div>
              </div>

              {/* Owner Bilgileri */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-blue-400 flex items-center">
                  <UserCheck className="w-5 h-5 mr-2" />
                  Owner (Yönetici) Hesabı
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Ad Soyad</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                      value={newRestaurant.owner_full_name}
                      onChange={(e) => setNewRestaurant({...newRestaurant, owner_full_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">E-posta</label>
                    <input
                      type="email"
                      required
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                      value={newRestaurant.owner_email}
                      onChange={(e) => setNewRestaurant({...newRestaurant, owner_email: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Şifre</label>
                  <input
                    type="password"
                    required
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    value={newRestaurant.owner_password}
                    onChange={(e) => setNewRestaurant({...newRestaurant, owner_password: e.target.value})}
                  />
                </div>
              </div>

              {/* Kasa Bilgileri */}
              <div className="space-y-4 border-t border-gray-700 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-green-400 flex items-center">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Kasa Hesabı (Opsiyonel)
                  </h3>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={newRestaurant.kasa_enabled}
                      onChange={(e) => setNewRestaurant({...newRestaurant, kasa_enabled: e.target.checked})}
                    />
                    <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    <span className="ms-3 text-sm font-medium text-gray-300">
                      {newRestaurant.kasa_enabled ? 'Aktif' : 'Pasif'}
                    </span>
                  </label>
                </div>
                
                {newRestaurant.kasa_enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Kasa E-posta</label>
                      <input
                        type="email"
                        required={newRestaurant.kasa_enabled}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
                        value={newRestaurant.kasa_email}
                        onChange={(e) => setNewRestaurant({...newRestaurant, kasa_email: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Kasa Şifre</label>
                      <input
                        type="password"
                        required={newRestaurant.kasa_enabled}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
                        value={newRestaurant.kasa_password}
                        onChange={(e) => setNewRestaurant({...newRestaurant, kasa_password: e.target.value})}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Mutfak Bilgileri */}
              <div className="space-y-4 border-t border-gray-700 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-orange-400 flex items-center">
                    <ChefHat className="w-5 h-5 mr-2" />
                    Mutfak Hesabı (Opsiyonel)
                  </h3>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={newRestaurant.mutfak_enabled}
                      onChange={(e) => setNewRestaurant({...newRestaurant, mutfak_enabled: e.target.checked})}
                    />
                    <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                    <span className="ms-3 text-sm font-medium text-gray-300">
                      {newRestaurant.mutfak_enabled ? 'Aktif' : 'Pasif'}
                    </span>
                  </label>
                </div>
                
                {newRestaurant.mutfak_enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Mutfak E-posta</label>
                      <input
                        type="email"
                        required={newRestaurant.mutfak_enabled}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                        value={newRestaurant.mutfak_email}
                        onChange={(e) => setNewRestaurant({...newRestaurant, mutfak_email: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Mutfak Şifre</label>
                      <input
                        type="password"
                        required={newRestaurant.mutfak_enabled}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                        value={newRestaurant.mutfak_password}
                        onChange={(e) => setNewRestaurant({...newRestaurant, mutfak_password: e.target.value})}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg transition-colors font-semibold"
                >
                  Restoran ve Kullanıcıları Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
