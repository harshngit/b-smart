import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import api from "../lib/api";

import "swiper/css";
import "swiper/css/pagination";

import {
  ArrowLeft, Globe, Mail, Phone, MapPin,
  Building2, Calendar, Tag, Briefcase, Info, Megaphone, UserCheck,
  Image as ImageIcon, AlertCircle, Heart, MessageCircle,
  Eye, Play, BadgeCheck, ShieldCheck, X, ExternalLink,
  MoreHorizontal, Loader2, Bell, Flag, Users, Camera,
  Navigation, ShoppingBag, Package, Star, Store,
  ChevronRight,
} from "lucide-react";

const BASE_URL = "https://api.bebsmart.in";

// ─── URL helpers ──────────────────────────────────────────────────────────────
const fixUrl = (url) => {
  if (!url) return null;
  if (/^http:\/\/api\.bebsmart\.in/i.test(String(url)))
    return String(url).replace(/^http:\/\//i, "https://");
  if (String(url).startsWith("http")) return url;
  const n = String(url).replace(/^\/+/, "");
  return n.startsWith("uploads/") ? `${BASE_URL}/${n}` : `${BASE_URL}/uploads/${n}`;
};

const mediaUrl = (ad) => {
  const m = ad?.media?.[0];
  if (!m) return null;
  if (m.fileUrl?.startsWith("http")) return fixUrl(m.fileUrl);
  if (m.fileName) return fixUrl(m.fileName);
  return null;
};
const thumbnailUrl = (ad) => {
  const m = ad?.media?.[0];
  if (!m) return null;
  if (m.thumbnails?.[0]?.fileUrl) return fixUrl(m.thumbnails[0].fileUrl);
  if (m.thumbnail_url) return fixUrl(m.thumbnail_url);
  if (m.media_type !== "video" && m.fileUrl) return fixUrl(m.fileUrl);
  return null;
};
const isVideoAd = (ad) => ad?.media?.[0]?.media_type === "video";

const fmt = (n = 0) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n || 0);
};

// ─── Verified Badge ───────────────────────────────────────────────────────────
const VerifiedBadge = ({ size = "md" }) => {
  const dim = size === "sm" ? 15 : 19;
  const ico = size === "sm" ? 8 : 11;
  return (
    <span
      title="Verified"
      className="inline-flex items-center justify-center rounded-full bg-[#0095f6] flex-shrink-0"
      style={{ width: dim, height: dim }}
    >
      <BadgeCheck size={ico} className="text-white" strokeWidth={3} />
    </span>
  );
};

// ─── Avatar Lightbox ──────────────────────────────────────────────────────────
const AvatarLightbox = ({ src, name, onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={onClose}>
    <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
      <X size={20} />
    </button>
    <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
      <div className="rounded-3xl overflow-hidden shadow-2xl">
        {src
          ? <img src={src} alt={name} className="w-full object-cover" />
          : <div className="w-full aspect-square bg-gradient-to-br from-orange-400 to-pink-600 flex items-center justify-center">
              <span className="text-white font-black text-7xl">{name?.[0]?.toUpperCase()}</span>
            </div>
        }
      </div>
      <p className="text-center text-white/80 text-sm font-semibold mt-3">{name}</p>
    </div>
  </div>
);

// ─── Ad Card ─────────────────────────────────────────────────────────────────
const AdCard = ({ ad, onClick }) => {
  const videoRef = useRef(null);
  const [hovered, setHovered] = useState(false);
  const thumb = thumbnailUrl(ad);
  const src   = mediaUrl(ad);
  const hasVid = isVideoAd(ad);

  const onEnter = () => {
    setHovered(true);
    if (hasVid && videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play().catch(() => {}); }
  };
  const onLeave = () => {
    setHovered(false);
    if (hasVid && videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
  };

  return (
    <div onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={() => onClick?.(ad._id || ad.id)}
      className="relative overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800 cursor-pointer group" style={{ aspectRatio: "1/1" }}>
      {thumb
        ? <img src={thumb} alt={ad.ad_title || "Ad"} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        : <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-pink-100 dark:from-orange-900/30 dark:to-pink-900/30" />
      }
      {hasVid && src && (
        <video ref={videoRef} src={src} muted loop playsInline
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${hovered ? "opacity-100" : "opacity-0"}`} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent z-10" />
      <div className="absolute bottom-0 left-0 right-0 z-20 px-2.5 pb-2.5">
        {(ad.category || ad.ad_type) && (
          <span className="block text-[10px] font-black uppercase tracking-widest text-white/90 truncate">{ad.category || ad.ad_type}</span>
        )}
        {(ad.ad_title || ad.caption) && (
          <span className="block text-[9px] text-white/60 truncate leading-tight">{ad.ad_title || ad.caption}</span>
        )}
      </div>
      {hasVid && (
        <div className="absolute top-2 right-2 z-20 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
          <Play size={8} className="text-white fill-white ml-0.5" />
        </div>
      )}
      <div className={`absolute inset-0 bg-black/50 z-30 flex items-center justify-center gap-3 transition-opacity duration-200 ${hovered ? "opacity-100" : "opacity-0"}`}>
        <span className="flex items-center gap-1 text-white text-xs font-black"><Heart size={12} className="fill-white" /> {fmt(ad.likes_count ?? 0)}</span>
        <span className="flex items-center gap-1 text-white text-xs font-black"><Eye size={12} /> {fmt(ad.views_count ?? 0)}</span>
      </div>
    </div>
  );
};

// ─── ABOUT TAB ────────────────────────────────────────────────────────────────
const AboutTab = ({ data }) => {
  const addr    = data.online_presence?.address;
  const addrStr = [addr?.address_line1, addr?.address_line2, addr?.city, addr?.state, addr?.pincode, addr?.country].filter(Boolean).join(", ");
  const industry = data.company_details?.industry || data.business_details?.industry_category;
  const hasSocial = data.social_media_links?.instagram || data.social_media_links?.facebook
    || data.social_media_links?.linkedin || data.social_media_links?.twitter;

  return (
    <div className="space-y-4">

      {/* Description */}
      {data.company_description && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">About</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{data.company_description}</p>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex flex-col items-center gap-1">
          <span className="text-xl font-black text-gray-900 dark:text-white">{fmt(data.ad_count || 0)}</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Ads</span>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex flex-col items-center gap-1">
          <span className="text-xl font-black text-gray-900 dark:text-white">{fmt(data.follower_count || 0)}</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Followers</span>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex flex-col items-center gap-1">
          <span className="text-xl font-black text-gray-900 dark:text-white">{fmt(data.following_count || 0)}</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Following</span>
        </div>
      </div>

      {/* Info chips */}
      <div className="grid grid-cols-2 gap-2.5">
        {industry && (
          <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/20 rounded-2xl p-4">
            <Tag size={16} className="text-violet-500 mb-2" />
            <p className="text-[10px] font-black text-violet-500 uppercase tracking-wider mb-0.5">Industry</p>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{industry}</p>
          </div>
        )}
        {data.business_details?.business_nature && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/20 rounded-2xl p-4">
            <Briefcase size={16} className="text-blue-500 mb-2" />
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-wider mb-0.5">Nature</p>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{data.business_details.business_nature}</p>
          </div>
        )}
        {data.business_details?.service_coverage && (
          <div className="bg-teal-50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/20 rounded-2xl p-4">
            <Globe size={16} className="text-teal-500 mb-2" />
            <p className="text-[10px] font-black text-teal-500 uppercase tracking-wider mb-0.5">Coverage</p>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{data.business_details.service_coverage}</p>
          </div>
        )}
        {data.company_details?.year_established && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/20 rounded-2xl p-4">
            <Calendar size={16} className="text-amber-500 mb-2" />
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-wider mb-0.5">Est.</p>
            <p className="text-2xl font-black text-gray-800 dark:text-gray-100">{data.company_details.year_established}</p>
          </div>
        )}
        {data.business_details?.country && (
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/20 rounded-2xl p-4">
            <MapPin size={16} className="text-rose-500 mb-2" />
            <p className="text-[10px] font-black text-rose-500 uppercase tracking-wider mb-0.5">Country</p>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{data.business_details.country}</p>
          </div>
        )}
        {data.company_details?.company_type && (
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-2xl p-4">
            <Building2 size={16} className="text-slate-500 mb-2" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5">Type</p>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{data.company_details.company_type}</p>
          </div>
        )}
      </div>

      {/* Registration */}
      {(data.company_details?.registration_number || data.company_details?.tax_id) && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Registration</p>
          <div className="flex flex-wrap gap-6">
            {data.company_details?.registration_number && (
              <div>
                <p className="text-[10px] text-gray-400 font-semibold mb-1">Reg. Number</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white font-mono">{data.company_details.registration_number}</p>
              </div>
            )}
            {data.company_details?.tax_id && (
              <div>
                <p className="text-[10px] text-gray-400 font-semibold mb-1">Tax ID / GST</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white font-mono">{data.company_details.tax_id}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Address */}
      {addrStr && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
              <MapPin size={16} className="text-rose-500" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Address</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{addrStr}</p>
            </div>
          </div>
        </div>
      )}

      {/* Social Media */}
      {hasSocial && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Social Media</p>
          <div className="flex flex-wrap gap-2">
            {data.social_media_links?.instagram && (
              <a href={data.social_media_links.instagram} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-pink-200 dark:border-pink-900 text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/20 text-xs font-bold hover:bg-pink-100 transition-colors">
                Instagram
              </a>
            )}
            {data.social_media_links?.facebook && (
              <a href={data.social_media_links.facebook} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 text-xs font-bold hover:bg-blue-100 transition-colors">
                Facebook
              </a>
            )}
            {data.social_media_links?.linkedin && (
              <a href={data.social_media_links.linkedin} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 text-xs font-bold hover:bg-blue-100 transition-colors">
                LinkedIn
              </a>
            )}
            {data.social_media_links?.twitter && (
              <a href={data.social_media_links.twitter} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-sky-200 dark:border-sky-900 text-sky-500 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 text-xs font-bold hover:bg-sky-100 transition-colors">
                Twitter / X
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── PRODUCTS TAB (dummy) ─────────────────────────────────────────────────────
const ProductsTab = ({ vendorName }) => {
  const dummyProducts = [
    { id: 1, name: "Premium Casual Shoes", price: "₹1,299", rating: 4.5, reviews: 128, tag: "Bestseller", color: "from-orange-400 to-pink-500" },
    { id: 2, name: "Formal Oxford Shoes", price: "₹2,499", rating: 4.8, reviews: 89,  tag: "New",        color: "from-blue-400 to-indigo-500" },
    { id: 3, name: "Sports Running Shoes",price: "₹3,199", rating: 4.6, reviews: 214, tag: "Sale",       color: "from-green-400 to-teal-500"  },
    { id: 4, name: "Kids Velcro Shoes",   price: "₹899",   rating: 4.3, reviews: 56,  tag: null,         color: "from-purple-400 to-pink-500" },
    { id: 5, name: "Ladies Heel Sandals", price: "₹1,799", rating: 4.7, reviews: 172, tag: "Popular",    color: "from-rose-400 to-pink-600"   },
    { id: 6, name: "Loafers Collection",  price: "₹1,599", rating: 4.4, reviews: 93,  tag: null,         color: "from-amber-400 to-orange-500" },
  ];
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-gray-900 dark:text-white">Products by {vendorName}</p>
        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full font-semibold">Coming Soon</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {dummyProducts.map(p => (
          <div key={p.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
            <div className={`h-28 bg-gradient-to-br ${p.color} flex items-center justify-center relative`}>
              <Package size={32} className="text-white/70" />
              {p.tag && (
                <span className="absolute top-2 left-2 text-[9px] font-black uppercase bg-white/20 text-white px-2 py-0.5 rounded-full">
                  {p.tag}
                </span>
              )}
            </div>
            <div className="p-3">
              <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight mb-1 line-clamp-2">{p.name}</p>
              <div className="flex items-center gap-1 mb-2">
                <Star size={10} className="text-amber-400 fill-amber-400" />
                <span className="text-[10px] font-semibold text-gray-500">{p.rating} ({p.reviews})</span>
              </div>
              <p className="text-sm font-black text-gray-900 dark:text-white">{p.price}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── GALLERY TAB ──────────────────────────────────────────────────────────────
const GalleryTab = ({ vendorUserId }) => {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    api.get("/ads/gallery", { params: vendorUserId ? { userId: vendorUserId } : {} })
      .then(res => {
        const raw = res.data?.data || res.data || [];
        setItems(Array.isArray(raw) ? raw : []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [vendorUserId]);

  if (loading) return (
    <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
      <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm">Loading gallery…</span>
    </div>
  );

  if (items.length === 0) return (
    <div className="flex flex-col items-center py-20 gap-3 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
      <Camera size={36} className="text-gray-300 dark:text-gray-600" />
      <p className="text-sm text-gray-400 font-medium">No gallery items yet</p>
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
        {items.map((item, i) => {
          const url = fixUrl(item.link || item.fileUrl || item.url || '');
          return (
            <button key={item.adId || i} onClick={() => setLightbox(i)}
              className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 group relative">
              {url
                ? <img src={url} alt={item.filename || item.filname || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={e => { e.currentTarget.style.display='none'; }} />
                : <div className="w-full h-full flex items-center justify-center"><Camera size={20} className="text-gray-400" /></div>
              }
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </button>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (() => {
        const item = items[lightbox];
        const url  = fixUrl(item?.link || item?.fileUrl || item?.url || '');
        return (
          <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
            <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
              <X size={20} />
            </button>
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 text-white text-xs font-bold">
              {lightbox + 1} / {items.length}
            </div>
            {lightbox > 0 && (
              <button onClick={e => { e.stopPropagation(); setLightbox(l => l - 1); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
                ‹
              </button>
            )}
            <div className="max-w-3xl w-full max-h-[85vh] flex items-center justify-center" onClick={e => e.stopPropagation()}>
              {url && <img src={url} alt="" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain" />}
            </div>
            {lightbox < items.length - 1 && (
              <button onClick={e => { e.stopPropagation(); setLightbox(l => l + 1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
                ›
              </button>
            )}
          </div>
        );
      })()}
    </>
  );
};

// ─── ADS TAB ──────────────────────────────────────────────────────────────────
const AdsTab = ({ userId, navigate }) => {
  const [ads, setAds]         = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (!userId) return;
    api.get(`/ads/user/${userId}`)
      .then(res => { const raw = res.data?.ads || res.data || []; setAds(Array.isArray(raw) ? raw : []); })
      .catch(() => setError("Could not load ads."))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-gray-400">Loading ads…</span>
    </div>
  );
  if (error) return (
    <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-500 px-4 py-3 rounded-2xl text-sm">
      <AlertCircle size={14} /> {error}
    </div>
  );
  if (ads.length === 0) return (
    <div className="flex flex-col items-center py-20 gap-3 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
      <Megaphone size={36} className="text-gray-300 dark:text-gray-600" />
      <p className="text-sm text-gray-400 font-medium">No ads yet</p>
    </div>
  );
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {ads.map((ad, i) => (
        <AdCard key={ad._id || i} ad={ad} onClick={(id) => navigate(`/ads/${id}/details`)} />
      ))}
    </div>
  );
};

// ─── EVENTS TAB (dummy) ───────────────────────────────────────────────────────
const EventsTab = () => {
  const dummy = [
    { id: 1, title: "Annual Footwear Expo 2026", date: "Aug 15, 2026", location: "Thane, Maharashtra", type: "Exhibition", color: "from-pink-500 to-rose-600" },
    { id: 2, title: "End of Season Sale Launch", date: "Jul 1, 2026",  location: "Online",              type: "Sale",       color: "from-orange-500 to-amber-500" },
    { id: 3, title: "New Collection Launch",     date: "Sep 5, 2026",  location: "Mumbai, Maharashtra", type: "Launch",     color: "from-purple-500 to-indigo-600" },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-gray-900 dark:text-white">Upcoming Events</p>
        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full font-semibold">Coming Soon</span>
      </div>
      {dummy.map(ev => (
        <div key={ev.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className={`h-2 bg-gradient-to-r ${ev.color}`} />
          <div className="p-4 flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${ev.color} flex items-center justify-center shrink-0 shadow-sm`}>
              <Calendar size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white mb-1 leading-snug">{ev.title}</p>
              <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1"><Calendar size={11} /> {ev.date}</span>
                <span className="flex items-center gap-1"><MapPin size={11} /> {ev.location}</span>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 shrink-0">
              {ev.type}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── LOCATIONS TAB (dummy) ────────────────────────────────────────────────────
const LocationsTab = ({ data }) => {
  const addr = data.online_presence?.address;
  const addrStr = addr
    ? [addr.address_line1, addr.address_line2, addr.city, addr.state, addr.pincode, addr.country].filter(Boolean).join(", ")
    : null;
  const dummyBranches = [
    { name: "Head Office",   city: addr?.city || "Thane",  state: addr?.state || "Maharashtra", type: "HQ"     },
    { name: "Warehouse",     city: "Mumbai",                state: "Maharashtra",                 type: "Storage" },
    { name: "Retail Outlet", city: "Pune",                  state: "Maharashtra",                 type: "Store"   },
  ];
  return (
    <div className="space-y-4">
      {/* Main Address Map placeholder */}
      {addrStr && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className="h-36 bg-gradient-to-br from-blue-100 to-teal-100 dark:from-blue-900/30 dark:to-teal-900/30 flex items-center justify-center relative">
            <Navigation size={36} className="text-blue-400" />
            <span className="absolute bottom-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Map view coming soon</span>
          </div>
          <div className="p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
              <MapPin size={16} className="text-rose-500" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Primary Address</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{addrStr}</p>
            </div>
          </div>
        </div>
      )}

      {/* Branch list */}
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">All Locations</p>
      <div className="space-y-3">
        {dummyBranches.map((b, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
              <Store size={18} className="text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white">{b.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{b.city}, {b.state}</p>
            </div>
            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">{b.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── CONTACT TAB ─────────────────────────────────────────────────────────────
const ContactTab = ({ data }) => {
  const contactItems = [
    data.online_presence?.company_email && {
      icon: Mail, bg: "bg-pink-50 dark:bg-pink-900/30", color: "text-pink-500",
      label: "Company Email", value: data.online_presence.company_email,
      href: `mailto:${data.online_presence.company_email}`,
    },
    data.online_presence?.phone_number && {
      icon: Phone, bg: "bg-green-50 dark:bg-green-900/30", color: "text-green-500",
      label: "Phone Number", value: data.online_presence.phone_number,
      href: `tel:${data.online_presence.phone_number}`,
    },
    data.online_presence?.website_url && {
      icon: Globe, bg: "bg-blue-50 dark:bg-blue-900/30", color: "text-blue-500",
      label: "Website", value: data.online_presence.website_url,
      href: data.online_presence.website_url,
    },
    data.user_id?.email && {
      icon: Mail, bg: "bg-orange-50 dark:bg-orange-900/30", color: "text-orange-500",
      label: "Account Email", value: data.user_id.email,
      href: `mailto:${data.user_id.email}`,
    },
    data.user_id?.phone && {
      icon: Phone, bg: "bg-teal-50 dark:bg-teal-900/30", color: "text-teal-500",
      label: "Account Phone", value: data.user_id.phone,
      href: `tel:${data.user_id.phone}`,
    },
  ].filter(Boolean);

  return (
    <div className="space-y-3">
      {contactItems.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">No contact info available.</div>
      ) : (
        contactItems.map((item, i) => (
          <a key={i} href={item.href}
            target={item.href.startsWith("http") ? "_blank" : "_self"} rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-sm transition-all group">
            <div className={`w-10 h-10 rounded-2xl ${item.bg} flex items-center justify-center shrink-0`}>
              <item.icon size={16} className={item.color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.label}</p>
              <p className={`text-sm font-semibold mt-0.5 truncate ${item.color} group-hover:underline`}>{item.value}</p>
            </div>
            <ExternalLink size={13} className="text-gray-300 group-hover:text-gray-400 shrink-0" />
          </a>
        ))
      )}

      {/* CTA buttons */}
      {(data.online_presence?.company_email || data.online_presence?.phone_number) && (
        <div className="flex gap-3 pt-2">
          {data.online_presence?.company_email && (
            <a href={`mailto:${data.online_presence.company_email}`}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-pink-600 text-white text-sm font-bold shadow-lg hover:opacity-90 transition-all">
              <Mail size={15} /> Send Email
            </a>
          )}
          {data.online_presence?.phone_number && (
            <a href={`tel:${data.online_presence.phone_number}`}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
              <Phone size={15} /> Call Now
            </a>
          )}
        </div>
      )}
    </div>
  );
};

// ─── TABS CONFIG ──────────────────────────────────────────────────────────────
const TABS = [
  { id: "about",     label: "About",     icon: Info       },
  { id: "products",  label: "Products",  icon: Package    },
  { id: "gallery",   label: "Gallery",   icon: Camera     },
  { id: "ads",       label: "Ads",       icon: Megaphone  },
  { id: "events",    label: "Events",    icon: Calendar   },
  { id: "locations", label: "Locations", icon: Navigation },
  { id: "contact",   label: "Contact",   icon: UserCheck  },
];

// ─── ROOT COMPONENT ───────────────────────────────────────────────────────────
export default function VendorPublicProfile() {
  const { userId }  = useParams();
  const navigate    = useNavigate();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [activeTab, setActiveTab]   = useState("about");
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [showMenu, setShowMenu]     = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [toast, setToast]           = useState(null);
  const menuRef   = useRef(null);
  const tabsRef   = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showMenu]);

  // Fetch vendor profile
  useEffect(() => {
    if (!userId) return;
    setLoading(true); setError("");
    api.get(`/vendors/profile/${userId}/public`)
      .then(res => {
        const raw = res.data?.vendor ?? res.data?.profile ?? res.data?.data ?? res.data;
        setData(raw);
      })
      .catch(() => setError("Failed to load vendor profile."))
      .finally(() => setLoading(false));
  }, [userId]);

  // Fetch notification preference
  useEffect(() => {
    if (!userId) return;
    api.get(`/notification-preferences/vendors/${userId}/status`)
      .then(res => setNotifEnabled(res.data?.enabled || false))
      .catch(() => {});
  }, [userId]);

  const toggleNotif = async () => {
    if (!userId || notifLoading) return;
    setNotifLoading(true);
    try {
      const res = await api.post(`/notification-preferences/vendors/${userId}/toggle`);
      setNotifEnabled(res.data?.enabled || false);
      setToast({ type: "success", message: `Notifications ${res.data?.enabled ? "enabled" : "disabled"}.` });
    } catch {
      setToast({ type: "error", message: "Failed to update notification settings." });
    } finally { setNotifLoading(false); setShowMenu(false); }
  };

  const handleReport = () => {
    setShowMenu(false);
    setToast({ type: "success", message: "Report submitted successfully." });
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Scroll active tab into view on mobile
  useEffect(() => {
    if (!tabsRef.current) return;
    const btn = tabsRef.current.querySelector(`[data-tab="${activeTab}"]`);
    if (btn) btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeTab]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-gray-400">Loading profile…</span>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-center gap-4 p-6">
      <AlertCircle size={40} className="text-red-400" />
      <p className="text-base font-semibold text-gray-700 dark:text-gray-300">{error}</p>
      <button onClick={() => navigate(-1)} className="text-sm text-pink-600 font-bold hover:underline">← Go Back</button>
    </div>
  );

  if (!data) return null;

  const companyName  = data.company_details?.company_name || data.business_name || "Vendor";
  const isVerified   = data.validated === true;
  const avatarSrc    = fixUrl(data.avatar_url || data.user_id?.avatar_url);
  const coverUrls    = (data.cover_image_urls || []).map(fixUrl).filter(Boolean);
  const industry     = data.company_details?.industry || data.business_details?.industry_category;
  const vendorUserId = data.user_id?._id || (typeof data.user_id === "string" ? data.user_id : null) || userId;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-4 z-[110] rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg ${
          toast.type === "success"
            ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"
            : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
        }`}>{toast.message}</div>
      )}

      {/* Avatar Lightbox */}
      {avatarOpen && <AvatarLightbox src={avatarSrc} name={companyName} onClose={() => setAvatarOpen(false)} />}

      {/* ── Cover image ─────────────────────────────────────────────── */}
      <div className="relative h-52 md:h-72 bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 overflow-hidden">

        {/* Top action bar — absolute over cover */}
        <div className="absolute top-4 left-4 right-4 z-30 flex justify-between items-center">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/40 backdrop-blur-sm text-white text-xs font-bold hover:bg-black/60 transition-all shadow-lg">
            <ArrowLeft size={14} /> Back
          </button>
          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowMenu(!showMenu)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-all shadow-lg">
              <MoreHorizontal size={20} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden origin-top-right z-50">
                <button onClick={handleReport}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                  <Flag size={16} /> Report
                </button>
                <button onClick={toggleNotif} disabled={notifLoading}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border-t border-gray-100 dark:border-gray-800 transition-colors disabled:opacity-50">
                  {notifLoading ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
                  {notifEnabled ? "Turn Off Notifs" : "Turn On Notifs"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Cover images */}
        {coverUrls.length > 0 ? (
          <Swiper modules={[Autoplay, Pagination]} autoplay={{ delay: 3500, disableOnInteraction: false }}
            pagination={{ clickable: true }} loop className="w-full h-full">
            {coverUrls.map((url, i) => (
              <SwiperSlide key={i}>
                <img src={url} alt={`Cover ${i + 1}`} className="w-full h-full object-cover" />
              </SwiperSlide>
            ))}
          </Swiper>
        ) : (
          <>
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <ImageIcon size={56} className="text-white/20" />
            </div>
          </>
        )}
      </div>

      {/* ── Profile identity ─────────────────────────────────────────── */}
      {/* Separate section with explicit background — avatar overlaps cover via negative margin */}
      <div className="bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 pb-4">

          {/* Avatar row — pulled up to overlap cover */}
          <div className="flex items-end justify-between" style={{ marginTop: "-44px" }}>
            <button onClick={() => setAvatarOpen(true)}
              className="w-[88px] h-[88px] md:w-[100px] md:h-[100px] rounded-2xl overflow-hidden bg-white dark:bg-gray-800 border-4 border-white dark:border-gray-950 shadow-xl shrink-0 hover:scale-105 transition-transform focus:outline-none">
              {avatarSrc
                ? <img src={avatarSrc} alt={companyName} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-gradient-to-br from-orange-400 to-pink-600 flex items-center justify-center">
                    <span className="text-white font-black text-3xl">{companyName[0]?.toUpperCase()}</span>
                  </div>
              }
            </button>

            <div className="flex items-center gap-2 pt-2">
              {data.online_presence?.website_url && (
                <a href={data.online_presence.website_url} target="_blank" rel="noopener noreferrer"
                  className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-lg hover:opacity-90 transition-all">
                  <Globe size={12} /> Visit Website
                </a>
              )}
              <button onClick={() => setActiveTab("contact")}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition-all shadow-sm">
                + Follow
              </button>
            </div>
          </div>

          {/* Company name + meta */}
          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{companyName}</h1>
              {isVerified && <VerifiedBadge />}
            </div>

            <div className="flex items-center flex-wrap gap-4 mt-1.5 mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-bold text-gray-900 dark:text-white">{fmt(data.follower_count || 0)}</span> followers
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-bold text-gray-900 dark:text-white">{fmt(data.following_count || 0)}</span> following
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-bold text-gray-900 dark:text-white">{fmt(data.ad_count || 0)}</span> ads
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {industry && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-full">
                  <Tag size={9} /> {industry}
                </span>
              )}
              {data.business_details?.service_coverage && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-full">
                  <MapPin size={9} /> {data.business_details.service_coverage}
                </span>
              )}
              {data.business_details?.country && (
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-full">
                  🌏 {data.business_details.country}
                </span>
              )}
              {isVerified && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                  <ShieldCheck size={9} /> Verified Business
                </span>
              )}
            </div>

            {data.company_description && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                {data.company_description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <div className="sticky top-16 md:top-0 z-20 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-4xl mx-auto">
          <div ref={tabsRef} className="flex overflow-x-auto scrollbar-hide">
            {TABS.map(t => {
              const active = activeTab === t.id;
              return (
                <button key={t.id} data-tab={t.id} onClick={() => setActiveTab(t.id)}
                  className={`flex-shrink-0 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-4 sm:px-5 py-3.5 text-[11px] sm:text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
                    active
                      ? "border-pink-500 text-pink-600 dark:text-pink-400"
                      : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}>
                  <t.icon size={14} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Tab Content ───────────────────────────────────────────────── */}
      <div className={`max-w-4xl mx-auto pb-24 ${activeTab === "ads" ? "pt-1 px-0" : "px-4 py-5"}`}>
        {activeTab === "about"     && <AboutTab data={data} />}
        {activeTab === "products"  && <ProductsTab vendorName={companyName} />}
        {activeTab === "gallery"   && <GalleryTab vendorUserId={vendorUserId} />}
        {activeTab === "ads"       && <AdsTab userId={vendorUserId} navigate={navigate} />}
        {activeTab === "events"    && <EventsTab />}
        {activeTab === "locations" && <LocationsTab data={data} />}
        {activeTab === "contact"   && <ContactTab data={data} />}
      </div>
    </div>
  );
}
