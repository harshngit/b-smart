import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowLeft, Upload, X, Loader2, Image, Video, ZoomIn,
  Maximize2, Copy, ChevronLeft, ChevronRight, Plus,
  Package, Tag, Eye, Target, Coins, Globe, Languages,
  MessageSquareOff, Heart, Trash2, Link, FileText, ShoppingBag,
  Ticket, Check, Camera, Film
} from 'lucide-react';
import Cropper from 'react-easy-crop';
import api from '../lib/api';

// ─── Filter & Adjustment Definitions ──────────────────────────────────────────
const FILTERS = [
  { name: 'Original', style: '' },
  { name: 'Clarendon', style: 'contrast(1.2) saturate(1.25)' },
  { name: 'Gingham', style: 'brightness(1.05) hue-rotate(-10deg)' },
  { name: 'Moon', style: 'grayscale(1) contrast(1.1) brightness(1.1)' },
  { name: 'Lark', style: 'contrast(0.9)' },
  { name: 'Reyes', style: 'sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)' },
  { name: 'Juno', style: 'contrast(1.2) brightness(1.1) saturate(1.4) sepia(0.2)' },
  { name: 'Slumber', style: 'brightness(1.05) saturate(0.66) sepia(0.20)' },
  { name: 'Crema', style: 'contrast(0.9) saturate(0.9) sepia(0.2)' },
  { name: 'Ludwig', style: 'contrast(0.9) saturate(0.9) brightness(1.1)' },
  { name: 'Aden', style: 'contrast(0.9) saturate(0.85) brightness(1.2) hue-rotate(-20deg)' },
  { name: 'Perpetua', style: 'contrast(1.1) brightness(1.1) saturate(1.1)' },
];

const ADJUSTMENTS = [
  { name: 'Brightness', property: 'brightness', min: -100, max: 100 },
  { name: 'Contrast', property: 'contrast', min: -100, max: 100 },
  { name: 'Saturation', property: 'saturate', min: -100, max: 100 },
  { name: 'Temperature', property: 'sepia', min: -100, max: 100 },
  { name: 'Fade', property: 'opacity', min: 0, max: 100 },
];

const AD_CATEGORIES = ['Fashion', 'Beauty', 'Food & Drink', 'Technology', 'Home & Living', 'Sports', 'Travel', 'Health', 'Entertainment', 'Education', 'Finance', 'Automotive'];
const CTA_OPTIONS = ['Learn More', 'Shop Now', 'Sign Up', 'Install', 'Watch More', 'Get Offer', 'Book Now', 'Contact Us'];
const LANGUAGES = ['English', 'Hindi', 'Arabic', 'French', 'Spanish', 'German', 'Japanese', 'Portuguese'];

// ─── Utilities ─────────────────────────────────────────────────────────────────
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!pixelCrop) {
    const size = Math.min(image.width, image.height);
    pixelCrop = { x: (image.width - size) / 2, y: (image.height - size) / 2, width: size, height: size };
  }
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  return new Promise((resolve) => {
    canvas.toBlob((file) => resolve(URL.createObjectURL(file)), 'image/jpeg');
  });
}

async function processVideoForUpload(originalFile, trimStart, trimEnd, cropParams, onProgress) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(originalFile);
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;';
    document.body.appendChild(video);
    const cleanup = () => {
      try { document.body.removeChild(video); } catch (e) { void e; }
      URL.revokeObjectURL(objectUrl);
    };
    video.onloadedmetadata = async () => {
      const totalDuration = trimEnd - trimStart;
      if (totalDuration <= 0.05) { cleanup(); resolve(originalFile); return; }
      const natW = video.videoWidth || 1280, natH = video.videoHeight || 720;
      const srcX = cropParams?.x ?? 0, srcY = cropParams?.y ?? 0;
      const srcW = cropParams?.width ?? natW, srcH = cropParams?.height ?? natH;
      const outW = cropParams?.outputWidth ?? natW, outH = cropParams?.outputHeight ?? natH;
      const canvas = document.createElement('canvas');
      canvas.width = outW; canvas.height = outH;
      const ctx = canvas.getContext('2d');
      const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1') ? 'video/mp4;codecs=avc1' :
        MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' :
        MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
      let recorder;
      try {
        const stream = canvas.captureStream(30);
        recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
      } catch {
        try {
          const vStream = video.captureStream?.() || video.mozCaptureStream?.();
          if (!vStream) throw new Error('no stream');
          recorder = new MediaRecorder(vStream, { mimeType });
        } catch { cleanup(); resolve(originalFile); return; }
      }
      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data?.size > 0) chunks.push(e.data); };
      recorder.onstop = () => { cleanup(); resolve(new File([new Blob(chunks, { type: 'video/mp4' })], 'video.mp4', { type: 'video/mp4' })); };
      recorder.onerror = () => { cleanup(); resolve(originalFile); };
      video.currentTime = trimStart;
      await new Promise(res => { const fn = () => { video.removeEventListener('seeked', fn); res(); }; video.addEventListener('seeked', fn); });
      recorder.start(100);
      video.play().catch(() => {});
      const drawFrame = () => {
        const elapsed = Math.max(0, video.currentTime - trimStart);
        if (onProgress) onProgress(Math.min(100, Math.round((elapsed / totalDuration) * 100)));
        if (video.currentTime >= trimEnd - 0.05 || video.ended || video.paused) {
          video.pause();
          if (recorder.state === 'recording') { ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, outW, outH); recorder.stop(); }
          return;
        }
        ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, outW, outH);
        if (recorder.state === 'recording') requestAnimationFrame(drawFrame);
      };
      requestAnimationFrame(drawFrame);
    };
    video.onerror = () => { cleanup(); resolve(originalFile); };
  });
}

function SuccessCountdown({ onDone }) {
  const [elapsed, setElapsed] = React.useState(0);
  const TOTAL = 5000, STEP = 50;
  const ref = React.useRef(onDone);
  React.useEffect(() => { ref.current = onDone; }, [onDone]);
  React.useEffect(() => {
    if (elapsed >= TOTAL) { ref.current(); return; }
    const t = setTimeout(() => setElapsed(e => e + STEP), STEP);
    return () => clearTimeout(t);
  }, [elapsed]);
  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <div className="w-full h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${(1 - elapsed / TOTAL) * 100}%`, background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)', transition: `width ${STEP}ms linear` }} />
      </div>
      <p className="text-xs text-white/40">Redirecting to ads…</p>
    </div>
  );
}

const DEFAULT_ADJ = { brightness: 0, contrast: 0, saturate: 0, sepia: 0, opacity: 0 };

// ─── Step Indicator ───────────────────────────────────────────────────────────
const STEPS = [
  { key: 'upload', label: 'Upload' },
  { key: 'edit', label: 'Edit' },
  { key: 'products', label: 'Products' },
  { key: 'details', label: 'Preview' },
];

function StepBar({ current }) {
  const idx = STEPS.findIndex(s => s.key === current);
  return (
    <div className="flex items-center justify-center gap-0 px-4">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <React.Fragment key={s.key}>
            <div className="flex flex-col items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${done ? 'bg-blue-600 text-white' : active ? 'bg-blue-600 text-white ring-4 ring-blue-600/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                {done ? <Check size={14} /> : i + 1}
              </div>
              <span className={`text-[10px] font-semibold whitespace-nowrap ${active ? 'text-blue-600' : done ? 'text-blue-500' : 'text-gray-400'}`}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-[2px] w-8 sm:w-12 mb-3 mx-1 rounded-full transition-all duration-300 ${i < idx ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Media Preview (persistent sidebar) ──────────────────────────────────────
function MediaPreviewSidebar({ media, currentIndex, setCurrentIndex, getFilterStyle, formatDuration }) {
  const item = media[currentIndex];
  if (!item) return null;
  return (
    <div className="hidden lg:flex flex-col bg-[#0a0a0a] w-[300px] xl:w-[360px] flex-shrink-0 items-center justify-center p-4 gap-4 border-r border-gray-800">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Preview</div>
      <div className="relative w-full rounded-2xl overflow-hidden bg-black shadow-2xl" style={{ aspectRatio: `${item.aspect || 1}`, maxHeight: '65vh' }}>
        {item.type === 'video' ? (
          <>
            <video src={item.croppedUrl || item.url} className="w-full h-full object-cover" autoPlay loop muted={!item.soundOn}
              onLoadedMetadata={(e) => { e.currentTarget.currentTime = item.trimStart || 0; }}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                const end = item.trimEnd > 0 ? item.trimEnd : item.duration || 0;
                if (end > 0 && v.currentTime >= end) { v.currentTime = item.trimStart || 0; v.play().catch(() => {}); }
              }} />
            {item.duration > 0 && (
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-mono px-2 py-0.5 rounded-full">
                {formatDuration((item.trimEnd > 0 ? item.trimEnd : item.duration) - (item.trimStart || 0))}
              </div>
            )}
          </>
        ) : (
          <img src={item.croppedUrl || item.url} className="w-full h-full object-cover" style={getFilterStyle(item)} alt="preview" />
        )}
        {/* Ad overlay badge */}
        <div className="absolute top-2 left-2 bg-blue-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">AD</div>
      </div>
      {media.length > 1 && (
        <div className="flex gap-1.5">
          {media.map((_, i) => (
            <button key={i} onClick={() => setCurrentIndex(i)} className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-blue-500 w-5' : 'bg-gray-600'}`} />
          ))}
        </div>
      )}
      <div className="text-[11px] text-gray-600 text-center">
        {item.type === 'image' ? (item.filter !== 'Original' ? `Filter: ${item.filter}` : 'No filter') : `Video · ${formatDuration(item.duration || 0)}`}
      </div>
    </div>
  );
}

const CreateAd = () => {
  const navigate = useNavigate();
  const { userObject } = useSelector((state) => state.auth);

  const [step, setStep] = useState('upload');
  const [isDragging, setIsDragging] = useState(false);

  // ── Media ──────────────────────────────────────────────────────────────────
  const [media, setMedia] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentMedia = media[currentIndex];

  const updateCurrentMedia = useCallback((updates) => {
    setMedia(prev => prev.map((item, i) => i === currentIndex ? { ...item, ...updates } : item));
  }, [currentIndex]);

  // ── Crop/Edit UI ────────────────────────────────────────────────────────────
  const [cropMode, setCropMode] = useState('crop'); // 'crop' | 'edit'
  const [showRatioMenu, setShowRatioMenu] = useState(false);
  const [showZoomSlider, setShowZoomSlider] = useState(false);
  const [showMultiSelect, setShowMultiSelect] = useState(false);
  const [activeEditTab, setActiveEditTab] = useState('filters');
  const [dragHandle, setDragHandle] = useState(null);
  const [trimPlayTime, setTrimPlayTime] = useState(0);
  const [overlaySize, setOverlaySize] = useState({ w: 0, h: 0 });
  const [editBoxSize, setEditBoxSize] = useState({ w: 0, h: 0 });

  // ── Products & Offers ───────────────────────────────────────────────────────
  const [productsTab, setProductsTab] = useState('products'); // 'products' | 'offers'
  const [products, setProducts] = useState([]);
  const [offers, setOffers] = useState([]);

  // ── Ad Details ─────────────────────────────────────────────────────────────
  const [caption, setCaption] = useState('');
  const [ctaLink, setCtaLink] = useState('');
  const [ctaText, setCtaText] = useState('Learn More');
  const [adTitle, setAdTitle] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [targetLocation, setTargetLocation] = useState('');
  const [totalBudgetCoins, setTotalBudgetCoins] = useState(100);
  const [hideLikes, setHideLikes] = useState(false);
  const [disableComments, setDisableComments] = useState(false);
  const [contentType, setContentType] = useState('post');

  // ── Upload ─────────────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStage, setUploadStage] = useState('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const fileInputRef = useRef(null);
  const cropContainerRef = useRef(null);
  const editContainerRef = useRef(null);
  const editVideoRef = useRef(null);
  const trimTrackRef = useRef(null);
  const coverInputRef = useRef(null);

  // ── Overlay sizes ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'upload' || cropMode !== 'crop') return;
    const el = cropContainerRef.current;
    if (!el || !currentMedia) return;
    const compute = () => {
      const cw = el.clientWidth, ch = el.clientHeight;
      const va = currentMedia.originalAspect || 1;
      let vw, vh;
      if (cw / ch > va) { vh = ch; vw = vh * va; } else { vw = cw; vh = vw / va; }
      const a = currentMedia.aspect || 1;
      let w = vw, h = w / a;
      if (h > vh) { h = vh; w = h * a; }
      setOverlaySize({ w, h });
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [step, cropMode, currentMedia]);

  useEffect(() => {
    if (step !== 'upload' || cropMode !== 'edit') return;
    const el = editContainerRef.current;
    if (!el || !currentMedia) return;
    const compute = () => {
      const cw = el.clientWidth, ch = el.clientHeight;
      const a = currentMedia.aspect || 1;
      let w = cw, h = w / a;
      if (h > ch) { h = ch; w = h * a; }
      setEditBoxSize({ w, h });
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [step, cropMode, currentMedia]);

  // ── Auto tab for video ───────────────────────────────────────────────────────
  useEffect(() => {
    if (cropMode === 'edit' && currentMedia?.type === 'video') setActiveEditTab('video');
    else if (cropMode === 'edit') setActiveEditTab('filters');
  }, [cropMode, currentMedia?.type]);

  // ── Generate thumbnails ──────────────────────────────────────────────────────
  useEffect(() => {
    if (cropMode !== 'edit') return;
    const item = currentMedia;
    if (!item || item.type !== 'video' || (item.thumbnails && item.thumbnails.length)) return;
    const v = document.createElement('video');
    v.crossOrigin = 'anonymous';
    v.src = item.croppedUrl || item.url;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    (async () => {
      await new Promise(res => { v.onloadedmetadata = res; });
      const duration = isFinite(v.duration) ? v.duration : 0;
      const count = duration > 0 ? Math.min(30, Math.max(2, Math.ceil(duration))) : 7;
      const h = 120, w = Math.round(h * ((v.videoWidth || 640) / (v.videoHeight || 360)));
      canvas.width = w; canvas.height = h;
      const frames = [];
      for (let i = 0; i < count; i++) {
        const t = duration > 0 ? Math.min(duration - 0.01, i) : 0;
        await new Promise(res => { v.currentTime = t; v.onseeked = res; });
        ctx.drawImage(v, 0, 0, w, h);
        frames.push(canvas.toDataURL('image/jpeg', 0.92));
      }
      updateCurrentMedia({ thumbnails: frames, coverUrl: frames[0] });
    })();
  }, [cropMode, currentMedia, updateCurrentMedia]);

  // ── Cover at crop step ───────────────────────────────────────────────────────
  useEffect(() => {
    if (cropMode !== 'crop') return;
    const item = currentMedia;
    if (!item || item.type !== 'video' || item.coverUrl) return;
    const v = document.createElement('video');
    v.crossOrigin = 'anonymous';
    v.src = item.url;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    (async () => {
      await new Promise(res => { v.onloadedmetadata = res; });
      canvas.width = v.videoWidth || 640; canvas.height = v.videoHeight || 360;
      await new Promise(res => { v.currentTime = 0; v.onseeked = res; });
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      updateCurrentMedia({ coverUrl: canvas.toDataURL('image/jpeg', 0.9) });
    })();
  }, [cropMode, currentMedia, updateCurrentMedia]);

  const handleFiles = async (files) => {
    const valid = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (!valid.length) return;
    const newMedia = await Promise.all(valid.map(async (file) => {
      const url = URL.createObjectURL(file);
      if (file.type.startsWith('image/')) {
        let aspect = 1, originalAspect = null;
        try { const img = await createImage(url); originalAspect = img.width / img.height; aspect = originalAspect; } catch {}
        return { id: Math.random().toString(36).substr(2, 9), url, type: 'image', crop: { x: 0, y: 0 }, zoom: 1, aspect, originalAspect, croppedAreaPixels: null, filter: 'Original', adjustments: { ...DEFAULT_ADJ } };
      } else {
        const video = document.createElement('video');
        video.src = url;
        await new Promise(res => { video.onloadedmetadata = res; });
        const originalAspect = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 1;
        const duration = isFinite(video.duration) ? video.duration : 0;
        return { id: Math.random().toString(36).substr(2, 9), url, originalFile: file, videoNaturalWidth: video.videoWidth || 0, videoNaturalHeight: video.videoHeight || 0, type: 'video', crop: { x: 0, y: 0 }, zoom: 1, aspect: originalAspect, originalAspect, duration, coverUrl: null, thumbnails: null, trimStart: 0, trimEnd: duration, soundOn: true, croppedAreaPixels: null, filter: 'Original', adjustments: { ...DEFAULT_ADJ } };
      }
    }));
    if (!media.length) {
      setMedia(newMedia); setCurrentIndex(0); setCropMode('crop');
    } else {
      setMedia(prev => [...prev, ...newMedia]);
    }
  };

  const getFilterStyle = (item) => {
    if (!item) return {};
    const filterDef = FILTERS.find(f => f.name === item.filter);
    const adj = item.adjustments || DEFAULT_ADJ;
    return {
      filter: `${filterDef?.style || ''} brightness(${100 + adj.brightness}%) contrast(${100 + adj.contrast}%) saturate(${100 + adj.saturate}%) ${adj.sepia !== 0 ? `sepia(${Math.abs(adj.sepia)}%)` : ''} ${adj.sepia < 0 ? `hue-rotate(-${Math.abs(adj.sepia)}deg)` : adj.sepia > 0 ? `hue-rotate(${adj.sepia}deg)` : ''}`.trim(),
      opacity: (100 - (adj.opacity || 0)) / 100
    };
  };

  const formatDuration = (d) => {
    if (!d || !isFinite(d)) return '00:00';
    return `${String(Math.floor(d / 60)).padStart(2, '0')}:${String(Math.floor(d % 60)).padStart(2, '0')}`;
  };

  // ── Product helpers ──────────────────────────────────────────────────────────
  const addProduct = () => setProducts(prev => [...prev, { id: Date.now(), images: [], name: '', description: '', link: '', previewImages: [] }]);
  const removeProduct = (id) => setProducts(prev => prev.filter(p => p.id !== id));
  const updateProduct = (id, field, value) => setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));

  const addOffer = () => setOffers(prev => [...prev, { id: Date.now(), image: null, previewImage: null, code: '', description: '', ctaLink: '' }]);
  const removeOffer = (id) => setOffers(prev => prev.filter(o => o.id !== id));
  const updateOffer = (id, field, value) => setOffers(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));

  const handleProductImages = (id, files) => {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    const previewImages = validFiles.map(f => URL.createObjectURL(f));
    updateProduct(id, 'images', validFiles);
    updateProduct(id, 'previewImages', previewImages);
  };

  const handleOfferImage = (id, file) => {
    if (!file?.type.startsWith('image/')) return;
    const previewImage = URL.createObjectURL(file);
    updateOffer(id, 'image', file);
    updateOffer(id, 'previewImage', previewImage);
  };

  // ── Navigation ───────────────────────────────────────────────────────────────
  const handleBack = () => {
    if (step === 'upload') {
      if (cropMode === 'edit') { setCropMode('crop'); return; }
      if (media.length) { setMedia([]); setCurrentIndex(0); return; }
      navigate(-1);
    } else if (step === 'products') setStep('upload');
    else if (step === 'details') setStep('products');
  };

  const handleNext = async () => {
    if (step === 'upload') {
      if (cropMode === 'crop') {
        // Compute crop and move to edit
        const containerEl = cropContainerRef.current;
        const newMedia = await Promise.all(media.map(async (item) => {
          if (item.type === 'video') {
            if (!containerEl) return { ...item, croppedAreaPixels: item.croppedAreaPixels, croppedUrl: item.url };
            const cw = containerEl.clientWidth, ch = containerEl.clientHeight;
            const va = item.originalAspect || 1;
            let rendW, rendH;
            if (cw / ch > va) { rendH = ch; rendW = rendH * va; } else { rendW = cw; rendH = rendW / va; }
            const boxW = overlaySize.w || rendW, boxH = overlaySize.h || rendH;
            const vidLeft = (cw - rendW) / 2, vidTop = (ch - rendH) / 2;
            const boxLeft = (cw - boxW) / 2, boxTop = (ch - boxH) / 2;
            const scaleX = (item.videoNaturalWidth || rendW) / rendW, scaleY = (item.videoNaturalHeight || rendH) / rendH;
            const cropPx = { x: Math.max(0, Math.round((boxLeft - vidLeft) * scaleX)), y: Math.max(0, Math.round((boxTop - vidTop) * scaleY)), width: Math.round(boxW * scaleX), height: Math.round(boxH * scaleY) };
            return { ...item, croppedAreaPixels: cropPx, croppedUrl: item.url };
          }
          try { const croppedUrl = await getCroppedImg(item.url, item.croppedAreaPixels); return { ...item, croppedUrl }; }
          catch { return { ...item, croppedUrl: item.url }; }
        }));
        setMedia(newMedia);
        setCropMode('edit');
      } else {
        setStep('products');
      }
    } else if (step === 'products') {
      setStep('details');
    } else if (step === 'details') {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!media.length) return;
    setIsSubmitting(true);
    setUploadStage('converting');
    setUploadProgress(0);
    setUploadError('');
    try {
      const totalItems = media.length;
      const convertedMedia = await Promise.all(media.map(async (item, idx) => {
        if (item.type !== 'video' || !item.originalFile) return item;
        const start = item.trimStart || 0, dur = item.duration || 0;
        const end = item.trimEnd > 0 ? item.trimEnd : dur;
        let cropParams = null;
        if (item.croppedAreaPixels) {
          const { x, y, width, height } = item.croppedAreaPixels;
          if (width > 0 && height > 0) {
            const aspect = item.aspect || width / height;
            const maxLong = 1920;
            let outputWidth = aspect >= 1 ? Math.min(width, maxLong) : Math.round(Math.min(height, maxLong) * aspect);
            let outputHeight = aspect >= 1 ? Math.round(outputWidth / aspect) : Math.min(height, maxLong);
            outputWidth = outputWidth % 2 === 0 ? outputWidth : outputWidth - 1;
            outputHeight = outputHeight % 2 === 0 ? outputHeight : outputHeight - 1;
            cropParams = { x, y, width, height, outputWidth, outputHeight };
          }
        }
        const convertedFile = await processVideoForUpload(item.originalFile, start, end, cropParams, (pct) => {
          setUploadProgress(Math.round((idx / totalItems) * 50 + (pct / 100) * (50 / totalItems)));
        });
        return { ...item, convertedFile };
      }));
      setUploadStage('uploading');
      setUploadProgress(50);
      const processedMedia = await Promise.all(convertedMedia.map(async (item, idx) => {
        let blob, uploadMimeType;
        try {
          if (item.type === 'video') { blob = item.convertedFile || item.originalFile || await (await fetch(item.url)).blob(); uploadMimeType = 'video/mp4'; }
          else {
            blob = await new Promise((res, rej) => {
              const img = new window.Image(); img.crossOrigin = 'anonymous';
              img.onload = () => {
                const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                const fs = getFilterStyle(item); if (fs.filter) ctx.filter = fs.filter; if (fs.opacity !== 1) ctx.globalAlpha = fs.opacity;
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(b => b ? res(b) : rej(new Error('fail')), 'image/jpeg', 0.95);
              };
              img.onerror = rej; img.src = item.croppedUrl || item.url;
            });
            uploadMimeType = blob.type;
          }
        } catch { const r = await fetch(item.croppedUrl || item.url); blob = await r.blob(); uploadMimeType = blob.type; }
        const fileExt = item.type === 'video' ? 'mp4' : (uploadMimeType.split('/')[1] || 'jpg');
        const file = new File([blob], `ad_${Date.now()}.${fileExt}`, { type: uploadMimeType });
        const fd = new FormData(); fd.append('file', file);
        const res = await api.post('https://bsmart.asynk.store/api/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (evt) => { if (evt.total) setUploadProgress(Math.round(50 + (idx / totalItems) * 45 + (evt.loaded / evt.total) * (45 / totalItems))); }
        });
        return { ...item, uploadedUrl: res.data.fileUrl };
      }));
      setUploadStage('posting');
      setUploadProgress(97);
      const fd = new FormData();
      fd.append('caption', caption); fd.append('ctaLink', ctaLink); fd.append('ctaText', ctaText);
      fd.append('title', adTitle); fd.append('type', 'ad'); fd.append('category', category);
      fd.append('target_language', targetLanguage); fd.append('target_location', targetLocation);
      fd.append('total_budget_coins', totalBudgetCoins); fd.append('content_type', contentType);
      fd.append('engagement_controls', JSON.stringify({ hide_likes_count: hideLikes, disable_comments: disableComments }));
      tags.split(',').forEach((t, i) => fd.append(`tags[${i}]`, t.trim()));
      processedMedia.forEach((item, i) => { fd.append(`mediaUrls[${i}]`, item.uploadedUrl); fd.append(`mediaTypes[${i}]`, item.type); });
      products.forEach((p, i) => { fd.append(`products[${i}][name]`, p.name); fd.append(`products[${i}][description]`, p.description); fd.append(`products[${i}][link]`, p.link); });
      offers.forEach((o, i) => { fd.append(`offers[${i}][code]`, o.code); fd.append(`offers[${i}][description]`, o.description); fd.append(`offers[${i}][ctaLink]`, o.ctaLink); });
      await api.post('/ads', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploadProgress(100); setUploadStage('done'); setIsSubmitting(false); setShowSuccess(true);
    } catch (error) {
      setUploadStage('error'); setUploadError(error?.response?.data?.message || 'Something went wrong.'); setIsSubmitting(false);
    }
  };

  // ─── HEADER label ─────────────────────────────────────────────────────────
  const headerTitle = step === 'upload' ? (cropMode === 'crop' ? 'Crop' : 'Edit') : step === 'products' ? 'Products & Offers' : 'Preview & Launch';
  const nextLabel = step === 'upload' ? (cropMode === 'crop' ? 'Edit' : 'Next') : step === 'products' ? 'Preview' : 'Launch';

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white flex flex-col" style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>

      {/* ── Header ── */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800/60">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={handleBack} className="w-9 h-9 flex items-center justify-center -ml-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-bold text-sm">{headerTitle}</span>
          </div>
          {media.length > 0 ? (
            <button onClick={handleNext} disabled={isSubmitting}
              className="px-4 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all disabled:opacity-40 active:scale-95">
              {nextLabel}
            </button>
          ) : <div className="w-16" />}
        </div>
        {/* Step bar */}
        <div className="pb-3 pt-1">
          <StepBar current={step === 'upload' ? 'upload' : step} />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          STEP 1 — UPLOAD (empty state)
      ══════════════════════════════════════════════════════════════ */}
      {step === 'upload' && !media.length && (
        <div className="flex-1 flex flex-col items-center justify-center p-6"
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(Array.from(e.dataTransfer.files)); }}>
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`w-full max-w-lg rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-5 p-10 ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/5'}`}
            style={{ minHeight: 340 }}>
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#3b82f620,#8b5cf620)', border: '1.5px solid #3b82f640' }}>
              <Upload size={36} className="text-blue-500" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold mb-1 text-gray-800 dark:text-gray-100">Upload Ad Media</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Drag & drop or click to select images or videos</p>
            </div>
            <div className="flex gap-3">
              {[{ icon: Camera, label: 'Image', color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
                { icon: Film, label: 'Video', color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20' }].map(({ icon: Icon, label, color, bg }) => (
                <div key={label} className={`flex items-center gap-2 px-4 py-2 ${bg} rounded-xl`}>
                  <Icon size={15} className={color} />
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => { handleFiles(Array.from(e.target.files)); e.target.value = ''; }} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          STEP 1 — CROP mode
      ══════════════════════════════════════════════════════════════ */}
      {step === 'upload' && media.length > 0 && cropMode === 'crop' && currentMedia && (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden" style={{ minHeight: 0 }}>
          {/* Crop canvas — full width on mobile, grows on desktop */}
          <div className="relative bg-black flex-1 flex items-center justify-center overflow-hidden" style={{ minHeight: 300 }} ref={cropContainerRef}>
            {currentMedia.type === 'video' ? (
              <>
                <video src={currentMedia.url} className="absolute inset-0 w-full h-full object-contain" autoPlay muted playsInline loop />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div style={{ width: overlaySize.w, height: overlaySize.h, border: '2px solid rgba(255,255,255,0.85)', boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)', borderRadius: 4 }} />
                </div>
              </>
            ) : (
              <Cropper
                image={currentMedia.url}
                crop={currentMedia.crop}
                zoom={currentMedia.zoom}
                aspect={currentMedia.aspect || 1}
                onCropChange={c => updateCurrentMedia({ crop: c })}
                onCropComplete={(_, px) => updateCurrentMedia({ croppedAreaPixels: px })}
                onZoomChange={z => updateCurrentMedia({ zoom: z })}
                onMediaLoaded={({ naturalWidth: nw, naturalHeight: nh }) => {
                  if (nw && nh) { const oa = nw / nh; if (!currentMedia.originalAspect || Math.abs(currentMedia.originalAspect - oa) > 0.01) updateCurrentMedia({ originalAspect: oa, aspect: !currentMedia.originalAspect ? oa : currentMedia.aspect }); }
                }}
                objectFit="contain"
                showGrid={false}
                style={{ containerStyle: { background: '#000' }, cropAreaStyle: { border: '1.5px solid rgba(255,255,255,0.6)' } }}
              />
            )}

            {/* Nav arrows */}
            {media.length > 1 && currentIndex > 0 && <button onClick={() => setCurrentIndex(p => p - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center"><ChevronLeft size={18} /></button>}
            {media.length > 1 && currentIndex < media.length - 1 && <button onClick={() => setCurrentIndex(p => p + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center"><ChevronRight size={18} /></button>}

            {/* Bottom toolbar */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-30">
              <div className="relative">
                {showRatioMenu && (
                  <div className="absolute bottom-full left-0 mb-2 bg-black/90 backdrop-blur-xl rounded-2xl overflow-hidden flex flex-col w-36 shadow-2xl border border-white/10">
                    {[{ label: 'Original', aspect: currentMedia.originalAspect || 1 }, { label: '1:1', aspect: 1 }, { label: '4:5', aspect: 4 / 5 }, { label: '16:9', aspect: 16 / 9 }, { label: '9:16', aspect: 9 / 16 }].map(({ label, aspect }) => (
                      <button key={label} onClick={() => { updateCurrentMedia({ aspect, zoom: 1, crop: { x: 0, y: 0 } }); setShowRatioMenu(false); }}
                        className={`px-4 py-2.5 text-sm font-medium text-left hover:bg-white/10 transition-colors ${Math.abs(currentMedia.aspect - aspect) < 0.01 ? 'text-blue-400' : 'text-gray-300'}`}>{label}</button>
                    ))}
                  </div>
                )}
                <button onClick={() => { setShowRatioMenu(!showRatioMenu); setShowZoomSlider(false); setShowMultiSelect(false); }}
                  className={`h-8 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${showRatioMenu ? 'bg-white text-black' : 'bg-black/60 text-white backdrop-blur-sm border border-white/20'}`}>
                  <Maximize2 size={13} /> Ratio
                </button>
              </div>
              <div className="flex gap-2">
                {currentMedia.type === 'image' && (
                  <div className="relative">
                    {showZoomSlider && (
                      <div className="absolute bottom-full right-0 mb-2 p-3 bg-black/90 backdrop-blur-xl rounded-2xl border border-white/10 w-32">
                        <input type="range" min={1} max={3} step={0.1} value={currentMedia.zoom} onChange={(e) => updateCurrentMedia({ zoom: Number(e.target.value) })} className="w-full h-1 bg-gray-600 rounded-full appearance-none cursor-pointer accent-blue-500" />
                      </div>
                    )}
                    <button onClick={() => { setShowZoomSlider(!showZoomSlider); setShowRatioMenu(false); setShowMultiSelect(false); }}
                      className={`h-8 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${showZoomSlider ? 'bg-white text-black' : 'bg-black/60 text-white backdrop-blur-sm border border-white/20'}`}>
                      <ZoomIn size={13} /> Zoom
                    </button>
                  </div>
                )}
                <div className="relative">
                  {showMultiSelect && (
                    <div className="absolute bottom-full right-0 mb-2 p-2 bg-black/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
                      <div className="flex gap-2 max-w-[250px] overflow-x-auto pb-1 scrollbar-hide">
                        {media.map((item, idx) => (
                          <div key={item.id} className={`relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${idx === currentIndex ? 'border-blue-400' : 'border-transparent'}`} onClick={() => setCurrentIndex(idx)}>
                            <img src={item.type === 'video' ? (item.coverUrl || item.url) : item.url} className="w-full h-full object-cover" alt="" />
                            <button onClick={(e) => { e.stopPropagation(); if (media.length === 1) { setMedia([]); } else { setMedia(prev => prev.filter((_, i) => i !== idx)); if (currentIndex >= idx && currentIndex > 0) setCurrentIndex(p => p - 1); } }} className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/70 rounded-full flex items-center justify-center text-white"><X size={9} /></button>
                          </div>
                        ))}
                        <button onClick={() => { fileInputRef.current?.click(); setShowMultiSelect(false); }} className="flex-shrink-0 w-12 h-12 self-center rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white/50"><Plus size={20} /></button>
                      </div>
                    </div>
                  )}
                  <button onClick={() => { setShowMultiSelect(!showMultiSelect); setShowRatioMenu(false); setShowZoomSlider(false); }}
                    className={`h-8 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${showMultiSelect ? 'bg-white text-black' : 'bg-black/60 text-white backdrop-blur-sm border border-white/20'}`}>
                    <Copy size={13} /> {media.length > 1 ? `${media.length} items` : 'Add more'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          STEP 1 — EDIT mode
      ══════════════════════════════════════════════════════════════ */}
      {step === 'upload' && media.length > 0 && cropMode === 'edit' && currentMedia && (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden" style={{ minHeight: 0 }}>
          {/* Preview */}
          <div ref={editContainerRef} className="relative bg-black flex items-center justify-center lg:flex-1 w-full overflow-hidden" style={{ minHeight: 280 }}>
            {currentMedia.type === 'video' ? (
              <div style={{ width: editBoxSize.w || 300, height: editBoxSize.h || 300 }} className="relative overflow-hidden bg-black rounded-xl">
                <video ref={editVideoRef} src={currentMedia.croppedUrl || currentMedia.url} className="hidden" muted preload="metadata"
                  onLoadedMetadata={(e) => { e.currentTarget.currentTime = currentMedia.trimStart || 0; }}
                  onTimeUpdate={(e) => { setTrimPlayTime(e.currentTarget.currentTime); const end = currentMedia.trimEnd > 0 ? currentMedia.trimEnd : currentMedia.duration || 0; if (end > 0 && e.currentTarget.currentTime >= end) e.currentTarget.currentTime = currentMedia.trimStart || 0; }} />
                <img src={currentMedia.coverUrl || currentMedia.thumbnails?.[0] || currentMedia.url} className="w-full h-full object-cover" alt="Cover" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                </div>
                {currentMedia.duration > 0 && (
                  <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs font-mono px-2.5 py-1 rounded-full">
                    {formatDuration((currentMedia.trimEnd > 0 ? currentMedia.trimEnd : currentMedia.duration) - (currentMedia.trimStart || 0))}
                  </div>
                )}
              </div>
            ) : (
              <img src={currentMedia.croppedUrl || currentMedia.url} className="max-w-full max-h-full object-contain" style={getFilterStyle(currentMedia)} alt="Edit" />
            )}
            {media.length > 1 && currentIndex > 0 && <button onClick={() => setCurrentIndex(p => p - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center"><ChevronLeft size={18} /></button>}
            {media.length > 1 && currentIndex < media.length - 1 && <button onClick={() => setCurrentIndex(p => p + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center"><ChevronRight size={18} /></button>}
          </div>

          {/* Edit tools */}
          <div className="bg-white dark:bg-[#111] border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-gray-800 flex flex-col lg:w-[300px] xl:w-[340px] w-full flex-shrink-0 overflow-hidden">
            <div className="flex border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              {currentMedia.type !== 'video' ? (
                <>
                  <button onClick={() => setActiveEditTab('filters')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors ${activeEditTab === 'filters' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}>Filter</button>
                  <button onClick={() => setActiveEditTab('adjustments')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors ${activeEditTab === 'adjustments' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}>Adjust</button>
                </>
              ) : (
                <button className="flex-1 py-3 text-xs font-bold uppercase tracking-wide text-blue-600 border-b-2 border-blue-600">Video</button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {/* Filters */}
              {activeEditTab === 'filters' && currentMedia.type !== 'video' && (
                <div className="grid grid-cols-3 gap-2 p-3">
                  {FILTERS.map((filter) => (
                    <button key={filter.name} onClick={() => updateCurrentMedia({ filter: filter.name })} className="flex flex-col items-center gap-1.5">
                      <div className={`w-full aspect-square rounded-xl overflow-hidden border-2 transition-all ${currentMedia.filter === filter.name ? 'border-blue-500 scale-105' : 'border-transparent'}`}>
                        <img src={currentMedia.croppedUrl || currentMedia.url} className="w-full h-full object-cover" style={{ filter: filter.style }} alt={filter.name} />
                      </div>
                      <span className={`text-[10px] font-semibold ${currentMedia.filter === filter.name ? 'text-blue-500' : 'text-gray-400'}`}>{filter.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {/* Adjustments */}
              {activeEditTab === 'adjustments' && currentMedia.type !== 'video' && (
                <div className="flex flex-col gap-4 p-4">
                  {ADJUSTMENTS.map((adj) => (
                    <div key={adj.name} className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{adj.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-400 w-8 text-right">{currentMedia.adjustments?.[adj.property] || 0}</span>
                          {(currentMedia.adjustments?.[adj.property] || 0) !== 0 && (
                            <button onClick={() => updateCurrentMedia({ adjustments: { ...currentMedia.adjustments, [adj.property]: 0 } })} className="text-[10px] text-blue-500 font-bold">Reset</button>
                          )}
                        </div>
                      </div>
                      <input type="range" min={adj.min} max={adj.max} value={currentMedia.adjustments?.[adj.property] || 0}
                        onChange={(e) => updateCurrentMedia({ adjustments: { ...currentMedia.adjustments, [adj.property]: parseInt(e.target.value) } })}
                        className="w-full h-1 rounded-full appearance-none cursor-pointer accent-blue-500" style={{ background: `linear-gradient(to right, #3b82f6 ${50 + (currentMedia.adjustments?.[adj.property] || 0) / 2}%, #e5e7eb ${50 + (currentMedia.adjustments?.[adj.property] || 0) / 2}%)` }} />
                    </div>
                  ))}
                </div>
              )}
              {/* Video tools */}
              {currentMedia.type === 'video' && (
                currentMedia.thumbnails ? (
                  <div className="flex flex-col gap-5 p-4">
                    {/* Cover */}
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Cover Photo</span>
                        <button onClick={() => coverInputRef.current?.click()} className="text-xs text-blue-500 font-bold">From Device</button>
                        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { updateCurrentMedia({ coverUrl: URL.createObjectURL(f), uploadedCoverUrl: URL.createObjectURL(f) }); e.target.value = ''; } }} />
                      </div>
                      {(() => {
                        const thumbs = currentMedia.thumbnails || [];
                        const selIdx = Math.max(0, thumbs.findIndex(t => t === currentMedia.coverUrl));
                        const fw = thumbs.length > 0 ? 100 / thumbs.length : 100;
                        return (
                          <div className="relative w-full rounded-xl overflow-hidden bg-black cursor-grab" style={{ height: 60 }}
                            onMouseDown={(se) => {
                              se.preventDefault();
                              const rect = se.currentTarget.getBoundingClientRect();
                              const pick = (x) => { const r = Math.min(1, Math.max(0, (x - rect.left) / rect.width)); const i = Math.min(thumbs.length - 1, Math.floor(r * thumbs.length)); if (thumbs[i]) updateCurrentMedia({ coverUrl: thumbs[i] }); };
                              pick(se.clientX);
                              const onMove = (e) => pick(e.clientX);
                              const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                              window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
                            }}>
                            <div className="flex h-full">{thumbs.map((t, i) => <div key={i} className="flex-1 h-full overflow-hidden" style={{ minWidth: 0 }}><img src={t} className="w-full h-full object-cover" alt="" draggable={false} /></div>)}</div>
                            <div className="absolute top-0 bottom-0 left-0 bg-black/45 pointer-events-none" style={{ width: `${selIdx * fw}%` }} />
                            <div className="absolute top-0 bottom-0 right-0 bg-black/45 pointer-events-none" style={{ width: `${(thumbs.length - selIdx - 1) * fw}%` }} />
                            <div className="absolute top-0 bottom-0 pointer-events-none z-10" style={{ left: `${selIdx * fw}%`, width: `${fw}%`, border: '2.5px solid white', borderRadius: 3 }} />
                          </div>
                        );
                      })()}
                    </div>
                    {/* Trim */}
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Trim</span>
                        <span className="text-xs text-gray-400 font-mono">{formatDuration(Math.max(0, (currentMedia.trimEnd > 0 ? currentMedia.trimEnd : currentMedia.duration || 0) - (currentMedia.trimStart || 0)))} selected</span>
                      </div>
                      <div className="relative select-none" style={{ paddingBottom: 20 }}
                        onMouseMove={(e) => {
                          if (!dragHandle || !trimTrackRef.current) return;
                          const rect = trimTrackRef.current.getBoundingClientRect();
                          const t = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)) * (currentMedia.duration || 0);
                          if (dragHandle === 'start') updateCurrentMedia({ trimStart: Math.max(0, Math.min(t, (currentMedia.trimEnd || 0) - 0.5)) });
                          else updateCurrentMedia({ trimEnd: Math.min(currentMedia.duration || 0, Math.max(t, (currentMedia.trimStart || 0) + 0.5)) });
                        }}
                        onMouseLeave={() => setDragHandle(null)} onMouseUp={() => setDragHandle(null)}
                        onTouchMove={(e) => {
                          if (!dragHandle || !trimTrackRef.current) return;
                          e.preventDefault();
                          const rect = trimTrackRef.current.getBoundingClientRect();
                          const t = Math.min(1, Math.max(0, (e.touches[0].clientX - rect.left) / rect.width)) * (currentMedia.duration || 0);
                          if (dragHandle === 'start') updateCurrentMedia({ trimStart: Math.max(0, Math.min(t, (currentMedia.trimEnd || 0) - 0.5)) });
                          else updateCurrentMedia({ trimEnd: Math.min(currentMedia.duration || 0, Math.max(t, (currentMedia.trimStart || 0) + 0.5)) });
                        }} onTouchEnd={() => setDragHandle(null)}>
                        <div ref={trimTrackRef} className="relative w-full rounded-xl overflow-hidden" style={{ height: 56 }}>
                          <div className="flex h-full">{(currentMedia.thumbnails || []).map((t, i) => <div key={i} className="flex-1 h-full overflow-hidden" style={{ minWidth: 0 }}><img src={t} className="w-full h-full object-cover" alt="" draggable={false} /></div>)}</div>
                          {(() => {
                            const dur = currentMedia.duration || 0;
                            const s = (currentMedia.trimStart || 0) / (dur || 1);
                            const e2 = ((currentMedia.trimEnd > 0 ? currentMedia.trimEnd : dur)) / (dur || 1);
                            return (
                              <>
                                <div className="absolute top-0 bottom-0 left-0 bg-black/55 pointer-events-none" style={{ width: `${s * 100}%` }} />
                                <div className="absolute top-0 bottom-0 right-0 bg-black/55 pointer-events-none" style={{ width: `${(1 - e2) * 100}%` }} />
                                <div className="absolute top-0 bottom-0 border-t-[2.5px] border-b-[2.5px] border-white pointer-events-none z-10" style={{ left: `${s * 100}%`, width: `${Math.max(0, e2 - s) * 100}%` }} />
                                <div className="absolute top-0 bottom-0 w-[2px] bg-white/80 z-20" style={{ left: `${Math.min(1, Math.max(0, (trimPlayTime || 0) / (dur || 1))) * 100}%` }} />
                                {[{ side: 'start', pos: s, transform: 'translateX(-4px)', rounded: 'rounded-l-lg' }, { side: 'end', pos: e2, transform: 'translateX(-16px)', rounded: 'rounded-r-lg' }].map(({ side, pos, transform, rounded }) => (
                                  <div key={side} className="absolute top-0 bottom-0 z-30 flex items-center justify-center cursor-ew-resize" style={{ left: `${pos * 100}%`, width: 20, transform }}
                                    onMouseDown={(e) => { e.preventDefault(); setDragHandle(side); }} onTouchStart={(e) => { e.preventDefault(); setDragHandle(side); }}>
                                    <div className={`w-[14px] h-full ${rounded} flex items-center justify-center bg-white`}>
                                      <div className="flex flex-col gap-[3px]"><div className="w-[2px] h-3 bg-gray-400 rounded-full" /><div className="w-[2px] h-3 bg-gray-400 rounded-full" /></div>
                                    </div>
                                  </div>
                                ))}
                              </>
                            );
                          })()}
                        </div>
                        <div className="relative w-full mt-1" style={{ height: 14 }}>
                          {(() => {
                            const dur = currentMedia.duration || 0;
                            if (dur <= 0) return null;
                            const steps = Math.min(5, Math.floor(dur));
                            return Array.from({ length: steps + 1 }).map((_, i) => (
                              <span key={i} className="absolute text-[10px] text-gray-400 font-mono" style={{ left: `${(i / steps) * 100}%`, transform: i === 0 ? 'none' : i === steps ? 'translateX(-100%)' : 'translateX(-50%)', top: 0 }}>{Math.round((i / steps) * dur)}s</span>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                    {/* Sound */}
                    <div className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-gray-800">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Sound</span>
                      <button onClick={() => updateCurrentMedia({ soundOn: !currentMedia.soundOn })}
                        className={`w-11 h-6 rounded-full transition-all duration-200 relative ${currentMedia.soundOn ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${currentMedia.soundOn ? 'left-[22px]' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-gray-400">Generating frames…</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          STEP 2 — PRODUCTS & OFFERS
      ══════════════════════════════════════════════════════════════ */}
      {step === 'products' && (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden" style={{ minHeight: 0 }}>
          {/* Persistent media preview */}
          {media.length > 0 && (
            <MediaPreviewSidebar media={media} currentIndex={currentIndex} setCurrentIndex={setCurrentIndex} getFilterStyle={getFilterStyle} formatDuration={formatDuration} />
          )}

          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {/* Tabs */}
            <div className="sticky top-0 z-10 bg-white dark:bg-[#0a0a0a] border-b border-gray-100 dark:border-gray-800 px-4 flex gap-0">
              {[{ key: 'products', label: 'Products', icon: Package }, { key: 'offers', label: 'Offers', icon: Ticket }].map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setProductsTab(key)}
                  className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold border-b-2 transition-all ${productsTab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                  <Icon size={15} />{label}
                  {key === 'products' && products.length > 0 && <span className="ml-1 w-5 h-5 bg-blue-600 text-white rounded-full text-[10px] flex items-center justify-center">{products.length}</span>}
                  {key === 'offers' && offers.length > 0 && <span className="ml-1 w-5 h-5 bg-blue-600 text-white rounded-full text-[10px] flex items-center justify-center">{offers.length}</span>}
                </button>
              ))}
            </div>

            <div className="p-4 flex flex-col gap-4 max-w-2xl mx-auto">
              {/* ── Products Tab ── */}
              {productsTab === 'products' && (
                <>
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <h3 className="font-bold text-base">Tag Products</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Add products featured in your ad</p>
                    </div>
                    <button onClick={addProduct}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all active:scale-95">
                      <Plus size={15} /> Add Product
                    </button>
                  </div>
                  {products.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                      <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <ShoppingBag size={26} className="text-gray-400" />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">No products yet</p>
                        <p className="text-xs text-gray-400 mt-0.5">Tap "Add Product" to tag items in your ad</p>
                      </div>
                    </div>
                  )}
                  {products.map((product, pIdx) => (
                    <div key={product.id} className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700/60 rounded-2xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700/60">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Product {pIdx + 1}</span>
                        <button onClick={() => removeProduct(product.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 flex items-center justify-center transition-colors"><Trash2 size={14} /></button>
                      </div>
                      <div className="p-4 flex flex-col gap-4">
                        {/* Product images */}
                        <div>
                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">Product Images</label>
                          <div className="flex gap-2 flex-wrap">
                            {product.previewImages.map((src, i) => (
                              <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700">
                                <img src={src} className="w-full h-full object-cover" alt="" />
                                <button onClick={() => { const imgs = product.images.filter((_, j) => j !== i); const prev = product.previewImages.filter((_, j) => j !== i); updateProduct(product.id, 'images', imgs); updateProduct(product.id, 'previewImages', prev); }} className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/70 rounded-full flex items-center justify-center text-white"><X size={9} /></button>
                              </div>
                            ))}
                            <label className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all">
                              <Plus size={18} className="text-gray-400" />
                              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleProductImages(product.id, e.target.files)} />
                            </label>
                          </div>
                        </div>
                        {/* Name & desc */}
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">Product Name</label>
                            <input type="text" value={product.name} onChange={(e) => updateProduct(product.id, 'name', e.target.value)} placeholder="e.g. Summer Dress" className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-black border border-gray-200 dark:border-gray-700 text-sm outline-none focus:border-blue-500 transition-colors" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">Description</label>
                            <textarea value={product.description} onChange={(e) => updateProduct(product.id, 'description', e.target.value)} placeholder="Briefly describe the product…" rows={2} className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-black border border-gray-200 dark:border-gray-700 text-sm outline-none focus:border-blue-500 transition-colors resize-none" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">Product Link</label>
                            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-black border border-gray-200 dark:border-gray-700 focus-within:border-blue-500 transition-colors">
                              <Link size={14} className="text-gray-400 flex-shrink-0" />
                              <input type="url" value={product.link} onChange={(e) => updateProduct(product.id, 'link', e.target.value)} placeholder="https://yourstore.com/product" className="flex-1 text-sm outline-none bg-transparent" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* ── Offers Tab ── */}
              {productsTab === 'offers' && (
                <>
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <h3 className="font-bold text-base">Add Offers</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Promote deals, discounts, and promo codes</p>
                    </div>
                    <button onClick={addOffer}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all active:scale-95">
                      <Plus size={15} /> Add Offer
                    </button>
                  </div>
                  {offers.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                      <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Ticket size={26} className="text-gray-400" />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">No offers yet</p>
                        <p className="text-xs text-gray-400 mt-0.5">Add promo codes or special deals to boost engagement</p>
                      </div>
                    </div>
                  )}
                  {offers.map((offer, oIdx) => (
                    <div key={offer.id} className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700/60 rounded-2xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700/60">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Offer {oIdx + 1}</span>
                        <button onClick={() => removeOffer(offer.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 flex items-center justify-center transition-colors"><Trash2 size={14} /></button>
                      </div>
                      <div className="p-4 flex flex-col gap-4">
                        {/* Offer image */}
                        <div>
                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">Offer Image</label>
                          {offer.previewImage ? (
                            <div className="relative w-full rounded-xl overflow-hidden bg-gray-200" style={{ maxHeight: 160 }}>
                              <img src={offer.previewImage} className="w-full object-cover" alt="" style={{ maxHeight: 160 }} />
                              <button onClick={() => updateOffer(offer.id, 'previewImage', null)} className="absolute top-2 right-2 w-7 h-7 bg-black/70 rounded-full flex items-center justify-center text-white"><X size={14} /></button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all gap-2">
                              <Image size={22} className="text-gray-400" />
                              <span className="text-xs text-gray-400 font-medium">Upload offer image</span>
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleOfferImage(offer.id, e.target.files[0]); e.target.value = ''; }} />
                            </label>
                          )}
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">Promo Code</label>
                            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-black border border-gray-200 dark:border-gray-700 focus-within:border-blue-500 transition-colors">
                              <Tag size={14} className="text-gray-400 flex-shrink-0" />
                              <input type="text" value={offer.code} onChange={(e) => updateOffer(offer.id, 'code', e.target.value.toUpperCase())} placeholder="e.g. SAVE20" className="flex-1 text-sm font-mono outline-none bg-transparent font-bold tracking-wider" />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">Description</label>
                            <textarea value={offer.description} onChange={(e) => updateOffer(offer.id, 'description', e.target.value)} placeholder="e.g. Get 20% off your first order!" rows={2} className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-black border border-gray-200 dark:border-gray-700 text-sm outline-none focus:border-blue-500 transition-colors resize-none" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">CTA Link</label>
                            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-black border border-gray-200 dark:border-gray-700 focus-within:border-blue-500 transition-colors">
                              <Link size={14} className="text-gray-400 flex-shrink-0" />
                              <input type="url" value={offer.ctaLink} onChange={(e) => updateOffer(offer.id, 'ctaLink', e.target.value)} placeholder="https://yourstore.com/offer" className="flex-1 text-sm outline-none bg-transparent" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
              <div className="h-6" />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          STEP 3 — DETAILS / PREVIEW
      ══════════════════════════════════════════════════════════════ */}
      {step === 'details' && (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden" style={{ minHeight: 0 }}>
          {/* Persistent preview */}
          {media.length > 0 && (
            <MediaPreviewSidebar media={media} currentIndex={currentIndex} setCurrentIndex={setCurrentIndex} getFilterStyle={getFilterStyle} formatDuration={formatDuration} />
          )}

          <div className="flex-1 overflow-y-auto scrollbar-hide pb-28 lg:pb-8">
            <div className="max-w-2xl mx-auto p-4 flex flex-col gap-4">
              {/* Mobile preview */}
              {media[currentIndex] && (
                <div className="lg:hidden relative rounded-2xl overflow-hidden bg-black shadow-xl" style={{ aspectRatio: `${media[currentIndex].aspect || 1}` }}>
                  {media[currentIndex].type === 'video' ? (
                    <video src={media[currentIndex].croppedUrl || media[currentIndex].url} className="w-full h-full object-cover" autoPlay loop muted={!media[currentIndex].soundOn} />
                  ) : (
                    <img src={media[currentIndex].croppedUrl || media[currentIndex].url} className="w-full h-full object-cover" style={getFilterStyle(media[currentIndex])} alt="" />
                  )}
                  <div className="absolute top-2 left-2 bg-blue-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">AD</div>
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <span className="text-white text-xs font-bold bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full truncate max-w-[60%]">{adTitle || 'Your ad title'}</span>
                    <span className="text-white text-xs font-bold bg-blue-600 px-3 py-1.5 rounded-full flex-shrink-0">{ctaText}</span>
                  </div>
                </div>
              )}

              {/* Caption */}
              <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700/60 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700/60">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Caption</label>
                </div>
                <div className="p-4">
                  <textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Write a caption for your ad…" maxLength={2200} rows={3} className="w-full bg-transparent outline-none text-sm dark:text-white placeholder-gray-400 resize-none" />
                  <div className="text-right text-xs text-gray-400 mt-1">{caption.length}/2,200</div>
                </div>
              </div>

              {/* Ad title & CTA */}
              <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700/60 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700/60">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Ad Title & CTA</label>
                </div>
                <div className="p-4 flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Ad Title</label>
                    <input type="text" value={adTitle} onChange={(e) => setAdTitle(e.target.value)} placeholder="Enter a compelling title…" maxLength={80} className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-black border border-gray-200 dark:border-gray-700 text-sm outline-none focus:border-blue-500 transition-colors" />
                    <div className="text-right text-xs text-gray-400 mt-1">{adTitle.length}/80</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-2 block">CTA Button</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {CTA_OPTIONS.map((opt) => (
                        <button key={opt} onClick={() => setCtaText(opt)}
                          className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${ctaText === opt ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-400'}`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Destination URL</label>
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-black border border-gray-200 dark:border-gray-700 focus-within:border-blue-500 transition-colors">
                      <Link size={14} className="text-gray-400 flex-shrink-0" />
                      <input type="url" value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} placeholder="https://yourwebsite.com" className="flex-1 text-sm outline-none bg-transparent" />
                    </div>
                    {ctaLink && !/^https?:\/\/.+/.test(ctaLink) && <p className="text-xs text-red-500 mt-1">Please enter a valid URL starting with https://</p>}
                  </div>
                </div>
              </div>

              {/* Targeting */}
              <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700/60 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700/60 flex items-center gap-2">
                  <Target size={14} className="text-blue-500" />
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Target Audience</label>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Category</label>
                    <div className="flex flex-wrap gap-1.5">
                      {AD_CATEGORIES.map(cat => (
                        <button key={cat} onClick={() => setCategory(c => c === cat ? '' : cat)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${category === cat ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-blue-400'}`}>
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1.5 block flex items-center gap-1"><Globe size={12} /> Target Location</label>
                      <input type="text" value={targetLocation} onChange={(e) => setTargetLocation(e.target.value)} placeholder="e.g. Mumbai, India" className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-black border border-gray-200 dark:border-gray-700 text-sm outline-none focus:border-blue-500 transition-colors" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1.5 block flex items-center gap-1"><Languages size={12} /> Target Language</label>
                      <select value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-black border border-gray-200 dark:border-gray-700 text-sm outline-none focus:border-blue-500 transition-colors appearance-none">
                        <option value="">Select language</option>
                        {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Tags (comma separated)</label>
                      <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="fashion, summer, sale" className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-black border border-gray-200 dark:border-gray-700 text-sm outline-none focus:border-blue-500 transition-colors" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Budget */}
              <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700/60 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700/60 flex items-center gap-2">
                  <Coins size={14} className="text-yellow-500" />
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Ad Budget</label>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold dark:text-white">Total Budget</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-yellow-500 text-lg">🪙</span>
                      <span className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{totalBudgetCoins.toLocaleString()}</span>
                      <span className="text-xs text-gray-400">coins</span>
                    </div>
                  </div>
                  <input type="range" min={50} max={5000} step={50} value={totalBudgetCoins} onChange={(e) => setTotalBudgetCoins(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer accent-yellow-500 mb-2"
                    style={{ background: `linear-gradient(to right, #eab308 ${(totalBudgetCoins - 50) / (5000 - 50) * 100}%, #e5e7eb ${(totalBudgetCoins - 50) / (5000 - 50) * 100}%)` }} />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>🪙 50</span>
                    <span>🪙 5,000</span>
                  </div>
                </div>
              </div>

              {/* Engagement controls */}
              <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700/60 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700/60 flex items-center gap-2">
                  <Eye size={14} className="text-purple-500" />
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Engagement Controls</label>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {[
                    { icon: Heart, label: 'Hide likes & view count', desc: 'Only you can see engagement metrics', value: hideLikes, set: setHideLikes },
                    { icon: MessageSquareOff, label: 'Disable comments', desc: 'Prevent users from commenting on this ad', value: disableComments, set: setDisableComments },
                  ].map(({ icon: Icon, label, desc, value, set }) => (
                    <div key={label} className="flex items-center justify-between px-4 py-3.5">
                      <div className="flex items-start gap-3">
                        <Icon size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold dark:text-gray-200">{label}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                        </div>
                      </div>
                      <button onClick={() => set(!value)}
                        className={`ml-4 w-11 h-6 rounded-full transition-all duration-200 relative flex-shrink-0 ${value ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${value ? 'left-[22px]' : 'left-0.5'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Content type */}
              <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700/60 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700/60 flex items-center gap-2">
                  <FileText size={14} className="text-green-500" />
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Content Type</label>
                </div>
                <div className="p-4 flex gap-3">
                  {['post', 'reel', 'story'].map(type => (
                    <button key={type} onClick={() => setContentType(type)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border capitalize transition-all ${contentType === type ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-blue-400'}`}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-4" />
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile launch button ── */}
      {step === 'details' && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 z-50">
          <button onClick={handleNext} disabled={isSubmitting}
            className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-base transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 flex items-center justify-center gap-2">
            {isSubmitting ? <><Loader2 size={20} className="animate-spin" />Publishing…</> : '🚀 Launch Ad Campaign'}
          </button>
        </div>
      )}

      {/* ── Upload Progress Overlay ── */}
      {isSubmitting && uploadStage !== 'idle' && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(16px)' }}>
          <div className="rounded-3xl p-8 w-full max-w-xs flex flex-col items-center gap-5" style={{ background: 'linear-gradient(145deg,#141414,#0a0a0a)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 40px 100px rgba(0,0,0,0.7)' }}>
            <div className="relative flex items-center justify-center w-24 h-24">
              <svg className="absolute inset-0 w-24 h-24" style={{ transform: 'rotate(-90deg)' }} viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                <circle cx="48" cy="48" r="42" fill="none" stroke="url(#adGrad)" strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - uploadProgress / 100)}`}
                  style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(0.4,0,0.2,1)' }} />
                <defs><linearGradient id="adGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs>
              </svg>
              <span className="relative z-10 text-2xl font-bold text-white tabular-nums">{uploadProgress}%</span>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-white">{uploadStage === 'converting' ? '✂️ Processing media…' : uploadStage === 'uploading' ? '⬆️ Uploading…' : '🚀 Publishing…'}</p>
              <p className="text-xs text-white/40 mt-1">{uploadStage === 'converting' ? 'Applying crop & trim' : uploadStage === 'uploading' ? 'Sending to server' : 'Almost done!'}</p>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden bg-white/5">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${uploadProgress}%`, background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)' }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Success ── */}
      {showSuccess && (() => {
        const doClose = () => { setShowSuccess(false); setUploadStage('idle'); setUploadProgress(0); setMedia([]); setCaption(''); setAdTitle(''); setCtaLink(''); setStep('upload'); navigate('/ads'); };
        return (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(16px)' }}>
            <style>{`
              @keyframes adPopIn { from { opacity:0; transform:scale(0.75) translateY(20px); } to { opacity:1; transform:scale(1) translateY(0); } }
              @keyframes adCheckDraw { from { stroke-dashoffset:48; } to { stroke-dashoffset:0; } }
              @keyframes adSpin { to { transform:rotate(360deg); } }
            `}</style>
            <div className="w-full max-w-xs flex flex-col items-center gap-6 rounded-3xl p-8"
              style={{ animation: 'adPopIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both', background: 'linear-gradient(145deg,#161616,#0d0d0d)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 40px 120px rgba(0,0,0,0.8)' }}>
              <div className="relative flex items-center justify-center w-24 h-24">
                <svg className="absolute inset-0 w-24 h-24" style={{ animation: 'adSpin 3s linear infinite' }} viewBox="0 0 96 96">
                  <defs><linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs>
                  <circle cx="48" cy="48" r="44" fill="none" stroke="url(#sg)" strokeWidth="4" strokeDasharray="138 138" strokeLinecap="round" />
                </svg>
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)' }}>
                  <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
                    <path d="M7 17l6 6 12-12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="48" strokeDashoffset="0" style={{ animation: 'adCheckDraw 0.5s 0.15s ease both' }} />
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-white">Ad Launched! 🎉</h3>
                <p className="text-sm text-white/50 mt-1">Your campaign is now live and running</p>
              </div>
              <div className="w-full h-px" style={{ background: 'linear-gradient(90deg,transparent,#3b82f680,transparent)' }} />
              <SuccessCountdown onDone={doClose} />
            </div>
          </div>
        );
      })()}

      {/* ── Error ── */}
      {uploadStage === 'error' && !isSubmitting && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#181818] rounded-2xl p-8 w-full max-w-sm shadow-2xl border border-red-200/50 dark:border-red-900/30 flex flex-col items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <X size={28} className="text-red-500" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Upload Failed</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{uploadError || 'Something went wrong. Please try again.'}</p>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => { setUploadStage('idle'); setUploadProgress(0); setUploadError(''); }} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-sm">Cancel</button>
              <button onClick={() => { setUploadStage('idle'); setUploadProgress(0); setUploadError(''); handleNext(); }} className="flex-1 py-3 rounded-xl text-white font-semibold text-sm" style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)' }}>Try Again</button>
            </div>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => { handleFiles(Array.from(e.target.files)); e.target.value = ''; }} />
    </div>
  );
};

export default CreateAd;