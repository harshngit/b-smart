import { Check, Search, Send, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { getFollowing } from '../services/followService';
import { shareContentToUsers } from '../services/chatService';

const getUserId = (user) => String(user?._id || user?.id || '');
const getUserName = (user) => user?.full_name || user?.name || user?.username || 'User';
const getUserAvatar = (user) => user?.avatar_url || user?.profile_picture || user?.profilePicture || '';
const getInitial = (user) => getUserName(user).trim().charAt(0).toUpperCase() || 'U';

export default function ShareContentModal({
  isOpen,
  onClose,
  contentType,
  contentId,
}) {
  const { userObject } = useSelector((state) => state.auth);
  const currentUserId = userObject?._id || userObject?.id || '';

  const [followingUsers, setFollowingUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (!currentUserId) return;

    let mounted = true;
    setLoadingUsers(true);
    getFollowing(currentUserId, { page: 1, limit: 100 })
      .then((response) => {
        if (!mounted) return;
        const users = Array.isArray(response?.users) ? response.users : [];
        setFollowingUsers(users);
      })
      .catch(() => {
        if (!mounted) return;
        setFollowingUsers([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingUsers(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, currentUserId]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedIds([]);
      setSearch('');
      setSubmitting(false);
    }
  }, [isOpen]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return followingUsers;
    return followingUsers.filter((user) => {
      const username = String(user?.username || '').toLowerCase();
      const name = String(getUserName(user)).toLowerCase();
      return username.includes(query) || name.includes(query);
    });
  }, [search, followingUsers]);

  const toggleUser = (userId) => {
    setSelectedIds((prev) => (
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    ));
  };

  const handleSend = async () => {
    if (!selectedIds.length || !contentType || !contentId || submitting) return;
    setSubmitting(true);
    try {
      await shareContentToUsers({
        recipientIds: selectedIds,
        contentType,
        contentId,
      });
      onClose?.();
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to share content';
      window.alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex w-full max-w-[640px] max-h-[82vh] flex-col overflow-hidden rounded-[26px] border border-white/10 bg-[#24252b] text-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <button onClick={onClose} className="rounded-full p-2 text-white/75 transition hover:bg-white/5 hover:text-white" aria-label="Close share">
            <X size={22} />
          </button>
          <p className="text-2xl font-semibold tracking-tight">Share</p>
          <div className="w-10" />
        </div>

        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3 rounded-xl bg-[#2c2f36] px-3 py-2.5">
            <Search size={18} className="text-white/50" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/45"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loadingUsers ? (
            <div className="py-10 text-center text-sm text-white/60">Loading following users...</div>
          ) : null}

          {!loadingUsers && !filteredUsers.length ? (
            <div className="py-10 text-center text-sm text-white/60">No users found.</div>
          ) : null}

          {!loadingUsers && filteredUsers.length ? (
            <div className="grid grid-cols-3 gap-x-4 gap-y-5 sm:grid-cols-4">
              {filteredUsers.map((user) => {
                const userId = getUserId(user);
                const selected = selectedIds.includes(userId);
                const avatar = getUserAvatar(user);
                return (
                  <button
                    key={userId}
                    type="button"
                    onClick={() => toggleUser(userId)}
                    className="flex flex-col items-center gap-2 text-center transition hover:opacity-90"
                  >
                    <div className="relative h-16 w-16">
                      {avatar ? (
                        <img src={avatar} alt={getUserName(user)} className="h-full w-full rounded-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] text-lg font-bold text-white">
                          {getInitial(user)}
                        </div>
                      )}
                      {selected ? (
                        <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#2a2f9f] text-white ring-2 ring-[#24252b]">
                          <Check size={14} />
                        </span>
                      ) : null}
                    </div>
                    <p className="line-clamp-2 text-sm leading-tight text-white/95">{user?.username || getUserName(user)}</p>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="border-t border-white/10 px-5 py-4">
          <button
            type="button"
            disabled={!selectedIds.length || submitting}
            onClick={handleSend}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2a2f9f] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#3137b5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={16} />
            {submitting ? 'Sharing...' : `Send (${selectedIds.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
