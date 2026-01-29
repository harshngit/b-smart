import React from 'react';
import { Settings, Image, Video, Megaphone, Wallet, Gift, PenTool, ChevronRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';

const Profile = () => {
  const { userObject } = useSelector((state) => state.auth);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const walletBalance = userObject?.wallet?.balance || '0.00';
  const currency = userObject?.wallet?.currency || 'USD';

  const menuItems = [
    { icon: Image, label: 'Uploaded Videos & Images', path: '#' },
    { icon: Megaphone, label: 'Posted Ads', path: '#' },
    { icon: Wallet, label: 'Wallet & Coins', subLabel: `${walletBalance} ${currency}`, path: '#' },
    { icon: Gift, label: 'Redeem Rewards', path: '#' },
    { icon: PenTool, label: 'Tools', subLabel: 'AI features, fonts, colors, auto reply', path: '#' },
  ];

  if (!userObject) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-insta-pink"></div>
      </div>
    );
  }

  return (
    <div className="pb-20 min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center z-40 md:hidden">
        <Link to="/" className="text-gray-800">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-lg font-semibold">Profile</h1>
        <Link to="/settings" className="text-gray-800">
          <Settings size={24} />
        </Link>
      </div>

      <div className="max-w-2xl mx-auto bg-white min-h-screen md:mt-4 md:rounded-xl md:shadow-sm md:border md:border-gray-200 overflow-hidden">

        {/* Profile Info */}
        <div className="flex flex-col items-center pt-8 pb-6 px-4">
          <div className="w-24 h-24 rounded-full p-[2px] bg-gradient-to-tr from-insta-yellow via-insta-orange to-insta-pink mb-3">
            <div className="w-full h-full rounded-full bg-white p-[2px] overflow-hidden">
              {userObject.avatar_url ? (
                <img
                  src={userObject.avatar_url}
                  className="w-full h-full rounded-full object-cover"
                  alt="Profile"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-2xl font-bold text-gray-500">
                  {getInitials(userObject.full_name || userObject.username)}
                </div>
              )}
            </div>
          </div>

          <h2 className="text-xl font-bold text-gray-900">{userObject.full_name || userObject.username}</h2>
          <p className="text-sm text-gray-500 mb-6">{userObject.bio || 'Digital creator | Tech enthusiast'}</p>

          {/* Stats */}
          <div className="flex justify-center gap-12 mb-8 w-full">
            <div className="text-center">
              <div className="font-bold text-lg text-[#fa3f5e]">{userObject.posts_count || 0}</div>
              <div className="text-xs text-gray-500">Posts</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-[#fa3f5e]">{userObject.followers_count || 0}</div>
              <div className="text-xs text-gray-500">Followers</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-[#fa3f5e]">{userObject.following_count || 0}</div>
              <div className="text-xs text-gray-500">Following</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 w-full px-4 mb-8">
            <Link to="/edit-profile" className="flex-1 bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange text-white py-2.5 rounded-xl font-semibold text-sm shadow-md hover:opacity-90 transition-opacity text-center">
              Edit Profile
            </Link>
            <Link to="/settings" className="flex-1 bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange text-white py-2.5 rounded-xl font-semibold text-sm shadow-md hover:opacity-90 transition-opacity text-center">
              Settings
            </Link>
          </div>
        </div>

        {/* Menu Items */}
        <div className="px-4 pb-8 space-y-3">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link
                key={index}
                to={item.path}
                className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center text-[#fa3f5e]">
                    <Icon size={20} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{item.label}</span>
                    {item.subLabel && (
                      <span className="text-xs text-gray-500 truncate max-w-[200px]">{item.subLabel}</span>
                    )}
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Profile;
