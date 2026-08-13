// Safeco Taxi Booking — Customer app. Fonts load before anything renders so
// the serif voice never flashes system type; navigation is one native stack
// with headers hidden (each screen carries its own masthead).

import { useEffect } from 'react';
import {
  useFonts,
  SourceSerif4_400Regular,
  SourceSerif4_400Regular_Italic,
  SourceSerif4_600SemiBold,
  SourceSerif4_700Bold,
} from '@expo-google-fonts/source-serif-4';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initSupabaseNative } from '@safeco/shared/native';
import { startAuthWatch, useAuth } from '@safeco/shared/auth';
import { startLiveSync, stopLiveSync } from '@safeco/shared';
import { ConfigErrorScreen } from '@safeco/shared/ui';
import { AuthNavigator, FirstRunNavigator, RootNavigator } from './src/navigation';

// Supabase is initialised once at module scope, before any screen renders.
// EXPO_PUBLIC_* must be referenced literally with dot notation: Expo inlines
// these at build time and does not resolve dynamic or destructured lookups.
let configError: Error | null = null;
try {
  initSupabaseNative(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  );
  startAuthWatch();
} catch (e) {
  configError = e as Error;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    SourceSerif4_400Regular,
    SourceSerif4_400Regular_Italic,
    SourceSerif4_600SemiBold,
    SourceSerif4_700Bold,
  });
  const { stage } = useAuth();

  // Live data is bound to the session, not to app launch: before a profile
  // exists, RLS returns nothing and hydrating would cache an empty world.
  // Tearing down on sign-out stops one account's data outliving its session.
  useEffect(() => {
    if (stage !== 'ready') return;
    void startLiveSync();
    return () => stopLiveSync();
  }, [stage]);

  if (configError) {
    return (
      <SafeAreaProvider>
        <ConfigErrorScreen app="Customer app" message={configError.message} />
      </SafeAreaProvider>
    );
  }

  // 'loading' is a restoring session, not a signed-out one — showing sign-in
  // here would flash it at every returning user before their session resolves.
  if (!fontsLoaded || stage === 'loading') return null;

  // No app-level StatusBar: ScreenContainer owns the (light) status bar.
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {stage === 'signedOut' ? (
          <AuthNavigator />
        ) : stage === 'needsProfile' ? (
          <FirstRunNavigator />
        ) : (
          <RootNavigator />
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
