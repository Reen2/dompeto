type IconProps = { name: string; size?: number; color?: string; className?: string };

const PATHS: Record<string, string> = {
  wallet: 'M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v2H5a2 2 0 0 1-2-2zm0 4h17v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M17 14h2',
  list: 'M4 6h16M4 12h16M4 18h10',
  pie: 'M12 3a9 9 0 1 0 9 9h-9z M12 3a9 9 0 0 1 9 9',
  chart: 'M4 19V5M4 19h16M8 15v-4M12 15V9M16 15v-6',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  plus: 'M12 5v14M5 12h14',
  'arrow-up-right': 'M7 17L17 7M17 7H9M17 7v8',
  'arrow-down-left': 'M17 7L7 17M7 17h8M7 17V9',
  transfer: 'M7 7h10l-3-3M17 7l-3 3M17 17H7l3 3M7 17l3-3',
  sparkles: 'M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5zM19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  download: 'M12 3v12m0 0l-4-4m4 4l4-4M5 21h14',
  palette: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3v9h9',
  lock: 'M6 10V7a6 6 0 1 1 12 0v3M5 10h14v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z',
  calendar: 'M4 6h16v14H4zM4 10h16M8 4v4M16 4v4',
  trash: 'M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13',
  tag: 'M20 10l-8 8-8-8V4h6z M7.5 7.5h.01',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  flag: 'M5 3v18M5 4h11l-2 4 2 4H5',
  repeat: 'M4 7h13l-3-3M17 7l-3 3M20 17H7l3 3M7 17l3-3',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
  'chevron-left': 'M15 18l-6-6 6-6',
  'chevron-right': 'M9 18l6-6-6-6',
  'chevron-down': 'M6 9l6 6 6-6',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 13l4 4L19 7',
  eye: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  'eye-off': 'M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10.5 10.5 0 0 1 12 5c7 0 10 7 10 7a13.2 13.2 0 0 1-1.7 2.6M6.6 6.6C4.3 8.4 3 10.5 3 12s3 7 9 7a9.8 9.8 0 0 0 4.4-1',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  food: 'M4 3v7a3 3 0 0 0 3 3v8M7 3v7M10 3v7M17 3c-1.5 0-3 1.5-3 4v3h3v11',
  car: 'M3 13l2-5h14l2 5M5 13v4h2v-2h10v2h2v-4M7 16a1.5 1.5 0 1 0 0 .01M17 16a1.5 1.5 0 1 0 0 .01',
  cart: 'M3 4h2l2.5 11h9.5l2-7H6M9 19a1 1 0 1 0 0 .01M18 19a1 1 0 1 0 0 .01',
  home: 'M3 11l9-8 9 8M5 10v10h14V10M9 20v-6h6v6',
  heart: 'M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6C19 16.5 12 21 12 21z',
  book: 'M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z',
  gift: 'M4 10h16v11H4zM2 7h20v3H2zM12 7v14M9 7a2 2 0 1 1 3-2M15 7a2 2 0 1 0-3-2',
  coffee: 'M4 8h12v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3zM16 10h2a2 2 0 0 1 0 4h-2M6 3v3M10 3v3',
  phone: 'M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2',
  wifi: 'M2 8.8a15 15 0 0 1 20 0M5 12.4a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01',
  game: 'M6 12h4M8 10v4M16 11h.01M18 13h.01M4 8h16a2 2 0 0 1 2 2v4a4 4 0 0 1-4 4h-1l-2-2H9l-2 2H6a4 4 0 0 1-4-4v-4a2 2 0 0 1 2-2z',
  plane: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  music: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3zM21 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3z',
  shirt: 'M7 3l-4 3 2 2 2-1v14h10V7l2 1 2-2-4-3a3 3 0 0 1-6 0z',
  bank: 'M3 21h18M4 17h16M5 10h14M3 7l9-4 9 4M6 10v7M10 10v7M14 10v7M18 10v7',
  briefcase: 'M3 8h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18',
  graduation: 'M2 9l10-5 10 5-10 5-10-5zM6 11.5V16a6 4 0 0 0 12 0v-4.5',
  dumbbell: 'M3 10v4M7 8v8M17 8v8M21 10v4M7 12h10',
  baby: 'M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM6 22a6 6 0 0 1 12 0M9 21v-3M15 21v-3',
  pet: 'M12 20c-4 0-7-3-7-7 0-2 1-4 2.5-5.5L10 5l2 3 2-3 2.5 2.5C18 9 19 11 19 13c0 4-3 7-7 7z',
  tool: 'M14 4l6 6-8 8-6-6 8-8zM4 20l4-4',
  stethoscope: 'M4 4v6a4 4 0 0 0 8 0V4M8 14a5 5 0 0 0 10 0v-2M18 10a2 2 0 1 0 0 .01',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z',
  smile: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM8 10h.01M16 10h.01M8 15s1.5 2 4 2 4-2 4-2',
  camera: 'M4 7h3l2-3h6l2 3h3v12H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  film: 'M3 5h18v14H3zM3 9h18M3 15h18M7 5v4M7 15v4M17 5v4M17 15v4',
  bike: 'M5 17a3 3 0 1 0 0 .01M19 17a3 3 0 1 0 0 .01M12 17l-3-6 4-4 3 2 2 2M9 11H5',
  leaf: 'M5 21c0-8 6-14 14-14-1 7-7 14-14 14zM5 21l7-7',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
};

export default function Icon({ name, size = 20, color = 'currentColor', className }: IconProps) {
  const d = PATHS[name] ?? PATHS.more;
  const isFill = name === 'home' || name === 'wallet';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={isFill ? color : 'none'}
      stroke={isFill ? 'none' : color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
