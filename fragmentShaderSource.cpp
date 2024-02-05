      precision highp float;

      uniform vec2 u_resolution;
      uniform vec4 u_complexRange;
      uniform float u_scale;
      uniform int u_colorMode;
      
      const float maxIters = 20000.;
      const float invMaxIters = 1. / maxIters;
      const float escRad = 2.;
      const float escRad2 = escRad * escRad;
      
      vec2 addDouble(vec2 a, vec2 b) {
          vec2 result;
          result.x = a.x + b.x;
          result.y = a.y + b.y;
      
          // Handle carry from low to high if necessary
          result.y += step(0.0, result.x - a.x) * 1.0;
      
          return result;
      }
      
      vec2 subtractDouble(vec2 a, vec2 b) {
          vec2 result;
          result.x = a.x - b.x;
          result.y = a.y - b.y;
      
          // Handle borrow from high to low if necessary
          result.y -= step(a.x, b.x) * 1.0;
      
          return result;
      }
      
      vec2 multiplyDouble(vec2 a, vec2 b) {
          vec2 result;
          result.x = a.x * b.x;
          result.y = (a.x * b.y) + (a.y * b.x) + (a.y * b.y);
      
          // Handle overflow and underflow
          result.y += step(0.0, result.x) * 1.0;
      
          return result;
      }
      
      vec2 toDouble(float value) {
          return vec2(value, 0.0);
      }
      
      float toFloat(vec2 doubleValue) {
          return doubleValue.x + doubleValue.y;
      }
      
      void main() {
          vec2 uv = (gl_FragCoord.xy - 0.5) / u_resolution;
          vec2 c = mix(
              vec2(u_complexRange.x, u_complexRange.y),
              vec2(u_complexRange.z, u_complexRange.w),
              uv
          );
      
          vec2 zx = vec2(0.0, 0.0);
          vec2 zy = vec2(0.0, 0.0);
          float iteration = 0.0;
      
          for (float i = 0.; i < maxIters; i++) {
              vec2 zxSquared = multiplyDouble(zx, zx);
              vec2 zySquared = multiplyDouble(zy, zy);
              vec2 condition = addDouble(zxSquared, zySquared);

              if (toFloat(condition) < escRad2) {
                  vec2 xt = multiplyDouble(zx, zy);
                  zx = addDouble(subtractDouble(zxSquared, zySquared), toDouble(c.x));
                  zy = addDouble(multiplyDouble(toDouble(2.0), xt), toDouble(c.y));
                  iteration = i;
              }
          }
      
          float colorValue = -1. / (0.05 * iteration + 1.) + 1.;
          gl_FragColor = vec4(vec3(colorValue), 1.0);
      }