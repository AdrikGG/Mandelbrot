import React, { useRef, useEffect, useState, useCallback } from 'react';

const CPUParallel = () => {
  let workInProgress = false;
  const [workers, setWorkers] = useState<Worker[]>([]);

  const mouseCoordinates = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  const plotWidth = 1500;
  const plotHeight = 900;
  const pixelsPerPixel = 4;
  const initialScale = 400;

  const [xMin, setXMin] = useState(-(plotWidth / (initialScale * 2)));
  const [yMin, setYMin] = useState(-(plotHeight / (initialScale * 2)));
  const [xMax, setXMax] = useState(plotWidth / (initialScale * 2));
  const [yMax, setYMax] = useState(plotHeight / (initialScale * 2));

  const [scale, setScale] = useState(initialScale);
  const [zooms, setZooms] = useState(0);
  const [maxIterations, setMaxIterations] = useState(200);

  const [colorMode, setColorMode] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');

    if (context) {
      contextRef.current = context;
    }

    plotMandelbrotParallel();
  });

  useEffect(() => {
    // Create workers dynamically
    const numWorkers = navigator.hardwareConcurrency || 4;
    const newWorkers: Worker[] = [];
    const workerScript = `
      onmessage = function(event) {
        const startRow = event.data[0];
        const endRow = event.data[1];
        const plotWidth = event.data[2];
        const xMin = event.data[3];
        const yMin = event.data[4];
        const scale = event.data[5];
        const pixelsPerPixel = event.data[6];
        const maxIterations = event.data[7];
        const colorMode = event.data[8];
  
        const result = (${calculateMandelbrotRow.toString()})(startRow, endRow, plotWidth, xMin, yMin, scale, pixelsPerPixel, maxIterations, colorMode);
  
        postMessage(result);
      }
    `;
    const blob = new Blob([workerScript], { type: 'application/javascript' });

    console.log('Creating workers:', numWorkers);
    for (let i = 0; i < numWorkers; i++) {
      const worker = new Worker(URL.createObjectURL(blob));
      newWorkers.push(worker);
    }
    setWorkers(newWorkers);

    // Cleanup workers on component unmount
    return () => {
      newWorkers.forEach((worker) => worker.terminate());
    };
  }, []);

  const plotMandelbrotParallel = () => {
    const rowsPerWorker = Math.ceil(
      plotHeight / (pixelsPerPixel * workers.length)
    );
    const promises = [];

    for (let i = 0; i < workers.length; i++) {
      const startRow = i * rowsPerWorker * pixelsPerPixel;
      const endRow = Math.min(
        (i + 1) * rowsPerWorker * pixelsPerPixel,
        plotHeight
      );

      workInProgress = true;

      const worker = workers[i];
      const workerPromise = new Promise((resolve) => {
        worker.onmessage = (e) => {
          resolve(e.data);
        };

        worker.postMessage([
          startRow,
          endRow,
          plotWidth,
          xMin,
          yMin,
          scale,
          pixelsPerPixel,
          maxIterations,
          colorMode
        ]);
      });

      promises.push(workerPromise);
    }

    Promise.all(promises)
      .then((results) => {
        const rowImageDataArray: ImageData[] = [];
        for (const workerResult of results) {
          for (const rowImageData of workerResult as ImageData[])
            rowImageDataArray.push(rowImageData);
        }

        drawBatchRows(rowImageDataArray);
        workInProgress = false;
      })
      .catch((error) => {
        console.error('Error in worker pool:', error);
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
    maxIterations: number,
    colorMode: boolean
  ) => {
    const imageDataArray: ImageData[] = [];
    const colorValues = new Uint8ClampedArray(3);
    const rowData = new Uint8ClampedArray(plotWidth * 4);

    const imageDataWidth = plotWidth / pixelsPerPixel;
    const scaleReciprocal = 1 / scale;

    const rLookup = Array.from({ length: maxIterations }, (_, i) =>
      Math.floor(((-Math.cos(0.025 * i) + 1) / 2) * 255)
    );
    const gLookup = Array.from({ length: maxIterations }, (_, i) =>
      Math.floor(((-Math.cos(0.08 * i) + 1) / 2) * 255)
    );
    const bLookup = Array.from({ length: maxIterations }, (_, i) =>
      Math.floor(((-Math.cos(0.12 * i) + 1) / 2) * 255)
    );

    for (let y = startRow; y < endRow; y += pixelsPerPixel) {
      const cy = yMin + y * scaleReciprocal;

      for (let x = 0; x < plotWidth; x += pixelsPerPixel) {
        const cx = xMin + x * scaleReciprocal;
        let zx = 0;
        let zy = 0;

        let i = 0;
        for (i; i < maxIterations && zx * zx + zy * zy < 16; i++) {
          const xt = zx * zy;
          zx = zx * zx - zy * zy + cx;
          zy = 2 * xt + cy;
        }

        if (colorMode) {
          if (maxIterations - i < 2) {
            colorValues[0] = colorValues[1] = colorValues[2] = 0;
          } else {
            colorValues[0] = rLookup[i];
            colorValues[1] = gLookup[i];
            colorValues[2] = bLookup[i];
          }
        } else {
          const grayscaleValue = (-1 / (0.05 * i + 1) + 1) * 255;
          colorValues[0] = colorValues[1] = colorValues[2] = grayscaleValue;
        }

        for (let n = 0; n < pixelsPerPixel; n++) {
          const offset = (x + n) << 2;
          rowData[offset] = colorValues[0];
          rowData[offset + 1] = colorValues[1];
          rowData[offset + 2] = colorValues[2];
          rowData[offset + 3] = 255;
        }
      }

      const pixelData = new Uint8ClampedArray(rowData);
      const imageData = new ImageData(
        pixelData,
        imageDataWidth,
        pixelsPerPixel
      );

      for (let k = 0; k < pixelsPerPixel; k++) {
        imageDataArray.push(imageData);
      }
    }

    return imageDataArray;
  };

  const handleZoom = useCallback(
    (zoomIn: boolean) => {
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
      let newScale = 0;
      let newMaxIters = 0;
      if (zoomIn) {
        newScale = scale * zoomFactor;
        newMaxIters = maxIterations + 5;
        setZooms((prev) => prev + 1);
      } else {
        newScale = scale / zoomFactor;
        newMaxIters = maxIterations - 5;
        setZooms((prev) => prev - 1);
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
      setMaxIterations(newMaxIters);
    },
    [xMin, yMin, xMax, yMax, scale, maxIterations]
  );

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
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
      } else if (e.key === 'p') {
        const printValues = () => {
          const mouseX = mouseCoordinates.current.x;
          const mouseY = mouseCoordinates.current.y;

          console.log(`
            Mouse Coords: (${mouseX}, ${mouseY})
            Canvas Size: ${plotWidth} x ${plotHeight}
            Resolution: ${plotWidth / pixelsPerPixel} x ${
            plotHeight / pixelsPerPixel
          }
            Range: (${xMin}, ${yMin}), (${xMax}, ${yMax})
            Max Iterations: ${maxIterations}
            Scale: ${scale}
            Zooms: ${zooms}
          `);
        };

        printValues();
      }
    },
    [
      workInProgress,
      xMin,
      yMin,
      xMax,
      yMax,
      scale,
      zooms,
      maxIterations,
      handleZoom
    ]
  );

  return (
    <>
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
      <div>Note: Firefox may not take advantage of all your CPU cores</div>
    </>
  );
};

export default CPUParallel;
