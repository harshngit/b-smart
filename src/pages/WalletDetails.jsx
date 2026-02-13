import React, { useState } from 'react';
import { ArrowLeft, ChevronRight, SlidersHorizontal, ArrowUpRight, ShoppingCart, HelpCircle, Gift, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const WalletDetails = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('All');
  const [isLifeTime, setIsLifeTime] = useState(true);

  // Mock data based on the screenshot
  const transactions = [
    {
      id: 1,
      type: 'earned',
      title: 'Watched video: Kids Learning Fun',
      date: 'Dec 16, 2025 at 10:45 PM',
      amount: 8,
      icon: <ArrowUpRight size={16} className="text-green-500" />,
      color: 'text-green-500'
    },
    {
      id: 2,
      type: 'spent',
      title: 'Redeemed on order #9c2656b4',
      date: 'Dec 16, 2025 at 10:35 PM',
      amount: -139,
      icon: <ShoppingCart size={16} className="text-blue-500" />,
      color: 'text-red-500'
    },
    {
      id: 3,
      type: 'earned',
      title: 'Watched video: Kids Learning Fun',
      date: 'Dec 16, 2025 at 10:45 PM',
      amount: 8,
      icon: <ArrowUpRight size={16} className="text-green-500" />,
      color: 'text-green-500'
    },
    {
      id: 4,
      type: 'spent',
      title: 'Redeemed on order #9c2656b4',
      date: 'Dec 16, 2025 at 10:35 PM',
      amount: -139,
      icon: <ShoppingCart size={16} className="text-blue-500" />,
      color: 'text-red-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-black px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-gray-900 dark:text-white">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Wallet & Coins</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Balance Card */}
        <div className="w-full rounded-2xl p-6 text-white bg-gradient-to-r from-orange-400 to-orange-600 shadow-lg relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
            
            <div className="flex justify-between items-start mb-2 relative z-10">
                <div className="flex items-center gap-2 text-white/90 text-sm font-medium">
                    <div className="flex -space-x-1">
                        <div className="w-4 h-4 rounded-full border border-orange-500 bg-white/30"></div>
                        <div className="w-4 h-4 rounded-full border border-orange-500 bg-white/30"></div>
                    </div>
                    Available Balance
                </div>
                
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Life Time</span>
                    <button 
                        onClick={() => setIsLifeTime(!isLifeTime)}
                        className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${isLifeTime ? 'bg-teal-400' : 'bg-gray-300'}`}
                    >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${isLifeTime ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </button>
                </div>
            </div>

            <div className="mb-6 relative z-10">
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">4201</span>
                    <span className="text-lg font-medium opacity-90">coins</span>
                </div>
            </div>

            <div className="flex justify-between items-end relative z-10">
                <div>
                    <div className="text-xs text-white/80 mb-0.5">Total Earned</div>
                    <div className="text-xl font-bold">203</div>
                </div>
                <div className="text-right">
                    <div className="text-xs text-white/80 mb-0.5">Total Spent</div>
                    <div className="text-xl font-bold">738</div>
                </div>
            </div>
        </div>

        {/* Transaction History */}
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Transaction History</h2>
                <div className="flex gap-2">
                    <button className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
                        <SlidersHorizontal size={20} />
                    </button>
                    <button className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
                        <ChevronDown size={20} />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg mb-4">
                {['All', 'Earned', 'Spent', 'Expired'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setFilter(tab)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                            filter === tab 
                                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' 
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                {transactions.map((tx) => (
                    <div key={tx.id} className="p-4 flex items-start gap-3">
                        <div className={`mt-1 p-1.5 rounded-full ${tx.type === 'earned' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                            {tx.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate pr-2">{tx.title}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{tx.date}</p>
                        </div>
                        <span className={`text-sm font-bold whitespace-nowrap ${tx.color}`}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount}
                        </span>
                    </div>
                ))}
            </div>
        </div>

        {/* Menu Options */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
            <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-center gap-3">
                    {/* <User size={20} className="text-gray-400" /> */}
                    <span className="text-sm font-semibold text-gray-900 dark:text-white italic">Account Details</span>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
            </button>
            <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-center gap-3">
                    {/* <Gift size={20} className="text-gray-400" /> */}
                    <span className="text-sm font-semibold text-gray-900 dark:text-white italic">Redeem Coins</span>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
            </button>
            <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-center gap-3">
                    {/* <HelpCircle size={20} className="text-gray-400" /> */}
                    <span className="text-sm font-semibold text-gray-900 dark:text-white italic">Help</span>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default WalletDetails;
