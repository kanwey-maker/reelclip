import type { ReactElement, SVGProps } from "react";

export type P = SVGProps<SVGSVGElement> & { size?: number };

function S({ size = 18, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IcBolt = (p: P) => (
  <S {...p}><path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2z" fill="currentColor" stroke="none" /></S>
);
export const IcPlay = (p: P) => (
  <S {...p}><path d="M7 4.8v14.4L19 12 7 4.8z" fill="currentColor" stroke="none" /></S>
);
export const IcPause = (p: P) => (
  <S {...p}><rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" /></S>
);
export const IcScissors = (p: P) => (
  <S {...p}><circle cx="6" cy="6" r="2.6" /><circle cx="6" cy="18" r="2.6" /><path d="M20 4 8.2 15.8M14.5 14.5 20 20M8.2 8.2l3.4 3.4" /></S>
);
export const IcSparkles = (p: P) => (
  <S {...p}><path d="M12 4l1.7 4.3L18 10l-4.3 1.7L12 16l-1.7-4.3L6 10l4.3-1.7L12 4z" fill="currentColor" stroke="none" /><path d="M19 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1z" fill="currentColor" stroke="none" /><path d="M5 2.8l.7 1.7 1.7.7-1.7.7L5 7.6l-.7-1.7-1.7-.7 1.7-.7.7-1.7z" fill="currentColor" stroke="none" /></S>
);
export const IcDownload = (p: P) => (
  <S {...p}><path d="M12 3v11m0 0 4-4m-4 4-4-4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></S>
);
export const IcUpload = (p: P) => (
  <S {...p}><path d="M12 14V3m0 0 4 4m-4-4L8 7" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></S>
);
export const IcLink = (p: P) => (
  <S {...p}><path d="M10 14a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.1" /><path d="M14 10a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1" /></S>
);
export const IcWand = (p: P) => (
  <S {...p}><path d="m5 19 9.5-9.5m2-2L19 5" /><path d="M18.5 2.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6.6-1.4zM8.5 2.8l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5.5-1.2zM21 11l.5 1.1 1.1.5-1.1.5L21 14.2l-.5-1.1-1.1-.5 1.1-.5.5-1.1z" fill="currentColor" stroke="none" /></S>
);
export const IcHash = (p: P) => (
  <S {...p}><path d="M9.5 3.5 7 20.5M17 3.5l-2.5 17M4 8.5h16.5M3.5 15.5H20" /></S>
);
export const IcType = (p: P) => (
  <S {...p}><path d="M5 7V4h14v3M12 4v16m-3 0h6" /></S>
);
export const IcPalette = (p: P) => (
  <S {...p}><path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-.9 2-2 0-1.5-1.5-1.7-1.5-3 0-1 .8-2 2.5-2H17a4 4 0 0 0 4-4c0-4-4.5-7-9-7z" /><circle cx="7.5" cy="11" r="1" fill="currentColor" stroke="none" /><circle cx="10.5" cy="7" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="7.5" r="1" fill="currentColor" stroke="none" /></S>
);
export const IcShare = (p: P) => (
  <S {...p}><path d="M12 3v12m0-12 4 4m-4-4L8 7" /><path d="M4 13v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" /></S>
);
export const IcCheck = (p: P) => (
  <S {...p}><path d="m4.5 12.5 5 5 10-11" /></S>
);
export const IcClose = (p: P) => (
  <S {...p}><path d="m6 6 12 12M18 6 6 18" /></S>
);
export const IcChevronL = (p: P) => (
  <S {...p}><path d="M14.5 5.5 8 12l6.5 6.5" /></S>
);
export const IcChevronR = (p: P) => (
  <S {...p}><path d="m9.5 5.5 6.5 6.5-6.5 6.5" /></S>
);
export const IcArrowR = (p: P) => (
  <S {...p}><path d="M4 12h15m0 0-5-5m5 5-5 5" /></S>
);
export const IcFlame = (p: P) => (
  <S {...p}><path d="M12 2.5c.8 3-0.6 4.6-2 6.2C8.4 10.5 7 12.2 7 14.8A5.2 5.2 0 0 0 12 20a5.2 5.2 0 0 0 5-5.2c0-1.8-.7-3.2-1.5-4.4-.4 1-.9 1.6-1.8 2.1.4-3.4-.5-7.4-1.7-10z" fill="currentColor" stroke="none" /></S>
);
export const IcCopy = (p: P) => (
  <S {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></S>
);
export const IcRemix = (p: P) => (
  <S {...p}><path d="M3 5v5h5" /><path d="M3.5 10A8.5 8.5 0 1 1 5 16.5" /></S>
);
export const IcVolume = (p: P) => (
  <S {...p}><path d="M11 5 6.5 9H3v6h3.5L11 19V5z" fill="currentColor" stroke="none" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" /></S>
);
export const IcVolumeX = (p: P) => (
  <S {...p}><path d="M11 5 6.5 9H3v6h3.5L11 19V5z" fill="currentColor" stroke="none" /><path d="m16 9.5 5 5m0-5-5 5" /></S>
);
export const IcFilm = (p: P) => (
  <S {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" /></S>
);
export const IcClock = (p: P) => (
  <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></S>
);
export const IcTrend = (p: P) => (
  <S {...p}><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></S>
);
export const IcCalendar = (p: P) => (
  <S {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></S>
);
export const IcCloud = (p: P) => (
  <S {...p}><path d="M7 18a4.5 4.5 0 1 1 .7-8.9A6 6 0 0 1 19.5 11 3.8 3.8 0 0 1 18 18H7z" /></S>
);
export const IcLayers = (p: P) => (
  <S {...p}><path d="m12 3 9 5-9 5-9-5 9-5z" /><path d="m3 13 9 5 9-5" /><path d="m3 17.5 9 5 9-5" strokeOpacity="0.45" /></S>
);
export const IcTall = (p: P) => (
  <S {...p}><rect x="8" y="3" width="8" height="18" rx="2" /></S>
);
export const IcSquare = (p: P) => (
  <S {...p}><rect x="4.5" y="4.5" width="15" height="15" rx="2" /></S>
);
export const IcWide = (p: P) => (
  <S {...p}><rect x="3" y="7" width="18" height="10" rx="2" /></S>
);
export const IcKey = (p: P) => (
  <S {...p}><circle cx="8" cy="14" r="4.5" /><path d="m11.5 10.5 8-8M17 5l2.5 2.5M14 8l2 2" /></S>
);
export const IcTrash = (p: P) => (
  <S {...p}><path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v6M14 11v6" /></S>
);
export const IcFolder = (p: P) => (
  <S {...p}><path d="M3 6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" /></S>
);
export const IcGrid = (p: P) => (
  <S {...p}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></S>
);
export const IcGrip = (p: P) => (
  <S {...p}><path d="M9 5v14M15 5v14" /></S>
);

/* ---------- social ---------- */
export const IcTikTok = (p: P) => (
  <S {...p}><path d="M14.5 3v10.8a3.7 3.7 0 1 1-3.2-3.65" /><path d="M14.5 5.2c.7 2.3 2.5 3.8 5 4" /></S>
);
export const IcYouTube = (p: P) => (
  <S {...p}><rect x="2.5" y="5.5" width="19" height="13" rx="3.5" /><path d="M10.2 9.3v5.4l4.6-2.7-4.6-2.7z" fill="currentColor" stroke="none" /></S>
);
export const IcInstagram = (p: P) => (
  <S {...p}><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" /></S>
);
export const IcXSocial = (p: P) => (
  <S {...p}><path d="m4 4 16 16M20 4 4 20" strokeWidth={2.4} /></S>
);

export const PLATFORM_ICONS: Record<string, (p: P) => ReactElement> = {
  tiktok: IcTikTok,
  ytshorts: IcYouTube,
  reels: IcInstagram,
  x: IcXSocial,
};
