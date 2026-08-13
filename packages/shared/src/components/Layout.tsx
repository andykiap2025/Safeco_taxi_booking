// Layout primitives. All shadows come from the elevation scale — never
// define shadow values in app code.

import { Pressable, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { colors, elevation, minTapTarget, radius, space, typography, type ElevationLevel } from '../theme';
import { Kicker, SerifText } from './Typography';

export function Screen({ style, ...rest }: ViewProps) {
  return <View {...rest} style={[{ flex: 1, backgroundColor: colors.paper }, style]} />;
}

export interface CardProps extends ViewProps {
  level?: ElevationLevel;
}

export function Card({ level = 'raised', style, ...rest }: CardProps) {
  return (
    <View
      {...rest}
      style={[
        { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.s4, ...elevation[level] },
        style,
      ]}
    />
  );
}

export interface ListRowProps {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  selected?: boolean;
  onPress?: () => void;
  last?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ListRow({ title, subtitle, leading, trailing, selected, onPress, last, style }: ListRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.s2 + 2,
          minHeight: minTapTarget,
          paddingVertical: space.s2 + 3,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: colors.neutral300,
          backgroundColor: selected ? colors.accentSelection : 'transparent',
        },
        style,
      ]}
    >
      {leading}
      <View style={{ flex: 1, minWidth: 0 }}>
        <SerifText weight="semibold" size={typography.size.body}>{title}</SerifText>
        {subtitle ? (
          <SerifText size={typography.size.meta} color={colors.neutral700}>{subtitle}</SerifText>
        ) : null}
      </View>
      {trailing}
    </Pressable>
  );
}

export interface StatBlockProps {
  value: string;
  label: string;
  valueColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function StatBlock({ value, label, valueColor = colors.ink, style }: StatBlockProps) {
  return (
    <View style={style}>
      <SerifText weight="semibold" size={24} color={valueColor}>{value}</SerifText>
      <Kicker style={{ marginTop: space.s1 }}>{label}</Kicker>
    </View>
  );
}

// Vehicle registration chip — heavy ink border, always identifiable.
export function PlateChip({ plate, style }: { plate: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ borderWidth: 2, borderColor: colors.ink, paddingHorizontal: 8, paddingVertical: 5, alignSelf: 'flex-start' }, style]}>
      <SerifText weight="semibold" size={16} style={{ letterSpacing: 1 }}>{plate}</SerifText>
    </View>
  );
}
