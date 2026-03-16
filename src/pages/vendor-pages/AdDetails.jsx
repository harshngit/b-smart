import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import api from "../../lib/api";
import {
  ArrowLeft, CheckCircle, BarChart2, Users, MessageCircle,
  ThumbsDown, Clock, Eye, MapPin, Globe, Tag,
  Film, Hash, Building2, Coins, Heart, AlertCircle,
  ChevronDown, ChevronUp, RefreshCw, ArrowDownLeft, ArrowUpRight,
  ChevronLeft, ChevronRight, Wallet, TrendingUp, TrendingDown,
  Activity, UserCheck, BarChart, PieChart as PieIcon, MapPinned
} from "lucide-react";
import {
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

// ─── Reusable Components ──────────────────────────────────────────────────────

const Badge = ({ status }) => {
  const styles = {
    active:    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
    paused:    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    draft:     "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700",
    rejected:  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
    pending:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[(status || "").toLowerCase()] || styles.draft}`}>
      {status || "Unknown"}
    </span>
  );
};

const Card = ({ title, children, className = "", action, icon: Icon }) => (
  <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm ${className}`}>
    {title && (
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-pink-500" />}
          {title}
        </h3>
        {action}
      </div>
    )}
    {children}
  </div>
);

const StatCard = ({ label, value, color = "blue", icon: Icon }) => {
  const colors = {
    blue:   "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
    pink:   "bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
    green:  "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    red:    "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
  };
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5">{value}</div>
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );
};

const InfoRow = ({ icon: Icon, label, value, mono = false }) => (
  <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wide min-w-[130px] flex-shrink-0">
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      {label}
    </div>
    <div className={`text-sm font-semibold text-gray-800 dark:text-gray-200 text-right break-all ${mono ? "font-mono text-xs" : ""}`}>
      {value ?? "—"}
    </div>
  </div>
);

const TagList = ({ items, color = "blue" }) => {
  const colors = {
    blue:   "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
    purple: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300",
    green:  "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300",
  };
  if (!items || items.length === 0)
    return <span className="text-sm text-gray-400 italic">None</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span key={i} className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colors[color]}`}>
          {item}
        </span>
      ))}
    </div>
  );
};

const Avatar = ({ name, url, size = "w-8 h-8", textSize = "text-xs" }) => {
  const initials = (name || "U").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  if (url) {
    return (
      <img src={url} alt={name} className={`${size} rounded-full object-cover flex-shrink-0`}
        onError={e => { e.target.style.display = "none"; }} />
    );
  }
  return (
    <div className={`${size} rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white ${textSize} font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
};

// ─── Comment Item with Replies ────────────────────────────────────────────────

const CommentItem = ({ comment }) => {
  const [showReplies, setShowReplies]       = useState(false);
  const [replies, setReplies]               = useState([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [repliesFetched, setRepliesFetched] = useState(false);

  const toggleReplies = useCallback(async () => {
    if (repliesFetched) { setShowReplies(v => !v); return; }
    setLoadingReplies(true);
    try {
      const res = await api.get(`/ads/comments/${comment._id}/replies`);
      const data = Array.isArray(res.data) ? res.data : res.data?.replies || res.data?.data || [];
      setReplies(data);
      setRepliesFetched(true);
      setShowReplies(true);
    } catch (err) { console.error("Failed to fetch replies", err); }
    finally { setLoadingReplies(false); }
  }, [comment._id, repliesFetched]);

  const replyCount = comment.replies_count || comment.repliesCount || 0;
  const user       = comment.user_id || comment.user || {};
  const userName   = user.full_name || user.username || "User";
  const timeAgo    = comment.createdAt
    ? new Date(comment.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "";

  return (
    <div className="space-y-2">
      <div className="flex gap-3 items-start p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
        <Avatar name={userName} url={user.avatar_url || ""} />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center gap-2 mb-1">
            <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{userName}</span>
            <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">{timeAgo}</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            {comment.text || comment.content || comment.comment || ""}
          </p>
          {replyCount > 0 && (
            <button onClick={toggleReplies} disabled={loadingReplies}
              className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
            >
              {loadingReplies ? <RefreshCw className="w-3 h-3 animate-spin" />
               : showReplies ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showReplies ? "Hide replies" : `${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
            </button>
          )}
        </div>
      </div>
      {showReplies && replies.length > 0 && (
        <div className="ml-10 space-y-2">
          {replies.map((reply, idx) => {
            const rUser = reply.user_id || reply.user || {};
            const rName = rUser.full_name || rUser.username || "User";
            const rTime = reply.createdAt ? new Date(reply.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "";
            return (
              <div key={reply._id || idx} className="flex gap-2 items-start p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                <Avatar name={rName} url={rUser.avatar_url || ""} size="w-6 h-6" textSize="text-[10px]" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-gray-900 dark:text-white truncate">{rName}</span>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">{rTime}</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    {reply.text || reply.content || reply.comment || ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Stats Section ─────────────────────────────────────────────────────────────

const GENDER_COLORS = {
  male:    "#3b82f6",
  female:  "#ec4899",
  other:   "#8b5cf6",
  unknown: "#9ca3af",
};

// ─── Heatmap Location Card ────────────────────────────────────────────────────

const HEATMAP_METRIC_OPTIONS = [
  { key: "views",               label: "Views",         color: { from: "#1e3a8a", mid: "#3b82f6", to: "#93c5fd" } },
  { key: "unique_viewers",      label: "Unique",        color: { from: "#4c1d95", mid: "#8b5cf6", to: "#c4b5fd" } },
  { key: "completed_views",     label: "Completed",     color: { from: "#065f46", mid: "#10b981", to: "#6ee7b7" } },
  { key: "rewarded_views",      label: "Rewarded",      color: { from: "#78350f", mid: "#f59e0b", to: "#fde68a" } },
  { key: "total_coins_rewarded",label: "Coins",         color: { from: "#7c2d12", mid: "#f97316", to: "#fed7aa" } },
];

const LocationHeatmap = ({ locationRows }) => {
  const [activeMetric, setActiveMetric] = useState("views");
  const [hoveredRow, setHoveredRow]     = useState(null);

  const metricDef = HEATMAP_METRIC_OPTIONS.find(m => m.key === activeMetric);
  const maxVal    = Math.max(...locationRows.map(r => r[activeMetric] || 0), 1);
  const totalVal  = locationRows.reduce((s, r) => s + (r[activeMetric] || 0), 0);

  // Heatmap intensity: 0..1
  const intensity = (val) => Math.pow((val || 0) / maxVal, 0.6); // power < 1 = softer scale

  // Color interpolation for heatmap cells
  const heatColor = (val) => {
    const t = intensity(val);
    // Returns CSS var-safe opacity-based color
    return { opacity: Math.max(0.08, t), value: val || 0 };
  };

  const METRICS_DETAIL = [
    { key: "views",                label: "Total",     suffix: "" },
    { key: "unique_viewers",       label: "Unique",    suffix: "" },
    { key: "completed_views",      label: "Completed", suffix: "" },
    { key: "rewarded_views",       label: "Rewarded",  suffix: "" },
    { key: "total_coins_rewarded", label: "Coins",     suffix: "🪙" },
  ];

  // Rank 1 = highest
  const ranked = [...locationRows].sort((a, b) => (b[activeMetric] || 0) - (a[activeMetric] || 0));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <MapPinned className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Views by Location</h3>
            <p className="text-xs text-gray-400 mt-0.5">{locationRows.length} locations tracked</p>
          </div>
        </div>
        {/* Metric pills */}
        <div className="flex gap-1.5 flex-wrap">
          {HEATMAP_METRIC_OPTIONS.map(m => (
            <button
              key={m.key}
              onClick={() => setActiveMetric(m.key)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                activeMetric === m.key
                  ? "bg-gray-900 dark:bg-white text-white dark:text-black shadow-sm"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="p-6">

        {/* Legend strip */}
        <div className="flex items-center gap-2 mb-5">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Low</span>
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{
            background: `linear-gradient(to right, ${metricDef.color.to}33, ${metricDef.color.mid}, ${metricDef.color.from})`
          }} />
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">High</span>
          <span className="text-[10px] text-gray-500 ml-2 font-semibold">Total: {totalVal.toLocaleString()}</span>
        </div>

        {/* Location rows as heatmap cards */}
        <div className="space-y-2">
          {ranked.map((row, rankIdx) => {
            const val    = row[activeMetric] || 0;
            const pct    = totalVal > 0 ? ((val / totalVal) * 100).toFixed(1) : "0.0";
            const heat   = heatColor(val);
            const isTop  = rankIdx === 0;
            const isHovered = hoveredRow === rankIdx;

            return (
              <div
                key={rankIdx}
                onMouseEnter={() => setHoveredRow(rankIdx)}
                onMouseLeave={() => setHoveredRow(null)}
                className={`relative rounded-2xl overflow-hidden border transition-all duration-200 cursor-pointer ${
                  isTop
                    ? "border-blue-200 dark:border-blue-800"
                    : "border-gray-100 dark:border-gray-800"
                } ${isHovered ? "scale-[1.005] shadow-md" : ""}`}
                style={{ background: isHovered ? undefined : undefined }}
              >
                {/* Heatmap fill layer */}
                <div
                  className="absolute inset-0 transition-opacity duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${metricDef.color.from}${Math.round(heat.opacity * 255).toString(16).padStart(2, "0")} 0%, ${metricDef.color.mid}${Math.round(heat.opacity * 0.6 * 255).toString(16).padStart(2, "0")} 60%, transparent 100%)`,
                  }}
                />

                {/* Progress bar at bottom */}
                <div className="absolute bottom-0 left-0 h-0.5 transition-all duration-700"
                  style={{
                    width: `${(val / maxVal) * 100}%`,
                    background: `linear-gradient(to right, ${metricDef.color.from}, ${metricDef.color.mid})`,
                    opacity: 0.7
                  }}
                />

                <div className="relative p-4">
                  <div className="flex items-center gap-3">
                    {/* Rank badge */}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${
                      rankIdx === 0 ? "bg-blue-600 text-white" :
                      rankIdx === 1 ? "bg-purple-500 text-white" :
                      rankIdx === 2 ? "bg-pink-500 text-white" :
                      "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    }`}>
                      {rankIdx + 1}
                    </div>

                    {/* Location + metric cells */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        {/* Location name */}
                        <div className="flex items-center gap-1.5 min-w-0 sm:w-40 flex-shrink-0">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{row.location}</span>
                        </div>

                        {/* Metric cells */}
                        <div className="flex flex-wrap gap-2 flex-1">
                          {METRICS_DETAIL.map(m => {
                            const v = row[m.key] || 0;
                            const isActive = m.key === activeMetric;
                            return (
                              <div key={m.key} className={`flex flex-col items-start px-2.5 py-1.5 rounded-xl transition-all ${
                                isActive
                                  ? "bg-gray-900 dark:bg-white"
                                  : "bg-white/60 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700"
                              }`}>
                                <span className={`text-[9px] font-bold uppercase tracking-wider ${
                                  isActive ? "text-gray-400 dark:text-gray-600" : "text-gray-400 dark:text-gray-500"
                                }`}>{m.label}</span>
                                <span className={`text-xs font-black ${
                                  isActive ? "text-white dark:text-gray-900" : "text-gray-800 dark:text-gray-200"
                                }`}>
                                  {m.suffix}{v.toLocaleString()}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Pct share */}
                        <div className="flex-shrink-0 text-right">
                          <div className="text-lg font-black text-gray-900 dark:text-white leading-none">{pct}%</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">share</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals footer */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-5 gap-2">
          {METRICS_DETAIL.map(m => (
            <div key={m.key} className={`text-center py-2 rounded-xl ${
              m.key === activeMetric ? "bg-gray-100 dark:bg-gray-800" : ""
            }`}>
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">{m.label}</div>
              <div className="text-xs font-black text-gray-900 dark:text-white">
                {m.suffix}{locationRows.reduce((s, r) => s + (r[m.key] || 0), 0).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Likes & Dislikes Panel ───────────────────────────────────────────────────

const LikesDislikesPanel = ({ stats }) => {
  const [activeGender, setActiveGender] = useState(null); // null = all

  const totalLikes    = stats.likes?.total    || 0;
  const totalDislikes = stats.dislikes?.total || 0;
  const totalReactions = totalLikes + totalDislikes;
  const likesPct   = totalReactions > 0 ? (totalLikes    / totalReactions) * 100 : 0;
  const dislikesPct = totalReactions > 0 ? (totalDislikes / totalReactions) * 100 : 0;

  const likesByGender    = stats.likes?.by_gender    || {};
  const dislikesByGender = stats.dislikes?.by_gender || {};
  const genderKeys = [...new Set([...Object.keys(likesByGender), ...Object.keys(dislikesByGender)])];

  const genderConfig = {
    male:    { label: "Male",    color: "#3b82f6", bg: "bg-blue-500",   bgLight: "bg-blue-50 dark:bg-blue-900/20",   text: "text-blue-600 dark:text-blue-400"   },
    female:  { label: "Female",  color: "#ec4899", bg: "bg-pink-500",   bgLight: "bg-pink-50 dark:bg-pink-900/20",   text: "text-pink-600 dark:text-pink-400"   },
    other:   { label: "Other",   color: "#8b5cf6", bg: "bg-purple-500", bgLight: "bg-purple-50 dark:bg-purple-900/20",text: "text-purple-600 dark:text-purple-400" },
    unknown: { label: "Unknown", color: "#9ca3af", bg: "bg-gray-400",   bgLight: "bg-gray-50 dark:bg-gray-800",      text: "text-gray-500 dark:text-gray-400"   },
  };

  // Filtered counts based on active gender
  const filteredLikes    = activeGender ? (likesByGender[activeGender]?.count    || 0) : totalLikes;
  const filteredDislikes = activeGender ? (dislikesByGender[activeGender]?.count || 0) : totalDislikes;
  const filteredTotal    = filteredLikes + filteredDislikes;
  const filteredLikesPct = filteredTotal > 0 ? (filteredLikes / filteredTotal) * 100 : 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center">
            <Heart className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Likes & Dislikes</h3>
            <p className="text-xs text-gray-400 mt-0.5">{totalReactions.toLocaleString()} total reactions</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-7">

        {/* ── Big sentiment bar ─────────────────────────────────────── */}
        <div>
          <div className="flex justify-between items-end mb-2">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-500" />
              <span className="text-2xl font-black text-gray-900 dark:text-white">{filteredLikes.toLocaleString()}</span>
              <span className="text-sm text-gray-400">likes</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">dislikes</span>
              <span className="text-2xl font-black text-gray-900 dark:text-white">{filteredDislikes.toLocaleString()}</span>
              <ThumbsDown className="w-4 h-4 text-red-400" />
            </div>
          </div>

          {/* Split bar */}
          <div className="h-4 rounded-full overflow-hidden flex bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full bg-gradient-to-r from-pink-500 to-rose-400 transition-all duration-700 flex items-center justify-end pr-2"
              style={{ width: `${filteredLikesPct}%`, minWidth: filteredLikes > 0 ? "2%" : "0%" }}
            >
              {filteredLikesPct > 20 && (
                <span className="text-[10px] font-black text-white">{Math.round(filteredLikesPct)}%</span>
              )}
            </div>
            <div
              className="h-full bg-gradient-to-r from-red-400 to-red-500 transition-all duration-700 flex items-center justify-start pl-2"
              style={{ width: `${100 - filteredLikesPct}%`, minWidth: filteredDislikes > 0 ? "2%" : "0%" }}
            >
              {(100 - filteredLikesPct) > 20 && (
                <span className="text-[10px] font-black text-white">{Math.round(100 - filteredLikesPct)}%</span>
              )}
            </div>
          </div>

          <div className="flex justify-between text-[10px] text-gray-400 mt-1.5 font-semibold">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-pink-500" /> Likes
            </span>
            <span className="flex items-center gap-1">
              Dislikes <div className="w-2 h-2 rounded-full bg-red-500" />
            </span>
          </div>
        </div>

        {/* ── Gender filter pills ───────────────────────────────────── */}
        {genderKeys.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Filter by Gender</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveGender(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  activeGender === null
                    ? "bg-gray-900 dark:bg-white text-white dark:text-black border-transparent"
                    : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                All
              </button>
              {genderKeys.map(g => {
                const cfg = genderConfig[g] || genderConfig.unknown;
                const isActive = activeGender === g;
                return (
                  <button
                    key={g}
                    onClick={() => setActiveGender(isActive ? null : g)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${
                      isActive
                        ? "border-transparent text-white"
                        : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                    style={isActive ? { backgroundColor: cfg.color } : {}}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Gender breakdown grid ─────────────────────────────────── */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">By Gender</p>
          <div className="space-y-2.5">
            {genderKeys.map(g => {
              const cfg     = genderConfig[g] || genderConfig.unknown;
              const lCount  = likesByGender[g]?.count    || 0;
              const dCount  = dislikesByGender[g]?.count || 0;
              const gTotal  = lCount + dCount;
              const lPct    = gTotal > 0 ? (lCount / gTotal) * 100 : 0;
              const isActive = activeGender === g || activeGender === null;

              return (
                <div
                  key={g}
                  onClick={() => setActiveGender(activeGender === g ? null : g)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                    activeGender === g
                      ? "border-gray-300 dark:border-gray-600 shadow-sm"
                      : activeGender !== null
                      ? "border-gray-100 dark:border-gray-800 opacity-50"
                      : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                      <span className="text-sm font-bold text-gray-900 dark:text-white capitalize">{g}</span>
                    </div>
                    <span className="text-xs text-gray-400 font-semibold">{gTotal.toLocaleString()} reactions</span>
                  </div>

                  {/* Mini split bar */}
                  <div className="h-2 rounded-full overflow-hidden flex bg-gray-100 dark:bg-gray-800 mb-2">
                    <div
                      className="h-full transition-all duration-500"
                      style={{ width: `${lPct}%`, backgroundColor: "#ec4899", minWidth: lCount > 0 ? "2%" : "0%" }}
                    />
                    <div
                      className="h-full transition-all duration-500"
                      style={{ width: `${100 - lPct}%`, backgroundColor: "#ef4444", minWidth: dCount > 0 ? "2%" : "0%" }}
                    />
                  </div>

                  <div className="flex justify-between text-xs">
                    <span className="text-pink-500 font-bold flex items-center gap-1">
                      <Heart className="w-3 h-3" /> {lCount.toLocaleString()}
                      <span className="text-gray-400 font-normal ml-0.5">({Math.round(lPct)}%)</span>
                    </span>
                    <span className="text-red-400 font-bold flex items-center gap-1">
                      <span className="text-gray-400 font-normal mr-0.5">({Math.round(100 - lPct)}%)</span>
                      {dCount.toLocaleString()} <ThumbsDown className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Sentiment score ───────────────────────────────────────── */}
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Sentiment Score</p>
              <p className="text-3xl font-black text-gray-900 dark:text-white">
                {totalReactions > 0 ? Math.round((filteredLikes / (filteredLikes + filteredDislikes)) * 100) : 0}
                <span className="text-sm font-normal text-gray-400 ml-1">/ 100</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {(() => {
                  const s = filteredTotal > 0 ? (filteredLikes / filteredTotal) * 100 : 0;
                  if (s >= 80) return "Excellent reception";
                  if (s >= 60) return "Good reception";
                  if (s >= 40) return "Mixed reception";
                  return "Low positive reception";
                })()}
              </p>
            </div>
            {/* Donut mini */}
            <div className="relative w-16 h-16">
              <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                <circle cx="32" cy="32" r="26" fill="none" strokeWidth="8" stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
                <circle
                  cx="32" cy="32" r="26" fill="none" strokeWidth="8"
                  stroke="#ec4899"
                  strokeDasharray={`${(filteredLikesPct / 100) * 163.4} 163.4`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Heart className="w-4 h-4 text-pink-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Stats Section ─────────────────────────────────────────────────────────────

const StatsSection = ({ adId }) => {
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  useEffect(() => {
    if (!adId) return;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/ads/${adId}/stats`);
        setStats(res.data);
      } catch (err) {
        console.error("Stats fetch failed", err);
        setError(err?.response?.data?.message || "Failed to load stats");
      } finally {
        setLoading(false);
      }
    })();
  }, [adId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
        <RefreshCw className="w-5 h-5 animate-spin text-pink-500" />
        <span className="text-sm">Loading stats...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-5 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (!stats) return null;

  const viewStats = [
    { label: "Total Views",     value: stats.views?.total     || 0, color: "blue",   icon: Eye         },
    { label: "Unique Views",    value: stats.views?.unique    || 0, color: "purple", icon: Users       },
    { label: "Completed Views", value: stats.views?.completed || 0, color: "green",  icon: CheckCircle },
  ];

  const locationRows = stats.views?.by_location || [];

  return (
    <div className="space-y-8">

      {/* ── Views Stat Cards ─────────────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-500" /> Views Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {viewStats.map((s, i) => (
            <StatCard key={i} label={s.label} value={s.value.toLocaleString()} color={s.color} icon={s.icon} />
          ))}
        </div>
      </div>

      {/* ── Likes & Dislikes ─────────────────────────────────────────────── */}
      <LikesDislikesPanel stats={stats} />

      {/* ── Audience gender pie (remains from recharts) ───────────────────── */}
      {(() => {
        const genderPieData = Object.entries(stats.likes?.by_gender || {})
          .map(([key, val]) => ({ name: key.charAt(0).toUpperCase() + key.slice(1), value: val?.count || 0 }))
          .filter(d => d.value > 0);
        if (!genderPieData.length) return null;
        const total = genderPieData.reduce((s, d) => s + d.value, 0);
        return (
          <Card title="Audience by Gender" icon={PieIcon}>
            <p className="text-xs text-gray-400 -mt-2 mb-4">Based on who liked this ad</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderPieData}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {genderPieData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={GENDER_COLORS[entry.name.toLowerCase()] || "#6366f1"}
                          stroke="none"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: "12px" }}
                      formatter={(value, name) => [`${value} users`, name]}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={10}
                      formatter={(value) => <span style={{ fontSize: "11px", color: "#9ca3af" }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {genderPieData.map((item) => {
                  const pct   = total > 0 ? Math.round((item.value / total) * 100) : 0;
                  const color = GENDER_COLORS[item.name.toLowerCase()] || "#6366f1";
                  return (
                    <div key={item.name} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 capitalize">{item.name}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                          </div>
                          <span className="text-[10px] font-bold text-gray-500 whitespace-nowrap">{pct}%</span>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{item.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        );
      })()}

      {/* ── Location Heatmap ─────────────────────────────────────────────── */}
      {locationRows.length > 0 && <LocationHeatmap locationRows={locationRows} />}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdDetails() {
  const { adId }   = useParams();
  const navigate   = useNavigate();

  const [ad, setAd]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

  const [comments, setComments]               = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsPage, setCommentsPage]       = useState(1);
  const [commentsTotal, setCommentsTotal]     = useState(0);
  const COMMENTS_PER_PAGE = 5;

  const [showAllLikes, setShowAllLikes] = useState(false);

  // Tab state for right panel
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "stats"

  // Wallet / Ad transaction history
  const [walletHistory, setWalletHistory]   = useState(null);
  const [walletLoading, setWalletLoading]   = useState(false);
  const [walletError, setWalletError]       = useState("");
  const [walletPage, setWalletPage]         = useState(1);
  const WALLET_PER_PAGE = 5;

  const COLORS = ["#3b82f6", "#ec4899", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444"];

  // Fetch Ad
  useEffect(() => {
    if (!adId) return;
    (async () => {
      setLoading(true); setError("");
      try {
        const res = await api.get(`/ads/${adId}`);
        setAd(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load ad details. Please try again.");
      } finally { setLoading(false); }
    })();
  }, [adId]);

  // Fetch Comments (paginated)
  useEffect(() => {
    if (!adId) return;
    (async () => {
      setCommentsLoading(true);
      try {
        const res = await api.get(`/ads/${adId}/comments`, {
          params: { page: commentsPage, limit: COMMENTS_PER_PAGE },
        });
        const data  = Array.isArray(res.data) ? res.data : res.data?.comments || res.data?.data || [];
        const total = res.data?.total || res.data?.totalCount || data.length;
        setComments(data);
        setCommentsTotal(total);
      } catch (err) { console.error("Comments fetch failed", err); setComments([]); }
      finally { setCommentsLoading(false); }
    })();
  }, [adId, commentsPage]);

  // Fetch Wallet / Ad Transaction History
  useEffect(() => {
    if (!adId) return;
    (async () => {
      setWalletLoading(true); setWalletError("");
      try {
        const res = await api.get(`/wallet/ads/${adId}/history`, {
          params: { page: walletPage, limit: WALLET_PER_PAGE },
        });
        setWalletHistory(res.data);
      } catch (err) {
        setWalletError(err?.response?.data?.message || "Failed to load transaction history");
      } finally { setWalletLoading(false); }
    })();
  }, [adId, walletPage]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading ad details...</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error || !ad) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Failed to Load</h2>
          <p className="text-gray-500 mb-6">{error || "Ad not found."}</p>
          <button onClick={() => navigate("/vendor/ads-management")}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors">
            Back to Ads Management
          </button>
        </div>
      </div>
    );
  }

  // ── Derived values ───────────────────────────────────────────────────────
  const status         = ad.status || "draft";
  const media          = ad.media?.[0] || null;
  const thumbnail      = media?.thumbnails?.[0]?.fileUrl || null;
  const isVideo        = media?.media_type === "video";
  const totalBudget    = ad.total_budget_coins || 0;
  const coinsSpent     = ad.total_coins_spent  || 0;
  const coinsRemaining = totalBudget - coinsSpent;
  const spendPct       = totalBudget > 0 ? Math.round((coinsSpent / totalBudget) * 100) : 0;

  const likesList    = Array.isArray(ad.likes)    ? ad.likes    : [];
  const dislikesList = Array.isArray(ad.dislikes) ? ad.dislikes : [];
  const visibleLikes = showAllLikes ? likesList : likesList.slice(0, 8);

  const engagementData = [
    { name: "Likes",    value: ad.likes_count    || 0 },
    { name: "Dislikes", value: ad.dislikes_count || 0 },
    { name: "Comments", value: ad.comments_count || 0 },
  ].filter(d => d.value > 0);

  const totalCommentPages = Math.max(1, Math.ceil(commentsTotal / COMMENTS_PER_PAGE));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans transition-colors duration-300">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="pb-20 pt-2">

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => navigate("/vendor/ads-management")}
              className="p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm flex-shrink-0">
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{ad.caption || "Ad Details"}</h1>
                <Badge status={status} />
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">ID: {ad._id}</span>
                <span>•</span>
                <span>{new Date(ad.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
              </div>
            </div>
          </div>

          {/* ── Tab Navigation ────────────────────────────────────────── */}
          <div className="flex gap-1 mb-8 bg-white dark:bg-gray-900 p-1 rounded-2xl border border-gray-100 dark:border-gray-800 w-fit shadow-sm">
            {[
              { id: "overview", label: "Overview",   icon: BarChart2  },
              { id: "stats",    label: "Stats & Analytics", icon: Activity },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* OVERVIEW TAB                                                    */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* ── LEFT COLUMN (2/3) ──────────────────────────────────── */}
              <div className="lg:col-span-2 space-y-8">

                {/* Media Preview */}
                {media && (
                  <Card title="Media Preview">
                    <div className="flex flex-col sm:flex-row gap-6 items-start">
                      <div className="relative w-36 flex-shrink-0 rounded-xl overflow-hidden bg-black" style={{ aspectRatio: "9/16" }}>
                        {thumbnail ? (
                          <img src={thumbnail} alt="thumbnail" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">
                            <Film className="w-8 h-8" />
                          </div>
                        )}
                        {isVideo && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center shadow">
                              <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[10px] border-l-gray-800 ml-1" />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <InfoRow icon={Film} label="Type"   value={media.media_type} />
                        <InfoRow icon={Film} label="File"   value={media.fileName} mono />
                        {isVideo && media.video_meta && (
                          <>
                            <InfoRow icon={Clock} label="Duration"   value={`${media.video_meta.final_duration?.toFixed(2)}s`} />
                            <InfoRow icon={Clock} label="Original"   value={`${media.video_meta.original_length_seconds?.toFixed(2)}s`} />
                            <InfoRow icon={Clock} label="Trim Range" value={`${media.video_meta.selected_start?.toFixed(2)}s – ${media.video_meta.selected_end?.toFixed(2)}s`} />
                          </>
                        )}
                        {media.crop_settings && (
                          <InfoRow icon={BarChart2} label="Aspect Ratio" value={media.crop_settings.aspect_ratio} />
                        )}
                        {media.image_editing?.filter?.name && (
                          <InfoRow icon={Tag} label="Filter" value={media.image_editing.filter.name} />
                        )}
                        <div className="pt-3">
                          <a href={media.fileUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors">
                            <Eye className="w-3.5 h-3.5" /> Open Media
                          </a>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <StatCard label="Total Views"     value={(ad.views_count           || 0).toLocaleString()} icon={Eye}           color="blue"   />
                  <StatCard label="Unique Views"    value={(ad.unique_views_count    || 0).toLocaleString()} icon={Users}         color="purple" />
                  <StatCard label="Completed Views" value={(ad.completed_views_count || 0).toLocaleString()} icon={CheckCircle}   color="green"  />
                  <StatCard label="Likes"           value={(ad.likes_count           || 0).toLocaleString()} icon={Heart}         color="pink"   />
                  <StatCard label="Dislikes"        value={(ad.dislikes_count        || 0).toLocaleString()} icon={ThumbsDown}    color="red"    />
                  <StatCard label="Comments"        value={(ad.comments_count        || 0).toLocaleString()} icon={MessageCircle} color="orange" />
                </div>

                {/* Ad Information */}
                <Card title="Ad Information">
                  <InfoRow icon={Hash}        label="Caption"      value={ad.caption}      />
                  <InfoRow icon={Tag}         label="Category"     value={ad.category}     />
                  <InfoRow icon={Film}        label="Content Type" value={ad.content_type} />
                  <InfoRow icon={MapPin}      label="Location"     value={ad.location}     />
                  <InfoRow icon={AlertCircle} label="Status"       value={<Badge status={ad.status} />} />
                  {ad.rejection_reason && (
                    <InfoRow icon={AlertCircle} label="Reject Reason" value={ad.rejection_reason} />
                  )}
                  <InfoRow icon={Clock} label="Created At" value={new Date(ad.createdAt).toLocaleString("en-IN")} />
                  <InfoRow icon={Clock} label="Updated At" value={new Date(ad.updatedAt).toLocaleString("en-IN")} />
                </Card>

                {/* Targeting Settings */}
                <Card title="Targeting Settings">
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wide">
                          <Globe className="w-3.5 h-3.5" /> Target Languages
                        </div>
                        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full font-semibold">
                          {(ad.target_language || []).length}
                        </span>
                      </div>
                      <TagList items={ad.target_language} color="blue" />
                    </div>
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wide">
                          <MapPin className="w-3.5 h-3.5" /> Target Locations
                        </div>
                        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full font-semibold">
                          {(ad.target_location || []).length}
                        </span>
                      </div>
                      <TagList items={ad.target_location} color="purple" />
                    </div>
                    {(ad.target_preferences || []).length > 0 && (
                      <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                          <Tag className="w-3.5 h-3.5" /> Preferences
                        </div>
                        <TagList items={ad.target_preferences} color="green" />
                      </div>
                    )}
                    {(ad.hashtags || []).length > 0 && (
                      <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                          <Hash className="w-3.5 h-3.5" /> Hashtags
                        </div>
                        <TagList items={ad.hashtags} color="green" />
                      </div>
                    )}
                  </div>
                </Card>

                {/* Engagement Controls */}
                <Card title="Engagement Controls">
                  <div className="space-y-3">
                    {[
                      { label: "Hide Likes Count", value: ad.engagement_controls?.hide_likes_count },
                      { label: "Disable Comments", value: ad.engagement_controls?.disable_comments  },
                    ].map((ctrl, i) => (
                      <div key={i} className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{ctrl.label}</span>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${ctrl.value
                          ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                          : "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"}`}>
                          {ctrl.value ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Comments Section */}
                <Card title={`Comments (${commentsTotal || ad.comments_count || 0})`}>
                  {commentsLoading ? (
                    <div className="flex items-center justify-center py-10 gap-3 text-gray-400">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span className="text-sm">Loading comments...</span>
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No comments yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {comments.map(comment => <CommentItem key={comment._id} comment={comment} />)}
                    </div>
                  )}
                  {totalCommentPages > 1 && (
                    <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <button onClick={() => setCommentsPage(p => Math.max(1, p - 1))}
                        disabled={commentsPage === 1 || commentsLoading}
                        className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                        ← Prev
                      </button>
                      <span className="text-xs text-gray-500">Page {commentsPage} of {totalCommentPages}</span>
                      <button onClick={() => setCommentsPage(p => Math.min(totalCommentPages, p + 1))}
                        disabled={commentsPage === totalCommentPages || commentsLoading}
                        className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                        Next →
                      </button>
                    </div>
                  )}
                </Card>
              </div>

              {/* ── RIGHT COLUMN (1/3) ──────────────────────────────────── */}
              <div className="space-y-8">

                {/* Publisher Info */}
                <Card title="Publisher">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar name={ad.user_id?.full_name || "U"} url={ad.user_id?.avatar_url || ""} size="w-12 h-12" textSize="text-sm" />
                    <div>
                      <div className="font-bold text-sm text-gray-900 dark:text-white">{ad.user_id?.full_name || "—"}</div>
                      <div className="text-xs text-gray-500">@{ad.user_id?.username || "—"}</div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      <span className="font-bold uppercase tracking-wide">Business</span>
                    </div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">{ad.vendor_id?.business_name || "—"}</div>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      ad.vendor_id?.validated
                        ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                        : "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:border-gray-700"}`}>
                      {ad.vendor_id?.validated ? "✓ Verified" : "Unverified"}
                    </span>
                  </div>
                </Card>

                {/* Budget & Coins */}
                <Card title="Budget & Coins">
                  <div className="relative p-5 rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white overflow-hidden mb-5 shadow-lg">
                    <div className="absolute top-0 right-0 w-28 h-28 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10">
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Total Budget</div>
                      <div className="text-3xl font-extrabold mb-4 tracking-tight flex items-center gap-2">
                        <Coins className="w-6 h-6 text-yellow-400" />
                        {totalBudget.toLocaleString()}
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/10">
                        <div>
                          <div className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">Spent</div>
                          <div className="font-bold text-base text-red-400">{coinsSpent.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">Remaining</div>
                          <div className="font-bold text-base text-emerald-400">{coinsRemaining.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span>Budget Used</span>
                      <span className="font-bold">{spendPct}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                      <div className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all" style={{ width: `${spendPct}%` }} />
                    </div>
                  </div>
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                      <span>Coins Reward</span>
                      <span className="font-semibold text-gray-800 dark:text-white">{ad.coins_reward ?? 0}</span>
                    </div>
                  </div>
                </Card>

                {/* Engagement Pie */}
                <Card title="Engagement Breakdown">
                  {engagementData.length > 0 ? (
                    <div className="h-52 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={engagementData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                            {engagementData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: "8px" }} />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No engagement data yet</p>
                    </div>
                  )}
                </Card>

                {/* Views Breakdown */}
                <Card title="Views Breakdown">
                  <div className="space-y-2">
                    {[
                      { label: "Total Views",     value: ad.views_count           || 0, color: "bg-blue-500"   },
                      { label: "Unique Views",    value: ad.unique_views_count    || 0, color: "bg-purple-500" },
                      { label: "Completed Views", value: ad.completed_views_count || 0, color: "bg-green-500"  },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${item.color}`} />
                          {item.label}
                        </div>
                        <span className="font-bold text-sm text-gray-900 dark:text-white">{item.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Action Breakdown from wallet history */}
                {walletHistory?.actions && (
                  <Card title="Action Breakdown">
                    <div className="space-y-2">
                      {[
                        { label: "Views",    data: walletHistory.actions.views,    color: "bg-blue-500",   icon: "👁️" },
                        { label: "Likes",    data: walletHistory.actions.likes,    color: "bg-pink-500",   icon: "❤️" },
                        { label: "Comments", data: walletHistory.actions.comments, color: "bg-orange-500", icon: "💬" },
                        { label: "Replies",  data: walletHistory.actions.replies,  color: "bg-purple-500", icon: "↩️" },
                        { label: "Saves",    data: walletHistory.actions.saves,    color: "bg-green-500",  icon: "🔖" },
                        { label: "Refunds",  data: walletHistory.actions.refunds,  color: "bg-red-500",    icon: "↩" },
                      ].filter(a => a.data?.count > 0).map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${item.color}`} />
                            <span>{item.icon} {item.label}</span>
                            <span className="text-xs text-gray-400">×{item.data.count}</span>
                          </div>
                          <span className="font-bold text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5" />{item.data.total_coins.toLocaleString()}
                          </span>
                        </div>
                      ))}
                      {walletHistory.unique_users > 0 && (
                        <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 mt-2">
                          <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
                            <UserCheck className="w-4 h-4" /> Unique Users Reached
                          </div>
                          <span className="font-bold text-sm text-indigo-700 dark:text-indigo-300">
                            {walletHistory.unique_users.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Likes & Dislikes */}
                <Card title={`Likes (${ad.likes_count || 0})`}
                  action={likesList.length > 8 && (
                    <button onClick={() => setShowAllLikes(v => !v)}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                      {showAllLikes ? "Show Less" : `View All ${likesList.length}`}
                    </button>
                  )}>
                  {likesList.length === 0 ? (
                    <div className="text-center py-6 text-gray-400">
                      <Heart className="w-7 h-7 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No likes yet</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {visibleLikes.map((like, i) => {
                        const u    = like.user_id || like.user || like;
                        const name = u.full_name || u.username || `User ${i + 1}`;
                        return (
                          <div key={like._id || i} className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-pink-50 dark:hover:bg-pink-900/10 transition-colors">
                            <Avatar name={name} url={u.avatar_url || ""} size="w-7 h-7" textSize="text-[10px]" />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">{name}</div>
                              {u.username && <div className="text-[10px] text-gray-400 truncate">@{u.username}</div>}
                            </div>
                            <Heart className="w-3 h-3 text-pink-500 flex-shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {dislikesList.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                        <ThumbsDown className="w-3.5 h-3.5 text-red-400" /> Dislikes ({ad.dislikes_count || dislikesList.length})
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {dislikesList.slice(0, 6).map((dislike, i) => {
                          const u    = dislike.user_id || dislike.user || dislike;
                          const name = u.full_name || u.username || `User ${i + 1}`;
                          return (
                            <div key={dislike._id || i} className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                              <Avatar name={name} url={u.avatar_url || ""} size="w-7 h-7" textSize="text-[10px]" />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">{name}</div>
                                {u.username && <div className="text-[10px] text-gray-400 truncate">@{u.username}</div>}
                              </div>
                              <ThumbsDown className="w-3 h-3 text-red-400 flex-shrink-0" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* STATS & ANALYTICS TAB                                          */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {activeTab === "stats" && (
            <StatsSection adId={adId} />
          )}

          {/* ── Ad Transaction History (always visible, below tabs) ──────── */}
          <div className="mt-8">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-pink-500" /> Transaction History
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">All coin movements for this ad</p>
                </div>
                {walletHistory?.budget && (
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Budget</div>
                      <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-yellow-500" />
                        {(walletHistory.budget.total_budget_coins || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Spent</div>
                      <div className="font-bold text-red-500 flex items-center gap-1">
                        <TrendingDown className="w-3.5 h-3.5" />
                        {(walletHistory.budget.total_coins_spent || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Remaining</div>
                      <div className="font-bold text-green-600 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        {(walletHistory.budget.balance_remaining || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="w-28">
                      <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                        <span>Used</span>
                        <span className="font-bold">{Math.round(walletHistory.budget.spent_percentage || 0)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-pink-500"
                          style={{ width: `${Math.min(100, walletHistory.budget.spent_percentage || 0)}%` }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {walletLoading ? (
                <div className="flex items-center justify-center py-14 gap-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-pink-500" />
                  <span className="text-sm text-gray-400">Loading transactions…</span>
                </div>
              ) : walletError ? (
                <div className="flex items-center justify-center py-14 gap-3 text-red-500">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{walletError}</span>
                </div>
              ) : !walletHistory?.transactions?.length ? (
                <div className="flex flex-col items-center justify-center py-14 gap-3 text-gray-400">
                  <Wallet className="w-10 h-10 opacity-30" />
                  <p className="text-sm font-medium">No transactions yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                        {["User", "Transaction", "Amount", "Direction", "Status", "Date"].map(h => (
                          <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {walletHistory.transactions.map((tx) => {
                        const u = tx.user || {};
                        const userName = u.full_name || u.username || "User";
                        return (
                          <tr key={tx._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2.5">
                                {u.avatar_url ? (
                                  <img src={u.avatar_url} alt={userName} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                    {userName[0]?.toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">{userName}</div>
                                  {u.username && <div className="text-[10px] text-gray-400 truncate">@{u.username}</div>}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">{tx.label || tx.type || "—"}</div>
                              {tx.description && <div className="text-[10px] text-gray-400 mt-0.5 max-w-[180px] truncate">{tx.description}</div>}
                            </td>
                            <td className="px-5 py-3">
                              <span className={`text-sm font-bold flex items-center gap-1 ${tx.direction === "credit" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                <Coins className="w-3.5 h-3.5 text-yellow-500" />
                                {tx.direction === "credit" ? "+" : "-"}{Number(tx.amount).toLocaleString()}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                tx.direction === "credit"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                                {tx.direction === "credit" ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                {tx.direction === "credit" ? "Credit" : "Debit"}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                                tx.status === "SUCCESS" ? "text-green-600 dark:text-green-400"
                                : tx.status === "FAILED" ? "text-red-600 dark:text-red-400"
                                : "text-amber-600 dark:text-amber-400"}`}>
                                {tx.status === "SUCCESS" ? "✓" : tx.status === "FAILED" ? "✗" : "⏳"} {tx.status}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                              {tx.created_at ? new Date(tx.created_at).toLocaleString("en-IN", {
                                day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                              }) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {(() => {
                const txTotal = walletHistory?.pagination?.total ?? (walletHistory?.transactions?.length ?? 0);
                const totalPg = Math.ceil(txTotal / WALLET_PER_PAGE);
                if (!walletHistory || totalPg <= 1) return null;
                const windowSize = Math.min(5, totalPg);
                let start = Math.max(1, walletPage - Math.floor(windowSize / 2));
                let end = start + windowSize - 1;
                if (end > totalPg) { end = totalPg; start = Math.max(1, end - windowSize + 1); }
                const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);
                return (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-xs text-gray-400">Page {walletPage} of {totalPg} · {txTotal} transactions</span>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setWalletPage(p => Math.max(1, p - 1))} disabled={walletPage === 1 || walletLoading}
                        className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      {pages.map(p => (
                        <button key={p} onClick={() => setWalletPage(p)}
                          className={`w-8 h-8 rounded-xl text-xs font-bold transition-colors ${
                            walletPage === p
                              ? "bg-gradient-to-r from-pink-600 to-orange-500 text-white shadow-sm"
                              : "border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"}`}>
                          {p}
                        </button>
                      ))}
                      <button onClick={() => setWalletPage(p => Math.min(totalPg, p + 1))} disabled={walletPage === totalPg || walletLoading}
                        className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}