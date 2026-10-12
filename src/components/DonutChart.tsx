// src/components/DonutChart.tsx
// Lightweight donut chart using react-native-svg.

import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { fonts } from '../theme';
import type { MoneyCategoryBreakdown } from '../types';

type Props = {
  data: MoneyCategoryBreakdown[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
  centerLabelColor?: string;
  centerValueColor?: string;
  trackColor?: string;
};

export default function DonutChart({
  data,
  size = 220,
  strokeWidth = 26,
  centerLabel,
  centerValue,
  centerLabelColor = '#888',
  centerValueColor = '#111',
  trackColor = '#00000010',
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const [progress, setProgress] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const start = Date.now();
    const duration = 500;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [data]);

  const total = data.reduce((a, b) => a + b.amount, 0);
  let cursor = 0;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {total > 0 &&
            data.map((item) => {
              const fraction = item.amount / total;
              const dashLength = circumference * fraction * progress;
              const dashOffset = -circumference * cursor * progress;
              cursor += fraction;
              return (
                <Circle
                  key={item.categoryId}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dashLength} ${circumference}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="butt"
                  fill="none"
                />
              );
            })}
        </G>
      </Svg>

      {centerLabel || centerValue ? (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          {centerLabel ? (
            <Text
              style={[styles.centerLabel, { color: centerLabelColor }]}
            >
              {centerLabel}
            </Text>
          ) : null}
          {centerValue ? (
            <Text
              style={[styles.centerValue, { color: centerValueColor }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {centerValue}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  centerLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    marginBottom: 4,
    textAlign: 'center',
  },
  centerValue: {
    fontFamily: fonts.serifBold,
    fontSize: 20,
    textAlign: 'center',
  },
});