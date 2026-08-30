import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Truck, Plus, Check, CreditCard, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';
import { clearCart } from '../store/cartSlice';
import { CATEGORY_STYLE } from './Market';

const TAX_RATE = 0.08;

const Checkout = () => {
  const items = useSelector((state) => state.cart.items);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [selectedAddress, setSelectedAddress] = useState('home');
  const [form, setForm] = useState({
    firstName: '', lastName: '', address: '', city: '', state: '', zip: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '' });
  const [placed, setPlaced] = useState(false);

  const handleFormChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const handleCardChange = (e) => setCard((c) => ({ ...c, [e.target.name]: e.target.value }));

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const handlePlaceOrder = (e) => {
    e.preventDefault();
    dispatch(clearCart());
    setPlaced(true);
  };

  if (placed) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-green-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Order placed!</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          This is a mock checkout — no real order or payment was processed.
        </p>
        <Link to="/market" className="mt-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange">
          Back to Market
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center gap-3">
        <p className="text-gray-500 dark:text-gray-400">Your cart is empty.</p>
        <Link to="/market" className="text-[#fa3f5e] font-semibold text-sm">Browse the Market</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24 max-w-[1100px] mx-auto px-4 pt-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Checkout</h1>
      <p className="text-xs text-gray-400 dark:text-gray-500 -mt-4 mb-6">Mock checkout — no real order or payment is processed.</p>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-5">
          {/* Shipping address */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Truck size={18} className="text-[#fa3f5e]" />
              <h2 className="font-bold text-gray-900 dark:text-white">Shipping Address</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <button
                type="button"
                onClick={() => setSelectedAddress('home')}
                className={`relative text-left p-3.5 rounded-xl border-2 ${
                  selectedAddress === 'home' ? 'border-[#fa3f5e]' : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {selectedAddress === 'home' && (
                  <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#fa3f5e] flex items-center justify-center">
                    <Check size={12} className="text-white" />
                  </span>
                )}
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Home</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  123 Commerce St, Suite 400<br />San Francisco, CA 94105
                </p>
              </button>

              <button
                type="button"
                className="flex items-center justify-center gap-2 p-3.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
              >
                <Plus size={16} /> Add New Address
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">First Name</label>
                <input name="firstName" value={form.firstName} onChange={handleFormChange} required
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-insta-pink/20 focus:border-insta-pink dark:text-white" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Last Name</label>
                <input name="lastName" value={form.lastName} onChange={handleFormChange} required
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-insta-pink/20 focus:border-insta-pink dark:text-white" />
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Address</label>
              <input name="address" value={form.address} onChange={handleFormChange} required
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-insta-pink/20 focus:border-insta-pink dark:text-white" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">City</label>
                <input name="city" value={form.city} onChange={handleFormChange} required
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-insta-pink/20 focus:border-insta-pink dark:text-white" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">State</label>
                <input name="state" value={form.state} onChange={handleFormChange} required
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-insta-pink/20 focus:border-insta-pink dark:text-white" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">ZIP</label>
                <input name="zip" value={form.zip} onChange={handleFormChange} required
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-insta-pink/20 focus:border-insta-pink dark:text-white" />
              </div>
            </div>
          </div>

          {/* Payment method */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard size={18} className="text-[#fa3f5e]" />
              <h2 className="font-bold text-gray-900 dark:text-white">Payment Method</h2>
            </div>

            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`w-full text-left p-4 rounded-xl border-2 mb-3 ${
                paymentMethod === 'card' ? 'border-[#fa3f5e]' : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'card' ? 'border-[#fa3f5e]' : 'border-gray-300 dark:border-gray-600'}`}>
                    {paymentMethod === 'card' && <span className="w-2 h-2 rounded-full bg-[#fa3f5e]" />}
                  </span>
                  Credit Card
                </span>
                <span className="flex gap-1">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500">VISA</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500">MC</span>
                </span>
              </div>

              {paymentMethod === 'card' && (
                <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    name="number" value={card.number} onChange={handleCardChange} placeholder="Card number" required
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-insta-pink/20 focus:border-insta-pink dark:text-white"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      name="expiry" value={card.expiry} onChange={handleCardChange} placeholder="MM/YY" required
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-insta-pink/20 focus:border-insta-pink dark:text-white"
                    />
                    <input
                      name="cvv" value={card.cvv} onChange={handleCardChange} placeholder="CVV" required
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-insta-pink/20 focus:border-insta-pink dark:text-white"
                    />
                  </div>
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('paypal')}
              className={`w-full flex items-center gap-2 p-4 rounded-xl border-2 ${
                paymentMethod === 'paypal' ? 'border-[#fa3f5e]' : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'paypal' ? 'border-[#fa3f5e]' : 'border-gray-300 dark:border-gray-600'}`}>
                {paymentMethod === 'paypal' && <span className="w-2 h-2 rounded-full bg-[#fa3f5e]" />}
              </span>
              <span className="font-bold italic text-[#003087] dark:text-blue-400">PayPal</span>
            </button>
          </div>
        </div>

        {/* Order summary */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 lg:sticky lg:top-6">
          <h2 className="font-bold text-gray-900 dark:text-white mb-4">Order Summary</h2>

          <div className="space-y-3 border-b border-gray-100 dark:border-gray-800 pb-4 mb-4">
            {items.map((item) => {
              const style = CATEGORY_STYLE[item.category];
              const Icon = style?.icon;
              return (
                <div key={item.id} className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${style?.bg || 'bg-gray-100 dark:bg-gray-800'}`}>
                    {Icon && <Icon size={18} className={`${style.text} opacity-70`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Qty: {item.qty}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white flex-shrink-0">${(item.price * item.qty).toFixed(2)}</p>
                </div>
              );
            })}
          </div>

          <div className="space-y-2.5 text-sm border-b border-gray-100 dark:border-gray-800 pb-4 mb-4">
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Shipping</span>
              <span className="text-green-600 dark:text-green-400 font-medium">Free</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Tax</span>
              <span>${tax.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <span className="font-bold text-gray-900 dark:text-white">Total</span>
            <span className="font-bold text-[#fa3f5e] text-lg">${total.toFixed(2)}</span>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange"
          >
            Place Order <ArrowRight size={16} />
          </button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mt-3">
            <Lock size={11} /> Payments are secure and encrypted
          </p>
        </div>
      </form>
    </div>
  );
};

export default Checkout;
