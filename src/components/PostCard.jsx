import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Edit, Trash2, ChevronLeft, ChevronRight, Volume2, VolumeX, UserPlus, UserCheck, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import api from '../lib/api';

// ─── Delete Confirmation Modal ──────────────────────────────────────────────
const DeleteModal = ({ isOpen, onClose, onConfirm, isDeleting }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-800">
                {isDeleting ? (
                    <div className="flex flex-col items-center justify-center py-8">
                        <div className="animate-spin w-12 h-12 border-4 border-gray-200 border-t-red-500 rounded-full mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Deleting post...</p>
                    </div>
                ) : (
                    <>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 text-center">Delete Post?</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 text-center">
                            Are you sure you want to delete this post? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                Cancel
                            </button>
                            <button onClick={onConfirm} className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors">
                                Delete
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// ─── People Tag Overlay ─────────────────────────────────────────────────────
// Shows Instagram-style draggable tag bubbles on tap/click
const PeopleTagsOverlay = ({ tags, visible }) => {
    const [showTags, setShowTags] = useState(false);

    useEffect(() => {
        if (visible && tags && tags.length > 0) {
            setShowTags(true);
            const t = setTimeout(() => setShowTags(false), 2800);
            return () => clearTimeout(t);
        }
    }, [visible, tags]);

    if (!tags || tags.length === 0) return null;

    return (
        <>
            <style>{`
                @keyframes tagPop {
                    from { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
                    to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                }
                @keyframes tagFadeOut {
                    from { opacity: 1; }
                    to   { opacity: 0; }
                }
            `}</style>

            {/* Clickable overlay — tap to toggle tags */}
            <div
                className="absolute inset-0 z-10 cursor-pointer select-none"
                onClick={(e) => { e.stopPropagation(); setShowTags(s => !s); }}
            >
                {/* Tag count badge — shown when tags are hidden */}
                {!showTags && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/55 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full pointer-events-none">
                        <Tag size={11} />
                        <span className="font-medium">{tags.length}</span>
                    </div>
                )}

                {/* Tag bubbles */}
                {showTags && tags.map((tag, idx) => (
                    <div
                        key={tag._id || idx}
                        className="absolute"
                        style={{
                            left: `${Math.min(95, Math.max(5, tag.x))}%`,
                            top:  `${Math.min(95, Math.max(5, tag.y))}%`,
                            transform: 'translate(-50%, -50%)',
                            animation: `tagPop 0.25s ${idx * 0.06}s cubic-bezier(0.34,1.56,0.64,1) both`,
                        }}
                    >
                        <Link
                            to={`/profile/${tag.user_id || ''}`}
                            onClick={e => e.stopPropagation()}
                            className="flex flex-col items-center gap-0.5 no-underline"
                        >
                            {/* Pin dot */}
                            <div className="w-2 h-2 bg-white rounded-full shadow-md border border-black/20 mx-auto" />
                            {/* Username bubble */}
                            <div className="bg-black/80 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shadow-lg border border-white/10 hover:bg-black/95 transition-colors">
                                @{tag.username}
                            </div>
                        </Link>
                    </div>
                ))}
            </div>
        </>
    );
};

// ─── Follow Button ──────────────────────────────────────────────────────────
const FollowButton = ({ targetUserId }) => {
    const { userObject } = useSelector(s => s.auth);
    const [following, setFollowing] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleClick = useCallback(async (e) => {
        e.stopPropagation();
        if (!userObject || loading) return;
        const wasFollowing = following;
        setFollowing(!wasFollowing);
        setLoading(true);
        try {
            const endpoint = wasFollowing
                ? 'https://bsmart.asynk.store/api/unfollow'
                : 'https://bsmart.asynk.store/api/follow';
            await api.post(endpoint, { followedUserId: targetUserId });
        } catch {
            setFollowing(wasFollowing); // revert on error
        } finally {
            setLoading(false);
        }
    }, [userObject, loading, following, targetUserId]);

    return (
        <button
            onClick={handleClick}
            disabled={loading}
            className={`flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 rounded-full border-2 transition-all duration-200 ${
                loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            } ${
                following
                    ? 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 bg-transparent hover:border-red-400 hover:text-red-400'
                    : 'border-white text-black dark:text-white bg-white dark:bg-transparent dark:border-white hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
        >
            {following ? <UserCheck size={12} /> : <UserPlus size={12} />}
            <span>{following ? 'Following' : 'Follow'}</span>
        </button>
    );
};

// ─── PostCard ───────────────────────────────────────────────────────────────
const PostCard = ({ post, onCommentClick, onDelete }) => {
    const { userObject } = useSelector((state) => state.auth);

    // State
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [isSaved, setIsSaved] = useState(false);
    const [latestComment, setLatestComment] = useState(null);
    const [showOptions, setShowOptions] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isMuted, setIsMuted] = useState(true);
    // Video state — controls thumbnail vs video visibility
    const [videoReady, setVideoReady] = useState(false);   // metadata loaded
    const [videoPlaying, setVideoPlaying] = useState(false); // actually playing
    const videoRef = useRef(null);

    // ── Derived values ────────────────────────────────────────────────────
    const user       = post.user_id || post.users || post.user || {};
    const username   = user.username  || post.username  || 'User';
    const fullName   = user.full_name || '';
    const avatar     = user.avatar_url || post.userAvatar || '';
    const userId     = user._id || user.id || (typeof post.user_id === 'string' ? post.user_id : null);
    const postId     = post._id || post.id;
    const peopleTags = post.people_tags || [];
    const isOwner    = userObject && userId && (
        String(userObject._id || userObject.id) === String(userId)
    );

    const mediaItems = post.media?.length > 0
        ? post.media
        : (post.imageUrl ? [{ fileUrl: post.imageUrl }] : []);

    const currentItem = mediaItems[currentImageIndex] || {};
    const isVideo     = currentItem.type === 'video';

    // Extract thumbnail URL from item (supports multiple API shapes)
    const getThumbnailUrl = (item) => {
        if (!item) return null;
        if (Array.isArray(item.thumbnail)  && item.thumbnail[0]?.fileUrl)  return item.thumbnail[0].fileUrl;
        if (Array.isArray(item.thumbnails) && item.thumbnails[0]?.fileUrl) return item.thumbnails[0].fileUrl;
        if (typeof item.thumbnail  === 'string') return item.thumbnail;
        if (typeof item.poster     === 'string') return item.poster;
        return null;
    };
    const thumbnailUrl = getThumbnailUrl(currentItem);

    // Parse trim timing
    const getVideoTiming = (item) => {
        if (!item) return { start: 0, end: 0 };
        const n = (v) => {
            if (typeof v === 'number' && isFinite(v)) return v;
            const p = parseFloat(v);
            return isFinite(p) ? p : 0;
        };
        const t = item.timing || {};
        let s = n(t.start ?? item['finalLength-start']);
        let e = n(t.end   ?? item['finallength-end']);
        const dur = n(item.videoLength ?? item.totalLenght ?? item.duration);
        if (s < 0) s = 0;
        if ((!e || e <= 0) && dur > 0) e = dur;
        if (dur > 0 && e > dur) e = dur;
        if (e > 0 && e <= s) e = 0;
        return { start: s, end: e };
    };

    // Relative date
    const formattedDate = (() => {
        const raw = post.createdAt || post.created_at;
        if (!raw) return 'Just now';
        const diff = Math.floor((Date.now() - new Date(raw)) / 1000);
        if (diff < 60)     return 'Just now';
        if (diff < 3600)   return `${Math.floor(diff / 60)}m`;
        if (diff < 86400)  return `${Math.floor(diff / 3600)}h`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
        return new Date(raw).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    })();

    // ── Init from post data ───────────────────────────────────────────────
    useEffect(() => {
        if (!post) return;

        // Likes
        if (Array.isArray(post.likes)) {
            const myId = userObject?._id || userObject?.id;
            const liked = myId ? post.likes.some(l => {
                if (typeof l === 'string') return String(l) === String(myId);
                return String(l.user_id || l._id || l.id) === String(myId);
            }) : false;
            setIsLiked(liked);
            setLikeCount(post.likes.length);
        } else if (typeof post.is_liked_by_me !== 'undefined') {
            setIsLiked(post.is_liked_by_me);
            setLikeCount(post.likes_count || 0);
        }

        // Saved
        setIsSaved(post.is_saved_by_me || false);

        // Latest comment
        if (post.latest_comments?.length > 0) {
            const c = post.latest_comments[0];
            setLatestComment({ username: c.username || c.user?.username, text: c.text || c.content });
        } else if (post.comments?.length > 0) {
            const c = post.comments[0];
            setLatestComment({ username: c.user?.username, text: c.text || c.content });
        } else if (!post._id) {
            // Legacy Supabase
            supabase
                .from('comments')
                .select('id, content, created_at, users(username)')
                .eq('post_id', post.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()
                .then(({ data }) => {
                    if (data) setLatestComment({ username: data.users?.username, text: data.content });
                })
                .catch(() => {});
        }

        // Reset video state when media changes
        setVideoReady(false);
        setVideoPlaying(false);
    }, [post, userObject]);

    // ── Handlers ──────────────────────────────────────────────────────────

    // Like
    const handleLike = async () => {
        if (!userObject) return;
        const newLiked = !isLiked;
        setIsLiked(newLiked);
        setLikeCount(c => newLiked ? c + 1 : Math.max(0, c - 1));
        try {
            if (post._id) {
                await api.post(`/posts/${postId}/${newLiked ? 'like' : 'unlike'}`);
            } else {
                const likes = post.likes || [];
                const updated = isLiked
                    ? likes.filter(l => l.user_id !== userObject.id)
                    : [...likes, { user_id: userObject.id }];
                await supabase.from('posts').update({ likes: updated }).eq('id', post.id);
                post.likes = updated;
            }
        } catch {
            setIsLiked(!newLiked);
            setLikeCount(c => !newLiked ? c + 1 : Math.max(0, c - 1));
        }
    };

    // Save / Unsave
    const handleSave = async (e) => {
        e.stopPropagation();
        if (!userObject || !postId) return;
        const was = isSaved;
        setIsSaved(!was);
        try {
            await api.post(`https://bsmart.asynk.store/api/posts/${postId}/${was ? 'unsave' : 'save'}`);
        } catch {
            setIsSaved(was);
        }
    };

    // Delete
    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            const token = localStorage.getItem('token');
            await api.delete(`/posts/${postId}`, { headers: { Authorization: `Bearer ${token}` } });
            await new Promise(r => setTimeout(r, 900));
            if (onDelete) onDelete(postId);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Delete error:', err);
            alert(err.response?.data?.message || 'Failed to delete post');
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

    // Carousel
    const goNext = (e) => {
        e.stopPropagation();
        setCurrentImageIndex(i => (i + 1) % mediaItems.length);
        setVideoReady(false);
        setVideoPlaying(false);
    };
    const goPrev = (e) => {
        e.stopPropagation();
        setCurrentImageIndex(i => (i - 1 + mediaItems.length) % mediaItems.length);
        setVideoReady(false);
        setVideoPlaying(false);
    };

    // Mute
    const toggleMute = (e) => {
        e.stopPropagation();
        if (videoRef.current) videoRef.current.muted = !isMuted;
        setIsMuted(m => !m);
    };

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <div className="bg-white dark:bg-black mb-4 border-b border-gray-200 dark:border-gray-800 pb-4 md:rounded-lg md:border max-w-[470px] mx-auto">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    {/* Avatar with Instagram gradient ring */}
                    <Link to={`/profile/${userId}`} className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-tr from-yellow-400 via-orange-500 to-pink-500 p-[2px] block">
                        <div className="w-full h-full rounded-full bg-white dark:bg-black p-[1px]">
                            {avatar ? (
                                <img src={avatar} alt={username} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <div className="w-full h-full rounded-full bg-gradient-to-tr from-yellow-400 via-orange-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">
                                    {username.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                    </Link>

                    {/* Name block */}
                    <div className="flex flex-col min-w-0 leading-tight">
                        <Link to={`/profile/${userId}`} className="font-semibold text-sm dark:text-white hover:underline truncate">
                            {username}
                        </Link>
                        {fullName && (
                            <span className="text-[11px] text-gray-400 truncate">{fullName}</span>
                        )}
                    </div>


                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">{formattedDate}</span>
                    {isOwner && (
                        <div className="relative">
                            <button
                                onClick={() => setShowOptions(s => !s)}
                                className="p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                            >
                                <MoreHorizontal size={20} />
                            </button>
                            {showOptions && (
                                <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#262626] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 py-1 z-50">
                                    <button
                                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 transition-colors"
                                        onClick={() => setShowOptions(false)}
                                    >
                                        <Edit size={15} /> Edit Post
                                    </button>
                                    <button
                                        className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 border-t border-gray-100 dark:border-gray-800 transition-colors"
                                        onClick={() => { setShowOptions(false); setShowDeleteModal(true); }}
                                    >
                                        <Trash2 size={15} /> Delete Post
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <DeleteModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleConfirmDelete}
                isDeleting={isDeleting}
            />

            {/* ── Media ──────────────────────────────────────────────────── */}
            <div className="w-full bg-black overflow-hidden relative group" style={{ minHeight: 300 }}>
                {mediaItems.length > 0 ? (
                    <>
                        {isVideo ? (() => {
                            const { start, end } = getVideoTiming(currentItem);
                            // Show thumbnail when: video not ready, or video is paused/stopped
                            const showThumb = thumbnailUrl && (!videoReady || !videoPlaying);
                            return (
                                <div className="relative w-full">
                                    {/* ── Thumbnail poster (shown until video plays) ── */}
                                    {thumbnailUrl && (
                                        <img
                                            src={thumbnailUrl}
                                            alt="Video thumbnail"
                                            className="w-full h-auto max-h-[600px] object-contain"
                                            style={{
                                                display: showThumb ? 'block' : 'none',
                                                minHeight: 300,
                                            }}
                                        />
                                    )}

                                    {/* ── Actual video — no controls, tap-to-play ── */}
                                    <video
                                        ref={videoRef}
                                        src={currentItem.fileUrl || currentItem.url}
                                        className="w-full h-auto max-h-[600px] object-contain"
                                        style={{
                                            display: videoReady ? 'block' : 'none',
                                            opacity: videoPlaying ? 1 : 0,
                                            position: videoPlaying ? 'relative' : 'absolute',
                                            top: 0, left: 0,
                                            minHeight: !videoPlaying ? 0 : undefined,
                                        }}
                                        autoPlay
                                        muted={isMuted}
                                        playsInline
                                        loop={false}
                                        poster={thumbnailUrl || undefined}
                                        data-start={start}
                                        data-end={end}
                                        onLoadedMetadata={(e) => {
                                            const v = e.currentTarget;
                                            setVideoReady(true);
                                            const s = Number(v.dataset.start || 0);
                                            if (s > 0 && isFinite(s)) v.currentTime = s;
                                        }}
                                        onCanPlay={() => setVideoReady(true)}
                                        onPlay={() => setVideoPlaying(true)}
                                        onPause={() => setVideoPlaying(false)}
                                        onEnded={() => { setVideoPlaying(false); }}
                                        onWaiting={() => setVideoPlaying(false)}
                                        onTimeUpdate={(e) => {
                                            const v = e.currentTarget;
                                            const s    = Number(v.dataset.start || 0);
                                            const eVal = Number(v.dataset.end   || 0);
                                            if (eVal > 0 && isFinite(eVal) && v.currentTime >= eVal) {
                                                v.currentTime = isFinite(s) && s > 0 ? s : 0;
                                                v.pause();
                                            }
                                        }}
                                    />

                                    {/* Tap-to-play / tap-to-pause overlay */}
                                    <div
                                        className="absolute inset-0 z-[5] cursor-pointer flex items-center justify-center"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!videoRef.current) return;
                                            if (videoRef.current.paused) {
                                                videoRef.current.play();
                                            } else {
                                                videoRef.current.pause();
                                            }
                                        }}
                                    >
                                        {/* Pause icon — briefly flash on pause */}
                                        {videoPlaying ? null : (
                                            <div className="w-14 h-14 rounded-full bg-black/40 flex items-center justify-center pointer-events-none">
                                                <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M8 5v14l11-7z"/>
                                                </svg>
                                            </div>
                                        )}
                                    </div>

                                    {/* Mute/Unmute — bottom right */}
                                    <button
                                        onClick={toggleMute}
                                        className="absolute bottom-3 right-3 z-20 bg-black/55 hover:bg-black/75 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                                    </button>

                                    {/* People tags overlay */}
                                    <PeopleTagsOverlay tags={peopleTags} visible={videoReady || !!thumbnailUrl} />
                                </div>
                            );
                        })() : (
                            <div className="relative w-full">
                                <img
                                    src={currentItem.fileUrl || currentItem.image}
                                    alt={`Post ${currentImageIndex + 1}`}
                                    className="w-full h-auto max-h-[600px] object-contain"
                                />
                                {/* People tags on images too */}
                                <PeopleTagsOverlay tags={peopleTags} visible={true} />
                            </div>
                        )}

                        {/* Carousel navigation */}
                        {mediaItems.length > 1 && (
                            <>
                                {currentImageIndex > 0 && (
                                    <button onClick={goPrev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                        <ChevronLeft size={20} />
                                    </button>
                                )}
                                {currentImageIndex < mediaItems.length - 1 && (
                                    <button onClick={goNext} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                        <ChevronRight size={20} />
                                    </button>
                                )}
                                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                                    {mediaItems.map((_, idx) => (
                                        <div key={idx} className={`rounded-full transition-all duration-300 ${idx === currentImageIndex ? 'w-2 h-2 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`} />
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    <div className="flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm" style={{ minHeight: 200 }}>
                        Post unavailable
                    </div>
                )}
            </div>

            {/* ── Action Bar ─────────────────────────────────────────────── */}
            <div className="px-3 pt-2.5">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3.5">
                        {/* Like */}
                        <button onClick={handleLike} className="active:scale-90 transition-transform" aria-label="Like">
                            <Heart
                                size={24}
                                className={`transition-all duration-200 ${isLiked ? 'fill-red-500 text-red-500' : 'text-black dark:text-white'}`}
                            />
                        </button>
                        {/* Comment */}
                        <button onClick={() => onCommentClick?.(post)} className="hover:opacity-60 transition-opacity" aria-label="Comment">
                            <MessageCircle size={24} className="text-black dark:text-white" />
                        </button>
                        {/* Share */}
                        <button className="hover:opacity-60 transition-opacity" aria-label="Share">
                            <Send size={24} className="text-black dark:text-white" />
                        </button>
                    </div>

                    {/* Right side: Follow (if not owner) + Save */}
                    <div className="flex items-center gap-3">
                        {!isOwner && userId && userObject && (
                            <FollowButton targetUserId={String(userId)} />
                        )}
                        {/* Save / Unsave */}
                        <button onClick={handleSave} className="active:scale-90 transition-transform" aria-label={isSaved ? 'Unsave' : 'Save'}>
                            <Bookmark
                                size={24}
                                className={`transition-all duration-200 ${isSaved ? 'fill-black text-black dark:fill-white dark:text-white' : 'text-black dark:text-white'}`}
                            />
                        </button>
                    </div>
                </div>

                {/* Like count */}
                {!post.hide_likes_count && (
                    <p className="font-semibold text-sm dark:text-white mb-1">
                        {likeCount.toLocaleString()} {likeCount === 1 ? 'like' : 'likes'}
                    </p>
                )}

                {/* Caption */}
                {post.caption ? (
                    <p className="text-sm dark:text-white leading-snug mb-1">
                        <Link to={`/profile/${userId}`} className="font-semibold mr-1 hover:underline dark:text-white">{username}</Link>
                        {post.caption}
                    </p>
                ) : null}

                {/* People tag mentions (below caption) */}
                {peopleTags.length > 0 && (
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mb-1">
                        {peopleTags.map((tag, i) => (
                            <Link
                                key={tag._id || i}
                                to={`/profile/${tag.user_id || ''}`}
                                className="text-xs text-[#0095f6] hover:underline font-medium"
                            >
                                @{tag.username}
                            </Link>
                        ))}
                    </div>
                )}

                {/* Latest comment */}
                {latestComment && (
                    <p className="text-sm dark:text-white mb-1">
                        <span className="font-semibold mr-1 dark:text-white">{latestComment.username}</span>
                        {latestComment.text}
                    </p>
                )}

                {/* View all comments */}
                {(post.comments_count || 0) > 1 && (
                    <button
                        onClick={() => onCommentClick?.(post)}
                        className="block text-sm text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 mb-1 transition-colors"
                    >
                        View all {post.comments_count} comments
                    </button>
                )}

                {/* Timestamp */}
                <p className="text-gray-400 text-[11px] uppercase tracking-wider mt-0.5">{formattedDate}</p>
            </div>
        </div>
    );
};

export default PostCard;