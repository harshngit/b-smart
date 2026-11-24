import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, Heart, MessageCircle, CheckCircle2, Loader2, AlertCircle, Zap, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../lib/api';

// Single sequential hue (dataviz skill's validated default "blue" ramp) — same
// convention as PostInsights.jsx: magnitude-only bars across one-off
// categories, so one hue is correct rather than a categorical rainbow.
const SEQ_BLUE = '#2a78d6';

const GENDER_LABELS = { male: 'Male', female: 'Female', other: 'Other', unknown: 'Unknown' };

const StatCard = ({ label, value, color = 'blue', icon: Icon }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    pink: 'bg-pink-50 text-[#fa3f5e] dark:bg-pink-900/20 dark:text-pink-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
  };
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5">{value}</div>
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );
};

const ChartCard = ({ title, children }) => (
  <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">{title}</h3>
    {children}
  </div>
);

export default function PromoteReelInsights() {
  const { promoteReelId } = useParams();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api.get(`/promote-reels/${promoteReelId}/stats`)
      .then(({ data }) => { if (alive) setStats(data); })
      .catch((err) => { if (alive) setError(err?.response?.data?.message || 'Could not load insights for this promoted reel.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [promoteReelId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[#fa3f5e]" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4 text-center">
        <AlertCircle size={28} className="text-red-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{error || 'Insights not available.'}</p>
        <button type="button" onClick={() => navigate(-1)} className="text-sm font-semibold text-[#fa3f5e]">Go back</button>
      </div>
    );
  }

  const completionRate = stats.views.total > 0 ? Math.round((stats.views.completed / stats.views.total) * 100) : 0;
  const genderData = Object.entries(stats.likes.by_gender).map(([key, count]) => ({ name: GENDER_LABELS[key] || key, count }));
  const ageData = Object.entries(stats.likes.by_age).map(([name, count]) => ({ name, count }));

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-10">
      <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-[#fa3f5e] mb-4">
        <ArrowLeft size={16} /> Back
      </button>
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-orange-400 to-pink-500 text-white">
          <Zap size={10} /> Promoted
        </span>
        {stats.created_at && (
          <span className="text-xs text-gray-400">
            {new Date(stats.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )}
      </div>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Promoted Reel Insights</h1>
      {stats.caption && <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{stats.caption}</p>}
      <div className="flex items-start gap-2 mb-5 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 text-xs text-blue-700 dark:text-blue-300">
        <Info size={14} className="shrink-0 mt-0.5" />
        <span>Watch-time retention and location breakdowns aren&rsquo;t tracked for promoted reels yet — only regular reels have that level of detail right now.</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <StatCard label="Views" value={stats.views.total.toLocaleString()} color="blue" icon={Eye} />
        <StatCard label="Unique viewers" value={stats.views.unique.toLocaleString()} color="blue" icon={Eye} />
        <StatCard label="Completion rate" value={`${completionRate}%`} color="green" icon={CheckCircle2} />
        <StatCard label="Completed views" value={stats.views.completed.toLocaleString()} color="green" icon={CheckCircle2} />
        <StatCard label="Likes" value={stats.likes.total.toLocaleString()} color="pink" icon={Heart} />
        <StatCard label="Comments" value={stats.comments.total.toLocaleString()} color="orange" icon={MessageCircle} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Likes by gender">
          {genderData.every((d) => d.count === 0) ? (
            <p className="text-xs text-gray-400 py-8 text-center">No likes yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={genderData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#898781' }} axisLine={{ stroke: '#c3c2b7' }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#898781' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" fill={SEQ_BLUE} radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Likes by age group">
          {ageData.every((d) => d.count === 0) ? (
            <p className="text-xs text-gray-400 py-8 text-center">No likes yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ageData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#898781' }} axisLine={{ stroke: '#c3c2b7' }} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#898781' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" fill={SEQ_BLUE} radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Recent comments</h3>
        {stats.comments.recent.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No comments yet.</p>
        ) : (
          <div className="space-y-3">
            {stats.comments.recent.map((c) => (
              <div key={c._id} className="text-sm">
                <span className="font-semibold text-gray-900 dark:text-white">{c.user?.username || 'User'}</span>{' '}
                <span className="text-gray-600 dark:text-gray-300">{c.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
