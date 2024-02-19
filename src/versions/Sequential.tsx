import React, { useRef, useEffect, useState, useCallback } from 'react';

const Sequential = () => {
  const mouseCoordinates = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  const plotWidth = 1500;
  const plotHeight = 900;
  const maxIterations = 300;
  const initialScale = 400;

  const [xMin, setXMin] = useState(-(plotWidth / (initialScale * 2)));
  const [yMin, setYMin] = useState(-(plotHeight / (initialScale * 2)));
  const [xMax, setXMax] = useState(plotWidth / (initialScale * 2));
  const [yMax, setYMax] = useState(plotHeight / (initialScale * 2));
  const [scale, setScale] = useState(100);
  const [zooms, setZooms] = useState(0);

  const [colorMode, setColorMode] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');

    if (context) {
      contextRef.current = context;
    }

    plotMandelbrot();
  });

  const plotPoint = (x: number, y: number, clr: string) => {
    const context = contextRef.current;

    if (context) {
      context.fillStyle = clr;
      context.fillRect(x, y, 4, 4);
    }
  };

  const plotMandelbrot = () => {
    const colorValues = new Uint8ClampedArray(3);
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

    for (let x = 0; x < plotWidth / 4; x++) {
      const cx = xMin + x * scaleReciprocal;

      for (let y = 0; y < plotHeight / 4; y++) {
        const cy = yMin + y * scaleReciprocal;
        let zx = 0,
          zy = 0;

        let i = 0;
        for (i; i < maxIterations && zx * zx + zy * zy < 4; i++) {
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

        plotPoint(
          x * 4,
          y * 4,
          `rgb(${colorValues[0]}, ${colorValues[1]}, ${colorValues[2]})`
        );
      }
    }
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
      let newScale = 0.0;
      if (zoomIn) {
        newScale = scale * zoomFactor;
        setZooms((prev) => prev + 1);
      } else {
        newScale = scale / zoomFactor;
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
    },
    [xMin, yMin, xMax, yMax, scale]
  );

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
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
            Resolution: ${plotWidth} x ${plotHeight}
            Range: (${xMin}, ${yMin}), (${xMax}, ${yMax})
            Max Iterations: ${maxIterations}
            Scale: ${scale}
            Zooms: ${zooms}
          `);
        };

        printValues();
      }
    },
    [xMin, yMin, xMax, yMax, scale, zooms, handleZoom]
  );

  function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null;

    return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
      const context = this;
      clearTimeout(timeout as NodeJS.Timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }

  const debouncedHandleKey = debounce(handleKey, 5);

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
        onKeyDown={(e) => debouncedHandleKey(e)}
      ></canvas>
    </>
  );
};

export default Sequential;
