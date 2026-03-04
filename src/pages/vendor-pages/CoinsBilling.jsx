export default function CoinsBilling() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans transition-colors duration-300">
      
     

      <div className="max-w-7xl mx-auto p-6 md:p-8">
        
        {/* Wallet Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="col-span-2 p-6 rounded-3xl bg-gradient-to-br from-gray-900 to-black text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10">
              <div className="text-sm font-medium text-gray-400 mb-1">Available Balance</div>
              <div className="text-4xl font-bold mb-6">₹ 24,500.00</div>
              <div className="flex gap-3">
                <button className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm text-sm font-semibold transition-colors">
                  Transaction History
                </button>
                <button className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm text-sm font-semibold transition-colors">
                  Download Invoice
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 transition-colors flex justify-between items-center">
                <span>View Pricing Plans</span>
                <span>→</span>
              </button>
              <button className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 transition-colors flex justify-between items-center">
                <span>Manage Payment Methods</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
