'use client';

import React, { useEffect } from 'react';
import { siteConfig } from '@/lib/site-config';

export interface AdBannerProps {
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal';
  slotId?: string;
  className?: string;
  label?: string;
}

export function AdBanner({
  format = 'auto',
  slotId,
  className = '',
  label = 'Publicité — Saisissez les opportunités IA',
}: AdBannerProps) {
  const adsenseId = siteConfig.adsenseClientId;

  useEffect(() => {
    if (adsenseId && typeof window !== 'undefined') {
      try {
        // @ts-expect-error - adsbygoogle is dynamically populated by Google AdSense script
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error('AdSense push error:', e);
      }
    }
  }, [adsenseId]);

  if (!adsenseId) {
    // Elegant fallback box in dev / preview mode
    return (
      <div
        className={`my-8 p-4 rounded-xl surface-panel border border-line text-center flex flex-col items-center justify-center min-h-[120px] ${className}`}
      >
        <span className="text-[10px] font-mono uppercase tracking-widest text-faint mb-1">
          {label}
        </span>
        <div className="w-full h-full py-4 border border-dashed border-accent/30 rounded-lg flex items-center justify-center bg-accent/5">
          <p className="text-xs text-muted font-mono">
            [ Emplacement Google AdSense — Id: <span className="text-lime">NEXT_PUBLIC_ADSENSE_CLIENT_ID</span> non configuré ]
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`my-8 text-center overflow-hidden ${className}`}>
      <span className="block text-[10px] font-mono uppercase tracking-widest text-faint mb-2">
        {label}
      </span>
      <ins
        className="adsbygoogle block"
        data-ad-client={adsenseId}
        data-ad-slot={slotId || '1234567890'}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
