import { useMemo } from 'react';
import { generateQrSvgData } from '../../utils/qrGenerator';

export function QrCodeSvg({
  value,
  margin = 1,
  darkColor,
  lightColor,
  label = 'Código QR',
  className,
}) {
  const {
    viewBoxSize,
    pathD,
    darkColor: resolvedDark,
    lightColor: resolvedLight,
  } = useMemo(
    () => generateQrSvgData(value || '', { margin, darkColor, lightColor }),
    [value, margin, darkColor, lightColor],
  );

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      width="100%"
      height="100%"
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
      className={className}
    >
      <rect width="100%" height="100%" fill={resolvedLight} />
      <path d={pathD} fill={resolvedDark} />
    </svg>
  );
}
