/* eslint-disable no-restricted-globals */
const workerpool = require('workerpool');

workerpool.worker({
  calculateMandelbrotRow: (
    startRow: number,
    endRow: number,
    plotWidth: number,
    xMin: number,
    yMin: number,
    scale: number,
    iterations: number,
    colorMode: boolean
  ) => {
    const rowDataArray = [];

    for (let y = startRow; y < endRow; y += 4) {
      const rowData = [];

      for (let x = 0; x < plotWidth; x += 4) {
        const cx = xMin + x / scale;
        const cy = yMin + y / scale;
        let zx = 0,
          zy = 0;

        let i = 0;
        for (i; i < iterations && zx * zx + zy * zy < 4; i++) {
          const xt = zx * zy;
          zx = zx * zx - zy * zy + cx;
          zy = 2 * xt + cy;
        }

        let clr = '';
        if (colorMode) {
          const hue = (i % 255) / 255;
          const saturation = 1.0;
          const lightness = i < 255 ? 0.5 : 0;

          const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
          };

          const q =
            lightness < 0.5
              ? lightness * (1 + saturation)
              : lightness + saturation - lightness * saturation;
          const p = 2 * lightness - q;
          const r = hue2rgb(p, q, hue + 1 / 3);
          const g = hue2rgb(p, q, hue);
          const b = hue2rgb(p, q, hue - 1 / 3);

          clr = `rgb(${Math.round(r * 255)}, ${Math.round(
            g * 255
          )}, ${Math.round(b * 255)})`;
        } else {
          clr = Math.round((i / iterations) * 255).toString(16);
        }

        rowData.push(clr);
      }

      rowDataArray.push({ row: y, rowData });
    }

    return rowDataArray;
  }
});

export {};
