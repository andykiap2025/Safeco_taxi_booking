// Typed navigation for the Driver app. Headers are hidden — every screen
// draws its own masthead/band, per the design language.

import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { colors } from '@safeco/shared/lumina';
import { SignInScreen } from './screens/SignInScreen';

export type RootStackParamList = {
  Home: undefined;
  JobOffer: { jobId: string };
  ToPickup: { jobId: string };
  OnTrip: { jobId: string };
  TripSummary: { jobId: string };
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export const Stack = createNativeStackNavigator<RootStackParamList>();

// Signed-out stack. Separate from the app stack so a driver without a session
// cannot reach a job route by navigating.
export type AuthStackParamList = { SignIn: undefined };
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      <AuthStack.Screen name="SignIn" component={SignInScreen} />
    </AuthStack.Navigator>
  );
}
