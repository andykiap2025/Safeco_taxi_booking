// Safeco Taxi Booking — Customer app. Fonts load before anything renders so
// the serif voice never flashes system type; navigation is one native stack
// with headers hidden (each screen carries its own masthead).

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
import { ConfigErrorScreen } from '@safeco/shared/ui';
import { RootNavigator } from './src/navigation';

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
        <ConfigErrorScreen app="Customer app" message={configError.message} />
      </SafeAreaProvider>
    );
  }

  // No app-level StatusBar: ScreenContainer owns the (light) status bar.
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
