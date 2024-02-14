// emulated quadruple precision GLSL library
// created by Henry thasler (thasler.org/blog)
// based on the QD library (http://crd-legacy.lbl.gov/~dhbailey/mpdist/)

#include <cmath>
#include <iostream>

using namespace std;

// precision highp float;

struct vec2 {
  float x;
  float y;

  vec2(float x, float y) {
    this->x = x;
    this->y = y;
  }

  vec2() {
    this->x = 0.;
    this->y = 0.;
  }
};

struct vec4 {
  float x;
  float y;
  float z;
  float w;

  vec2 xy;
  vec2 zw;

  vec4(float x, float y, float z, float w) {
    this->x = x;
    this->y = y;
    this->z = z;
    this->w = w;

    this->xy = vec2(this->x, this->y);
    this->zw = vec2(this->z, this->w);
  }

  vec4(vec2 xy, float z, float w) {
    this->x = xy.x;
    this->y = xy.y;
    this->z = z;
    this->w = w;

    this->xy = vec2(this->x, this->y);
    this->zw = vec2(this->z, this->w);
  }

  vec4(vec2 xy, vec2 zw) {
    this->x = xy.x;
    this->y = xy.y;
    this->z = zw.x;
    this->w = zw.y;

    this->xy = vec2(this->x, this->y);
    this->zw = vec2(this->z, this->w);
  }

  vec4() {
    this->x = 0.;
    this->y = 0.;
    this->z = 0.;
    this->w = 0.;

    this->xy = vec2(this->x, this->y);
    this->zw = vec2(this->z, this->w);
  }

  vec4 operator-() const {
    return vec4(-x, -y, -z, -w);
  }
};

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

const int iterations = 200;
const vec2 e_radius = ds_set(4.0);

const vec2 u_width = vec2(0.0006666666595265269, 7.140139608036167e-12);
const vec2 u_height = vec2(0.0011111111380159855, -2.690487416190379e-11);
const vec4 u_complexStart = vec4(-1.875, 0.0, -1.125, 0.0);
const vec4 u_complexEnd = vec4(1.875, 0.0, 1.125, 0.0);

float emandel2(void) {
  vec2 gl_FragCoord = vec2(875.612472, 250);
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

float mandel(void) {
  vec2 c = vec2(0.31403118, -0.5);
  float zx = 0.0;
  float zy = 0.0;
  float iteration = 0.0;

  for (float i = 0.0; i < iterations; i++) {
    if ((zx * zx + zy * zy) < 4.0) {
      float xt = zx * zy;
      zx = zx * zx - zy * zy + c.x;
      zy = 2.0 * xt + c.y;
      iteration = i;
    }
  }

  return iteration;
}

int main() {
  float m = mandel(); 
  cout << "mandel Output: \n" << m << "\n" << endl;

  float n = emandel2(); 
  cout << "emandel2 Output: \n" << n << "\n" << endl;

  return 0;
//   vec4(
//     (-cos(0.025 * n) + 1.0) / 2., 
//     (-cos(0.08 * n) + 1.0) / 2., 
//     (-cos(0.12 * n) + 1.0) / 2., 
//     1.
//   );
};