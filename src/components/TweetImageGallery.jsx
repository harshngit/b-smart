import React from 'react';

const resolveUrl = (raw) => {
  if (!raw) return null;
  const s = String(raw);
  if (s.startsWith('http')) return s;
  return `https://api.bebsmart.in/uploads/${s.replace(/^\/+/, '').replace(/^uploads\//, '')}`;
};

/**
 * TweetImageGallery
 * Matches the exact thumbnail layout used in CreatePostModal tweet composer:
 *  - 1 image  → compact card 180×120px, left-aligned
 *  - 2+ images → 2-col grid 260px wide, each 100px tall, second tile shows +N overlay
 */
const TweetImageGallery = ({ mediaItems = [], onImageClick }) => {
  if (!mediaItems.length) return null;

  const images = mediaItems
    .map((item) => resolveUrl(item?.fileUrl || item?.url || item?.fileName))
    .filter(Boolean);

  if (!images.length) return null;

  const count = images.length;

  if (count === 1) {
    return (
      <div className="mt-3 flex">
        <div
          className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 cursor-pointer"
          style={{ width: 180 }}
          onClick={() => onImageClick?.(0)}
        >
          <img
            src={images[0]}
            alt="Tweet media"
            className="w-full object-cover hover:opacity-95 transition-opacity"
            style={{ height: 120 }}
          />
        </div>
      </div>
    );
  }

  const remaining = count - 2;

  return (
    <div
      className="mt-3 grid grid-cols-2 gap-[2px] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800"
      style={{ width: 260 }}
    >
      <div className="cursor-pointer overflow-hidden" onClick={() => onImageClick?.(0)}>
        <img src={images[0]} alt="Tweet media 1" className="w-full object-cover hover:opacity-95 transition-opacity" style={{ height: 100 }} />
      </div>
      <div className="relative cursor-pointer overflow-hidden" onClick={() => onImageClick?.(1)}>
        <img src={images[1]} alt="Tweet media 2" className="w-full object-cover hover:opacity-95 transition-opacity" style={{ height: 100 }} />
        {remaining > 0 && (
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center pointer-events-none">
            <span className="text-white text-xl font-bold">+{remaining}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TweetImageGallery;