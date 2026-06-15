import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Ticket, MessageSquare, BookOpen, GraduationCap, FileText, Bug, AlertOctagon, UserX, ChevronRight, Loader2, Check } from 'lucide-react';

const SectionTitle = ({ title }) => (
  <p className="text-[11px] font-bold text-[#fa3f5e] uppercase tracking-widest mb-2 px-1">{title}</p>
);

const Row = ({ icon: Icon, iconBg, iconColor, label, sublabel, onClick, href, badge }) => {
  const inner = (
    <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
      <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon size={16} className={iconColor} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
          {sublabel && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sublabel}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {badge && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
            {badge}
          </span>
        )}
        <ChevronRight size={16} className="text-gray-400" />
      </div>
    </div>
  );

  if (href) return <a href={href} target="_blank" rel="noopener noreferrer">{inner}</a>;
  return <div onClick={onClick} role="button" tabIndex={0}>{inner}</div>;
};

const HelpSettings = () => {
  const [reportLoading, setReportLoading] = useState({});
  const [reportDone,    setReportDone]    = useState({});

  const handleReport = async (key) => {
    setReportLoading(p => ({ ...p, [key]: true }));
    await new Promise(r => setTimeout(r, 1000));
    setReportLoading(p => ({ ...p, [key]: false }));
    setReportDone(p => ({ ...p, [key]: true }));
    setTimeout(() => setReportDone(p => { const n = { ...p }; delete n[key]; return n; }), 3000);
  };

  const REPORTS = [
    { key: 'bug',     icon: Bug,          bg: 'bg-orange-50 dark:bg-gray-800', color: 'text-orange-500', label: 'Report a Bug',     sublabel: 'Found something broken? Let us know' },
    { key: 'content', icon: AlertOctagon, bg: 'bg-red-50 dark:bg-gray-800',    color: 'text-red-500',    label: 'Report Content',   sublabel: 'Flag inappropriate or harmful content' },
    { key: 'user',    icon: UserX,        bg: 'bg-gray-100 dark:bg-gray-800',  color: 'text-gray-500',   label: 'Report a User',    sublabel: 'Report abusive or suspicious accounts' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pb-24">

      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-black border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between z-40">
        <Link to="/settings" className="text-gray-800 dark:text-white p-1">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-base font-semibold dark:text-white">Help & Support</h1>
        <div className="w-8" />
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-5">

        {/* ── Support ── */}
        <div>
          <SectionTitle title="Support" />
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <Row
              icon={Mail}
              iconBg="bg-blue-50 dark:bg-gray-800"
              iconColor="text-blue-500"
              label="Contact Support"
              sublabel="Email us at support@bebsmart.in"
              href="mailto:support@bebsmart.in"
            />
            <Row
              icon={Ticket}
              iconBg="bg-purple-50 dark:bg-gray-800"
              iconColor="text-purple-500"
              label="Raise a Ticket"
              sublabel="Submit a support ticket for your issue"
              onClick={() => {}}
            />
            <Row
              icon={MessageSquare}
              iconBg="bg-teal-50 dark:bg-gray-800"
              iconColor="text-teal-500"
              label="Live Chat"
              sublabel="Chat with our support team in real-time"
              badge="Coming Soon"
              onClick={() => {}}
            />
          </div>
        </div>

        {/* ── Resources ── */}
        <div>
          <SectionTitle title="Resources" />
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <Row
              icon={BookOpen}
              iconBg="bg-green-50 dark:bg-gray-800"
              iconColor="text-green-500"
              label="FAQs"
              sublabel="Answers to the most common questions"
              href="https://bebsmart.in/faq"
            />
            <Row
              icon={GraduationCap}
              iconBg="bg-indigo-50 dark:bg-gray-800"
              iconColor="text-indigo-500"
              label="Tutorials"
              sublabel="Step-by-step guides for using bSmart"
              href="https://bebsmart.in/tutorials"
            />
            <Row
              icon={FileText}
              iconBg="bg-orange-50 dark:bg-gray-800"
              iconColor="text-orange-500"
              label="User Guide"
              sublabel="Full documentation and feature reference"
              href="https://bebsmart.in/guide"
            />
          </div>
        </div>

        {/* ── Reports ── */}
        <div>
          <SectionTitle title="Reports" />
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            {REPORTS.map(({ key, icon: Icon, bg, color, label, sublabel }) => (
              <div key={key} className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${bg}`}>
                    <Icon size={16} className={color} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sublabel}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleReport(key)}
                  disabled={!!reportLoading[key] || !!reportDone[key]}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-60
                    border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {reportLoading[key]
                    ? <Loader2 size={12} className="animate-spin" />
                    : reportDone[key]
                    ? <><Check size={12} className="text-green-500" /> Sent</>
                    : 'Report'}
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 px-1 mt-2">
            All reports are reviewed by our moderation team within 24–48 hours.
          </p>
        </div>

      </div>
    </div>
  );
};

export default HelpSettings;
