import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { ShoppingCart, Plus, Minus, UtensilsCrossed, X, Clock, Star, Bell } from 'lucide-react';
import { Badge } from '../components/ui/badge';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const QRMenu = () => {
  const { tableId } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [table, setTable] = useState(null);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutDialog, setCheckoutDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [submitting, setSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    fetchMenu();
  }, [tableId]);

  const fetchMenu = async () => {
    try {
      const response = await axios.get(`${API}/public/menu/${tableId}`);
      setRestaurant(response.data.restaurant);
      setTable(response.data.table);
      setCategories(response.data.categories);
      setItems(response.data.items);
    } catch (error) {
      toast.error('Menü yüklenemedi');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item) => {
    const existingItem = cart.find(i => i.menu_item_id === item.id);
    if (existingItem) {
      setCart(cart.map(i => 
        i.menu_item_id === item.id 
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ));
    } else {
      setCart([...cart, {
        menu_item_id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        preparation_time_minutes: item.preparation_time_minutes || 10
      }]);
    }
    toast.success(`${item.name} sepete eklendi`);
  };

  const updateQuantity = (itemId, delta) => {
    setCart(cart.map(item => {
      if (item.menu_item_id === itemId) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.menu_item_id !== itemId));
  };

  const getTotalAmount = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Sepetiniz boş');
      return;
    }
    setCheckoutDialog(true);
  };

  const handleSubmitOrder = async () => {
    setSubmitting(true);
    try {
      const response = await axios.post(`${API}/orders`, {
        table_id: tableId,
        items: cart,
        payment_method: paymentMethod
      });
      toast.success('Siparişiniz alındı! Mutfağa iletildi.');
      setPlacedOrder(response.data);
      setOrderPlaced(true);
      setCart([]);
      setCheckoutDialog(false);
    } catch (error) {
      toast.error('Sipariş gönderilemedi');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCallWaiter = async () => {
    try {
      await axios.post(`${API}/waiter-call`, {
        table_id: tableId
      });
      toast.success('Garson çağrıldı! Hemen gelecek.');
    } catch (error) {
      toast.error('Garson çağrılamadı');
      console.error(error);
    }
  };

  const handleSubmitReview = async () => {
    try {
      await axios.post(`${API}/reviews`, {
        restaurant_id: restaurant.id,
        order_id: placedOrder?.id,
        rating: rating,
        comment: reviewComment
      });
      toast.success('Değerlendirmeniz için teşekkürler!');
      setReviewDialog(false);
      setRating(5);
      setReviewComment('');
    } catch (error) {
      toast.error('Değerlendirme gönderilemedi');
      console.error(error);
    }
  };

  const getItemsByCategory = (categoryId) => {
    return items.filter(item => item.category_id === categoryId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50">
        <div className="text-center">
          <UtensilsCrossed className="w-12 h-12 text-orange-500 mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-gray-600">Menü yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!restaurant || !table) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50">
        <div className="text-center">
          <p className="text-lg text-red-600">Masa bulunamadı</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white pb-24">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900" data-testid="restaurant-name">{restaurant.name}</h1>
              <p className="text-sm text-gray-600">Masa {table.table_number}</p>
            </div>
            <Button
              onClick={handleCheckout}
              className="relative bg-orange-500 hover:bg-orange-600 rounded-full h-12 w-12 p-0"
              data-testid="cart-button"
            >
              <ShoppingCart className="w-5 h-5" />
              {cart.length > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-red-500 text-white h-6 w-6 flex items-center justify-center rounded-full p-0">
                  {cart.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {categories.map(category => {
          const categoryItems = getItemsByCategory(category.id);
          if (categoryItems.length === 0) return null;
          
          return (
            <div key={category.id} className="mb-8" data-testid="menu-category">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">{category.name}</h2>
              <div className="grid grid-cols-1 gap-4">
                {categoryItems.map(item => (
                  <Card 
                    key={item.id} 
                    className="shadow-md hover:shadow-lg transition-all duration-200 border-none overflow-hidden"
                    data-testid="menu-item-card"
                  >
                    <div className="flex">
                      {item.image_url && (
                        <img 
                          src={item.image_url} 
                          alt={item.name} 
                          className="w-28 h-28 object-cover"
                        />
                      )}
                      <div className="flex-1 p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-900">{item.name}</h3>
                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                            <div className="flex items-center gap-1 mt-2 text-xs text-orange-600">
                              <Clock className="w-3 h-3" />
                              <span>~{item.preparation_time_minutes || 10} dakika</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-3">
                          <span className="text-xl font-bold text-orange-600">{item.price.toFixed(2)} ₺</span>
                          <Button
                            onClick={() => addToCart(item)}
                            size="sm"
                            className="bg-orange-500 hover:bg-orange-600 rounded-full h-9 px-4 gap-1"
                            data-testid="add-to-cart-button"
                          >
                            <Plus className="w-4 h-4" />
                            Ekle
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}

        {categories.length === 0 && (
          <div className="text-center py-20">
            <UtensilsCrossed className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-500">Menüde henüz ürün yok</p>
          </div>
        )}
      </main>

      <Dialog open={checkoutDialog} onOpenChange={setCheckoutDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" data-testid="checkout-dialog">
          <DialogHeader>
            <DialogTitle className="text-2xl">Sepetiniz</DialogTitle>
          </DialogHeader>

          {cart.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Sepetiniz boş</p>
            </div>
          ) : (
            <div className="space-y-6 mt-4">
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.menu_item_id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg" data-testid="cart-item">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">{item.price.toFixed(2)} ₺</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.menu_item_id, -1)}
                          className="h-8 w-8 p-0 rounded-full"
                          data-testid="decrease-quantity-button"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="font-semibold w-8 text-center">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.menu_item_id, 1)}
                          className="h-8 w-8 p-0 rounded-full"
                          data-testid="increase-quantity-button"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFromCart(item.menu_item_id)}
                        className="text-red-500 hover:text-red-600 h-8 w-8 p-0"
                        data-testid="remove-item-button"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold">Toplam</span>
                  <span className="text-2xl font-bold text-orange-600" data-testid="total-amount">{getTotalAmount().toFixed(2)} ₺</span>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-semibold">Ödeme Yöntemi</Label>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                    <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-lg">
                      <RadioGroupItem value="cash" id="cash" data-testid="payment-cash" />
                      <Label htmlFor="cash" className="flex-1 cursor-pointer">Kasada Ödeme</Label>
                    </div>
                    <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-lg">
                      <RadioGroupItem value="online" id="online" data-testid="payment-online" />
                      <Label htmlFor="online" className="flex-1 cursor-pointer">Online Ödeme</Label>
                    </div>
                  </RadioGroup>
                </div>

                <Button
                  onClick={handleSubmitOrder}
                  disabled={submitting}
                  className="w-full mt-6 bg-orange-500 hover:bg-orange-600 h-12 text-base font-semibold rounded-full"
                  data-testid="submit-order-button"
                >
                  {submitting ? 'Gönderiliyor...' : 'Siparişi Onayla'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sipariş Başarılı Ekranı */}
      {orderPlaced && placedOrder && (
        <Dialog open={orderPlaced} onOpenChange={setOrderPlaced}>
          <DialogContent className="max-w-md">
            <div className="text-center space-y-6 py-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Siparişiniz Alındı!</h3>
                <p className="text-gray-600">Mutfağımız siparişinizi hazırlıyor.</p>
              </div>
              
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                <div className="flex items-center justify-center gap-2 text-orange-600 mb-2">
                  <Clock className="w-5 h-5" />
                  <span className="text-lg font-semibold">Tahmini Süre</span>
                </div>
                <p className="text-3xl font-bold text-orange-600">~{placedOrder.estimated_completion_minutes} dakika</p>
                <p className="text-sm text-gray-600 mt-2">Siparişiniz hazırlanıyor</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-600">Siparişiniz hazır olduğunda size bildirilecektir.</p>
                <p className="text-xs text-gray-500">Sipariş No: {placedOrder.id.slice(0, 8).toUpperCase()}</p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setReviewDialog(true)}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <Star className="w-4 h-4" />
                  Değerlendir
                </Button>
                <Button
                  onClick={handleCallWaiter}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <Bell className="w-4 h-4" />
                  Garson Çağır
                </Button>
              </div>

              <Button
                onClick={() => setOrderPlaced(false)}
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                Tamam
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Değerlendirme Dialog */}
      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Deneyiminizi Değerlendirin</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div>
              <Label className="text-base mb-3 block">Puanınız</Label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-10 h-10 ${
                        star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="review-comment">Yorumunuz (Opsiyonel)</Label>
              <Textarea
                id="review-comment"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Deneyiminizi bizimle paylaşın..."
                rows={4}
                className="mt-2"
              />
            </div>

            <Button
              onClick={handleSubmitReview}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              Gönder
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Garson Çağır Butonu (Sabit - Alt) */}
      {!orderPlaced && (
        <div className="fixed bottom-4 right-4 z-10">
          <Button
            onClick={handleCallWaiter}
            className="h-14 w-14 rounded-full bg-blue-500 hover:bg-blue-600 shadow-lg"
            data-testid="call-waiter-button"
          >
            <Bell className="w-6 h-6" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default QRMenu;
