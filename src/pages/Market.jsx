import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Shirt, Cpu, Home as HomeIcon, Sparkles, Heart, Star, Eye, Store, ShoppingCart } from 'lucide-react';
import { addItem } from '../store/cartSlice';

const CATEGORIES = ['All', 'Fashion', 'Tech', 'Home', 'Beauty'];

export const CATEGORY_STYLE = {
  Fashion: { icon: Shirt,    text: 'text-pink-500',   bg: 'bg-pink-50 dark:bg-gray-800' },
  Tech:    { icon: Cpu,      text: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-gray-800' },
  Home:    { icon: HomeIcon, text: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-gray-800' },
  Beauty:  { icon: Sparkles, text: 'text-purple-500', bg: 'bg-purple-50 dark:bg-gray-800' },
};

const ProductCard = ({ product, isFavorite, onToggleFavorite }) => {
  const dispatch = useDispatch();
  const { icon: Icon, text, bg } = CATEGORY_STYLE[product.category];

  const handleAddToCart = () => {
    dispatch(addItem({
      id: product.id,
      name: product.name,
      subtitle: product.dimensions,
      brand: product.vendor,
      price: product.price,
      category: product.category,
    }));
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <Link to={`/market/product/${product.id}`} className="block">
        <div className={`relative aspect-[4/3] flex items-center justify-center ${bg}`}>
          <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-white/90 dark:bg-black/60 text-[10px] font-bold tracking-wide text-gray-700 dark:text-gray-200 uppercase">
            Market
          </span>
          <button
            onClick={(e) => { e.preventDefault(); onToggleFavorite(product.id); }}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white dark:bg-gray-800 shadow flex items-center justify-center"
          >
            <Heart size={14} className={isFavorite ? 'fill-[#fa3f5e] text-[#fa3f5e]' : 'text-gray-400'} />
          </button>
          <Icon size={48} className={`${text} opacity-70`} />
        </div>
      </Link>

      <div className="p-4">
        <p className={`text-[11px] font-bold uppercase tracking-wide mb-1 ${text}`}>{product.category}</p>
        <Link to={`/market/product/${product.id}`}>
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1.5 truncate hover:text-[#fa3f5e] transition-colors" title={product.name}>
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mb-2.5">
          <Star size={12} className="fill-amber-400 text-amber-400" />
          <span>{product.rating}</span>
          <span className="mx-1">·</span>
          <Eye size={12} />
          <span>{product.views}</span>
        </div>
        <p className="font-bold text-[#fa3f5e] mb-3">
          ${product.price.toFixed(2)} <span className="text-gray-400 dark:text-gray-500 text-xs font-normal">USD</span>
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleAddToCart}
            className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange"
          >
            Add to Cart
          </button>
          <Link
            to={`/market/product/${product.id}`}
            className="flex-1 py-1.5 rounded-lg text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-center"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
};

const Market = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [favorites, setFavorites] = useState({});
  const allProducts = useSelector((state) => state.products.items);
  const cartCount = useSelector((state) => state.cart.items.reduce((sum, i) => sum + i.qty, 0));

  const toggleFavorite = (id) => setFavorites((f) => ({ ...f, [id]: !f[id] }));

  const products = activeCategory === 'All'
    ? allProducts
    : allProducts.filter((p) => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24 max-w-[1100px] mx-auto px-4 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Marketplace</h1>
        <div className="flex items-center gap-2">
          <Link
            to="/market/my-store"
            className="flex items-center gap-1.5 px-3 h-10 rounded-full border border-gray-200 dark:border-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700"
          >
            <Store size={16} /> My Store
          </Link>
          <Link
            to="/cart"
            className="relative w-10 h-10 rounded-full border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700"
          >
            <ShoppingCart size={18} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#fa3f5e] text-white text-[10px] font-bold flex items-center justify-center leading-none">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              activeCategory === c
                ? 'bg-[#fa3f5e] text-white border-[#fa3f5e]'
                : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Featured in Market</h2>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">Showing mock data — not wired to real products yet.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} isFavorite={!!favorites[p.id]} onToggleFavorite={toggleFavorite} />
        ))}
        {products.length === 0 && (
          <p className="col-span-full text-center text-gray-400 dark:text-gray-500 py-10">
            No products in this category yet.
          </p>
        )}
      </div>
    </div>
  );
};

export default Market;
