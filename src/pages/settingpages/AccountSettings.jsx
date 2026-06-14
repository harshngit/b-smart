import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import api from '../../lib/api';
import { fetchMe } from '../../store/authSlice';
import {
  ArrowLeft, Camera, Loader2, Check, AlertCircle, CheckCircle2,
} from 'lucide-react';

const GENDER_OPTIONS = ['Male', 'Female', 'Third Gender', 'Prefer Not to Say'];

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#fa3f5e]/20 focus:border-[#fa3f5e] placeholder-gray-400 dark:placeholder-gray-600 transition-all';

const Field = ({ label, children }) => (
  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
    <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{label}</label>
    <div className="mt-1.5">{children}</div>
  </div>
);

const SectionTitle = ({ title }) => (
  <p className="text-[11px] font-bold text-[#fa3f5e] uppercase tracking-widest mb-2 px-1">{title}</p>
);

const AccountSettings = () => {
  const dispatch = useDispatch();
  const { userObject } = useSelector((state) => state.auth);
  const userId = userObject?._id || userObject?.id;

  const [form, setForm] = useState({
    full_name: '', username: '', bio: '', website: '',
    date_of_birth: '', gender: '', location: '', email: '', phone: '',
  });
  const [interests, setInterests] = useState([]);
  const [allInterests, setAllInterests] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fileInputRef = useRef(null);
  const upd = (key, val) => setForm(p => ({ ...p, [key]: val }));

  useEffect(() => {
    if (!userId) return;

    Promise.allSettled([
      api.get(`/users/${userId}`),
      api.get(`/users/${userId}/interests`),
    ]).then(([userRes, interestsRes]) => {
      if (userRes.status === 'fulfilled') {
        const u = userRes.value.data?.user || userRes.value.data;
        setForm({
          full_name: u.full_name || '',
          username: u.username || '',
          bio: u.bio || '',
          website: u.website || '',
          date_of_birth: u.date_of_birth ? u.date_of_birth.slice(0, 10) : '',
          gender: u.gender || '',
          location: u.location || '',
          email: u.email || '',
          phone: u.phone || u.mobile_number || '',
        });
        setAvatarUrl(u.avatar_url || '');
      } else if (userObject) {
        setForm({
          full_name: userObject.full_name || '', username: userObject.username || '',
          bio: userObject.bio || '', website: userObject.website || '',
          date_of_birth: userObject.date_of_birth ? userObject.date_of_birth.slice(0, 10) : '',
          gender: userObject.gender || '', location: userObject.location || '',
          email: userObject.email || '',
          phone: userObject.phone || userObject.mobile_number || '',
        });
        setAvatarUrl(userObject.avatar_url || '');
      }

      if (interestsRes.status === 'fulfilled') {
        const d = interestsRes.value.data;
        setInterests(d.interests || d.user_interests || []);
        setAllInterests(d.all_interests || d.available_interests || []);
      }
    }).finally(() => setLoading(false));
  }, [userId]);

  const handleAvatarUpload = async (file) => {
    if (!file) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/upload/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAvatarUrl(res.data?.avatar_url || res.data?.fileUrl || '');
    } catch { setError('Failed to upload photo. Try again.'); }
    finally { setAvatarUploading(false); }
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await api.put(`/users/${userId}`, { ...form, avatar_url: avatarUrl });
      await dispatch(fetchMe());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save. Try again.');
    } finally { setSaving(false); }
  };

  const toggleInterest = async (name) => {
    const isOn = interests.includes(name);
    const next = isOn ? interests.filter(i => i !== name) : [...interests, name];
    setInterests(next);
    try { await api.put(`/users/${userId}/interests`, { interests: next }); }
    catch { setInterests(interests); }
  };

  const initials = (form.full_name || form.username || 'U').slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-black border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between z-40">
        <Link to="/settings" className="text-gray-800 dark:text-white p-1"><ArrowLeft size={22} /></Link>
        <h1 className="text-base font-semibold dark:text-white">Account</h1>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#fa3f5e] text-white text-sm font-bold disabled:opacity-60 transition-opacity min-w-[72px] justify-center">
          {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-gray-300 dark:text-gray-600" />
        </div>
      ) : (
        <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">

          {/* Avatar */}
          <div className="flex flex-col items-center gap-2 pb-2">
            <div className="relative">
              <div className="w-[90px] h-[90px] rounded-full overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 ring-4 ring-white dark:ring-gray-900 shadow-lg">
                {avatarUrl
                  ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-500 dark:text-gray-300">{initials}</div>
                }
              </div>
              <button onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#fa3f5e] text-white flex items-center justify-center shadow-md border-2 border-white dark:border-gray-900">
                {avatarUploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleAvatarUpload(e.target.files[0]); e.target.value = ''; }} />
            </div>
            <button onClick={() => fileInputRef.current?.click()}
              className="text-[#fa3f5e] text-sm font-semibold">
              Change Profile Photo
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}

          {/* Personal Information */}
          <div>
            <SectionTitle title="Personal Information" />
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">

              <Field label="Full Name">
                <input className={inputCls} placeholder="Your full name"
                  value={form.full_name} onChange={e => upd('full_name', e.target.value)} />
              </Field>

              <Field label="Username">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">@</span>
                  <input className={`${inputCls} pl-7`} placeholder="username"
                    value={form.username} onChange={e => upd('username', e.target.value)} />
                </div>
              </Field>

              <Field label="Bio">
                <textarea className={`${inputCls} resize-none`} rows={3}
                  placeholder="Write something about yourself…" maxLength={200}
                  value={form.bio} onChange={e => upd('bio', e.target.value)} />
                <p className="text-[11px] text-gray-400 text-right mt-1">{form.bio.length}/200</p>
              </Field>

              <Field label="Website">
                <input className={inputCls} placeholder="https://yourwebsite.com" type="url"
                  value={form.website} onChange={e => upd('website', e.target.value)} />
              </Field>

              <Field label="Date of Birth">
                <input className={inputCls} type="date"
                  value={form.date_of_birth} onChange={e => upd('date_of_birth', e.target.value)} />
              </Field>

              <Field label="Gender">
                <div className="grid grid-cols-2 gap-2">
                  {GENDER_OPTIONS.map(g => (
                    <button key={g} onClick={() => upd('gender', form.gender === g ? '' : g)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left ${
                        form.gender === g
                          ? 'bg-[#fa3f5e]/10 border-[#fa3f5e] text-[#fa3f5e]'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}>
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${form.gender === g ? 'border-[#fa3f5e]' : 'border-gray-300 dark:border-gray-600'}`}>
                        {form.gender === g && <span className="w-2 h-2 rounded-full bg-[#fa3f5e]" />}
                      </span>
                      {g}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Location">
                <input className={inputCls} placeholder="City, Country"
                  value={form.location} onChange={e => upd('location', e.target.value)} />
              </Field>
            </div>
          </div>

          {/* Interests */}
          <div>
            <SectionTitle title="Interests" />
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
              {(allInterests.length === 0 && interests.length === 0) ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No interests found.</p>
              ) : (
                <>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Tap to select or remove interests</p>
                  <div className="flex flex-wrap gap-2">
                    {(allInterests.length > 0 ? allInterests : interests).map((item) => {
                      const name = typeof item === 'string' ? item : (item.name || item.category || '');
                      const isOn = interests.some(i => (typeof i === 'string' ? i : i.name || i.category || '') === name);
                      return (
                        <button key={name} onClick={() => toggleInterest(name)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                            isOn
                              ? 'bg-[#fa3f5e] text-white border-[#fa3f5e] shadow-sm'
                              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-[#fa3f5e] hover:text-[#fa3f5e]'
                          }`}>
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <SectionTitle title="Contact Information" />
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">

              <Field label="Email Address">
                <div className="flex items-center gap-2">
                  <input className={`${inputCls} flex-1`} placeholder="you@example.com" type="email"
                    value={form.email} onChange={e => upd('email', e.target.value)} />
                  <button className="flex-shrink-0 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-[#fa3f5e] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    Verify
                  </button>
                </div>
              </Field>

              <Field label="Mobile Number">
                <div className="flex items-center gap-2">
                  <input className={`${inputCls} flex-1`} placeholder="+91 98765 43210" type="tel"
                    value={form.phone} onChange={e => upd('phone', e.target.value)} />
                  <button className="flex-shrink-0 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-[#fa3f5e] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    Verify
                  </button>
                </div>
              </Field>
            </div>
          </div>

          {/* Save Button */}
          <button onClick={handleSave} disabled={saving}
            className="w-full py-3.5 rounded-2xl bg-[#fa3f5e] text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-[#fa3f5e]/20">
            {saving
              ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
              : saved
              ? <><CheckCircle2 size={16} /> Changes Saved!</>
              : 'Save Changes'
            }
          </button>

        </div>
      )}
    </div>
  );
};

export default AccountSettings;
