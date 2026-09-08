import { LOGO_SHAPES, LOGO_SIZE } from "@/lib/logo";

/** Dasselbe Motiv wie app/icon.svg, inline gerendert. */
export function Logo({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox={`0 0 ${LOGO_SIZE} ${LOGO_SIZE}`} aria-hidden="true" focusable="false" className={className}>
      {LOGO_SHAPES.map((s, i) => (
        <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} fill={s.fill} />
      ))}
    </svg>
  );
}
