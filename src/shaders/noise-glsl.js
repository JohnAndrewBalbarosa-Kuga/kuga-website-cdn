// 3D value noise, 0..1. Smooth enough for a dissolve pattern and cheap on phones.

export const VALUE_NOISE_GLSL = /* glsl */ `
  float kefHash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float kefValueNoise(vec3 p) {
    vec3 cell = floor(p);
    vec3 local = fract(p);
    vec3 blend = local * local * (3.0 - 2.0 * local);
    return mix(
      mix(
        mix(kefHash(cell + vec3(0, 0, 0)), kefHash(cell + vec3(1, 0, 0)), blend.x),
        mix(kefHash(cell + vec3(0, 1, 0)), kefHash(cell + vec3(1, 1, 0)), blend.x),
        blend.y
      ),
      mix(
        mix(kefHash(cell + vec3(0, 0, 1)), kefHash(cell + vec3(1, 0, 1)), blend.x),
        mix(kefHash(cell + vec3(0, 1, 1)), kefHash(cell + vec3(1, 1, 1)), blend.x),
        blend.y
      ),
      blend.z
    );
  }

  // Two octaves read better than one on large flat faces.
  float kefDissolveNoise(vec3 p) {
    return kefValueNoise(p) * 0.65 + kefValueNoise(p * 2.7 + 11.0) * 0.35;
  }
`;
