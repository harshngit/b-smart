import React, { useState } from 'react';
import { Plus, Wrench, Trash2, X } from 'lucide-react';
import { SEED_SERVICES } from '../data/mockServices';

const AddServiceModal = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), description: description.trim(), price: parseInt(price, 10) || 0 });
    setName(''); setDescription(''); setPrice('');
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 dark:text-white">Add Service</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <input
            value={name} onChange={(e) => setName(e.target.value)} required placeholder="Service name"
            className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#fa3f5e]/20 focus:border-[#fa3f5e] dark:text-white"
          />
          <textarea
            value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Description"
            className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#fa3f5e]/20 focus:border-[#fa3f5e] dark:text-white"
          />
          <input
            type="number" min="0" step="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price ($)"
            className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#fa3f5e]/20 focus:border-[#fa3f5e] dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
        <button type="submit" className="w-full mt-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange">
          Add Service
        </button>
      </form>
    </div>
  );
};

const StoreServices = () => {
  const [services, setServices] = useState(SEED_SERVICES);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAdd = (service) => {
    setServices((prev) => [...prev, { id: Date.now(), ...service }]);
    setShowAddModal(false);
  };

  const handleRemove = (id) => setServices((prev) => prev.filter((s) => s.id !== id));

  return (
    <div className="max-w-[1450px] ml-auto px-4 md:px-8 pt-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Services</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange"
        >
          <Plus size={16} /> Add Service
        </button>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
        Mock only — services you list here aren't persisted or linked to checkout yet.
      </p>

      {services.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl py-16 text-center">
          <div className="w-16 h-16 border-2 border-gray-300 dark:border-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wrench size={28} className="text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="font-bold text-base text-gray-900 dark:text-white mb-1">No services yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">List a service your store offers, like installation or repair.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <div key={s.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center flex-shrink-0">
                  <Wrench size={18} className="text-[#fa3f5e]" />
                </div>
                <button onClick={() => handleRemove(s.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{s.name}</h3>
              {s.description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{s.description}</p>}
              {s.price > 0 && <p className="text-sm font-bold text-[#fa3f5e]">${s.price}</p>}
            </div>
          ))}
        </div>
      )}

      <AddServiceModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onAdd={handleAdd} />
    </div>
  );
};

export default StoreServices;
