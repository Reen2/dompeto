import { useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

import { Txt } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { formatCompact } from '@/lib/money';

/* ------------------------------------------------------------------ */
/* Grouped bars — income vs expense per month                          */
/* ------------------------------------------------------------------ */

export type BarDatum = { label: string; a: number; b: number };

export function GroupedBars({
  data,
  height = 148,
  colorA,
  colorB,
  formatValue = formatCompact,
}: {
  data: BarDatum[];
  height?: number;
  colorA?: string;
  colorB?: string;
  formatValue?: (value: number) => string;
}) {
  const c = useTheme();
  const a = colorA ?? c.income;
  const b = colorB ?? c.expense;
  const peak = Math.max(1, ...data.flatMap((d) => [d.a, d.b]));
  const [active, setActive] = useState<number | null>(null);

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height }}>
        {data.map((datum, index) => {
          const isActive = active === index;
          return (
            <View
              key={`${datum.label}-${index}`}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}
              onTouchStart={() => setActive(index)}
              onTouchEnd={() => setActive(null)}>
              {isActive ? (
                <View
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    marginBottom: -4,
                    backgroundColor: c.dark ? c.surfaceElevated : c.text,
                    paddingHorizontal: 7,
                    paddingVertical: 4,
                    borderRadius: 8,
                    zIndex: 10,
                    minWidth: 74,
                  }}>
                  <Txt variant="caption" color={c.dark ? c.text : c.bg} align="center">
                    {formatValue(datum.a)} · {formatValue(datum.b)}
                  </Txt>
                </View>
              ) : null}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  gap: 3,
                  height: `${(Math.max(datum.a, datum.b) / peak) * 100}%`,
                  minHeight: 4,
                }}>
                <View
                  style={{
                    width: 9,
                    height: datum.a > 0 ? `${(datum.a / Math.max(1, Math.max(datum.a, datum.b))) * 100}%` : 0,
                    minHeight: datum.a > 0 ? 3 : 0,
                    borderRadius: 5,
                    backgroundColor: a,
                    opacity: active === null || isActive ? 1 : 0.45,
                  }}
                />
                <View
                  style={{
                    width: 9,
                    height: datum.b > 0 ? `${(datum.b / Math.max(1, Math.max(datum.a, datum.b))) * 100}%` : 0,
                    minHeight: datum.b > 0 ? 3 : 0,
                    borderRadius: 5,
                    backgroundColor: b,
                    opacity: active === null || isActive ? 1 : 0.45,
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        {data.map((datum, index) => (
          <View key={`label-${index}`} style={{ flex: 1, alignItems: 'center' }}>
            <Txt variant="caption" color={active === index ? c.text : c.textFaint} numberOfLines={1}>
              {datum.label}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Line chart with soft area fill                                      */
/* ------------------------------------------------------------------ */

export function LineChart({
  values,
  labels,
  height = 150,
  color,
  fill = true,
  padding = 10,
}: {
  values: number[];
  labels?: string[];
  height?: number;
  color?: string;
  fill?: boolean;
  padding?: number;
}) {
  const c = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [measured, setMeasured] = useState(0);
  const width = measured || Math.max(220, windowWidth - 80);
  const stroke = color ?? c.accent;

  const { line, area, points, min, max } = useMemo(() => {
    const values2 = values.length ? values : [0];
    const maxValue = Math.max(...values2);
    const minValue = Math.min(...values2, 0);
    const span = maxValue - minValue || 1;
    const innerW = width - padding * 2;
    const innerH = height - padding * 2;
    const step = values2.length > 1 ? innerW / (values2.length - 1) : 0;
    const pts = values2.map((value, index) => {
      const x = padding + index * step;
      const y = padding + innerH - ((value - minValue) / span) * innerH;
      return { x, y };
    });
    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const areaPath = `${linePath} L${(padding + innerW).toFixed(1)},${height - padding} L${padding},${
      height - padding
    } Z`;
    return { line: linePath, area: areaPath, points: pts, min: minValue, max: maxValue };
  }, [values, width, height, padding]);

  return (
    <View onLayout={(event) => setMeasured(event.nativeEvent.layout.width)}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={stroke} stopOpacity="0.22" />
            <Stop offset="1" stopColor={stroke} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {[0.25, 0.5, 0.75].map((ratio) => (
          <Path
            key={ratio}
            d={`M${padding},${(padding + (height - padding * 2) * ratio).toFixed(1)} L${(
              width - padding
            ).toFixed(1)},${(padding + (height - padding * 2) * ratio).toFixed(1)}`}
            stroke={c.border}
            strokeWidth={StyleSheet.hairlineWidth}
          />
        ))}
        {fill ? <Path d={area} fill="url(#lineFill)" /> : null}
        <Path d={line} stroke={stroke} strokeWidth={2.4} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <Circle
          cx={points[points.length - 1]?.x ?? 0}
          cy={points[points.length - 1]?.y ?? 0}
          r={3.6}
          fill={stroke}
        />
        <Circle
          cx={points[points.length - 1]?.x ?? 0}
          cy={points[points.length - 1]?.y ?? 0}
          r={7}
          fill={stroke}
          opacity={0.18}
        />
      </Svg>
      {labels && labels.length ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          {labels.map((label, index) => (
            <Txt key={`${label}-${index}`} variant="caption" color={c.textFaint}>
              {label}
            </Txt>
          ))}
        </View>
      ) : null}
      {!labels?.length ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
          <Txt variant="caption" color={c.textFaint}>
            {formatCompact(min)}
          </Txt>
          <Txt variant="caption" color={c.textFaint}>
            {formatCompact(max)}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Donut                                                               */
/* ------------------------------------------------------------------ */

export type DonutSlice = { value: number; color: string; label?: string };

export function Donut({
  slices,
  size = 156,
  thickness = 17,
  centerLabel,
  centerValue,
}: {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const c = useTheme();
  const total = slices.reduce((sum, slice) => sum + Math.max(0, slice.value), 0);
  const radiusValue = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radiusValue;
  let offset = 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke={c.surfaceAlt}
          strokeWidth={thickness}
          fill="none"
        />
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          {total > 0
            ? slices.map((slice, index) => {
                const value = Math.max(0, slice.value);
                const fraction = value / total;
                const dash = Math.max(0, fraction * circumference - (slices.length > 1 ? 1.6 : 0));
                const circle = (
                  <Circle
                    key={index}
                    cx={size / 2}
                    cy={size / 2}
                    r={radiusValue}
                    stroke={slice.color}
                    strokeWidth={thickness}
                    strokeLinecap="butt"
                    fill="none"
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-offset}
                  />
                );
                offset += fraction * circumference;
                return circle;
              })
            : null}
        </G>
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center', gap: 1 }}>
        {centerValue ? (
          <Txt variant="h3" numberOfLines={1} style={{ fontSize: 18 }}>
            {centerValue}
          </Txt>
        ) : null}
        {centerLabel ? (
          <Txt variant="caption" color={c.textMuted} numberOfLines={1}>
            {centerLabel}
          </Txt>
        ) : null}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Day heatmap — last N weeks of activity                              */
/* ------------------------------------------------------------------ */

export function Heatmap({
  days,
  max,
  onSelect,
}: {
  days: { date: string; value: number }[];
  max?: number;
  onSelect?: (date: string) => void;
}) {
  const c = useTheme();
  const peak = Math.max(1, max ?? Math.max(...days.map((d) => d.value), 1));
  const columns: { date: string; value: number }[][] = [];
  for (let i = 0; i < days.length; i += 7) columns.push(days.slice(i, i + 7));

  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {columns.map((column, columnIndex) => (
        <View key={columnIndex} style={{ flex: 1, gap: 4 }}>
          {column.map((day) => {
            const intensity = day.value <= 0 ? 0 : Math.min(1, day.value / peak);
            return (
              <View
                key={day.date}
                onTouchStart={() => onSelect?.(day.date)}
                style={{
                  aspectRatio: 1,
                  borderRadius: 5,
                  backgroundColor:
                    intensity === 0
                      ? c.surfaceAlt
                      : `${c.accent}${Math.round(30 + intensity * 200)
                          .toString(16)
                          .padStart(2, '0')}`,
                }}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Horizontal breakdown bar                                            */
/* ------------------------------------------------------------------ */

export function SplitBar({
  segments,
  height = 10,
}: {
  segments: { value: number; color: string }[];
  height?: number;
}) {
  const c = useTheme();
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  return (
    <View
      style={{
        flexDirection: 'row',
        height,
        borderRadius: height / 2,
        overflow: 'hidden',
        backgroundColor: c.surfaceAlt,
      }}>
      {total > 0
        ? segments.map((segment, index) => (
            <View
              key={index}
              style={{
                width: `${(Math.max(0, segment.value) / total) * 100}%`,
                backgroundColor: segment.color,
              }}
            />
          ))
        : null}
    </View>
  );
}
