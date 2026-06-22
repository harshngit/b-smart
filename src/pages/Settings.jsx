import { Link } from 'react-router-dom';
import {
  ArrowLeft, UserCog, Shield, Lock, Bell, ChevronRight,
  MessageSquare, LayoutGrid, Wallet, UserX,
  Palette, HardDrive, HelpCircle, Scale, Info, LogOut,
} from 'lucide-react';

const SETTINGS_GROUPS = [
  {
    group: 'Account',
    items: [
      {
        key: 'account',
        label: 'Account',
        subLabel: 'Profile, username & email',
        icon: UserCog,
        to: '/settings/account',
        iconBg: 'bg-blue-50 dark:bg-gray-800',
        iconColor: 'text-blue-500',
      },
      {
        key: 'privacy',
        label: 'Privacy',
        subLabel: 'Account privacy & follow requests',
        icon: Shield,
        to: '/settings/privacy',
        iconBg: 'bg-pink-50 dark:bg-gray-800',
        iconColor: 'text-[#fa3f5e]',
      },
      {
        key: 'security',
        label: 'Security',
        subLabel: 'Password & 2FA',
        icon: Lock,
        to: '/settings/security',
        iconBg: 'bg-orange-50 dark:bg-gray-800',
        iconColor: 'text-orange-500',
      },
    ],
  },
  {
    group: 'Preferences',
    items: [
      {
        key: 'notifications',
        label: 'Notifications',
        subLabel: 'Manage your notification preferences',
        icon: Bell,
        to: '/settings/notifications',
        iconBg: 'bg-purple-50 dark:bg-gray-800',
        iconColor: 'text-purple-500',
      },
      {
        key: 'messaging',
        label: 'Messaging',
        subLabel: 'Auto download images, videos & documents',
        icon: MessageSquare,
        to: '/settings/messaging',
        iconBg: 'bg-teal-50 dark:bg-gray-800',
        iconColor: 'text-teal-500',
      },
      {
        key: 'content',
        label: 'Content Preferences',
        subLabel: 'Feed interests, topics & video playback',
        icon: LayoutGrid,
        to: '/settings/content',
        iconBg: 'bg-indigo-50 dark:bg-gray-800',
        iconColor: 'text-indigo-500',
      },
      {
        key: 'appearance',
        label: 'Appearance',
        subLabel: 'Theme, font size & motion settings',
        icon: Palette,
        to: '/settings/appearance',
        iconBg: 'bg-yellow-50 dark:bg-gray-800',
        iconColor: 'text-yellow-500',
      },
    ],
  },
  {
    group: 'Storage & Activity',
    items: [
      {
        key: 'wallet',
        label: 'Rewards & Wallet',
        subLabel: 'Coins, transactions & wallet history',
        icon: Wallet,
        to: '/wallet',
        iconBg: 'bg-orange-50 dark:bg-gray-800',
        iconColor: 'text-orange-500',
      },
      {
        key: 'storage',
        label: 'Storage & Data',
        subLabel: 'Cache, data usage & storage breakdown',
        icon: HardDrive,
        to: '/settings/storage',
        iconBg: 'bg-green-50 dark:bg-gray-800',
        iconColor: 'text-green-500',
      },
      {
        key: 'blocked',
        label: 'Blocked & Restricted',
        subLabel: 'Blocked, restricted & muted accounts',
        icon: UserX,
        to: '/settings/blocked',
        iconBg: 'bg-red-50 dark:bg-gray-800',
        iconColor: 'text-red-500',
      },
    ],
  },
  {
    group: 'Support & Legal',
    items: [
      {
        key: 'help',
        label: 'Help & Support',
        subLabel: 'Contact support, FAQs & reports',
        icon: HelpCircle,
        to: '/settings/help',
        iconBg: 'bg-sky-50 dark:bg-gray-800',
        iconColor: 'text-sky-500',
      },
      {
        key: 'legal',
        label: 'Legal & Compliance',
        subLabel: 'Terms, privacy, DPDP & data controls',
        icon: Scale,
        to: '/settings/legal',
        iconBg: 'bg-slate-100 dark:bg-gray-800',
        iconColor: 'text-slate-500',
      },
      {
        key: 'about',
        label: 'About bSmart',
        subLabel: 'App version, company & links',
        icon: Info,
        to: '/settings/about',
        iconBg: 'bg-gray-100 dark:bg-gray-800',
        iconColor: 'text-gray-500',
      },
    ],
  },
  {
    group: 'Account Actions',
    items: [
      {
        key: 'account-actions',
        label: 'Account Actions',
        subLabel: 'Logout, deactivate or delete account',
        icon: LogOut,
        to: '/settings/account-actions',
        iconBg: 'bg-red-50 dark:bg-gray-800',
        iconColor: 'text-red-500',
      },
    ],
  },
];

const Settings = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
      <div className="sticky top-0 bg-white dark:bg-black border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex justify-between items-center z-40">
        <Link to="/profile" className="text-gray-800 dark:text-white">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-lg font-semibold dark:text-white">Settings</h1>
        <div className="w-6" />
      </div>

      <div className="max-w-2xl mx-auto pt-6 px-4 space-y-6">
        {SETTINGS_GROUPS.map(({ group, items }) => (
          <div key={group}>
            <p className="text-[11px] font-bold text-[#fa3f5e] uppercase tracking-widest mb-2 px-1">{group}</p>
            <div className="space-y-2">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.key}
                    to={item.to}
                    className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.iconBg} ${item.iconColor}`}>
                        <Icon size={20} strokeWidth={2.5} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-white">{item.label}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{item.subLabel}</span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-gray-400" />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Settings;
