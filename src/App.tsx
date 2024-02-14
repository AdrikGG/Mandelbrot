import React, { useRef, useEffect, useState } from 'react';
import './App.css';
import { fragmentShaderSource } from './doubleSingleShader';

function App() {
  const mouseCoordinates = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);

  const plotWidth = 1500;
  const plotHeight = 900;
  const initialScale = 400;

  const [xMin, setXMin] = useState(-(plotWidth / (initialScale * 2)));
  const [yMin, setYMin] = useState(-(plotHeight / (initialScale * 2)));
  const [xMax, setXMax] = useState(plotWidth / (initialScale * 2));
  const [yMax, setYMax] = useState(plotHeight / (initialScale * 2));
  const [scale, setScale] = useState(initialScale);

  const [cx, setCX] = useState((xMin + xMax) / 2);
  const [cy, setCY] = useState((yMin + yMax) / 2);

  const [colorMode, setColorMode] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    // const gl = canvas?.getContext('webgl');
    const gl = canvas?.getContext('webgl', {
      antialias: true,
      powerPreference: 'high-performance'
    });

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

    const complexStartUniform = gl.getUniformLocation(
      shaderProgram,
      'u_complexStart'
    );
    const complexStartUniforms = new Float32Array(4);
    const csx = xMin;
    complexStartUniforms[0] = csx;
    complexStartUniforms[1] = csx - complexStartUniforms[0];
    const csy = yMin;
    complexStartUniforms[2] = csy;
    complexStartUniforms[3] = csy - complexStartUniforms[2];
    gl.uniform4fv(complexStartUniform, complexStartUniforms);

    const complexEndUniform = gl.getUniformLocation(
      shaderProgram,
      'u_complexEnd'
    );
    const complexEndUniforms = new Float32Array(4);
    const cex = xMin;
    complexEndUniforms[0] = cex;
    complexEndUniforms[1] = cex - complexEndUniforms[0];
    const cey = yMin;
    complexEndUniforms[2] = cey;
    complexEndUniforms[3] = cey - complexEndUniforms[2];
    gl.uniform4fv(complexEndUniform, complexEndUniforms);

    const widthUniforms = new Float32Array(2);
    const widthUniform = gl.getUniformLocation(shaderProgram, 'u_width');
    const w = 1 / gl.canvas.width;
    widthUniforms[0] = w;
    widthUniforms[1] = w - widthUniforms[0];
    gl.uniform2fv(widthUniform, widthUniforms);

    const heightUniforms = new Float32Array(2);
    const heightUniform = gl.getUniformLocation(shaderProgram, 'u_height');
    const h = 1 / gl.canvas.height;
    heightUniforms[0] = h;
    heightUniforms[1] = h - heightUniforms[0];
    gl.uniform2fv(heightUniform, heightUniforms);

    // console.log(widthUniforms, heightUniforms);

    // const cxUniforms = new Float32Array(2);
    // const cx0Uniform = gl.getUniformLocation(shaderProgram, 'ds_cx0');
    // const cx1Uniform = gl.getUniformLocation(shaderProgram, 'ds_cx1');
    // cxUniforms[0] = cx;
    // cxUniforms[1] = cx - cxUniforms[0];
    // gl.uniform1f(cx0Uniform, cxUniforms[0]);
    // gl.uniform1f(cx1Uniform, cxUniforms[1]);

    // const cyUniforms = new Float32Array(2);
    // const cy0Uniform = gl.getUniformLocation(shaderProgram, 'ds_cy0');
    // const cy1Uniform = gl.getUniformLocation(shaderProgram, 'ds_cy1');
    // cyUniforms[0] = cy;
    // cyUniforms[1] = cy - cyUniforms[0];
    // gl.uniform1f(cy0Uniform, cyUniforms[0]);
    // gl.uniform1f(cy1Uniform, cyUniforms[1]);

    // const zUniforms = new Float32Array(2);
    // const z0Uniform = gl.getUniformLocation(shaderProgram, 'ds_z0');
    // const z1Uniform = gl.getUniformLocation(shaderProgram, 'ds_z1');
    // const invScale = 1 / scale;
    // zUniforms[0] = invScale;
    // zUniforms[1] = invScale - zUniforms[0];
    // gl.uniform1f(z0Uniform, zUniforms[0]);
    // gl.uniform1f(z1Uniform, zUniforms[1]);

    // console.log(wUniforms, vUniforms, cxUniforms, cyUniforms, zUniforms);

    // const colorModeUniform = gl.getUniformLocation(
    //   shaderProgram,
    //   'u_colorMode'
    // );
    // gl.uniform1i(colorModeUniform, colorMode ? 1 : 0);

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

    const compX = percentX * compW + xMin;
    const compY = percentY * compH + yMin;

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
    setCX(compX);
    setCY(compY);

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
      console.log(
        'Frame in complex coordinates: (' +
          xMin +
          ', ' +
          yMin +
          '), ' +
          xMax +
          ', ' +
          yMax +
          ')',
        'Scale: ' + scale
      );
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
