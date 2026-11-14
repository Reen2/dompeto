/**
 * Design tokens — "quiet luxury" financial app.
 * Warm ivory in light mode, deep charcoal in dark mode, champagne gold accent.
 */

export type ThemeColors = {
  dark: boolean;
  bg: string;
  bgGradient: [string, string];
  surface: string;
  surfaceAlt: string;
  surfaceElevated: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  income: string;
  expense: string;
  warning: string;
  info: string;
  chart: string[];
};

export const Light: ThemeColors = {
  dark: false,
  bg: '#FAF8F4',
  bgGradient: ['#F3EDE1', '#FAF8F4'],
  surface: '#FFFFFF',
  surfaceAlt: '#F2EDE4',
  surfaceElevated: '#FFFFFF',
  border: '#E7E0D4',
  borderStrong: '#D6CCBA',
  text: '#191816',
  textMuted: '#6F6A60',
  textFaint: '#A39C8F',
  accent: '#A8813C',
  accentSoft: '#F2E7D2',
  onAccent: '#FFFDF8',
  income: '#1F7A4D',
  expense: '#B03A2E',
  warning: '#B4721C',
  info: '#3A6482',
  chart: [
    '#A8813C',
    '#3A6482',
    '#7A8C6B',
    '#B03A2E',
    '#6B5B95',
    '#C4864A',
    '#4E7A72',
    '#8C7B62',
  ],
};

export const Dark: ThemeColors = {
  dark: true,
  bg: '#0C0C0D',
  bgGradient: ['#17161A', '#0C0C0D'],
  surface: '#161618',
  surfaceAlt: '#1E1E21',
  surfaceElevated: '#232327',
  border: '#2A2A2E',
  borderStrong: '#3A3A40',
  text: '#F6F2EA',
  textMuted: '#9C968A',
  textFaint: '#6B665C',
  accent: '#D8B26A',
  accentSoft: '#2C2618',
  onAccent: '#1A1710',
  income: '#63C98B',
  expense: '#E2766A',
  warning: '#E0A34A',
  info: '#7FB0CE',
  chart: [
    '#D8B26A',
    '#7FB0CE',
    '#A3B892',
    '#E2766A',
    '#A99BD1',
    '#E0A462',
    '#7FC0B6',
    '#BDA98A',
  ],
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};

export const spacing = (n: number) => n * 4;

export const categoryPalette = [
  '#C4864A',
  '#3A6482',
  '#7A8C6B',
  '#B03A2E',
  '#6B5B95',
  '#4E7A72',
  '#A8813C',
  '#8C7B62',
  '#5A7D9A',
  '#9E6B6B',
  '#6E7E5A',
  '#8A6A9E',
];
