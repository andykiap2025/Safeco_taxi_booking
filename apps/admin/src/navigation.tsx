// Narrow-layout stack: Queue → Assign. The wide console bypasses navigation
// entirely (both panes always visible, selection lifted), so this file only
// concerns phones / narrow windows.

import { createNativeStackNavigator, type NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '@safeco/shared/lumina';
import { AssignScreen } from './screens/AssignScreen';
import { QueueScreen } from './screens/QueueScreen';

export type RootStackParamList = {
  Queue: undefined;
  Assign: { jobId: string };
};

export type QueueScreenProps = NativeStackScreenProps<RootStackParamList, 'Queue'>;
export type AssignScreenProps = NativeStackScreenProps<RootStackParamList, 'Assign'>;

const Stack = createNativeStackNavigator<RootStackParamList>();

export function NarrowNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="Queue" component={QueueScreen} />
      <Stack.Screen name="Assign" component={AssignScreen} />
    </Stack.Navigator>
  );
}
