import React, { useRef, useEffect, useState } from 'react';

const GPUParallel = () => {
  const mouseCoordinates = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);

  const plotWidth = 1500;
  const plotHeight = 900;
  const initialScale = 300;
  const maxIterations = 2000;

  const [xMin, setXMin] = useState(-(plotWidth / (initialScale * 2)));
  const [yMin, setYMin] = useState(-(plotHeight / (initialScale * 2)));
  const [xMax, setXMax] = useState(plotWidth / (initialScale * 2));
  const [yMax, setYMax] = useState(plotHeight / (initialScale * 2));
  const [scale, setScale] = useState(initialScale);
  const [zooms, setZooms] = useState(0);

  const [colorMode, setColorMode] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl');

    if (gl) {
      glRef.current = gl;
    }

    plotMandelbrot();
  });

  const plotMandelbrot = () => {
    const gl = glRef.current;

    if (!gl) {
      console.error('WebGL not supported, or context creation failed');
      return;
    }

    // Compile shaders
    const vertexShaderSource = `
      attribute vec4 a_position;
      void main() {
        gl_Position = a_position;
      }
    `;

    const fragmentShaderSource = `
      precision highp float;

      uniform vec2 u_resolution;
      uniform vec4 u_complexRange;
      uniform float u_scale;
      uniform int u_colorMode;

      const float maxIters = 8000.;
      const float escRad2 = 16.;

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5) * u_resolution;
        vec2 c = mix(
          vec2(u_complexRange.x, u_complexRange.y), 
          vec2(u_complexRange.z, u_complexRange.w),
          uv
        );

        float zx = 0.;
        float zy = 0.;
        float iteration = 0.;

        for (float i = 0.; i < maxIters; i++) {
          if ((zx * zx + zy * zy) < escRad2) {
            float xt = zx * zy;
            zx = zx * zx - zy * zy + c.x;
            zy = 2. * xt + c.y;
            iteration = i;
          } else {
            break;
          }
        }

        if (maxIters - iteration < 2.) iteration = 0.;

        if (u_colorMode == 1) {
          gl_FragColor = vec4(
            (-cos(0.025 * iteration) + 1.) / 2., 
            (-cos(0.08 * iteration) + 1.) / 2., 
            (-cos(0.12 * iteration) + 1.) / 2., 
            1.
          );
        } else {
          float colorValue = -1. / (0.05 * iteration + 1.) + 1.;
          gl_FragColor = vec4(vec3(colorValue), 1.0);
        }
      }
    `;

    const vertexShader = compileShader(
      gl,
      vertexShaderSource,
      gl.VERTEX_SHADER
    );
    const fragmentShader = compileShader(
      gl,
      fragmentShaderSource,
      gl.FRAGMENT_SHADER
    );

    if (!vertexShader || !fragmentShader) {
      console.error('Shader compilation failed');
      return;
    }

    // Create shader program
    const shaderProgram = gl.createProgram();
    if (!shaderProgram) {
      console.error('Shader program creation failed');
      return;
    }

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      console.error('Shader program linking failed');
      return;
    }

    gl.useProgram(shaderProgram);

    // Set up buffers, attributes, and uniforms
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionAttrib = gl.getAttribLocation(shaderProgram, 'a_position');
    gl.vertexAttribPointer(positionAttrib, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionAttrib);

    const resolutionUniform = gl.getUniformLocation(
      shaderProgram,
      'u_resolution'
    );
    gl.uniform2f(resolutionUniform, 1 / gl.canvas.width, 1 / gl.canvas.height);

    const complexRangeUniform = gl.getUniformLocation(
      shaderProgram,
      'u_complexRange'
    );
    gl.uniform4f(complexRangeUniform, xMin, yMin, xMax, yMax);

    const scaleUniform = gl.getUniformLocation(shaderProgram, 'u_scale');
    gl.uniform1f(scaleUniform, scale);

    const colorModeUniform = gl.getUniformLocation(
      shaderProgram,
      'u_colorMode'
    );
    gl.uniform1i(colorModeUniform, colorMode ? 1 : 0);

    // Draw
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Clean up
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    gl.deleteProgram(shaderProgram);
  };

  const compileShader = (
    gl: WebGLRenderingContext,
    source: string,
    type: number
  ) => {
    const shader = gl.createShader(type);

    if (!shader) {
      console.error('Shader creation failed');
      return null;
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(
        `Shader compilation failed: ${gl.getShaderInfoLog(shader)}`
      );
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  };

  const handleZoom = (zoomIn: boolean) => {
    const mouseX = mouseCoordinates.current.x;
    const mouseY = mouseCoordinates.current.y;

    // calculate the view width and height in the complex plane
    const compW = xMax - xMin;
    const compH = yMax - yMin;

    // calculate the mouse position as a percentage from bottom left to top right
    const percentX = mouseX / plotWidth;
    const percentY = mouseY / plotHeight;

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
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'w') {
      const newYMin = yMin + 10 / scale;
      const newYMax = yMax + 10 / scale;
      setYMin(newYMin);
      setYMax(newYMax);
    } else if (e.key === 'a') {
      const newXMin = xMin - 10 / scale;
      const newXMax = xMax - 10 / scale;
      setXMin(newXMin);
      setXMax(newXMax);
    } else if (e.key === 's') {
      const newYMin = yMin - 10 / scale;
      const newYMax = yMax - 10 / scale;
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
  };

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

export default GPUParallel;
