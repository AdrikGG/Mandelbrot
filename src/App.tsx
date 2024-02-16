import React, { useRef, useEffect, useState } from 'react';
import './App.css';
import workerpool from 'workerpool';

const pool = workerpool.pool();

function App() {
  const mouseCoordinates = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  const plotWidth = 1500;
  const plotHeight = 900;
  const iterations = 2000;
  const pixelsPerPixel = 3;
  const initialScale = 400;

  const [xMin, setXMin] = useState(-(plotWidth / (initialScale * 2)));
  const [yMin, setYMin] = useState(-(plotHeight / (initialScale * 2)));
  const [xMax, setXMax] = useState(plotWidth / (initialScale * 2));
  const [yMax, setYMax] = useState(plotHeight / (initialScale * 2));
  const [scale, setScale] = useState(initialScale);

  const [colorMode, setColorMode] = useState(true);

  let workInProgress = false;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');

    if (context) {
      contextRef.current = context;
    }

    plotMandelbrotParallel();
  });

  const plotMandelbrotParallel = () => {
    const numWorkers = 11;
    const rowsPerWorker = Math.ceil(plotHeight / (pixelsPerPixel * numWorkers));
    const promises = [];

    for (let i = 0; i < numWorkers; i++) {
      const startRow = i * rowsPerWorker * pixelsPerPixel;
      const endRow = Math.min(
        (i + 1) * rowsPerWorker * pixelsPerPixel,
        plotHeight
      );

      workInProgress = true;
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
        const rowImageDataArray: ImageData[] = [];
        for (const workerResult of results) {
          for (const rowImageData of workerResult)
            rowImageDataArray.push(rowImageData);
        }

        drawBatchRows(rowImageDataArray);
        workInProgress = false;
      })
      .catch((error) => {
        console.error('Error in worker pool:', error);
        pool.terminate();
      });
  };

  const drawBatchRows = (imageDataArray: ImageData[]) => {
    const context = contextRef.current;

    if (context) {
      const totalHeight = imageDataArray.length;
      const totalImageData = new ImageData(plotWidth, totalHeight);
      const totalData = totalImageData.data;

      for (let i = 0; i < totalHeight; i++) {
        const imageData = imageDataArray[i];
        const data = imageData.data;
        const totalIndex = i * plotWidth * 4;

        totalData.set(data, totalIndex);
      }

      context.putImageData(totalImageData, 0, 0);
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
    const imageDataArray: ImageData[] = [];
    const colorValues = new Uint8ClampedArray(3);

    for (let y = startRow; y < endRow; y += pixelsPerPixel) {
      const rowData = new Uint8ClampedArray(plotWidth * 4);
      const cy = yMin + y / scale;

      for (let x = 0; x < plotWidth; x += pixelsPerPixel) {
        const cx = xMin + x / scale;
        let zx = 0;
        let zy = 0;

        let i = 0;
        for (i; i < iterations && zx * zx + zy * zy < 16; i++) {
          const xt = zx * zy;
          zx = zx * zx - zy * zy + cx;
          zy = 2 * xt + cy;
        }

        if (i === iterations) i = 0;

        if (colorMode) {
          colorValues[0] = Math.floor(((-Math.cos(0.025 * i) + 1) / 2) * 255);
          colorValues[1] = Math.floor(((-Math.cos(0.08 * i) + 1) / 2) * 255);
          colorValues[2] = Math.floor(((-Math.cos(0.12 * i) + 1) / 2) * 255);
        } else {
          const grayscaleValue = Math.round((i / iterations) * 255);
          colorValues[0] = colorValues[1] = colorValues[2] = grayscaleValue;
        }

        for (let n = 0; n < pixelsPerPixel; n++) {
          const offset = (x + n) * 4;
          rowData[offset] = colorValues[0];
          rowData[offset + 1] = colorValues[1];
          rowData[offset + 2] = colorValues[2];
          rowData[offset + 3] = 255;
        }
      }

      const pixelData = new Uint8ClampedArray(rowData);
      const imageData = new ImageData(
        pixelData,
        plotWidth / pixelsPerPixel,
        pixelsPerPixel
      );

      for (let k = 0; k < pixelsPerPixel; k++) {
        imageDataArray.push(imageData);
      }
    }

    return imageDataArray;
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
    if (workInProgress) return;
    if (e.key === 'w') {
      const newYMin = yMin - 10 / scale;
      const newYMax = yMax - 10 / scale;
      setYMin(newYMin);
      setYMax(newYMax);
    } else if (e.key === 'a') {
      const newXMin = xMin - 10 / scale;
      const newXMax = xMax - 10 / scale;
      setXMin(newXMin);
      setXMax(newXMax);
    } else if (e.key === 's') {
      const newYMin = yMin + 10 / scale;
      const newYMax = yMax + 10 / scale;
      setYMin(newYMin);
      setYMax(newYMax);
    } else if (e.key === 'd') {
      const newXMin = xMin + 10 / scale;
      const newXMax = xMax + 10 / scale;
      setXMin(newXMin);
      setXMax(newXMax);
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
