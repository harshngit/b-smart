import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Search as SearchIcon, X, ArrowLeft, Loader2, Clock } from 'lucide-react';
import PostDetailModal from '../components/PostDetailModal';

const BASE_URL = 'https://api.bebsmart.in';

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const Avatar = ({ src, name, size = 44 }) => (
  <div className="rounded-full overflow-hidden bg-gradient-to-tr from-yellow-400 via-orange-500 to-pink-500 flex-shrink-0" style={{ width: size, height: size, padding: 2 }}>
    <div className="w-full h-full rounded-full bg-white dark:bg-black overflow-hidden flex items-center justify-center">
      {src ? <img src={src} alt="" className="w-full h-full object-cover" />
            : <span className="text-sm font-bold text-gray-700 dark:text-white">{(name || '?')[0].toUpperCase()}</span>}
    </div>
  </div>
);

export default function SearchPage() {
  const navigate = useNavigate();
  const { userObject } = useSelector((state) => state.auth);
  const userId = userObject?._id || userObject?.id;
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const [query, setQuery]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [results, setResults]       = useState(null);
  const [history, setHistory]       = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [activeTab, setActiveTab]   = useState('all');

  // Load history from API
  const loadHistory = useCallback(async () => {
    if (!userId) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/search/history/${userId}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setHistory(Array.isArray(data) ? data : (data.history || data.data || []));
      }
    } catch { /* silent */ } finally { setHistoryLoading(false); }
  }, [userId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const clearAllHistory = async () => {
    if (!userId) return;
    try {
      await fetch(`${BASE_URL}/api/search/history/${userId}`, { method: 'DELETE', headers: authHeaders() });
      setHistory([]);
    } catch { /* silent */ }
  };

  const deleteHistoryItem = async (historyId, e) => {
    e.stopPropagation();
    try {
      await fetch(`${BASE_URL}/api/search/history/${userId}/${historyId}`, { method: 'DELETE', headers: authHeaders() });
      setHistory(prev => prev.filter(h => (h._id || h.id) !== historyId));
    } catch { /* silent */ }
  };

  // Run search against /api/search
  const runSearch = useCallback(async (q) => {
    const trimmed = q.trim();
    if (!trimmed) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/search?q=${encodeURIComponent(trimmed)}&limit=20`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        const r = data.results || {};
        setResults({
          users: r.users || [],
          posts: (r.posts || []),
          reels: (r.reels || []),
        });
      } else { setResults({ users: [], posts: [], reels: [] }); }
    } catch { setResults({ users: [], posts: [], reels: [] }); }
    finally { setLoading(false); }
  }, []);

  const handleInput = (e) => {
    const q = e.target.value;
    setQuery(q);
    setActiveTab('all');
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults(null); return; }
    debounceRef.current = setTimeout(() => runSearch(q), 350);
  };

  const handleHistoryClick = (item) => {
    const q = typeof item === 'string' ? item : (item.query || item.keyword || item.text || '');
    if (!q) return;
    setQuery(q);
    runSearch(q);
  };

  const filteredUsers = (!results || activeTab === 'posts' || activeTab === 'reels') ? [] : (results?.users || []);
  const filteredPosts = (!results || activeTab === 'people' || activeTab === 'reels') ? [] : (results?.posts || []);
  const filteredReels = (!results || activeTab === 'people' || activeTab === 'posts') ? [] : (results?.reels || []);
  const hasResults    = results && (results.users.length + results.posts.length + results.reels.length) > 0;

  const tabs = [
    { key: 'all',    label: 'All' },
    { key: 'people', label: `People${results ? ` (${results.users.length})` : ''}` },
    { key: 'posts',  label: `Posts${results ? ` (${results.posts.length})` : ''}` },
    { key: 'reels',  label: `Reels${results ? ` (${results.reels.length})` : ''}` },
  ];

  return (
    <>
      <div className="min-h-screen bg-white dark:bg-black flex flex-col">

        {/* Search bar */}
        <div className="sticky top-0 z-40 bg-white dark:bg-black border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1.5 -ml-1 flex-shrink-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeft size={22} className="text-gray-900 dark:text-white" />
          </button>
          <div className="flex-1 flex items-center gap-2 bg-gray-100 dark:bg-[#1c1c1e] rounded-2xl px-4 py-2.5">
            <SearchIcon size={16} className="text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={handleInput}
              onKeyDown={e => e.key === 'Enter' && runSearch(query)}
              placeholder="Search"
              autoFocus
              className="flex-1 bg-transparent text-sm outline-none text-gray-900 dark:text-white placeholder-gray-400"
            />
            {loading
              ? <Loader2 size={14} className="animate-spin text-gray-400 shrink-0" />
              : query
                ? <button onClick={() => { setQuery(''); setResults(null); setActiveTab('all'); inputRef.current?.focus(); }}
                    className="w-5 h-5 rounded-full bg-gray-400 dark:bg-gray-600 flex items-center justify-center shrink-0">
                    <X size={10} color="white" strokeWidth={3} />
                  </button>
                : null
            }
          </div>
        </div>

        {/* Filter tabs — only when results exist */}
        {results && hasResults && (
          <div className="flex gap-1.5 px-3 py-2 border-b border-gray-100 dark:border-gray-800 overflow-x-auto scrollbar-none">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.key
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto pb-[80px]">

          {/* History — shown when no query */}
          {!query.trim() && (
            <>
              {historyLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={22} className="animate-spin text-gray-300 dark:text-gray-700" />
                </div>
              ) : history.length > 0 ? (
                <>
                  <div className="flex items-center justify-between px-4 pt-5 pb-3">
                    <span className="text-base font-bold text-gray-900 dark:text-white">Recent</span>
                    <button onClick={clearAllHistory} className="text-xs font-semibold text-[#fa3f5e] hover:opacity-80 transition-opacity">
                      Clear all
                    </button>
                  </div>
                  {history.map((item) => {
                    const hId  = item._id || item.id;
                    const label = typeof item === 'string' ? item : (item.query || item.keyword || item.text || '');
                    if (!label) return null;
                    return (
                      <div key={hId || label} onClick={() => handleHistoryClick(item)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 transition-colors cursor-pointer">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                          <Clock size={18} className="text-gray-400" />
                        </div>
                        <span className="flex-1 text-sm text-gray-900 dark:text-white">{label}</span>
                        {hId && (
                          <button onClick={(e) => deleteHistoryItem(hId, e)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <SearchIcon size={44} className="text-gray-200 dark:text-gray-800" />
                  <p className="text-sm font-medium text-gray-400 dark:text-gray-600">No recent searches.</p>
                </div>
              )}
            </>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="px-4 pt-6 space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-800 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full w-2/3" />
                    <div className="h-2.5 bg-gray-100 dark:bg-gray-900 rounded-full w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No results */}
          {query.trim() && !loading && results && !hasResults && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
              <SearchIcon size={36} className="opacity-20" />
              <p className="text-base font-semibold text-gray-500 dark:text-gray-400">No results for "{query}"</p>
              <p className="text-xs text-gray-400 dark:text-gray-600">Try a different keyword</p>
            </div>
          )}

          {/* ── People ─────────────────────────────────────────────────────── */}
          {!loading && filteredUsers.length > 0 && (
            <section>
              <div className="flex items-center gap-2 px-4 pt-5 pb-2">
                <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">People</p>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-600">· {results.users.length}</span>
              </div>
              {filteredUsers.map(u => (
                <button key={u._id} onClick={() => navigate(`/profile/${u.username || u._id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 transition-colors text-left">
                  <Avatar src={u.avatar_url} name={u.username || u.full_name} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{u.full_name || u.username}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      @{u.username}{u.location ? ` · ${u.location}` : ''}
                    </p>
                    {u.bio && <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{u.bio}</p>}
                  </div>
                  {u.role && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      u.role === 'vendor'
                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}>
                      {u.role === 'vendor' ? 'Vendor' : 'Member'}
                    </span>
                  )}
                </button>
              ))}
            </section>
          )}

          {/* ── Posts ──────────────────────────────────────────────────────── */}
          {!loading && filteredPosts.length > 0 && (
            <section>
              <div className="flex items-center gap-2 px-4 pt-5 pb-2">
                <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Posts</p>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-600">· {results.posts.length}</span>
              </div>
              <div className="grid grid-cols-3 gap-[2px]">
                {filteredPosts.map(post => {
                  const thumb = post.media?.[0]?.thumbnails?.[0]?.fileUrl
                    || post.media?.[0]?.thumbnail_url
                    || post.media?.[0]?.fileUrl
                    || post.media?.[0]?.url
                    || post.image_url;
                  return (
                    <button key={post._id} onClick={() => setSelectedPost(post)}
                      className="aspect-square bg-gray-100 dark:bg-gray-900 overflow-hidden relative group active:opacity-80 transition-opacity">
                      {thumb
                        ? <img src={thumb} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-300 dark:text-gray-700">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          </div>
                      }
                      {/* User info overlay on hover */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-start justify-end p-2">
                        {post.avatar_url && <img src={post.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover mb-1 border border-white/50" />}
                        <p className="text-white text-[9px] font-bold leading-none">@{post.username}</p>
                        {post.caption && <p className="text-white/80 text-[8px] leading-tight mt-0.5 line-clamp-2">{post.caption}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Reels ──────────────────────────────────────────────────────── */}
          {!loading && filteredReels.length > 0 && (
            <section className="pb-4">
              <div className="flex items-center gap-2 px-4 pt-5 pb-2">
                <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Reels</p>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-600">· {results.reels.length}</span>
              </div>
              <div className="grid grid-cols-3 gap-[2px]">
                {filteredReels.map(reel => {
                  const thumb = reel.media?.[0]?.thumbnails?.[0]?.fileUrl
                    || reel.media?.[0]?.thumbnail_url
                    || reel.thumbnail_url;
                  return (
                    <button key={reel._id} onClick={() => navigate(`/reels?id=${reel._id}`)}
                      className="aspect-square bg-gray-100 dark:bg-gray-900 overflow-hidden relative group active:opacity-80 transition-opacity">
                      {thumb
                        ? <img src={thumb} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-300 dark:text-gray-700">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                          </div>
                      }
                      {/* Play badge */}
                      <div className="absolute top-1.5 right-1.5 bg-black/60 rounded-md px-1 py-0.5 flex items-center">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      </div>
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-start justify-end p-2">
                        {reel.avatar_url && <img src={reel.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover mb-1 border border-white/50" />}
                        <p className="text-white text-[9px] font-bold leading-none">@{reel.username}</p>
                        {reel.caption && <p className="text-white/80 text-[8px] leading-tight mt-0.5 line-clamp-2">{reel.caption}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

        </div>
      </div>

      {/* Post Detail Modal */}
      <PostDetailModal
        isOpen={!!selectedPost}
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
      />
    </>
  );
}