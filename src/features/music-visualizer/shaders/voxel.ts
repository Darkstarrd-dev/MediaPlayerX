import type { MusicVisualizerShaderDefinition } from '../types'

export const SHADER: MusicVisualizerShaderDefinition = {
  id: 'voxel',
  label: 'Voxel',
  renderScale: 0.7,
  fragmentSource: String.raw`mat2 r2d(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, s, -s, c);
}

vec2 path(float t) {
  float a = sin(t * 0.2 + 1.5);
  float b = sin(t * 0.2);
  return vec2(2.0 * a, a * b);
}

float hash13(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
}

float audioBand(float normalizedBin) {
  return texture(iChannel0, vec2(clamp(normalizedBin, 0.001, 0.999), 0.25)).r;
}

float waveformBand(float normalizedBin) {
  return texture(iChannel0, vec2(clamp(normalizedBin, 0.001, 0.999), 0.75)).r;
}

float gTunnel = 0.0;
float gCore = 0.0;
vec4 gBands = vec4(0.0);
float gTransient = 0.0;
float gMatrixLevel = 2.0;
float gCoreHit = 0.0;
vec2 gCoreCell = vec2(0.0);
float gCoreLayer = 0.0;

const int DDA_MAX_STEPS = 64;

vec3 coreLocalSpace(vec3 p) {
  float worldZ = p.z;
  vec3 q = p;
  q.xy -= path(worldZ);
  q.xy += vec2(cos(worldZ + iTime) * sin(iTime), cos(worldZ + iTime));
  q.z = worldZ - (6.0 + iTime * 6.0);
  return q;
}

float coreMatrixMask(vec3 p, out vec2 cellIndex, out float layerIndex) {
  vec3 q = coreLocalSpace(p);
  cellIndex = floor(q.xy + 0.5);
  float zCell = floor(q.z + 0.5);
  layerIndex = zCell;

  float halfSpan = gMatrixLevel * 0.5;
  bool insideX = cellIndex.x >= -halfSpan && cellIndex.x < halfSpan;
  bool insideY = cellIndex.y >= -halfSpan && cellIndex.y < halfSpan;
  bool insideZ = abs(zCell) <= 0.0;

  float occupancy = (insideX && insideY && insideZ) ? 1.0 : 0.0;

  // 高频越高，缺块概率越高，保留“随机缺少几块”的体素矩阵质感。
  float dropThreshold = mix(0.24, 0.52, clamp(gBands.z * 1.5 + gTransient * 0.45, 0.0, 1.0));
  float keep = step(dropThreshold, hash13(vec3(cellIndex, layerIndex)));
  // 保留核心锚点，避免低能量时 1x1 团块完全消失。
  if (abs(cellIndex.x) < 0.1 && abs(cellIndex.y) < 0.1 && abs(zCell) < 0.1) {
    keep = 1.0;
  }

  return occupancy * keep;
}

float de(vec3 p) {
  gCoreHit = 0.0;

  vec3 tunnelP = p;
  tunnelP.xy -= path(tunnelP.z);

  // 隧道（反向圆柱）。
  float d = -length(tunnelP.xy) + 4.0;

  vec3 octaP = tunnelP;
  octaP.xy += vec2(cos(octaP.z + iTime) * sin(iTime), cos(octaP.z + iTime));
  octaP.z -= 6.0 + iTime * 6.0;
  float octa = dot(octaP, normalize(sign(octaP))) - 1.0;
  d = min(d, octa);

  // 隧道整体亮度保持稳定，不受 blob 过曝拖累。
  float tunnelGlow = 0.012 / (0.02 + d * d);
  tunnelGlow *= 0.75 + gBands.y * 0.9 + gBands.z * 0.5;
  gTunnel += tunnelGlow;

  // 中心矩阵体素簇：数量由音乐驱动（2x2 / 3x3 / 4x4），方块大小保持 1 个 voxel。
  vec2 coreCell = vec2(0.0);
  float coreLayer = 0.0;
  float coreMask = coreMatrixMask(p, coreCell, coreLayer);
  if (coreMask > 0.5) {
    float coreVoxelDistance = -0.35;
    if (coreVoxelDistance < d) {
      d = coreVoxelDistance;
      gCoreHit = 1.0;
      gCoreCell = coreCell;
      gCoreLayer = coreLayer;

      // blob 发光单独积分，后续单独限幅，不影响隧道亮度。
      gCore += 0.010 / (0.04 + coreVoxelDistance * coreVoxelDistance);
    }
  }

  return d;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy - 0.5;
  uv.x *= iResolution.x / iResolution.y;

  // 音频分频：低频控制矩阵级别，中频控制照亮强度，高频控制颜色变换与缺块率。
  float low = pow(audioBand(0.04), 1.05);
  float mid = pow(audioBand(0.16), 1.10);
  float high = pow(audioBand(0.34), 1.12);
  float presence = pow(audioBand(0.52), 1.06);
  gBands = vec4(low, mid, high, presence);

  float waveCenter = waveformBand(0.50);
  gTransient = abs(waveCenter - 0.5) * 2.0;

  // 目标：保持方块尺寸不变，仅增减矩阵数量（1x1 -> 4x4）。
  float matrixDrive = low * 4.5 + mid * 1.4 + gTransient * 2.2;
  gMatrixLevel = 1.0 + floor(clamp(matrixDrive, 0.0, 3.0));

  gTunnel = 0.0;
  gCore = 0.0;

  float dt = iTime * 6.0;
  vec3 ro = vec3(0.0, 0.0, -5.0 + dt);
  vec3 ta = vec3(0.0, 0.0, dt);

  ro.xy += path(ro.z);
  ta.xy += path(ta.z);

  vec3 fwd = normalize(ta - ro);
  vec3 right = cross(fwd, vec3(0.0, 1.0, 0.0));
  vec3 up = cross(right, fwd);
  vec3 rd = normalize(fwd + uv.x * right + uv.y * up);

  rd.xy *= r2d(sin(-ro.x / 3.14) * 0.3);

  vec3 p = floor(ro) + 0.5;
  vec3 mask = vec3(0.0);
  vec3 drd = 1.0 / abs(rd);
  rd = sign(rd);
  vec3 side = drd * (rd * (p - ro) + 0.5);

  float t = 0.0;
  for (int rayStep = 0; rayStep < DDA_MAX_STEPS; rayStep += 1) {
    if (de(p) < 0.0) {
      break;
    }

    mask = step(side, side.yzx) * step(side, side.zxy);
    side += drd * mask;
    p += rd * mask;
  }
  t = length(p - ro);

  vec3 c = vec3(1.0) * length(mask * vec3(1.0, 0.5, 0.75));
  c = mix(vec3(0.2, 0.2, 0.7), vec3(0.2, 0.1, 0.2), c);

  float ringGain = 0.7 + gBands.y * 1.6;
  c.r += sin(iTime) * 0.2 + sin(p.z * 0.5 - iTime * 6.0) * ringGain;

  // 中心体素簇颜色：按节奏与时间离散跳变，形成“随机换色”观感。
  if (gCoreHit > 0.5) {
    float colorStep = floor(iTime * (2.0 + gBands.z * 14.0 + gTransient * 6.0));
    float colorSeed = hash13(vec3(gCoreCell, gCoreLayer + colorStep));

    vec3 coreColorA = vec3(0.10, 0.72, 1.00);
    vec3 coreColorB = vec3(1.00, 0.22, 0.68);
    vec3 coreColorC = vec3(0.82, 0.92, 1.00);
    vec3 coreColor = mix(coreColorA, coreColorB, colorSeed);
    coreColor = mix(coreColor, coreColorC, clamp(gBands.z * 0.65 + gTransient * 0.25, 0.0, 1.0));

    float coreGlow = 0.45 + gBands.x * 1.25 + gBands.y * 1.90 + gBands.z * 1.15 + gTransient * 0.95;
    vec3 coreEmission = coreColor * coreGlow * (0.42 + gCore * 0.95);

    // 仅对 blob 发光做软限幅，避免纯白，同时保持高饱和色彩。
    coreEmission = coreEmission / (1.0 + coreEmission * 0.55);

    c = mix(c, coreColor, 0.42 + gBands.z * 0.22);
    c += coreEmission;
  }

  // 照亮周边隧道：由中频/高频控制整体泛光强度。
  float ambientGlow = 0.18 + gBands.y * 0.95 + gBands.z * 0.45;
  c += vec3(0.22, 0.46, 0.82) * gTunnel * ambientGlow;

  float fogDensity = 0.001 + gBands.x * 0.0015;
  c = mix(c, vec3(0.2, 0.1, 0.2), 1.0 - exp(-fogDensity * t * t));

  fragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
`,
}
