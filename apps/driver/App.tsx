// Safeco Driver — root: fonts, safe area, navigation. Headers are hidden;
// every screen draws its own masthead or band inside a Lumina ScreenContainer
// (which also owns the light-content status bar).

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
import { ConfigErrorScreen } from '@safeco/shared/ui';
import { Stack } from './src/navigation';
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

  if (!fontsLoaded) return null;

  if (configError) {
    return (
      <SafeAreaProvider>
        <ConfigErrorScreen app="Driver app" message={configError.message} />
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
