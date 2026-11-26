import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, Heart, MessageCircle, CheckCircle2, Percent, Loader2, AlertCircle, MapPin, Zap, Image as ImageIcon, Anchor, Flag, X } from 'lucide-react';
import { BarChart, Bar, ComposedChart, Area, Line, Legend, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../lib/api';

// Single sequential hue (dataviz skill's validated default "blue" ramp) — these
// are magnitude-only bars across one-off categories, not a repeating identity
// that needs to stay color-matched across other charts, so one hue is correct
// rather than a categorical rainbow.
const SEQ_BLUE = '#2a78d6';
// Neutral comparison line (platform average) — never a competing hue, so
// "your reel" stays the only thing color draws the eye to.
const NEUTRAL_GRAY = '#9a9890';

const GENDER_LABELS = { male: 'Male', female: 'Female', other: 'Other', unknown: 'Unknown' };

// Defensive — a location is normally already a plain name string, but older
// cached data (or a misbehaving endpoint) could hand back the raw
// {name, lat, lng} object; never render an object directly as a child.
const locationLabel = (value) => {
  if (!value) return 'Unknown';
  if (typeof value === 'string') return value;
  return value.name || 'Unknown';
};

const StatCard = ({ label, value, icon: Icon }) => (
  <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
    <div className="flex items-center gap-1.5 mb-2.5 text-gray-400 dark:text-gray-500">
      <Icon size={13} strokeWidth={2} />
      <span className="text-[10.5px] font-semibold uppercase tracking-wider">{label}</span>
    </div>
    <div className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">{value}</div>
  </div>
);

const ChartCard = ({ title, subtitle, children }) => (
  <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
    <h3 className="text-[13px] font-semibold text-gray-900 dark:text-white">{title}</h3>
    {subtitle && <p className="text-xs text-gray-400 mb-3">{subtitle}</p>}
    {!subtitle && <div className="mb-3" />}
    {children}
  </div>
);

export default function PostInsights() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get(`/posts/${postId}/stats`)
      .then(({ data }) => { if (alive) setStats(data); })
      .catch((err) => { if (alive) setError(err?.response?.data?.message || 'Could not load insights for this post.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [postId]);

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

  const isReel = stats.type === 'reel';
  const completionRate = stats.views.total > 0 ? Math.round((stats.views.completed / stats.views.total) * 100) : 0;

  const genderData = Object.entries(stats.likes.by_gender)
    .filter(([key]) => key !== 'users')
    .map(([key, v]) => ({ name: GENDER_LABELS[key] || key, count: v.count }));

  const ageData = Object.entries(stats.views.by_age).map(([name, count]) => ({ name, count }));
  const maxLocationViews = Math.max(1, ...stats.views.by_location.map((l) => l.views));
  const hasRetentionData = isReel && stats.retention_curve.some((d) => d.retained_pct > 0);
  const hasPlatformAvg = isReel && (stats.platform_avg_retention_curve || []).some((d) => d.retained_pct > 0);
  const retentionCurveData = hasRetentionData
    ? stats.retention_curve.map((d, i) => ({ ...d, platform_avg: hasPlatformAvg ? stats.platform_avg_retention_curve[i]?.retained_pct : undefined }))
    : [];
  const hookRetention = hasRetentionData ? stats.retention_curve[0].retained_pct : null;
  const completionRetention = hasRetentionData ? stats.retention_curve[stats.retention_curve.length - 1].retained_pct : null;

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 pb-10">
      <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-[#fa3f5e] mb-4">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex items-start gap-4 mb-5">
        {stats.thumbnail_url && (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="w-28 h-28 sm:w-32 sm:h-32 rounded-lg overflow-hidden shrink-0 border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900"
            aria-label="View full post"
          >
            <img src={stats.thumbnail_url} alt="" className="w-full h-full object-contain" />
          </button>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {isReel ? <Zap size={10} /> : <ImageIcon size={10} />} {isReel ? 'Reel' : 'Post'}
            </span>
            {stats.created_at && (
              <span className="text-xs text-gray-400">
                {new Date(stats.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Post Insights</h1>
          {stats.caption && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{stats.caption}</p>}
        </div>
      </div>

      {lightboxOpen && stats.thumbnail_url && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4" onClick={() => setLightboxOpen(false)}>
          <button type="button" onClick={() => setLightboxOpen(false)} className="absolute top-4 right-4 text-white hover:opacity-75" aria-label="Close">
            <X size={24} />
          </button>
          <img src={stats.thumbnail_url} alt="" className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <StatCard label="Views" value={stats.views.total.toLocaleString()} icon={Eye} />
        <StatCard label="Unique viewers" value={stats.views.unique.toLocaleString()} icon={Eye} />
        <StatCard label="Completion rate" value={`${completionRate}%`} icon={Percent} />
        <StatCard label="Completed views" value={stats.views.completed.toLocaleString()} icon={CheckCircle2} />
        <StatCard label="Likes" value={stats.likes.total.toLocaleString()} icon={Heart} />
        <StatCard label="Comments" value={stats.comments.total.toLocaleString()} icon={MessageCircle} />
      </div>

      {isReel && (
        <div className="rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden mb-4">
          <div className="flex items-center gap-2 px-4 pt-4">
            <span className="w-1 h-4 rounded-full bg-[#fa3f5e]" />
            <h3 className="text-[13px] font-semibold text-gray-900 dark:text-white">Deep dive: audience retention</h3>
          </div>
          <p className="text-xs text-gray-400 px-4 mt-0.5">
            {hasRetentionData ? 'Share of viewers who watched at least this far into the reel' : 'Not enough watch data yet — this fills in as people watch the reel.'}
          </p>

          {hasRetentionData && (
            <>
              <div className="px-2 pt-2">
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={retentionCurveData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="retentionFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={SEQ_BLUE} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={SEQ_BLUE} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
                    <XAxis dataKey="percent" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#898781' }} axisLine={{ stroke: '#c3c2b7' }} tickLine={false} />
                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#898781' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ stroke: '#c3c2b7', strokeWidth: 1 }}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(value, name) => [`${value}%`, name === 'platform_avg' ? 'Platform average' : 'Your reel']}
                      labelFormatter={(label) => `${label}% through`}
                    />
                    {hasPlatformAvg && <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => (v === 'platform_avg' ? 'Platform average' : 'Your reel')} />}
                    <Area type="monotone" dataKey="retained_pct" name="retained_pct" stroke={SEQ_BLUE} strokeWidth={2} fill="url(#retentionFill)" />
                    {hasPlatformAvg && (
                      <Line type="monotone" dataKey="platform_avg" name="platform_avg" stroke={NEUTRAL_GRAY} strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-3 px-4 pb-4 pt-1">
                <div className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 dark:border-gray-800">
                  <Anchor size={13} className="text-gray-400 dark:text-gray-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-900 dark:text-white leading-none">{hookRetention}%</div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">Hook retention (first 10%)</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 dark:border-gray-800">
                  <Flag size={13} className="text-gray-400 dark:text-gray-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-900 dark:text-white leading-none">{completionRetention}%</div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">Watched to completion</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
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

        <ChartCard title="Views by age group">
          {ageData.every((d) => d.count === 0) ? (
            <p className="text-xs text-gray-400 py-8 text-center">No view data yet.</p>
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

      <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 mb-4">
        <h3 className="text-[13px] font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-1.5"><MapPin size={14} /> Views by location</h3>
        {stats.views.by_location.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No location data yet.</p>
        ) : (
          <div className="space-y-2">
            {stats.views.by_location.slice(0, 10).map((loc) => (
              <div key={locationLabel(loc.location)} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 truncate text-gray-700 dark:text-gray-300">{locationLabel(loc.location)}</span>
                <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(loc.views / maxLocationViews) * 100}%`, backgroundColor: SEQ_BLUE }} />
                </div>
                <span className="w-10 shrink-0 text-right font-semibold text-gray-900 dark:text-white tabular-nums">{loc.views}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <h3 className="text-[13px] font-semibold text-gray-900 dark:text-white mb-3">Recent comments</h3>
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
