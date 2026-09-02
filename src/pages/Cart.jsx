import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Trash2, Minus, Plus, Lock, ArrowRight, ShoppingCart } from 'lucide-react';
import { removeItem, incrementQty, decrementQty } from '../store/cartSlice';
import { CATEGORY_STYLE } from './Market';

const SHIPPING_ESTIMATE = 12.5;
const TAX_RATE = 0.08;

const Cart = () => {
  const items = useSelector((state) => state.cart.items);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shipping = items.length ? SHIPPING_ESTIMATE : 0;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + shipping + tax;
  const itemCount = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24 max-w-[1100px] mx-auto px-4 pt-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Cart</h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-full bg-pink-50 dark:bg-gray-900 flex items-center justify-center mb-5">
            <ShoppingCart size={30} className="text-[#fa3f5e]" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1.5">Your cart is empty</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs">
            Looks like you haven't added anything yet — go find something you'll love.
          </p>
          <Link
            to="/market"
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange"
          >
            Browse the Market <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
          {/* Items */}
          <div className="space-y-4">
            {items.map((item) => {
              const style = CATEGORY_STYLE[item.category];
              const Icon = style?.icon;
              return (
                <div key={item.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 flex gap-4">
                  <div className={`w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0 ${style?.bg || 'bg-gray-100 dark:bg-gray-800'}`}>
                    {Icon && <Icon size={28} className={`${style.text} opacity-70`} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">{item.name}</p>
                        {item.subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{item.subtitle}</p>}
                        {item.brand && (
                          <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-[11px] text-gray-500 dark:text-gray-400">
                            Brand: {item.brand}
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-gray-900 dark:text-white flex-shrink-0">${(item.price * item.qty).toFixed(2)}</p>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <button onClick={() => dispatch(decrementQty(item.id))} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <Minus size={12} />
                        </button>
                        <span className="w-7 text-center text-sm font-semibold text-gray-900 dark:text-white">{item.qty}</span>
                        <button onClick={() => dispatch(incrementQty(item.id))} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <Plus size={12} />
                        </button>
                      </div>
                      <button
                        onClick={() => dispatch(removeItem(item.id))}
                        className="flex items-center gap-1 text-xs font-medium text-[#fa3f5e] hover:underline"
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order summary */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 lg:sticky lg:top-6">
            <h2 className="font-bold text-gray-900 dark:text-white mb-4">Order Summary</h2>
            <div className="space-y-2.5 text-sm border-b border-gray-100 dark:border-gray-800 pb-4 mb-4">
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>Subtotal ({itemCount} items)</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>Shipping estimate</span>
                <span>${shipping.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>Tax estimate</span>
                <span>${tax.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-gray-900 dark:text-white">Total</span>
              <span className="font-bold text-[#fa3f5e] text-lg">${total.toFixed(2)}</span>
            </div>
            <button
              onClick={() => navigate('/checkout')}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange"
            >
              Proceed to Checkout <ArrowRight size={16} />
            </button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mt-3">
              <Lock size={11} /> Secure Checkout
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
