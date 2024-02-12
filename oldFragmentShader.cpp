#include <cmath>
#include <iostream>

using namespace std;

struct vec2 {
  float x;
  float y;

  vec2(float x, float y) : x(x), y(y) {}

  vec2() : x(0.0f), y(0.0f) {}

  vec2 operator-(const vec2& rhs) const {
    return vec2(x - rhs.x, y - rhs.y);
  }

  friend vec2 operator-(float lhs, const vec2& rhs) {
    return vec2(lhs - rhs.x, lhs - rhs.y);
  }

  friend vec2 operator-(const vec2& lhs, float rhs) {
    return vec2(lhs.x - rhs, lhs.y - rhs);
  }

  vec2 operator+(const vec2& rhs) const {
    return vec2(x + rhs.x, y + rhs.y);
  }

  vec2 operator*(float scalar) const {
    return vec2(x * scalar, y * scalar);
  }

  vec2 operator*(const vec2& rhs) const {
    return vec2(x * rhs.x, y * rhs.y);
  }

  vec2 operator/(const vec2& rhs) const {
    return vec2(x / rhs.x, y / rhs.y);
  }
};

vec2 mix(vec2 x, vec2 y, vec2 a) {
  return x * (1.0 - a) + y * a;
}

struct vec3 {
  float x;
  float y;
  float z;

  vec3(float x, float y, float z) : x(x), y(y), z(z) {}

  vec3(float i) : x(i), y(i), z(i) {}

  vec3() : x(0.0f), y(0.0f), z(0.0f) {}

  // Overload the subtraction operator -
  vec3 operator-(const vec3& rhs) const {
    return vec3(x - rhs.x, y - rhs.y, z - rhs.z);
  }

  // Overload the multiplication operator *
  vec3 operator*(float scalar) const {
    return vec3(x * scalar, y * scalar, z * scalar);
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

  vec4(float x, vec3 yzw) {
    this->x = x;
    this->y = yzw.x;
    this->z = yzw.y;
    this->w = yzw.z;

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
};

vec2 u_resolution(1500, 900);
vec4 u_complexRange(-1.875, -1.125, 1.875, 1.125);
float u_scale = 400;
int u_colorMode = 1;

const float maxIters = 20000.0;
const float invMaxIters = 1.0 / maxIters;
const float escRad = 4.0;
const float escRad2 = escRad * escRad;

float mandel(void) {
  vec2 uv = (vec2(750.0, 450.0) - (float)0.5) / u_resolution;
  vec2 c = mix(
    vec2(u_complexRange.x, u_complexRange.y),
    vec2(u_complexRange.z, u_complexRange.w),
    uv
  );

  float zx = 0.0;
  float zy = 0.0;
  float iteration = 0.0;

  for (float i = 0.0; i < maxIters; i++) {
    if ((zx * zx + zy * zy) < escRad2) {
      float xt = zx * zy;
      zx = zx * zx - zy * zy + c.x;
      zy = 2.0 * xt + c.y;
      iteration = i;
    }
  }

  return iteration;
}

void freeArray(float** arr) {
  for (int i = 0; i < 1500; ++i) {
    delete[] arr[i];
  }
  delete[] arr;
}

int main() {
  float pixel = mandel();
  // display pixel array
  // cout << pixelArray[0][0] << endl;
  cout << pixel << endl;

  // freeArray(pixelArray);

  return 0;
}
