import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft, Search, X, Loader2, AlertCircle, Gift,
  Coins, ChevronRight, CheckCircle2, Info, ShoppingBag
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../lib/api';

// ─── Fixed categories ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: '',                  label: 'All'              },
  { key: 'Gift Cards',        label: 'Gift Cards'       },
  { key: 'Food',              label: 'Food'             },
  { key: 'Entertainment',     label: 'Entertainment'    },
  { key: 'Shopping',          label: 'Shopping'         },
  { key: 'Travel',            label: 'Travel'           },
  { key: 'Health & Wellness', label: 'Health & Wellness'},
  { key: 'Electronics',       label: 'Electronics'      },
  { key: 'Fashion',           label: 'Fashion'          },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtCoins = (n) => Number(n || 0).toLocaleString('en-IN');

// ─── Denomination chip ────────────────────────────────────────────────────────
const DenomChip = ({ denom, selected, onSelect }) => (
  <button
    onClick={() => onSelect(denom)}
    className={`flex flex-col items-center justify-center rounded-xl border-2 py-3 px-2 transition-all ${
      selected
        ? 'border-orange-500 bg-orange-500 shadow-lg shadow-orange-500/30'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 hover:border-orange-300 dark:hover:border-orange-600'
    }`}
  >
    <span className={`text-sm font-bold ${selected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
      ₹{fmtCoins(denom.amount)}
    </span>
    <span className={`text-[11px] font-semibold mt-0.5 ${selected ? 'text-orange-100' : 'text-gray-400 dark:text-gray-500'}`}>
      {fmtCoins(denom.bcoins)} bCoins
    </span>
  </button>
);

// ─── Detail modal — slides up from bottom, slides down on close ───────────────
const GiftCardDetail = ({ card, balance, onClose }) => {
  const [selected,  setSelected]  = useState(card.denominations?.[0] || null);
  const [buying,    setBuying]    = useState(false);
  const [done,      setDone]      = useState(false);
  const [errMsg,    setErrMsg]    = useState('');
  const [showTerms, setShowTerms] = useState(false);
  // animation state: false = hidden (translate-y-full), true = visible (translate-y-0)
  const [visible,   setVisible]   = useState(false);
  const [imgError,  setImgError]  = useState(false);

  const canAfford = selected ? balance >= selected.bcoins : false;

  // Slide UP on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Escape key
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Slide DOWN then unmount
  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 320);
  };

  const handleBuy = async () => {
    if (!selected || !canAfford) return;
    setBuying(true);
    setErrMsg('');
    try {
      await api.post('/gift-cards/redeem', {
        gift_card_id: card._id,
        denomination_id: selected._id,
      });
      setDone(true);
    } catch (e) {
      setErrMsg(e?.response?.data?.message || 'Redemption failed. Please try again.');
    } finally {
      setBuying(false);
    }
  };

  const hasImage = card.media?.url && !imgError;

  return (
    <>
      {/* ── Backdrop — fades in/out ── */}
      <div
        onClick={handleClose}
        className="fixed inset-0 z-[80] transition-all duration-300"
        style={{ background: visible ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0)', backdropFilter: visible ? 'blur(4px)' : 'none' }}
      />

      {/* ─────────────────────────────────────────────────────────────────────
          MOBILE / TABLET  →  bottom sheet slides up from bottom
          DESKTOP (md+)    →  centered two-column dialog
      ───────────────────────────────────────────────────────────────────── */}

      {/* ── Mobile bottom sheet ── */}
      <div
        className={`fixed inset-x-0 bottom-0 z-[80] md:hidden flex flex-col bg-white dark:bg-[#1c1c1e] rounded-t-3xl shadow-2xl max-h-[88dvh] overflow-hidden
          transition-transform duration-300 ease-out will-change-transform
          ${visible ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {/* Card image — compact, never empty black */}
        {hasImage && (
          <div className="w-full flex-shrink-0 overflow-hidden" style={{ maxHeight: 180 }}>
            <img
              src={card.media.url}
              alt={card.title}
              onError={() => setImgError(true)}
              className="w-full object-contain"
              style={{ maxHeight: 180, background: '#111' }}
            />
          </div>
        )}

        {/* Close button */}
        <button
          onClick={handleClose}
          className={`absolute z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors
            ${hasImage
              ? 'top-5 right-4 bg-black/40 hover:bg-black/60'
              : 'top-3 right-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
        >
          <X size={14} className={hasImage ? 'text-white' : 'text-gray-600 dark:text-gray-300'} />
        </button>

        {/* Scrollable detail content */}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2">
          <ModalBody
            card={card} selected={selected} setSelected={setSelected}
            canAfford={canAfford} balance={balance}
            showTerms={showTerms} setShowTerms={setShowTerms}
            errMsg={errMsg} done={done}
          />
        </div>

        {/* CTA */}
        <ModalFooter
          selected={selected} canAfford={canAfford} buying={buying} done={done}
          onBuy={handleBuy} onClose={handleClose}
        />
      </div>

      {/* ── Desktop centered dialog ── */}
      <div
        className={`fixed inset-0 z-[80] hidden md:flex items-center justify-center p-6
          transition-all duration-300
          ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        style={{ pointerEvents: visible ? 'auto' : 'none' }}
      >
        <div
          className="relative w-full max-w-3xl bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl flex flex-row max-h-[88vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left: image panel */}
          <div className="w-72 lg:w-80 flex-shrink-0 bg-gray-950 flex items-center justify-center relative rounded-l-2xl overflow-hidden">
            {hasImage ? (
              <img
                src={card.media.url}
                alt={card.title}
                onError={() => setImgError(true)}
                className="w-full h-full object-contain p-4"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 py-12">
                <Gift size={52} className="text-orange-400" />
                <span className="text-white/40 text-sm text-center px-4">{card.title}</span>
              </div>
            )}
            {card.vendor && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-4">
                <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">{card.vendor}</span>
              </div>
            )}
          </div>

          {/* Right: scrollable */}
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Close */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
            >
              <X size={14} className="text-gray-600 dark:text-gray-300" />
            </button>

            <div className="flex-1 overflow-y-auto px-6 pt-6 pb-2">
              <ModalBody
                card={card} selected={selected} setSelected={setSelected}
                canAfford={canAfford} balance={balance}
                showTerms={showTerms} setShowTerms={setShowTerms}
                errMsg={errMsg} done={done}
              />
            </div>

            <ModalFooter
              selected={selected} canAfford={canAfford} buying={buying} done={done}
              onBuy={handleBuy} onClose={handleClose}
            />
          </div>
        </div>
      </div>
    </>
  );
};

// ── Shared modal body (used by both mobile sheet and desktop dialog) ───────────
const ModalBody = ({ card, selected, setSelected, canAfford, balance, showTerms, setShowTerms, errMsg, done }) => (
  <>
    {card.vendor && (
      <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">{card.vendor}</span>
    )}
    <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5 leading-snug">{card.title}</h2>
    {card.description && card.description !== card.vendor && (
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">{card.description}</p>
    )}
    {card.category && (
      <span className="inline-block mt-2 text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {card.category}
      </span>
    )}

    {card.denominations?.length > 0 && (
      <div className="mt-5">
        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Gift Card Value</p>
        <div className="grid grid-cols-3 gap-2.5">
          {card.denominations.map((d) => (
            <DenomChip key={d._id} denom={d} selected={selected?._id === d._id} onSelect={setSelected} />
          ))}
        </div>
      </div>
    )}

    {selected && (
      <div className="mt-5 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-white/[0.03]">
          <span className="text-sm text-gray-600 dark:text-gray-400">You Pay</span>
          <div className="flex items-center gap-1.5">
            <Coins size={13} className="text-orange-400" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">{Number(selected.bcoins).toLocaleString('en-IN')} bCoins</span>
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-3.5 bg-gray-50 dark:bg-white/[0.03]">
          <span className="text-sm text-gray-600 dark:text-gray-400">Your Available Balance</span>
          <div className="flex items-center gap-1.5">
            <Coins size={13} className={canAfford ? 'text-orange-400' : 'text-red-400'} />
            <span className={`text-sm font-bold ${canAfford ? 'text-orange-500' : 'text-red-500'}`}>
              {Number(balance).toLocaleString('en-IN')} bCoins
            </span>
          </div>
        </div>
      </div>
    )}

    {card.terms_and_conditions?.length > 0 && (
      <div className="mt-4">
        <button
          onClick={() => setShowTerms(!showTerms)}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <Info size={13} />
          Terms & Conditions
          <ChevronRight size={13} className={`transition-transform ${showTerms ? 'rotate-90' : ''}`} />
        </button>
        {showTerms && (
          <ul className="mt-2.5 space-y-2">
            {card.terms_and_conditions.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                <CheckCircle2 size={12} className="text-green-400 mt-0.5 flex-shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        )}
      </div>
    )}

    {errMsg && (
      <div className="mt-3 flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-500 text-sm">
        <AlertCircle size={14} className="shrink-0 mt-0.5" />{errMsg}
      </div>
    )}
    {done && (
      <div className="mt-3 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 text-green-600 dark:text-green-400 text-sm font-semibold">
        🎉 Redeemed! Check your email for the gift card details.
      </div>
    )}
    <div className="h-4" />
  </>
);

// ── Shared footer CTA ─────────────────────────────────────────────────────────
const ModalFooter = ({ selected, canAfford, buying, done, onBuy, onClose }) => (
  <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1c1c1e]">
    {done ? (
      <button
        onClick={onClose}
        className="w-full py-3.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-black text-sm font-bold hover:opacity-90 transition-opacity"
      >
        Done
      </button>
    ) : (
      <button
        onClick={onBuy}
        disabled={!selected || !canAfford || buying}
        className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all ${
          !selected || !canAfford
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            : 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25 active:scale-[0.98]'
        }`}
      >
        {buying ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={15} className="animate-spin" /> Processing…
          </span>
        ) : !canAfford ? (
          'Insufficient Balance'
        ) : (
          `Redeem for ${Number(selected?.bcoins).toLocaleString('en-IN')} bCoins`
        )}
      </button>
    )}
  </div>
);

// ─── Card (shared by mobile scroll row and desktop grid) ─────────────────────
const GiftCardGridItem = ({ card, onOpen }) => {
  const minDenom = card.denominations?.reduce(
    (min, d) => (d.bcoins < (min?.bcoins ?? Infinity) ? d : min),
    null
  );

  return (
    <div
      onClick={() => onOpen(card)}
      className="flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/[0.07] shadow-sm hover:shadow-md hover:border-orange-200 dark:hover:border-orange-500/30 transition-all group cursor-pointer active:scale-[0.97]"
    >
      {/* Image */}
      <div className="w-full bg-gray-950 flex-shrink-0 overflow-hidden" style={{ height: 130 }}>
        {card.media?.url ? (
          <img
            src={card.media.url}
            alt={card.title}
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Gift size={32} className="text-orange-400/60" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        {card.vendor && (
          <span className="text-[10px] font-black text-orange-500 uppercase tracking-wider">{card.vendor}</span>
        )}
        <p className="text-sm font-bold text-gray-900 dark:text-white leading-snug line-clamp-2">{card.title}</p>

        {minDenom && (
          <div className="flex items-center gap-1">
            <Coins size={11} className="text-orange-400 flex-shrink-0" />
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              From <span className="font-bold text-orange-500">{fmtCoins(minDenom.bcoins)}</span> bCoins
            </span>
          </div>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); onOpen(card); }}
          className="mt-auto pt-2.5 w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-orange-500/20"
        >
          <ShoppingBag size={12} />
          Buy Now
        </button>
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
export default function GiftCards() {
  const navigate       = useNavigate();
  const { userObject } = useSelector((s) => s.auth);
  const balance        = userObject?.wallet?.balance ?? 0;

  const [cards,      setCards]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [query,      setQuery]      = useState('');
  const [category,   setCategory]   = useState('');
  const [activeCard, setActiveCard] = useState(null);
  const searchRef = useRef(null);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (category) params.category = category;
      const res = await api.get('/gift-cards/active', { params });
      const raw = res.data?.data || res.data?.gift_cards || res.data || [];
      setCards(Array.isArray(raw) ? raw : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load gift cards.');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  const filtered = cards.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.title?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.vendor?.toLowerCase().includes(q) ||
      c.category?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] max-w-[1100px] mx-auto pb-36">

        {/* ── Sticky header ── */}
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-gray-100 dark:border-white/[0.06] px-4 pt-3 pb-2">

          {/* Top row */}
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <ArrowLeft size={16} className="text-gray-700 dark:text-white" />
            </button>

            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Gift size={17} className="text-orange-400 flex-shrink-0" />
              <h1 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Redeem Gift Cards</h1>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 flex-shrink-0">
              <Coins size={11} className="text-orange-500" />
              <span className="text-xs font-bold text-orange-500">{fmtCoins(balance)}</span>
            </div>
          </div>

          {/* Category chip row — edge-to-edge horizontal scroll */}
          <div className="relative -mx-4 mb-2.5">
            <div className="flex gap-1.5 overflow-x-scroll w-[78%] pb-1 px-4 scrollbar-hide snap-x">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setCategory(cat.key === category ? '' : cat.key)}
                  className={`flex-shrink-0 snap-start px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                    category === cat.key
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-black'
                      : 'bg-gray-100 dark:bg-white/[0.07] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/[0.07]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
              <div className="flex-shrink-0 w-3" />
            </div>
            <div className="absolute right-0 top-0 bottom-1 w-8 pointer-events-none bg-gradient-to-l from-white dark:from-[#0a0a0a] to-transparent" />
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/30 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search gift cards, brands…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="lg:w-full w-[47%] pl-9 pr-9 py-2.5 rounded-xl bg-gray-100 dark:bg-white/[0.07] border border-transparent focus:border-orange-400 dark:focus:border-orange-500/40 focus:outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/25 transition-all"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); searchRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-300 dark:bg-white/20 flex items-center justify-center"
              >
                <X size={10} className="text-gray-600 dark:text-white" />
              </button>
            )}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="px-4 pt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-28 gap-3">
              <Loader2 size={28} className="animate-spin text-gray-300 dark:text-gray-600" />
              <span className="text-sm text-gray-400">Loading gift cards…</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <AlertCircle size={28} className="text-red-400" />
              <p className="text-sm text-red-500 text-center">{error}</p>
              <button onClick={fetchCards} className="text-xs text-blue-500 underline">Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-28 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
                <Gift size={28} className="text-orange-400" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-gray-900 dark:text-white">No gift cards found</p>
                <p className="text-sm text-gray-400 mt-1">
                  {query ? 'Try a different search term' : 'No gift cards available in this category'}
                </p>
              </div>
              {(query || category) && (
                <button
                  onClick={() => { setQuery(''); setCategory(''); }}
                  className="text-sm text-orange-500 font-semibold"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                {filtered.length} gift card{filtered.length !== 1 ? 's' : ''} available
              </p>

              {/* ── Mobile: horizontal scroll row ── */}
              <div className="sm:hidden flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
                {filtered.map((card) => (
                  <div key={card._id} className="flex-shrink-0 w-44 snap-start">
                    <GiftCardGridItem card={card} onOpen={setActiveCard} />
                  </div>
                ))}
              </div>

              {/* ── Desktop: grid ── */}
              <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filtered.map((card) => (
                  <GiftCardGridItem key={card._id} card={card} onOpen={setActiveCard} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {activeCard && (
        <GiftCardDetail
          card={activeCard}
          balance={balance}
          onClose={() => setActiveCard(null)}
        />
      )}
    </>
  );
}
