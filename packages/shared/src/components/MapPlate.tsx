// The map plate, restyled for Lumina Glass (2026-08-12): a dark recessed
// panel with faint white street lines, the route in bright teal, destination
// in rose, car puck in the primary teal. Still a placeholder until a map SDK
// is chosen — it keeps layout honest on map-led screens.

import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';
import { colors } from '../lumina/theme';
import { elevated } from '../lumina/shadows';
import { MonoText } from './Typography';

export interface MapPlateProps {
  height: number;
  route?: boolean;
  car?: boolean;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

const W = 412;
const LINE = colors.separator; // faint white grid
const ROAD = colors.glass.fill; // slightly brighter road fill

export function MapPlate({ height, route = true, car = false, label, style }: MapPlateProps) {
  const h = height;
  const grid: React.ReactNode[] = [];
  for (let x = 46; x < W; x += 46) {
    grid.push(<Line key={`v${x}`} x1={x} y1={0} x2={x} y2={h} stroke={LINE} strokeWidth={1} />);
  }
  for (let y = 52; y < h; y += 52) {
    grid.push(<Line key={`h${y}`} x1={0} y1={y} x2={W} y2={y} stroke={LINE} strokeWidth={1} />);
  }
  const oy = h * 0.28;
  const dy = h * 0.78;
  return (
    <View style={[{ height: h, backgroundColor: colors.inputWell, overflow: 'hidden' }, style]}>
      <Svg width="100%" height={h} viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="xMidYMid slice">
        {grid}
        <Rect x={0} y={h * 0.45} width={W} height={9} fill={ROAD} stroke={colors.glass.border} strokeWidth={0.5} />
        <Rect x={W * 0.22} y={0} width={11} height={h} fill={ROAD} stroke={colors.glass.border} strokeWidth={0.5} />
        {route ? (
          <>
            <Polyline
              points={`78,${oy} 78,${h * 0.5} 225,${h * 0.5} 225,${dy} 311,${dy}`}
              fill="none"
              stroke={colors.primary.light}
              strokeWidth={3}
            />
            <Circle cx={78} cy={oy} r={8} fill={colors.background} stroke={colors.text.primary} strokeWidth={3} />
            <Rect x={301} y={dy - 10} width={20} height={20} fill={colors.accent.rose} />
          </>
        ) : null}
      </Svg>
      {car ? (
        <View
          style={{
            position: 'absolute',
            left: '48%',
            top: h * 0.44,
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: colors.primary.base,
            borderWidth: 1,
            borderColor: colors.glass.border,
            alignItems: 'center',
            justifyContent: 'center',
            ...elevated,
          }}
        >
          <View style={{ width: 14, height: 8, borderRadius: 2, backgroundColor: colors.text.primary }} />
        </View>
      ) : null}
      {label ? (
        <MonoText
          size={10}
          color={colors.text.muted}
          style={{ position: 'absolute', left: 14, bottom: 12, letterSpacing: 0.8, textTransform: 'uppercase' }}
        >
          {label}
        </MonoText>
      ) : null}
    </View>
  );
}
