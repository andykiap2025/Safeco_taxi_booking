// Typed navigation for the Driver app. Headers are hidden — every screen
// draws its own masthead/band, per the design language.

import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';

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
