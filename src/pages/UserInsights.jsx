import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Grid, Eye, Heart, MessageCircle, Users, UserPlus, Loader2, AlertCircle, Image as ImageIcon, Zap, MapPin, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../lib/api';

// Single sequential hue (dataviz skill's validated default "blue") — one
// series, so the chart title carries identity; no legend needed.
const SEQ_BLUE = '#2a78d6';
// Sequential ramp (same hue family, light -> dark) for the heatmap cells —
// magnitude only, never identity, so one hue stepped in opacity is correct.
const heatCellStyle = (intensity) => ({ backgroundColor: `rgba(42, 120, 214, ${0.08 + intensity * 0.82})` });

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

const SectionCard = ({ title, subtitle, children }) => (
  <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
    <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
    {subtitle && <p className="text-xs text-gray-400 mb-3">{subtitle}</p>}
    {!subtitle && <div className="mb-3" />}
    {children}
  </div>
);

const formatShortDate = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function UserInsights() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api.get(`/users/${userId}/insights`)
      .then(({ data: res }) => { if (alive) setData(res); })
      .catch((err) => { if (alive) setError(err?.response?.data?.message || 'Could not load account insights.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[#fa3f5e]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4 text-center">
        <AlertCircle size={28} className="text-red-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{error || 'Insights not available.'}</p>
        <button type="button" onClick={() => navigate(-1)} className="text-sm font-semibold text-[#fa3f5e]">Go back</button>
      </div>
    );
  }

  const chartData = data.follower_growth.map((d) => ({ ...d, label: formatShortDate(d.date) }));
  const totalNewFollowers = data.follower_growth.reduce((sum, d) => sum + d.new_followers, 0);

  const reach = data.reel_viewer_reach;
  const followerPct = reach.total > 0 ? Math.round((reach.followers / reach.total) * 100) : 0;
  const maxTerritoryViewers = Math.max(1, ...data.top_territories.map((t) => t.viewers));

  const maxHeatCell = Math.max(1, ...data.posting_time_heatmap.flat());
  const hourLabels = { 0: '12 AM', 3: '3 AM', 6: '6 AM', 9: '9 AM', 12: '12 PM', 15: '3 PM', 18: '6 PM', 21: '9 PM' };

  return (
    <div className="max-w-5xl mx-auto px-4 pt-6 pb-10">
      <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-[#fa3f5e] mb-4">
        <ArrowLeft size={16} /> Back
      </button>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-5">Account Insights</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <StatCard label="Posts" value={data.totals.posts.toLocaleString()} color="blue" icon={Grid} />
        <StatCard label="Followers" value={data.totals.followers.toLocaleString()} color="pink" icon={Users} />
        <StatCard label="Following" value={data.totals.following.toLocaleString()} color="blue" icon={UserPlus} />
        <StatCard label="Total views" value={data.totals.views.toLocaleString()} color="blue" icon={Eye} />
        <StatCard label="Total likes" value={data.totals.likes.toLocaleString()} color="pink" icon={Heart} />
        <StatCard label="Total comments" value={data.totals.comments.toLocaleString()} color="orange" icon={MessageCircle} />
      </div>

      {/* ── Content library ──────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Content library</h3>
          <span className="text-xs text-gray-400">Showing {data.recent_content.length} of {data.total_content_count}</span>
        </div>
        {data.recent_content.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No posts yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-400 border-b border-gray-100 dark:border-gray-800">
                  <th className="pb-2 font-semibold">Content</th>
                  <th className="pb-2 font-semibold">Published</th>
                  <th className="pb-2 font-semibold text-right">Views</th>
                  <th className="pb-2 font-semibold text-right">Likes</th>
                  <th className="pb-2 font-semibold text-right">Comments</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_content.map((post) => {
                  const id = post._id || post.id;
                  const thumb = post.media?.[0]?.fileUrl;
                  const isReel = post.type === 'reel';
                  return (
                    <tr key={id} className="border-b border-gray-50 dark:border-gray-800/60 last:border-0">
                      <td className="py-2.5 pr-3">
                        <Link to={`/post/${id}/insights`} className="flex items-center gap-2.5 min-w-0 hover:text-[#fa3f5e]">
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 flex items-center justify-center">
                            {thumb ? <img src={thumb} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={14} className="text-gray-400" />}
                          </div>
                          <span className="min-w-0">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold mr-1.5 align-middle ${isReel ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'}`}>
                              {isReel ? <Zap size={8} /> : <ImageIcon size={8} />} {isReel ? 'Reel' : 'Post'}
                            </span>
                            <span className="text-gray-700 dark:text-gray-300 truncate">{post.caption || 'Untitled'}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-gray-400 whitespace-nowrap">{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                      <td className="py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300">{(post.views_count || 0).toLocaleString()}</td>
                      <td className="py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300">{(post.likes_count || 0).toLocaleString()}</td>
                      <td className="py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300">{(post.comments_count || 0).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Follower growth ──────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Follower growth — last 30 days</h3>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">+{totalNewFollowers} new</span>
        </div>
        {totalNewFollowers === 0 ? (
          <p className="text-xs text-gray-400 py-10 text-center">No new followers in the last 30 days.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#898781' }} axisLine={{ stroke: '#c3c2b7' }} tickLine={false} interval={Math.ceil(chartData.length / 8)} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#898781' }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ stroke: '#c3c2b7', strokeWidth: 1 }}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(value) => [value, 'New followers']}
                labelFormatter={(label) => label}
              />
              <Line type="monotone" dataKey="new_followers" stroke={SEQ_BLUE} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* ── Reach breakdown ──────────────────────────────────────────── */}
        <SectionCard title="Reel viewer reach" subtitle="Who's been watching your reels">
          {reach.total === 0 ? (
            <p className="text-xs text-gray-400 py-8 text-center">No reel views yet.</p>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-[#fa3f5e]">{followerPct}% Followers</span>
                <span className="font-semibold text-gray-500 dark:text-gray-400">{100 - followerPct}% Non-followers</span>
              </div>
              <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex mb-4">
                <div className="h-full bg-[#fa3f5e]" style={{ width: `${followerPct}%` }} />
                <div className="h-full bg-blue-400" style={{ width: `${100 - followerPct}%` }} />
              </div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1"><MapPin size={12} /> Top viewer locations</p>
              <div className="space-y-2">
                {data.top_territories.length === 0 ? (
                  <p className="text-xs text-gray-400">No location data yet.</p>
                ) : data.top_territories.map((t) => (
                  <div key={t.location} className="flex items-center gap-2 text-xs">
                    <span className="w-20 shrink-0 truncate text-gray-700 dark:text-gray-300">{t.location}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(t.viewers / maxTerritoryViewers) * 100}%`, backgroundColor: SEQ_BLUE }} />
                    </div>
                    <span className="w-6 shrink-0 text-right font-semibold text-gray-900 dark:text-white tabular-nums">{t.viewers}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>

        {/* ── Posting-time heatmap ─────────────────────────────────────── */}
        <SectionCard title="Best posting windows" subtitle="When your reel viewers are active (IST)">
          {maxHeatCell <= 1 && data.posting_time_heatmap.flat().every((v) => v === 0) ? (
            <p className="text-xs text-gray-400 py-8 text-center">Not enough view data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[380px]">
                <div className="grid pl-7" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} className="text-[8px] text-gray-400 text-center">{hourLabels[h] ? hourLabels[h].replace(' ', '') : ''}</div>
                  ))}
                </div>
                {data.posting_time_heatmap.map((row, dayIdx) => (
                  <div key={dayIdx} className="flex items-center gap-0.5 mb-0.5">
                    <span className="w-6 text-[9px] font-semibold text-gray-400 shrink-0">{DAY_LABELS[dayIdx]}</span>
                    <div className="grid flex-1 gap-0.5" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                      {row.map((count, hourIdx) => (
                        <div
                          key={hourIdx}
                          title={`${DAY_LABELS[dayIdx]} ${hourIdx}:00 IST — ${count} view${count === 1 ? '' : 's'}`}
                          className="aspect-square rounded-sm"
                          style={heatCellStyle(count / maxHeatCell)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 text-xs text-blue-700 dark:text-blue-300">
        <Info size={14} className="shrink-0 mt-0.5" />
        <span>Reel viewer reach and posting-time data are based on reel views only — there&rsquo;s no per-viewer tracking for image posts yet.</span>
      </div>
    </div>
  );
}
