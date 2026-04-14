import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ChevronDown, MapPin, UserPlus, Play, X } from 'lucide-react';
import StoryRail from '../components/StoryRail';
import PostCard from '../components/PostCard';
import PostDetailModal from '../components/PostDetailModal';
import api from '../lib/api';

const BASE_URL = 'https://api.bebsmart.in';

const normalizeApiArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  const candidates = [
    value.data, value?.data?.data, value.posts, value.feed, value.items,
    value.results, value.ads, value.users, value.reels,
    value?.data?.posts, value?.data?.feed, value?.data?.items, value?.data?.results,
    value?.data?.ads, value?.data?.users, value?.data?.reels,
    value?.data?.data?.posts, value?.data?.data?.feed, value?.data?.data?.items,
    value?.data?.data?.results, value?.data?.data?.ads,
  ];
  for (const c of candidates) { if (Array.isArray(c)) return c; }
  return [];
};

const adAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

// ── Location Bar ──────────────────────────────────────────────────────────────
const LocationBar = () => (
  <div className="hidden md:block sticky top-0 z-10 bg-white dark:bg-black mb-2 border-b border-gray-200 dark:border-gray-800">
    <div className="flex items-center justify-between px-4 py-3 gap-4">
      <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange" style={{ fontFamily: 'cursive' }}>
        B-Smart
      </h1>
      <div className="flex items-center justify-between gap-2 bg-gray-100 dark:bg-gray-900 px-3 py-2 rounded-lg cursor-pointer group hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors w-auto min-w-[300px]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="p-1.5 bg-white dark:bg-black rounded-full shadow-sm shrink-0">
            <MapPin size={14} className="text-red-500" />
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-white truncate">Plat No.20, 2nd Floor, Shivaram Nivas, Sri...</span>
        </div>
        <ChevronDown size={16} className="text-gray-400 shrink-0 ml-2" />
      </div>
    </div>
  </div>
);

// ── Skeleton Loader ───────────────────────────────────────────────────────────
const FeedSkeleton = () => (
  <div className="max-w-[470px] mx-auto">
    {[1, 2, 3].map(i => (
      <div key={i} className="bg-white dark:bg-black mb-4 border-b border-gray-200 dark:border-gray-800 pb-4 md:rounded-lg md:border animate-pulse">
        <div className="flex items-center gap-2.5 p-3">
          <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-800" />
          <div className="flex flex-col gap-1.5 flex-1">
            <div className="w-32 h-3 rounded-full bg-gray-200 dark:bg-gray-800" />
            <div className="w-20 h-2.5 rounded-full bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-800" style={{ height: 300 }} />
        <div className="px-3 pt-3 flex flex-col gap-2">
          <div className="w-16 h-3 rounded-full bg-gray-200 dark:bg-gray-800" />
          <div className="w-48 h-3 rounded-full bg-gray-100 dark:bg-gray-800" />
          <div className="w-32 h-2.5 rounded-full bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
    ))}
  </div>
);

// ── Mobile Suggested Users Card (horizontal scroll, Instagram-style) ──────────
const MobileSuggestedUsersCard = ({ users, onDismiss }) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState({});
  if (!users || users.length === 0) return null;
  const visible = users.filter((_, i) => !dismissed[i]);
  if (visible.length === 0) return null;

  return (
    <div className="bg-white dark:bg-black border-b border-t border-gray-200 dark:border-gray-800 py-3 mb-0 lg:hidden">
      <div className="flex items-center justify-between px-4 mb-3">
        <span className="text-sm font-bold text-gray-900 dark:text-white">Suggested for you</span>
        <button className="text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors">See all</button>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 scrollbar-hide pb-1">
        {users.map((user, i) => {
          if (dismissed[i]) return null;
          const u = user.user || user;
          const username = u.username || u.name || 'User';
          const avatar = u.avatar_url || u.avatar || u.profile_picture || null;
          const reason = u.mutual_friends_count
            ? `${u.mutual_friends_count} mutual`
            : u.followed_by ? `Followed by ${u.followed_by}` : 'Suggested for you';
          return (
            <div key={u._id || u.id || i}
              className="relative flex-shrink-0 flex flex-col items-center bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl p-4 w-[160px] gap-2 shadow-sm">
              {/* Dismiss button */}
              <button
                className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                onClick={() => setDismissed(p => ({ ...p, [i]: true }))}
              >
                <X size={11} />
              </button>
              {/* Avatar */}
              <div
                className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center cursor-pointer ring-2 ring-offset-1 ring-pink-300/40"
                onClick={() => navigate(`/profile/${username}`)}
              >
                {avatar
                  ? <img src={avatar} alt={username} className="w-full h-full object-cover" />
                  : <span className="text-white font-bold text-lg">{username.slice(0,1).toUpperCase()}</span>
                }
              </div>
              <p className="text-xs font-bold text-gray-900 dark:text-white text-center truncate w-full cursor-pointer"
                onClick={() => navigate(`/profile/${username}`)}>{username}</p>
              <p className="text-[10px] text-gray-400 text-center truncate w-full">{reason}</p>
              <button className="mt-1 w-full py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1">
                <UserPlus size={11} /> Follow
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Build feed with ads + mobile suggestions ──────────────────────────────────
const AD_INTERVAL = 4;

const buildFeed = (posts, ads, suggestedUsers) => {
  const safePosts = normalizeApiArray(posts);
  const safeAds   = normalizeApiArray(ads);

  // Pick a random position between index 2 and 5 for suggestion block
  const suggPos = safePosts.length > 2 ? 2 + Math.floor(Math.random() * Math.min(3, safePosts.length - 2)) : -1;

  const feed = [];
  let adIdx = 0;
  let suggInserted = false;

  safePosts.forEach((post, i) => {
    feed.push(post);
    // Insert ad
    if (safeAds.length > 0 && (i + 1) % AD_INTERVAL === 0 && adIdx < safeAds.length) {
      feed.push({ ...safeAds[adIdx % safeAds.length], item_type: 'ad' });
      adIdx++;
    }
    // Insert suggestion block (mobile only — hidden on lg via CSS)
    if (!suggInserted && i === suggPos && suggestedUsers.length > 0) {
      feed.push({ item_type: 'mobile_suggestion', users: suggestedUsers });
      suggInserted = true;
    }
  });
  return feed;
};

// ── Home ──────────────────────────────────────────────────────────────────────
const Home = () => {
  const navigate = useNavigate();
  const { userObject } = useSelector(s => s.auth);

  const [posts,          setPosts]          = useState([]);
  const [ads,            setAds]            = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [feed,           setFeed]           = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [selectedItem,   setSelectedItem]   = useState(null);

  const fetchPosts = useCallback(async () => {
    try { const { data } = await api.get('/posts/feed'); return normalizeApiArray(data); }
    catch (e) { console.error('Error fetching posts:', e); return []; }
  }, []);

  const fetchAds = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/ads/feed`, { headers: adAuthHeaders() });
      if (!res.ok) return [];
      return normalizeApiArray(await res.json());
    } catch (e) { return []; }
  }, []);

  const fetchSuggestedUsers = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/suggestions/users`, { headers: adAuthHeaders() });
      if (!res.ok) return [];
      return normalizeApiArray(await res.json());
    } catch (e) { return []; }
  }, []);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    const [fetchedPosts, fetchedAds, fetchedUsers] = await Promise.all([
      fetchPosts(), fetchAds(), fetchSuggestedUsers(),
    ]);
    setPosts(fetchedPosts);
    setAds(fetchedAds);
    setSuggestedUsers(fetchedUsers);
    setFeed(buildFeed(fetchedPosts, fetchedAds, fetchedUsers));
    setLoading(false);
  }, [fetchPosts, fetchAds, fetchSuggestedUsers]);

  useEffect(() => { loadFeed(); }, [loadFeed]);
  useEffect(() => { setFeed(buildFeed(posts, ads, suggestedUsers)); }, [posts, ads, suggestedUsers]);

  useEffect(() => {
    if (userObject?.role === 'vendor') navigate('/vendor/dashboard');
  }, [userObject, navigate]);

  const handlePostDeleted = (postId) => {
    setPosts(prev => prev.filter(p => (p._id || p.id) !== postId));
  };

  const handleCommentClick = (item) => {
    if (window.innerWidth < 768) {
      if (item.item_type === 'ad') { setSelectedItem(item); }
      else { navigate(`/post/${item._id || item.id}`); }
    } else {
      setSelectedItem(item);
    }
  };

  return (
    <div>
      <LocationBar />
      <StoryRail />
      <div className="pb-4">
        {loading ? (
          <FeedSkeleton />
        ) : feed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <p className="text-lg font-semibold mb-1">Your feed is empty</p>
            <p className="text-sm">Follow people to see their posts here.</p>
          </div>
        ) : (
          feed.map((item, idx) => {
            // Mobile suggestion block
            if (item.item_type === 'mobile_suggestion') {
              return <MobileSuggestedUsersCard key={`sugg-${idx}`} users={item.users} />;
            }
            return (
              <PostCard
                key={item._id || item.id || `item-${idx}`}
                post={item}
                onCommentClick={handleCommentClick}
                onDelete={handlePostDeleted}
              />
            );
          })
        )}
      </div>
      <PostDetailModal
        isOpen={!!selectedItem}
        post={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
};

export default Home;