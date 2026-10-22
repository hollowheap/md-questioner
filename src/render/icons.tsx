import React from "react";
// Named imports only: the package's CommonJS entry sets `exports.default`, which the
// browser bundle's interop cannot unwrap reliably.
import { Svg, Circle, Path } from "react-native-svg";

export interface GlyphProps {
  size?: number;
  color?: string;
}

/** Strokes use `currentColor` so the glyph inherits the surrounding text color token. */
const stroke = (color?: string) => ({
  stroke: color ?? "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
});

export const CheckGlyph: React.FC<GlyphProps> = ({ size = 14, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M5 12.5l4.5 4.5L19 7" {...stroke(color)} />
  </Svg>
);

export const CrossGlyph: React.FC<GlyphProps> = ({ size = 14, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M6.5 6.5l11 11M17.5 6.5l-11 11" {...stroke(color)} />
  </Svg>
);

export const PendingGlyph: React.FC<GlyphProps> = ({ size = 14, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx={12} cy={12} r={7} {...stroke(color)} />
  </Svg>
);
