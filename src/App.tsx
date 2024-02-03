import React, { useRef, useEffect, useState } from 'react';
import './App.css';
import workerpool from 'workerpool';

function App() {
  const mouseCoordinates = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  const plotWidth = 1600;
  const plotHeight = 1000;
  const iterations = 300;
  const pixelsPerPixel = 4;
  const initialScale = 400;

  const [xMin, setXMin] = useState(-(plotWidth / (initialScale * 2)));
  const [yMin, setYMin] = useState(-(plotHeight / (initialScale * 2)));
  const [xMax, setXMax] = useState(plotWidth / (initialScale * 2));
  const [yMax, setYMax] = useState(plotHeight / (initialScale * 2));
  const [scale, setScale] = useState(initialScale);

  const [colorMode, setColorMode] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');

    if (context) {
      contextRef.current = context;
    }

    plotMandelbrotParallel();
  });

  const plotMandelbrotParallel = () => {
    const pool = workerpool.pool();

    const numWorkers = 16;
    const rowsPerWorker = Math.ceil(plotHeight / (pixelsPerPixel * numWorkers));
    const promises = [];

    for (let i = 0; i < numWorkers; i++) {
      const startRow = i * rowsPerWorker * pixelsPerPixel;
      const endRow = Math.min(
        (i + 1) * rowsPerWorker * pixelsPerPixel,
        plotHeight
      );

      promises.push(
        pool.exec(calculateMandelbrotRow, [
          startRow,
          endRow,
          plotWidth,
          xMin,
          yMin,
          scale,
          pixelsPerPixel,
          iterations,
          colorMode
        ])
      );
    }

    Promise.all(promises)
      .then((results) => {
        pool.terminate();

        for (const workerResult of results) {
          for (const { row, rowData } of workerResult) {
            drawRow(row, rowData);
          }
        }
      })
      .catch((error) => {
        console.error('Error in worker pool:', error);
        pool.terminate();
      });
  };

  const drawRow = (row: number, rowData: string[]) => {
    const canvas = canvasRef.current;
    const context = contextRef.current;

    if (canvas && context) {
      for (let i = 0; i < rowData.length; i++) {
        context.fillStyle = rowData[i];
        context.fillRect(
          i * pixelsPerPixel,
          row,
          pixelsPerPixel,
          pixelsPerPixel
        );
      }
    }
  };

  const calculateMandelbrotRow = (
    startRow: number,
    endRow: number,
    plotWidth: number,
    xMin: number,
    yMin: number,
    scale: number,
    pixelsPerPixel: number,
    iterations: number,
    colorMode: boolean
  ) => {
    const rowDataArray = [];

    for (let y = startRow; y < endRow; y += pixelsPerPixel) {
      const rowData = [];

      for (let x = 0; x < plotWidth; x += pixelsPerPixel) {
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
  };

  const handleZoom = (zoomIn: boolean) => {
    const mouseX = mouseCoordinates.current.x;
    const mouseY = mouseCoordinates.current.y;

    // calculate the view width and height in the complex plane
    const compW = xMax - xMin;
    const compH = yMax - yMin;

    // calculate the mouse position as a percentage from bottom left to top right
    const percentX = mouseX / plotWidth;
    const percentY = 1 - mouseY / plotHeight;

    // const compX = percentX * compW + xMin;
    // const compY = percentY * compH + yMin;

    const zoomFactor = 1.05;
    let newScale = 0.0;
    if (zoomIn) {
      newScale = scale * zoomFactor;
    } else {
      newScale = scale / zoomFactor;
    }

    // calculate new view width and height in the complex plane after zoom
    let newCompW, newCompH;
    if (zoomIn) {
      newCompW = compW / zoomFactor;
      newCompH = compH / zoomFactor;
    } else {
      newCompW = compW * zoomFactor;
      newCompH = compH * zoomFactor;
    }

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
    } else if (e.key === 'c') {
      setColorMode((prevColorMode) => !prevColorMode);
    } else if (e.key === 'e') {
      handleZoom(true);
    } else if (e.key === 'q') {
      handleZoom(false);
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
          onMouseMove={(e) => {
            const canvasView = canvasRef.current?.getBoundingClientRect();
            if (canvasView) {
              const mouseX = e.clientX - canvasView.left;
              const mouseY = e.clientY - canvasView.top;
              mouseCoordinates.current = { x: mouseX, y: mouseY };
            }
          }}
          onKeyDown={(e) => handleKey(e)}
        ></canvas>
        <div className="controls">
          <h1>Controls</h1>
          <div>
            <ul>
              <li>Zoom in with e and zoom out with q.</li>
              <li>Hover mouse over where you want to zoom.</li>
              <li>Pan with wasd.</li>
            </ul>
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
