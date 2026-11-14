import { useEffect, useRef } from 'react';

const CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT_ID;

const UNCONFIGURED = 'REPLACE_WITH_ADSENSE_SLOT_ID';

// "BSmart Home Feed" display ad unit, reused across the feed, Reels and
// sidebar placements — created in AdSense under Ads > By ad unit.
export const AD_SLOT_SHARED = '5759394334';

export default function GoogleAdUnit({ slot = AD_SLOT_SHARED, className = '', format = 'auto', fullWidthResponsive = true }) {
  const insRef = useRef(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!CLIENT_ID || !slot || slot === UNCONFIGURED || pushedRef.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedRef.current = true;
    } catch (error) {
      console.error('AdSense push failed:', error);
    }
  }, [slot]);

  if (!CLIENT_ID) return null;

  if (!slot || slot === UNCONFIGURED) {
    return (
      <div className={`flex items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] px-4 py-6 text-center text-xs text-gray-400 dark:text-gray-600 ${className}`}>
        Ad slot not configured yet — add your AdSense ad-unit ID to show a live ad here.
      </div>
    );
  }

  return (
    <ins
      ref={insRef}
      className={`adsbygoogle block ${className}`}
      style={{ display: 'block' }}
      data-ad-client={CLIENT_ID}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
    />
  );
}
