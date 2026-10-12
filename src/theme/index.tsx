// src/theme/index.tsx
// My Sheep Manager — brand theme, fonts, and dark mode context.
// Forest green + cream. Playfair Display + Inter.

import {
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
    PlayfairDisplay_400Regular,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { useColorScheme } from 'react-native';

// ─────────────────────────────────────────────────────────────
// Brand constants
// ─────────────────────────────────────────────────────────────

export const BRAND = {
  green: '#2E5D3A',
  greenDark: '#1F3D28',
  greenLight: '#4A7C5C',
  cream: '#F5EFE0',
  creamDark: '#E8DFC8',
  // Secondary accent used for shearing/wool events
  wool: '#C4B998',
  // Secondary accent used for vet / alerts
  rust: '#A04A2E',
} as const;

// Semantic colors
export const ACCENTS = {
  healthy: '#2E7D32',
  warning: '#EF6C00',
  danger: '#C62828',
  info: '#0277BD',
  breeding: '#7B4BA8', // purple for breeding events
} as const;

// ─────────────────────────────────────────────────────────────
// Palette shapes
// ─────────────────────────────────────────────────────────────

export type Palette = {
  // Surfaces
  background: string;
  surface: string;
  surfaceAlt: string;
  card: string;

  // Text
  text: string;
  textMuted: string;
  textInverse: string;

  // Brand
  primary: string;
  primaryDark: string;
  primaryLight: string;
  onPrimary: string;
  accent: string;

  // Lines
  border: string;
  divider: string;

  // Semantic
  healthy: string;
  warning: string;
  danger: string;
  info: string;
  breeding: string;

  // Sex tags
  male: string;
  female: string;

  // Status bar content
  statusBar: 'light' | 'dark';
};

export const lightPalette: Palette = {
  background: BRAND.cream,
  surface: '#FFFFFF',
  surfaceAlt: '#FBF7EC',
  card: '#FFFFFF',

  text: '#1A1A1A',
  textMuted: '#5C5C66',
  textInverse: '#FFFFFF',

  primary: BRAND.green,
  primaryDark: BRAND.greenDark,
  primaryLight: BRAND.greenLight,
  onPrimary: '#FFFFFF',
  accent: BRAND.wool,

  border: '#E0D8C2',
  divider: '#EAE2CC',

  healthy: ACCENTS.healthy,
  warning: ACCENTS.warning,
  danger: ACCENTS.danger,
  info: ACCENTS.info,
  breeding: ACCENTS.breeding,

  male: '#2C5AA0',
  female: '#A0459B',

  statusBar: 'dark',
};

export const darkPalette: Palette = {
  background: '#0E1410',
  surface: '#171F19',
  surfaceAlt: '#1E2820',
  card: '#1A2319',

  text: '#F5EFE0',
  textMuted: '#A8A8B3',
  textInverse: '#0E1410',

  primary: BRAND.greenLight,
  primaryDark: BRAND.green,
  primaryLight: '#6B9D7C',
  onPrimary: '#FFFFFF',
  accent: '#D4C7A0',

  border: '#2A362C',
  divider: '#232D25',

  healthy: '#66BB6A',
  warning: '#FFA726',
  danger: '#EF5350',
  info: '#42A5F5',
  breeding: '#B68CD1',

  male: '#5B8CE0',
  female: '#CE7AC8',

  statusBar: 'light',
};

// ─────────────────────────────────────────────────────────────
// Typography
// ─────────────────────────────────────────────────────────────

export const fonts = {
  serifRegular: 'PlayfairDisplay_400Regular',
  serifMedium: 'PlayfairDisplay_500Medium',
  serifSemiBold: 'PlayfairDisplay_600SemiBold',
  serifBold: 'PlayfairDisplay_700Bold',

  sansRegular: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',

  fallbackSerif: 'serif',
  fallbackSans: 'System',
} as const;

export const fontAssets = {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} as const;

export const type = {
  h1: { fontFamily: fonts.serifBold, fontSize: 34, lineHeight: 40, letterSpacing: 0.2 },
  h2: { fontFamily: fonts.serifSemiBold, fontSize: 26, lineHeight: 32, letterSpacing: 0.2 },
  h3: { fontFamily: fonts.serifMedium, fontSize: 20, lineHeight: 26 },
  title: { fontFamily: fonts.sansSemiBold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.sansRegular, fontSize: 15, lineHeight: 21 },
  bodyStrong: { fontFamily: fonts.sansSemiBold, fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: fonts.sansRegular, fontSize: 12.5, lineHeight: 17 },
  label: { fontFamily: fonts.sansMedium, fontSize: 13, lineHeight: 18, letterSpacing: 0.3 },
  mono: { fontFamily: fonts.sansMedium, fontSize: 15, letterSpacing: 0.5 },
} as const;

// ─────────────────────────────────────────────────────────────
// Dark mode preference
// ─────────────────────────────────────────────────────────────

export type DarkModePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = '@my_sheep_manager/dark_mode_pref';

type ThemeContextValue = {
  palette: Palette;
  isDark: boolean;
  preference: DarkModePreference;
  setPreference: (p: DarkModePreference) => void;
  cyclePreference: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] =
    useState<DarkModePreference>('system');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'system' || saved === 'light' || saved === 'dark') {
          setPreferenceState(saved);
        }
      } catch {
        // ignore
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const setPreference = useCallback((p: DarkModePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  }, []);

  const cyclePreference = useCallback(() => {
    setPreference(
      preference === 'system'
        ? 'light'
        : preference === 'light'
        ? 'dark'
        : 'system'
    );
  }, [preference, setPreference]);

  const isDark = useMemo(() => {
    if (preference === 'dark') return true;
    if (preference === 'light') return false;
    return systemScheme === 'dark';
  }, [preference, systemScheme]);

  const palette = isDark ? darkPalette : lightPalette;

  const value = useMemo<ThemeContextValue>(
    () => ({ palette, isDark, preference, setPreference, cyclePreference }),
    [palette, isDark, preference, setPreference, cyclePreference]
  );

  if (!hydrated) return null;

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
};

// ─────────────────────────────────────────────────────────────
// Spacing + radius tokens
// ─────────────────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;