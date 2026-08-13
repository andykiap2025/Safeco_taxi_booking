// Safeco Office — the desk console. One codebase, two layouts: wide viewports
// (≥900px — web/desktop/tablet) get the two-pane console with queue and assign
// side by side; narrower windows get a Queue → Assign stack. Both compose the
// same DeskHeader / QueuePane / AssignPane.

import {
  SourceSerif4_400Regular,
  SourceSerif4_400Regular_Italic,
  SourceSerif4_600SemiBold,
  SourceSerif4_700Bold,
  useFonts,
} from '@expo-google-fonts/source-serif-4';
import { NavigationContainer } from '@react-navigation/native';
import { useWindowDimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NarrowNavigator } from './src/navigation';
import { WideConsole } from './src/panes/WideConsole';

const WIDE_BREAKPOINT = 900;

export default function App() {
  const [fontsLoaded] = useFonts({
    SourceSerif4_400Regular,
    SourceSerif4_400Regular_Italic,
    SourceSerif4_600SemiBold,
    SourceSerif4_700Bold,
  });
  const { width } = useWindowDimensions();

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {width >= WIDE_BREAKPOINT ? <WideConsole /> : <NarrowNavigator />}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
