// Customer app navigation — one typed native stack, headers hidden.
// Flow: SignIn ⇒ Plan → TierSelect → OfficeAssigning ⇒ Approach ⇒
// DriverArrived ⇒ Trip ⇒ Arrival ⇒ Receipt → back to Plan. Scheduled hangs
// off Plan. (⇒ = replace, so Back never revisits a spent trip stage.)

import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { colors } from '@safeco/shared/lumina';
import { SignInScreen } from './screens/SignInScreen';
import { PlanScreen } from './screens/PlanScreen';
import { TierSelectScreen } from './screens/TierSelectScreen';
import { OfficeAssigningScreen } from './screens/OfficeAssigningScreen';
import { ApproachScreen } from './screens/ApproachScreen';
import { DriverArrivedScreen } from './screens/DriverArrivedScreen';
import { TripScreen } from './screens/TripScreen';
import { ArrivalScreen } from './screens/ArrivalScreen';
import { ReceiptScreen } from './screens/ReceiptScreen';
import { ScheduledScreen } from './screens/ScheduledScreen';

export type RootStackParamList = {
  SignIn: undefined;
  Plan: undefined;
  TierSelect: undefined;
  OfficeAssigning: { jobId: string };
  Approach: { jobId: string };
  DriverArrived: { jobId: string };
  Trip: { jobId: string };
  Arrival: { jobId: string };
  Receipt: { jobId: string };
  Scheduled: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="SignIn"
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="Plan" component={PlanScreen} />
      <Stack.Screen name="TierSelect" component={TierSelectScreen} />
      <Stack.Screen name="OfficeAssigning" component={OfficeAssigningScreen} />
      <Stack.Screen name="Approach" component={ApproachScreen} />
      <Stack.Screen name="DriverArrived" component={DriverArrivedScreen} />
      <Stack.Screen name="Trip" component={TripScreen} />
      <Stack.Screen name="Arrival" component={ArrivalScreen} />
      <Stack.Screen name="Receipt" component={ReceiptScreen} />
      <Stack.Screen name="Scheduled" component={ScheduledScreen} />
    </Stack.Navigator>
  );
}
