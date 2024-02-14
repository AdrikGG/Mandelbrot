export const fragmentShaderSource = `
// GLSL Mandelbrot Shader inspired by Henry Thasler (www.thasler.org/blog)
// Double precision emulation functions written by Henry Thasler

precision highp float;

const float iterations = 2000.;
const vec2 e_radius = vec2(4.);

uniform vec2 u_width;
uniform vec2 u_height;
uniform vec4 u_complexStart; // xMin, yMin
uniform vec4 u_complexEnd;   // xMax, yMax

// Emulation based on Fortran-90 double-single package. 
// See http://crd.lbl.gov/~dhbailey/mpdist/
// Add: res = ds_add(a, b) => res = a + b
vec2 ds_add (vec2 dsa, vec2 dsb) {
  vec2 dsc;
  float t1, t2, e;

  t1 = dsa.x + dsb.x;
  e = t1 - dsa.x;
  t2 = ((dsb.x - e) + (dsa.x - (t1 - e))) + dsa.y + dsb.y;

  dsc.x = t1 + t2;
  dsc.y = t2 - (dsc.x - t1);
  return dsc;
}

// Subtract: res = ds_sub(a, b) => res = a - b
vec2 ds_sub (vec2 dsa, vec2 dsb) {
  vec2 dsc;
  float e, t1, t2;

  t1 = dsa.x - dsb.x;
  e = t1 - dsa.x;
  t2 = ((-dsb.x - e) + (dsa.x - (t1 - e))) + dsa.y - dsb.y;

  dsc.x = t1 + t2;
  dsc.y = t2 - (dsc.x - t1);
  return dsc;
}

// Compare: res = -1 if a < b
//              = 0 if a == b
//              = 1 if a > b
float ds_compare(vec2 dsa, vec2 dsb) {
  if (dsa.x < dsb.x) {
    return -1.;
  } else if (dsa.x == dsb.x) {
    if (dsa.y < dsb.y) {
      return -1.;
    } else if (dsa.y == dsb.y) {
      return 0.;
    } else {
      return 1.;
    } 
  } else {
    return 1.;
  }
}

// Multiply: res = ds_mul(a, b) => res = a * b
vec2 ds_mul (vec2 dsa, vec2 dsb) {
  vec2 dsc;
  float c11, c21, c2, e, t1, t2;
  float a1, a2, b1, b2, cona, conb, split = 8193.;

  cona = dsa.x * split;
  conb = dsb.x * split;
  a1 = cona - (cona - dsa.x);
  b1 = conb - (conb - dsb.x);
  a2 = dsa.x - a1;
  b2 = dsb.x - b1;

  c11 = dsa.x * dsb.x;
  c21 = a2 * b2 + (a2 * b1 + (a1 * b2 + (a1 * b1 - c11)));

  c2 = dsa.x * dsb.y + dsa.y * dsb.x;

  t1 = c11 + c2;
  e = t1 - c11;
  t2 = dsa.y * dsb.y + ((c2 - e) + (c11 - (t1 - e))) + c21;
  
  dsc.x = t1 + t2;
  dsc.y = t2 - (dsc.x - t1);
  
  return dsc;
}

// create double-single number from float
vec2 ds_set(float a) {
  vec2 z;
  z.x = a;
  z.y = 0.0;
  return z;
}

float emandel2(void) {
  vec2 px = ds_mul(ds_set(gl_FragCoord.x), u_width);
  vec2 py = ds_mul(ds_set(gl_FragCoord.y), u_height);

  vec2 cx = ds_add(ds_mul(px, ds_sub(u_complexEnd.xy, u_complexStart.xy)), u_complexStart.xy);
  vec2 cy = ds_add(ds_mul(py, ds_sub(u_complexEnd.zw, u_complexStart.zw)), u_complexStart.zw);

  vec2 zx = ds_set(0.0);
  vec2 zy = ds_set(0.0);
  float iteration = 0.0;

  for (float i = 0.0; i < iterations; i++) {
    if (ds_compare(ds_add(ds_mul(zx, zx), ds_mul(zy, zy)), e_radius) < 0.0) {
      vec2 xt = ds_mul(zx, zy);
      zx = ds_add(ds_sub(ds_mul(zx, zx), ds_mul(zy, zy)), cx);
      zy = ds_add(ds_mul(ds_set(2.0), xt), cy);
      iteration = i;
    }
  }

  return iteration;
}

void main() {
  float iteration = emandel2();

  if (iteration == iterations) {
    gl_FragColor = vec4(100.0, 0.0, 0.0, 1.0);  // Set color for points outside the Mandelbrot set
  } else {
    float normalizedIteration = iteration / iterations;
  
    gl_FragColor = vec4(normalizedIteration, normalizedIteration, normalizedIteration, 1.0);
  }
}
`;
