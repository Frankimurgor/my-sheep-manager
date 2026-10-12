// app/_layout.tsx
// Root layout — fonts, providers, top-level Stack, PIN gate.

import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SheepProvider, useSheep } from '../src/context/SheepContext';
import { fontAssets, ThemeProvider, useTheme } from '../src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function PinGate() {
  const router = useRouter();
  const segments = useSegments();
  const { ready, settings } = useSheep();
  const firstRun = useRef(true);

  useEffect(() => {
    if (!ready) return;

    const onLock = segments[0] === 'lock';
    const hasPin = !!settings.pinHash;

    if (hasPin && !onLock) {
      if (firstRun.current) {
        firstRun.current = false;
        router.replace('/lock');
      }
      return;
    }

    if (!hasPin && onLock) {
      router.replace('/(tabs)');
    }

    firstRun.current = false;
  }, [ready, settings.pinHash, segments, router]);

  return null;
}

function ThemedStack() {
  const { palette } = useTheme();

  return (
    <>
      <StatusBar style={palette.statusBar} />
      <PinGate />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(tabs)" />

        <Stack.Screen
          name="sheep/add"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="sheep/[id]"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="health/add"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="weight/add"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="breeding/add"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="lambing/add"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="task/add"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="money/add"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />

        <Stack.Screen name="breakdown" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="categories" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="tasks" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="about" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen
          name="lock"
          options={{ animation: 'fade', gestureEnabled: false }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: '#2E5D3A' }} />;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SheepProvider>
          <ThemedStack />
        </SheepProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}