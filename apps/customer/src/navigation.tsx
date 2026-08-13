// Customer app navigation — typed native stacks, headers hidden.
//
// Which stack renders is decided by the auth gate in App.tsx, not by a route:
// signed out -> AuthNavigator, verified but no profile -> FirstRunNavigator,
// otherwise the app. Sign-in is therefore NOT a screen inside the main stack —
// that arrangement let a signed-out user reach app routes by navigating, and
// left no way to eject someone whose session expired mid-trip.
//
// Flow once inside: Plan → TierSelect → OfficeAssigning ⇒ Approach ⇒
// DriverArrived ⇒ Trip ⇒ Arrival ⇒ Receipt → back to Plan. Scheduled hangs
// off Plan. (⇒ = replace, so Back never revisits a spent trip stage.)

import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { colors } from '@safeco/shared/lumina';
import { SignInScreen } from './screens/SignInScreen';
import { FirstRunNameScreen } from './screens/FirstRunNameScreen';
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

export type AuthStackParamList = { SignIn: undefined };
export type FirstRunStackParamList = { Name: undefined };

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const FirstRunStack = createNativeStackNavigator<FirstRunStackParamList>();

const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.background },
} as const;

/** Signed out. */
export function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={screenOptions}>
      <AuthStack.Screen name="SignIn" component={SignInScreen} />
    </AuthStack.Navigator>
  );
}

/** Verified, but no profile row yet — first sign-in needs a name. */
export function FirstRunNavigator() {
  return (
    <FirstRunStack.Navigator screenOptions={screenOptions}>
      <FirstRunStack.Screen name="Name" component={FirstRunNameScreen} />
    </FirstRunStack.Navigator>
  );
}

export function RootNavigator() {
  return (
    <Stack.Navigator initialRouteName="Plan" screenOptions={screenOptions}>
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
