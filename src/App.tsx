import React, { useRef, useEffect, useState } from 'react';
import './App.css';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  let canvas = null;
  let context: CanvasRenderingContext2D | null = null;

  const plotWidth = 1600;
  const plotHeight = 1000;
  const iterations = 300;

  const [xMin, setXMin] = useState(-(plotWidth / 400));
  const [yMin, setYMin] = useState(-(plotHeight / 400));
  const [xMax, setXMax] = useState(plotWidth / 400);
  const [yMax, setYMax] = useState(plotHeight / 400);
  const [scale, setScale] = useState(50);

  const [zooming, setZooming] = useState(false);

  useEffect(() => {
    canvas = canvasRef.current;
    context = canvas ? canvas.getContext('2d') : null;
    if (context) {
      context.fillStyle = 'black';
      context.fillRect(0, 0, plotWidth, plotHeight);
    }

    plotMandelbrot();
  });

  const plotPoint = (x: number, y: number, clr: string) => {
    if (context) {
      context.fillStyle = clr;
      context.fillRect(x, y, 4, 4);
    }
  };

  const plotMandelbrot = () => {
    for (let x = 0; x < 400; x++) {
      for (let y = 0; y < 250; y++) {
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

        // Assign color based on the number of iterations
        const hue = (i % 255) / 255;
        const saturation = 1.0;
        const lightness = i < 255 ? 0.5 : 0;

        // Convert HSL to RGB
        const rgbColor = hslToRgb(hue, saturation, lightness);

        // Plot the point with the calculated color
        plotPoint(x * 4, y * 4, rgbColor);
      }
    }
  };

  const hslToRgb = (h: number, s: number, l: number) => {
    let r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    // Scale values to the range [0, 255]
    return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(
      b * 255
    )})`;
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    if (e.type === 'mousedown') {
      setZooming(!zooming);
    }

    if (!zooming) {
      return;
    }

    // get mouse coordinates relative to the canvas
    const left =
      window.innerWidth > plotWidth ? (window.innerWidth - plotWidth) / 2 : 0;
    const top =
      window.innerHeight > plotHeight
        ? (window.innerHeight - plotHeight) / 2
        : 0;
    const mouseX = e.pageX - left;
    const mouseY = e.pageY - top;

    // calculate the view width and height in the complex plane
    const compW = xMax - xMin;
    const compH = yMax - yMin;

    // calculate the mouse position as a percentage from bottom left to top right
    const percentX = mouseX / plotWidth;
    const percentY = 1 - mouseY / plotHeight;

    // const compX = percentX * compW + xMin;
    // const compY = percentY * compH + yMin;

    const zoomFactor = 1.05;
    const newScale = scale * zoomFactor;

    // calculate new view width and height in the complex plane after zoom
    const newCompW = compW / zoomFactor;
    const newCompH = compH / zoomFactor;

    // calculate the new point in the complex plane for the bottom left corner of the view
    const newXMin = xMin + (compW - newCompW) * percentX;
    const newYMin = yMin + (compH - newCompH) * (1 - percentY);

    // calculate the new point in the complex plane for the top right corner of the view
    const newXMax = newXMin + newCompW;
    const newYMax = newYMin + newCompH;

    // Update state
    setXMin(newXMin);
    setYMin(newYMin);
    setXMax(newXMax);
    setYMax(newYMax);
    setScale(newScale);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'w') {
      const newYMin = yMin - 10 / scale;
      setYMin(newYMin);
    } else if (e.key === 'a') {
      const newXMin = xMin - 10 / scale;
      setXMin(newXMin);
    } else if (e.key === 's') {
      const newYMin = yMin + 10 / scale;
      setYMin(newYMin);
    } else if (e.key === 'd') {
      const newXMin = xMin + 10 / scale;
      setXMin(newXMin);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <canvas
          id="plot"
          ref={canvasRef}
          tabIndex={1}
          width={plotWidth}
          height={plotHeight}
          onMouseDown={(e) => handleZoomIn(e)}
          onMouseMove={(e) => handleZoomIn(e)}
          // onMouseUp={() => setZooming(false)}
          onKeyDown={(e) => handleKey(e)}
        ></canvas>
        <h1>Controls</h1>
        <div>
          Left mouse toggles zooming. Move the mouse to continuously zoom in on
          the cursor.
        </div>
        <div>Pan with wasd.</div>
      </header>
    </div>
  );
}

export default App;
