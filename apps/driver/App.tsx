// Safeco Driver — root: fonts, safe area, auth gate, navigation. Headers are
// hidden; every screen draws its own masthead or band inside a Lumina
// ScreenContainer (which also owns the light-content status bar).
//
// The gate differs from the customer app in one important way: there is no
// first-run profile step. A driver account is provisioned by the Office (RLS
// forbids self-signup as anything but a customer), so a session with no
// profile, or with the wrong role, gets AccessDeniedScreen rather than a form
// it could never submit.

import { useEffect } from 'react';
import {
  SourceSerif4_400Regular,
  SourceSerif4_400Regular_Italic,
  SourceSerif4_600SemiBold,
  SourceSerif4_700Bold,
  useFonts,
} from '@expo-google-fonts/source-serif-4';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initSupabaseNative } from '@safeco/shared/native';
import { signOut, startAuthWatch, useAuth } from '@safeco/shared/auth';
import { startLiveSync, stopLiveSync } from '@safeco/shared';
import { AccessDeniedScreen, ConfigErrorScreen } from '@safeco/shared/ui';
import { AuthNavigator, Stack } from './src/navigation';
import { HomeScreen } from './src/screens/HomeScreen';
import { JobOfferScreen } from './src/screens/JobOfferScreen';
import { OnTripScreen } from './src/screens/OnTripScreen';
import { ToPickupScreen } from './src/screens/ToPickupScreen';
import { TripSummaryScreen } from './src/screens/TripSummaryScreen';

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
  const { stage, profile } = useAuth();
  const isDriver = profile?.role === 'driver';

  useEffect(() => {
    if (stage !== 'ready' || !isDriver) return;
    void startLiveSync();
    return () => stopLiveSync();
  }, [stage, isDriver]);

  if (configError) {
    return (
      <SafeAreaProvider>
        <ConfigErrorScreen app="Driver app" message={configError.message} />
      </SafeAreaProvider>
    );
  }

  // 'loading' is a restoring session, not a signed-out one.
  if (!fontsLoaded || stage === 'loading') return null;

  if (stage === 'signedOut') {
    return (
      <SafeAreaProvider>
        <NavigationContainer>
          <AuthNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    );
  }

  // Signed in, but not as a driver — including 'needsProfile', which here means
  // the Office has not set this number up.
  if (!isDriver) {
    return (
      <SafeAreaProvider>
        <AccessDeniedScreen
          app="Safeco Driver"
          requires="a driver account"
          currentRole={profile?.role}
          onSignOut={() => void signOut()}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{ headerShown: false, gestureEnabled: false }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="JobOffer" component={JobOfferScreen} />
          <Stack.Screen name="ToPickup" component={ToPickupScreen} />
          <Stack.Screen name="OnTrip" component={OnTripScreen} />
          <Stack.Screen name="TripSummary" component={TripSummaryScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
