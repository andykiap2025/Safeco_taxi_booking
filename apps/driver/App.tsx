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
import { Stack } from './src/navigation';
import { HomeScreen } from './src/screens/HomeScreen';
import { JobOfferScreen } from './src/screens/JobOfferScreen';
import { OnTripScreen } from './src/screens/OnTripScreen';
import { ToPickupScreen } from './src/screens/ToPickupScreen';
import { TripSummaryScreen } from './src/screens/TripSummaryScreen';

export default function App() {
  const [fontsLoaded] = useFonts({
    SourceSerif4_400Regular,
    SourceSerif4_400Regular_Italic,
    SourceSerif4_600SemiBold,
    SourceSerif4_700Bold,
  });

  if (!fontsLoaded) return null;

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
