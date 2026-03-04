export default function Settings() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans transition-colors duration-300">
      

      <div className="max-w-3xl mx-auto p-6 md:p-8">
        <div className="space-y-4">
          {['Account Security', 'Notification Preferences', 'Privacy Settings', 'Help & Support', 'Log Out'].map((item) => (
            <div key={item} className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer transition-colors flex justify-between items-center group">
              <span className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item}</span>
              <span className="text-gray-400 group-hover:translate-x-1 transition-transform">→</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
