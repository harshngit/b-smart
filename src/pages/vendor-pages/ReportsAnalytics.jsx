import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import api from "../../lib/api";
import {
  BarChart2, Download, FileText, Mail, Filter, RefreshCw,
  ChevronDown, X, Loader2, AlertCircle, CheckCircle2,
  TrendingUp, TrendingDown, MousePointerClick, Users,
  Globe, DollarSign, Calendar, Target, Eye, Heart,
  Share2, Clock, Zap, ArrowUpRight, ArrowDownRight,
  Table, FileDown, Send, Bell, Search
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString("en-IN");
const fmtPct = (n) => `${Number(n || 0).toFixed(1)}%`;

// ─── Report types config ──────────────────────────────────────────────────────
const REPORT_TYPES = [
  {
    id: "performance",
    label: "Performance Summary",
    icon: TrendingUp,
    gradient: "from-orange-500 to-pink-600",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    iconColor: "text-orange-500",
    desc: "Overall campaign performance metrics",
    metrics: ["Impressions", "Clicks", "CTR", "Reach", "Frequency"],
  },
  {
    id: "click",
    label: "Click Report",
    icon: MousePointerClick,
    gradient: "from-blue-500 to-cyan-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    iconColor: "text-blue-500",
    desc: "Detailed click-through analysis",
    metrics: ["Total Clicks", "Unique Clicks", "CPC", "Click Rate", "Invalid Clicks"],
  },
  {
    id: "engagement",
    label: "Engagement Report",
    icon: Heart,
    gradient: "from-pink-500 to-rose-500",
    bg: "bg-pink-50 dark:bg-pink-900/20",
    iconColor: "text-pink-500",
    desc: "Likes, shares, comments & interactions",
    metrics: ["Likes", "Comments", "Shares", "Saves", "Engagement Rate"],
  },
  {
    id: "conversion",
    label: "Conversion Report",
    icon: Zap,
    gradient: "from-purple-500 to-violet-600",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    iconColor: "text-purple-500",
    desc: "Conversion tracking & ROI insights",
    metrics: ["Conversions", "Conversion Rate", "Cost per Conversion", "ROAS", "Revenue"],
  },
  {
    id: "geographic",
    label: "Geographic Report",
    icon: Globe,
    gradient: "from-green-500 to-teal-500",
    bg: "bg-green-50 dark:bg-green-900/20",
    iconColor: "text-green-500",
    desc: "Audience breakdown by location",
    metrics: ["Top Countries", "Top Cities", "Regional CTR", "Location Reach"],
  },
  {
    id: "financial",
    label: "Financial Report",
    icon: DollarSign,
    gradient: "from-amber-500 to-orange-500",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    iconColor: "text-amber-500",
    desc: "Spend, budget & billing summary",
    metrics: ["Total Spend", "Coins Used", "Budget Utilisation", "CPM", "Cost per Lead"],
  },
];

// ─── Date presets ─────────────────────────────────────────────────────────────
const DATE_PRESETS = [
  { label: "Today",        value: "today" },
  { label: "Yesterday",    value: "yesterday" },
  { label: "Last 7 days",  value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "This month",   value: "this_month" },
  { label: "Last month",   value: "last_month" },
  { label: "Custom",       value: "custom" },
];

// ─── Coin icon ────────────────────────────────────────────────────────────────
const CoinIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
    className="inline-block flex-shrink-0" style={{ verticalAlign: "-0.1em" }}>
    <circle cx="12" cy="12" r="10" fill="#F59E0B" />
    <circle cx="12" cy="12" r="8"  fill="#FBBF24" />
    <text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#92400E" fontFamily="serif">₹</text>
  </svg>
);

// ─── Portal helper ─────────────────────────────────────────────────────────────
const DropdownPortal = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
};

// ─── Dropdown component ────────────────────────────────────────────────────────
// Uses fixed positioning anchored to the button rect — never clipped by any parent
const Dropdown = ({ label, value, options, onChange, icon: Icon, className = "" }) => {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const btnRef = useRef(null);

  const openMenu = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setMenuStyle({
        position: "fixed",
        top: r.bottom + 4,
        left: r.left,
        width: r.width,
        minWidth: 180,
        zIndex: 9999,
      });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (btnRef.current && !btnRef.current.contains(e.target)) setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const selected = options.find(o => o.value === value);

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        onClick={() => open ? setOpen(false) : openMenu()}
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors w-full"
      >
        {Icon && <Icon size={14} className="text-gray-400 flex-shrink-0" />}
        <span className="flex-1 text-left truncate">{selected?.label || label}</span>
        <ChevronDown size={14} className={`text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <DropdownPortal>
          <div
            style={menuStyle}
            onMouseDown={e => e.stopPropagation()}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl"
          >
            <div className="max-h-52 overflow-auto py-1 rounded-xl">
              {options.map(opt => (
                <div key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`px-3.5 py-2.5 text-sm cursor-pointer transition-colors ${
                    opt.value === value
                      ? "text-pink-600 font-semibold bg-pink-50 dark:bg-pink-900/20"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}>
                  {opt.label}
                </div>
              ))}
            </div>
          </div>
        </DropdownPortal>
      )}
    </div>
  );
};

// ─── Metric Card ──────────────────────────────────────────────────────────────
const MetricCard = ({ label, value, change, changeType, icon: Icon, iconBg, sub }) => {
  const isUp = changeType === "up";
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon size={16} />
        </div>
        {change != null && (
          <span className={`flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${isUp ? "text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400" : "text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400"}`}>
            {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />} {Math.abs(change)}%
          </span>
        )}
      </div>
      <div className="text-xl font-black text-gray-900 dark:text-white">{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-1">{sub}</div>}
    </div>
  );
};

// ─── Report Card ──────────────────────────────────────────────────────────────
const ReportCard = ({ report, selected, onSelect, loading, data }) => {
  const Icon = report.icon;
  const isSelected = selected === report.id;
  return (
    <button onClick={() => onSelect(report.id)}
      className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${isSelected ? "border-transparent bg-gradient-to-br " + report.gradient + " text-white shadow-lg" : "border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-200 dark:hover:border-gray-700"}`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-white/20" : report.bg}`}>
          <Icon size={16} className={isSelected ? "text-white" : report.iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-bold truncate ${isSelected ? "text-white" : "text-gray-900 dark:text-white"}`}>{report.label}</div>
          <div className={`text-[11px] mt-0.5 truncate ${isSelected ? "text-white/70" : "text-gray-400"}`}>{report.desc}</div>
        </div>
        {loading && isSelected && <Loader2 size={14} className="animate-spin text-white flex-shrink-0 mt-0.5" />}
      </div>
    </button>
  );
};

// ─── Data Table (mock) ────────────────────────────────────────────────────────
const ReportTable = ({ report, data, loading }) => {
  if (loading) return (
    <div className="flex flex-col items-center py-12 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      <span className="text-sm text-gray-400">Loading report data…</span>
    </div>
  );
  if (!data || data.length === 0) return (
    <div className="flex flex-col items-center py-12 gap-3 text-gray-400">
      <BarChart2 size={36} className="opacity-30" />
      <p className="text-sm font-medium">No data for the selected filters</p>
      <p className="text-xs text-gray-300">Try adjusting your date range or filters</p>
    </div>
  );

  const cols = Object.keys(data[0] || {});
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            {cols.map(c => (
              <th key={c} className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-gray-400">{c.replace(/_/g, " ")}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
              {cols.map(c => (
                <td key={c} className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                  {typeof row[c] === "number" ? fmt(row[c]) : row[c]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Schedule Email Modal ─────────────────────────────────────────────────────
const ScheduleModal = ({ open, onClose, reportType }) => {
  const [email, setEmail] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [time, setTime] = useState("09:00");
  const [saved, setSaved] = useState(false);

  const handleSchedule = async () => {
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 2000);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden">
        <div className="sm:hidden flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" /></div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <div className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Mail size={16} className="text-pink-500" /> Schedule Email Report
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Get reports delivered to your inbox automatically</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          {saved && (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-3 py-2.5 rounded-xl text-sm font-semibold">
              <CheckCircle2 size={16} /> Schedule saved! You'll receive your first report soon.
            </div>
          )}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Frequency</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Send Time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500" />
            </div>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
            <div className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">Report Summary</div>
            <div className="text-xs text-gray-400">
              <span className="font-semibold text-gray-700 dark:text-gray-200">{REPORT_TYPES.find(r => r.id === reportType)?.label || "Selected Report"}</span>
              {" "}will be sent <span className="font-semibold text-gray-700 dark:text-gray-200">{frequency}</span> at <span className="font-semibold text-gray-700 dark:text-gray-200">{time}</span>
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl text-sm font-bold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">Cancel</button>
          <button onClick={handleSchedule} disabled={!email || saved}
            className="flex-1 py-3 rounded-2xl text-sm font-bold bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-lg shadow-pink-500/20 disabled:opacity-60 flex items-center justify-center gap-2">
            <Send size={14} /> Schedule Report
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Mock data generator ──────────────────────────────────────────────────────
const generateMockData = (reportId) => {
  if (reportId === "performance") return [
    { Date: "2025-01-01", Impressions: 12400, Clicks: 320, CTR: "2.58%", Reach: 9800, Frequency: "1.26" },
    { Date: "2025-01-02", Impressions: 15200, Clicks: 410, CTR: "2.70%", Reach: 11200, Frequency: "1.36" },
    { Date: "2025-01-03", Impressions: 11100, Clicks: 280, CTR: "2.52%", Reach: 8900, Frequency: "1.25" },
    { Date: "2025-01-04", Impressions: 18700, Clicks: 520, CTR: "2.78%", Reach: 14100, Frequency: "1.33" },
    { Date: "2025-01-05", Impressions: 21300, Clicks: 610, CTR: "2.86%", Reach: 16200, Frequency: "1.31" },
  ];
  if (reportId === "click") return [
    { Ad_Name: "Summer Sale",   Total_Clicks: 1240, Unique_Clicks: 980, CPC: "₹2.30", Click_Rate: "3.20%", Invalid: 12 },
    { Ad_Name: "Brand Boost",   Total_Clicks: 880,  Unique_Clicks: 720, CPC: "₹1.90", Click_Rate: "2.80%", Invalid: 8  },
    { Ad_Name: "New Arrivals",  Total_Clicks: 2100, Unique_Clicks: 1680, CPC: "₹1.60", Click_Rate: "4.10%", Invalid: 21 },
    { Ad_Name: "Flash Offer",   Total_Clicks: 560,  Unique_Clicks: 490, CPC: "₹3.10", Click_Rate: "2.20%", Invalid: 5  },
  ];
  if (reportId === "engagement") return [
    { Ad_Name: "Summer Sale",  Likes: 4200, Comments: 380, Shares: 210, Saves: 1100, Engagement_Rate: "8.40%" },
    { Ad_Name: "Brand Boost",  Likes: 2800, Comments: 210, Shares: 140, Saves: 680,  Engagement_Rate: "6.20%" },
    { Ad_Name: "New Arrivals", Likes: 6100, Comments: 540, Shares: 310, Saves: 1800, Engagement_Rate: "9.80%" },
  ];
  if (reportId === "conversion") return [
    { Ad_Name: "Summer Sale",  Conversions: 142, Conv_Rate: "11.45%", Cost_per_Conv: "₹18.40", ROAS: "4.2x", Revenue: "₹26,166" },
    { Ad_Name: "Brand Boost",  Conversions: 86,  Conv_Rate: "9.77%",  Cost_per_Conv: "₹21.20", ROAS: "3.8x", Revenue: "₹17,892" },
    { Ad_Name: "New Arrivals", Conversions: 218, Conv_Rate: "10.38%", Cost_per_Conv: "₹15.40", ROAS: "5.1x", Revenue: "₹33,578" },
  ];
  if (reportId === "geographic") return [
    { Country: "India",          Impressions: 48200, Clicks: 1240, CTR: "2.57%", Reach: 38400 },
    { Country: "United States",  Impressions: 12100, Clicks: 390, CTR: "3.22%", Reach: 9800  },
    { Country: "United Kingdom", Impressions: 6800,  Clicks: 210, CTR: "3.09%", Reach: 5600  },
    { Country: "UAE",            Impressions: 4200,  Clicks: 140, CTR: "3.33%", Reach: 3400  },
    { Country: "Singapore",      Impressions: 2900,  Clicks: 98,  CTR: "3.38%", Reach: 2400  },
  ];
  if (reportId === "financial") return [
    { Period: "Week 1", Total_Spend: "₹4,820", Coins_Used: 4820, Budget_Used: "48.2%", CPM: "₹12.40", Cost_per_Lead: "₹18.90" },
    { Period: "Week 2", Total_Spend: "₹5,610", Coins_Used: 5610, Budget_Used: "56.1%", CPM: "₹11.80", Cost_per_Lead: "₹16.40" },
    { Period: "Week 3", Total_Spend: "₹3,290", Coins_Used: 3290, Budget_Used: "32.9%", CPM: "₹13.10", Cost_per_Lead: "₹21.20" },
    { Period: "Week 4", Total_Spend: "₹6,880", Coins_Used: 6880, Budget_Used: "68.8%", CPM: "₹10.90", Cost_per_Lead: "₹14.80" },
  ];
  return [];
};

const SUMMARY_METRICS = [
  { label: "Total Impressions", value: "74,200", change: 12.4, changeType: "up", icon: Eye, iconBg: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400", sub: "vs last period" },
  { label: "Total Clicks", value: "2,080", change: 8.7, changeType: "up", icon: MousePointerClick, iconBg: "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400", sub: "avg CTR 2.80%" },
  { label: "Engagement Rate", value: "8.40%", change: 3.2, changeType: "up", icon: Heart, iconBg: "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400", sub: "likes + shares + saves" },
  { label: "Total Spend", value: "₹20,600", change: 5.1, changeType: "up", icon: DollarSign, iconBg: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400", sub: "coins deducted" },
  { label: "Conversions", value: "446", change: 14.8, changeType: "up", icon: Zap, iconBg: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400", sub: "ROAS 4.3x avg" },
  { label: "Reach", value: "59,600", change: 9.3, changeType: "up", icon: Users, iconBg: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400", sub: "unique users" },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ReportsAnalytics() {
  // Filters
  const [datePreset, setDatePreset]   = useState("30d");
  const [startDate, setStartDate]     = useState("");
  const [endDate, setEndDate]         = useState("");
  const [selectedAd, setSelectedAd]   = useState("all");
  const [country, setCountry]         = useState("all");
  const [language, setLanguage]       = useState("all");
  const [gender, setGender]           = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Report state
  const [selectedReport, setSelectedReport] = useState("performance");
  const [reportLoading, setReportLoading]   = useState(false);
  const [reportData, setReportData]         = useState(generateMockData("performance"));
  const [scheduleOpen, setScheduleOpen]     = useState(false);
  const [exportMsg, setExportMsg]           = useState("");

  const activeFiltersCount = [
    selectedAd !== "all", country !== "all",
    language !== "all", gender !== "all",
    datePreset === "custom" && (startDate || endDate),
  ].filter(Boolean).length;

  // Simulate data load when report type changes
  const loadReport = useCallback((reportId) => {
    setSelectedReport(reportId);
    setReportLoading(true);
    setTimeout(() => {
      setReportData(generateMockData(reportId));
      setReportLoading(false);
    }, 800);
  }, []);

  const handleDownloadPDF = () => {
    setExportMsg("PDF download started…");
    setTimeout(() => setExportMsg(""), 3000);
  };

  const handleExportCSV = () => {
    if (!reportData.length) return;
    const cols = Object.keys(reportData[0]);
    const csv = [cols.join(","), ...reportData.map(r => cols.map(c => `"${r[c]}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${selectedReport}_report.csv`; a.click();
    URL.revokeObjectURL(url);
    setExportMsg("CSV exported successfully!");
    setTimeout(() => setExportMsg(""), 3000);
  };

  const currentReport = REPORT_TYPES.find(r => r.id === selectedReport);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans transition-colors duration-300">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 via-red-500 to-pink-600">
                Reports & Analytics
              </span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track campaign performance, audience insights & ROI</p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <button onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm">
              <Download size={13} className="text-gray-500" /> Download PDF
            </button>
            <button onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm">
              <Table size={13} className="text-gray-500" /> Export CSV
            </button>
            <button onClick={() => setScheduleOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-md shadow-pink-500/20 hover:opacity-90 transition-all">
              <Send size={13} /> Schedule Email
            </button>
          </div>
        </div>

        {/* Export success message */}
        {exportMsg && (
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl text-sm font-semibold">
            <CheckCircle2 size={15} /> {exportMsg}
          </div>
        )}

        {/* ── Filters Bar ── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between px-4 md:px-5 py-3.5 border-b border-gray-50 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-gray-500" />
              <span className="text-sm font-bold text-gray-900 dark:text-white">Filters</span>
              {activeFiltersCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400 text-[10px] font-black">{activeFiltersCount} active</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <button onClick={() => { setSelectedAd("all"); setCountry("all"); setLanguage("all"); setGender("all"); setDatePreset("30d"); }}
                  className="text-[11px] font-semibold text-pink-500 hover:text-pink-600 transition-colors">Clear all</button>
              )}
              <button onClick={() => setShowFilters(v => !v)}
                className="md:hidden flex items-center gap-1 text-xs font-semibold text-gray-500 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                {showFilters ? <ChevronDown size={12} className="rotate-180" /> : <ChevronDown size={12} />}
                {showFilters ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Filter inputs — always visible on desktop, toggleable on mobile */}
          <div className={`${showFilters ? "block" : "hidden"} md:block p-4 md:p-5`}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Date range */}
              <div className="col-span-2 md:col-span-1 lg:col-span-2">
                <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Date Range</label>
                <Dropdown value={datePreset} onChange={setDatePreset} icon={Calendar}
                  options={DATE_PRESETS} />
              </div>
              {datePreset === "custom" && (
                <div className="col-span-2 grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">From</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">To</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500" />
                  </div>
                </div>
              )}
              {/* Ad filter */}
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Ad</label>
                <Dropdown value={selectedAd} onChange={setSelectedAd} icon={Target}
                  options={[
                    { value: "all", label: "All Ads" },
                    { value: "summer_sale", label: "Summer Sale" },
                    { value: "brand_boost", label: "Brand Boost" },
                    { value: "new_arrivals", label: "New Arrivals" },
                    { value: "flash_offer", label: "Flash Offer" },
                  ]} />
              </div>
              {/* Country */}
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Country</label>
                <Dropdown value={country} onChange={setCountry} icon={Globe}
                  options={[
                    { value: "all", label: "All Countries" },
                    { value: "in", label: "India" },
                    { value: "us", label: "United States" },
                    { value: "uk", label: "United Kingdom" },
                    { value: "ae", label: "UAE" },
                    { value: "sg", label: "Singapore" },
                  ]} />
              </div>
              {/* Language */}
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Language</label>
                <Dropdown value={language} onChange={setLanguage} icon={Search}
                  options={[
                    { value: "all", label: "All Languages" },
                    { value: "en", label: "English" },
                    { value: "hi", label: "Hindi" },
                    { value: "ta", label: "Tamil" },
                    { value: "te", label: "Telugu" },
                  ]} />
              </div>
              {/* Gender */}
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Gender</label>
                <Dropdown value={gender} onChange={setGender} icon={Users}
                  options={[
                    { value: "all", label: "All Genders" },
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                    { value: "other", label: "Other" },
                  ]} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Summary Metric Cards ── */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Overview</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {SUMMARY_METRICS.map((m, i) => <MetricCard key={i} {...m} />)}
          </div>
        </div>

        {/* ── Report Section ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

          {/* Report type selector */}
          <div className="lg:col-span-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Select Report</p>
            <div className="space-y-2">
              {REPORT_TYPES.map(r => (
                <ReportCard key={r.id} report={r} selected={selectedReport} onSelect={loadReport} loading={reportLoading} />
              ))}
            </div>
          </div>

          {/* Report data panel */}
          <div className="lg:col-span-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            {/* Panel header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                {currentReport && (
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${currentReport.bg}`}>
                    <currentReport.icon size={16} className={currentReport.iconColor} />
                  </div>
                )}
                <div>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">{currentReport?.label}</h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">{currentReport?.desc}</p>
                </div>
              </div>

              {/* Metrics pills */}
              <div className="flex flex-wrap gap-1.5">
                {currentReport?.metrics.slice(0, 3).map(m => (
                  <span key={m} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                    {m}
                  </span>
                ))}
                {(currentReport?.metrics.length ?? 0) > 3 && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                    +{(currentReport?.metrics.length ?? 0) - 3} more
                  </span>
                )}
              </div>
            </div>

            {/* Table */}
            <ReportTable report={selectedReport} data={reportData} loading={reportLoading} />

            {/* Panel footer */}
            {!reportLoading && reportData.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 border-t border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                <p className="text-xs text-gray-400">{reportData.length} rows · {DATE_PRESETS.find(d => d.value === datePreset)?.label}</p>
                <div className="flex gap-2">
                  <button onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm">
                    <FileDown size={12} /> Export CSV
                  </button>
                  <button onClick={handleDownloadPDF}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-sm shadow-pink-500/20 hover:opacity-90 transition-all">
                    <Download size={12} /> Download PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Schedule email CTA banner ── */}
        <div className="relative rounded-2xl bg-gradient-to-r from-gray-900 via-gray-800 to-black overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-pink-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Bell size={16} className="text-yellow-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Stay Informed</span>
              </div>
              <h3 className="text-base font-black text-white">Never miss a report</h3>
              <p className="text-sm text-gray-400 mt-0.5">Get automated reports delivered to your inbox — daily, weekly, or monthly.</p>
            </div>
            <button onClick={() => setScheduleOpen(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-pink-600 text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:opacity-90 transition-all flex-shrink-0 active:scale-95">
              <Send size={14} /> Schedule Email Report
            </button>
          </div>
        </div>

      </div>

      {/* Schedule Modal */}
      <ScheduleModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} reportType={selectedReport} />
    </div>
  );
}