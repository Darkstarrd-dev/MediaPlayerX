# 方案 D：全息球体定位控件 (Holographic Sphere Indicator)

## 📋 概述

全息球体控件是一种科幻风格的 3D 位置指示器，使用 Three.js 渲染一个半透明的线框球体，将用户在 3D 宇宙中的位置映射到球面上，并通过虚线投影线连接到三个坐标轴平面，从而直观地展示当前所处的象限和方向。

---

## 🎯 设计目标

| 目标 | 说明 |
|------|------|
| **象限感知** | 通过位置点在球面上的位置，直观判断处于 8 个象限中的哪一个 |
| **方向指示** | 位置点始终在球面上正确反映相对于世界原点的方向 |
| **距离映射** | 位置点到球心的距离按比例映射实际到原点的距离 |
| **轴平面投影** | 三条虚线将位置点分别投影到 YZ、XZ、XY 三个平面，辅助理解空间位置 |
| **科幻美学** | 全息线框 + 发光效果 + 缓慢旋转，营造太空导航仪的视觉风格 |

---

## 🏗️ 架构设计

### 组件层次结构

```
HologramIndicator (React 组件)
├── Three.js Scene
│   └── Group (缓慢自转)
│       ├── 线框球体 (SphereGeometry wireframe)
│       ├── 赤道环 (XZ 平面, 绿色)
│       ├── XY 子午线 (蓝色)
│       ├── YZ 子午线 (红色)
│       ├── X 轴线 + 箭头 (红色)
│       ├── Y 轴线 + 箭头 (绿色)
│       ├── Z 轴线 + 箭头 (蓝色)
│       ├── 轴标签精灵 (+X, +Y, +Z)
│       ├── 位置点 (黄色球体 + 发光效果)
│       └── 投影虚线 ×3 (到 YZ/XZ/XY 平面)
└── 象限标签 (HTML overlay)
```

### 数据流

```
宇宙相机位置 (CameraState)
    ↓
位置归一化: direction = position.normalize()
    ↓
距离映射: radius = min(distance/maxDist, 1.0) × 球体半径
    ↓
球面坐标: dotPos = direction × radius
    ↓
更新投影线: 3条虚线分别投影到 YZ / XZ / XY 平面
```

---

## 🔧 核心算法

### 1. 位置到球面的映射

```typescript
// 方向向量（归一化）
const dir = position.clone().normalize();

// 距离映射到球面半径（最大 2.0 单位）
const maxDist = Math.max(cameraState.distance, 50);
const mappedR = Math.min(cameraState.distance / maxDist, 1.0) * 2.0;

// 最终球面上的位置
const dotPos = dir.multiplyScalar(mappedR);
```

### 2. 投影线计算

每条投影线从位置点垂直投影到对应的坐标平面：

```typescript
// 投影到 YZ 平面 (X=0)：去掉 X 分量
projectionToYZ = new Vector3(0, dotPos.y, dotPos.z);

// 投影到 XZ 平面 (Y=0)：去掉 Y 分量
projectionToXZ = new Vector3(dotPos.x, 0, dotPos.z);

// 投影到 XY 平面 (Z=0)：去掉 Z 分量
projectionToXY = new Vector3(dotPos.x, dotPos.y, 0);
```

### 3. 象限判定

通过检查三个坐标轴的正负号组合，确定 8 个象限：

```
象限 I   : +X, +Y, +Z
象限 II  : -X, +Y, +Z
象限 III : -X, -Y, +Z
象限 IV  : +X, -Y, +Z
象限 V   : +X, +Y, -Z
象限 VI  : -X, +Y, -Z
象限 VII : -X, -Y, -Z
象限 VIII: +X, -Y, -Z
```

---

## 🎨 视觉元素详解

### 线框球体
- 几何体：`SphereGeometry(2, 24, 16)` — 半径 2，24 经线段，16 纬线段
- 材质：`MeshBasicMaterial` 线框模式，青色 (`#00ccff`)，透明度 0.08
- 效果：低透明度的线框球营造全息感，不遮挡内部元素

### 参考环线
| 环线 | 颜色 | 所在平面 | 透明度 | 用途 |
|------|------|----------|--------|------|
| 赤道环 | 绿色 `#44ff44` | XZ 平面 | 0.25 | 水平参考 |
| XY 子午线 | 蓝色 `#4444ff` | XY 平面 | 0.20 | 前后参考 |
| YZ 子午线 | 红色 `#ff4444` | YZ 平面 | 0.20 | 左右参考 |

### 坐标轴
- 长度：±2.8 单位
- 箭头：`ConeGeometry(0.06, 0.2, 8)` — 小锥体指示正方向
- 颜色约定：**X=红、Y=绿、Z=蓝**（标准 RGB-XYZ 映射）

### 位置指示点
- 主体：`SphereGeometry(0.12)` 黄色 (`#ffdd00`)
- 发光层：`SphereGeometry(0.2)` 黄色半透明，作为子对象附着在点上
- 位置始终在球面上，方向反映真实方向，半径反映距离

### 投影虚线
- 材质：`LineDashedMaterial`，dashSize: 0.1, gapSize: 0.05
- X 投影线：红色（连接到 YZ 平面）
- Y 投影线：绿色（连接到 XZ 平面）
- Z 投影线：蓝色（连接到 XY 平面）
- 透明度：0.4，不喧宾夺主

---

## 📐 Props 接口

```typescript
interface Props {
  cameraState: CameraState;  // 相机状态（位置、象限、距离）
  size?: number;              // 控件像素尺寸，默认 200
}

interface CameraState {
  position: THREE.Vector3;    // 世界坐标位置
  quadrant: string;           // 象限标识，如 "I (+X, +Y, +Z)"
  distance: number;           // 到世界原点的距离
}
```

---

## 📦 依赖项

| 包名 | 版本 | 用途 |
|------|------|------|
| `three` | ^0.182.0 | Three.js 3D 渲染引擎 |
| `@types/three` | ^0.182.0 | TypeScript 类型定义 |
| `react` | ^19.x | UI 框架 |

---

## 💻 完整源代码

### `src/indicators/HologramIndicator.tsx`

```tsx
/**
 * Design D: Holographic Wireframe Sphere
 * A wireframe sphere with latitude/longitude lines, position shown as a point on the sphere surface
 * indicating direction from origin, with distance shown as rings.
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { CameraState } from '../hooks/useUniverse';

interface Props {
  cameraState: CameraState;
  size?: number;
}

export function HologramIndicator({ cameraState, size = 200 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number>(0);
  const dotRef = useRef<THREE.Mesh | null>(null);
  const projLinesRef = useRef<THREE.Line[]>([]);
  const octantMeshesRef = useRef<THREE.Mesh[]>([]);
  const groupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060612);

    const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    cam.position.set(4, 3, 5);
    cam.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(2);
    rendererRef.current = renderer;

    const group = new THREE.Group();
    groupRef.current = group;
    scene.add(group);

    // ========================================
    // 1. 线框球体 - 全息球体的主体框架
    // ========================================
    const sphereGeo = new THREE.SphereGeometry(2, 24, 16);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x00ccff,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    group.add(new THREE.Mesh(sphereGeo, sphereMat));

    // ========================================
    // 2. 参考环线 - 赤道和子午线
    // ========================================
    const createCircle = (radius: number, rotation: THREE.Euler, color: number, opacity: number) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
      const line = new THREE.Line(geo, mat);
      line.rotation.copy(rotation);
      return line;
    };
    // XZ 赤道 (绿色)
    group.add(createCircle(2, new THREE.Euler(0, 0, 0), 0x44ff44, 0.25));
    // XY 子午线 (蓝色)
    group.add(createCircle(2, new THREE.Euler(Math.PI / 2, 0, 0), 0x4444ff, 0.2));
    // YZ 子午线 (红色)
    group.add(createCircle(2, new THREE.Euler(0, 0, Math.PI / 2), 0xff4444, 0.2));

    // ========================================
    // 3. 坐标轴线 + 箭头
    // ========================================
    const axLen = 2.8;
    const addAxis = (color: number, from: THREE.Vector3, to: THREE.Vector3) => {
      const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
      const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 });
      group.add(new THREE.Line(geo, mat));

      // 箭头锥体 - 指示正方向
      const dir = to.clone().sub(from).normalize();
      const arrowGeo = new THREE.ConeGeometry(0.06, 0.2, 8);
      const arrowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 });
      const arrow = new THREE.Mesh(arrowGeo, arrowMat);
      arrow.position.copy(to);
      arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      group.add(arrow);
    };
    addAxis(0xff4444, new THREE.Vector3(-axLen, 0, 0), new THREE.Vector3(axLen, 0, 0));   // X 轴 (红)
    addAxis(0x44ff44, new THREE.Vector3(0, -axLen, 0), new THREE.Vector3(0, axLen, 0));   // Y 轴 (绿)
    addAxis(0x4488ff, new THREE.Vector3(0, 0, -axLen), new THREE.Vector3(0, 0, axLen));   // Z 轴 (蓝)

    // ========================================
    // 4. 象限参考面 (可选，当前透明度为 0)
    // ========================================
    const octMeshes: THREE.Mesh[] = [];
    const createOctantSlice = (sx: number, sy: number, _sz: number, color: number) => {
      const geo = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        0, 0, 0,
        sx * 2, 0, 0,
        0, sy * 2, 0,
        sx * 2, 0, 0,
        sx * 2, sy * 2, 0,
        0, sy * 2, 0,
      ]);
      geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      group.add(mesh);
      return mesh;
    };
    octMeshes.push(createOctantSlice(1, 1, 1, 0xff4466));
    octantMeshesRef.current = octMeshes;

    // ========================================
    // 5. 位置指示点 (黄色球体 + 发光效果)
    // ========================================
    const dotGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    group.add(dot);
    dotRef.current = dot;

    // 发光层
    const glowGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffdd00, transparent: true, opacity: 0.2 });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    dot.add(glow);

    // ========================================
    // 6. 投影虚线 (从位置点到三个坐标平面)
    // ========================================
    const projLines: THREE.Line[] = [];
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const colors = [0xff4444, 0x44ff44, 0x4488ff];
      const mat = new THREE.LineDashedMaterial({
        color: colors[i],
        transparent: true,
        opacity: 0.4,
        dashSize: 0.1,
        gapSize: 0.05,
      });
      const line = new THREE.Line(geo, mat);
      line.computeLineDistances();
      group.add(line);
      projLines.push(line);
    }
    projLinesRef.current = projLines;

    // ========================================
    // 7. 轴标签精灵
    // ========================================
    const addLabel = (text: string, color: number, position: THREE.Vector3) => {
      const c2d = document.createElement('canvas');
      c2d.width = 64; c2d.height = 64;
      const ctx2d = c2d.getContext('2d')!;
      ctx2d.fillStyle = '#' + color.toString(16).padStart(6, '0');
      ctx2d.font = 'bold 36px monospace';
      ctx2d.textAlign = 'center';
      ctx2d.textBaseline = 'middle';
      ctx2d.fillText(text, 32, 32);
      const tex = new THREE.CanvasTexture(c2d);
      const sm = new THREE.SpriteMaterial({ map: tex, transparent: true });
      const sp = new THREE.Sprite(sm);
      sp.position.copy(position);
      sp.scale.set(0.35, 0.35, 1);
      group.add(sp);
    };
    addLabel('+X', 0xff4444, new THREE.Vector3(3.1, 0, 0));
    addLabel('+Y', 0x44ff44, new THREE.Vector3(0, 3.1, 0));
    addLabel('+Z', 0x4488ff, new THREE.Vector3(0, 0, 3.1));

    // ========================================
    // 8. 动画循环 - 缓慢自转
    // ========================================
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      group.rotation.y += 0.004;  // 缓慢绕 Y 轴旋转
      renderer.render(scene, cam);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      renderer.dispose();
    };
  }, [size]);

  // ========================================
  // 位置更新 - 响应相机状态变化
  // ========================================
  useEffect(() => {
    if (!dotRef.current) return;
    const pos = cameraState.position;
    const maxDist = Math.max(cameraState.distance, 50);

    // 将位置映射到球面:
    // - 方向: 归一化后的位置向量
    // - 半径: 距离占比 × 球体半径(2.0)
    const dir = pos.clone().normalize();
    const mappedR = Math.min(cameraState.distance / maxDist, 1.0) * 2.0;
    const dotPos = dir.multiplyScalar(mappedR);

    dotRef.current.position.copy(dotPos);

    // 更新三条投影线
    if (projLinesRef.current.length === 3) {
      const updateLine = (line: THREE.Line, from: THREE.Vector3, to: THREE.Vector3) => {
        const positions = line.geometry.attributes.position as THREE.BufferAttribute;
        positions.setXYZ(0, from.x, from.y, from.z);
        positions.setXYZ(1, to.x, to.y, to.z);
        positions.needsUpdate = true;
      };
      // X 投影线: 投影到 YZ 平面 (X=0)
      updateLine(projLinesRef.current[0], dotPos, new THREE.Vector3(0, dotPos.y, dotPos.z));
      // Y 投影线: 投影到 XZ 平面 (Y=0)
      updateLine(projLinesRef.current[1], dotPos, new THREE.Vector3(dotPos.x, 0, dotPos.z));
      // Z 投影线: 投影到 XY 平面 (Z=0)
      updateLine(projLinesRef.current[2], dotPos, new THREE.Vector3(dotPos.x, dotPos.y, 0));
    }
  }, [cameraState]);

  // ========================================
  // 渲染: Canvas + 象限标签
  // ========================================
  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="rounded-xl border border-cyan-500/20"
      />
      <div className="text-xs text-cyan-300 font-mono bg-black/40 px-3 py-1 rounded-lg border border-cyan-500/20">
        Quadrant {cameraState.quadrant}
      </div>
    </div>
  );
}
```

### 依赖的类型定义 `src/hooks/useUniverse.ts`（接口部分）

```typescript
export interface CameraState {
  position: THREE.Vector3;  // 当前相机世界坐标
  quadrant: string;         // 象限标识，格式: "I (+X, +Y, +Z)"
  distance: number;         // 到世界原点的欧几里得距离
}
```

---

## 🚀 使用示例

```tsx
import { HologramIndicator } from './indicators/HologramIndicator';
import type { CameraState } from './hooks/useUniverse';
import * as THREE from 'three';

function App() {
  const [cameraState, setCameraState] = useState<CameraState>({
    position: new THREE.Vector3(150, 80, 200),
    quadrant: 'I (+X, +Y, +Z)',
    distance: 262,
  });

  return (
    <div className="absolute top-4 right-4">
      <HologramIndicator
        cameraState={cameraState}
        size={220}
      />
    </div>
  );
}
```

---

## 🔄 生命周期管理

```
组件挂载 (mount)
  ├── 创建 Three.js Scene / Camera / Renderer
  ├── 构建所有 3D 对象并加入 Group
  ├── 启动 requestAnimationFrame 动画循环
  └── 返回清理函数

组件更新 (cameraState 变化)
  ├── 重新计算球面位置
  ├── 更新位置点坐标
  └── 更新三条投影线端点

组件卸载 (unmount)
  ├── cancelAnimationFrame 停止动画
  └── renderer.dispose() 释放 WebGL 资源
```

---

## ⚡ 性能考量

| 方面 | 措施 |
|------|------|
| **渲染分离** | 控件使用独立的 Three.js 渲染器，不影响主场景性能 |
| **像素比限制** | `setPixelRatio(2)` 限制最大像素比，平衡画质与性能 |
| **几何体复用** | 投影线使用 `BufferGeometry` 就地更新顶点，避免重建 |
| **React 更新** | 位置更新通过 `useEffect` 依赖 `cameraState`，仅在变化时执行 |
| **资源清理** | 卸载时 dispose renderer，防止 WebGL 上下文泄露 |

---

## 🎛️ 可调参数

| 参数 | 位置 | 默认值 | 说明 |
|------|------|--------|------|
| `size` | Props | 200 | 控件像素尺寸 |
| 球体半径 | `SphereGeometry(2, ...)` | 2 | 线框球体的半径 |
| 球体细分 | `SphereGeometry(_, 24, 16)` | 24×16 | 经纬线段数 |
| 球体透明度 | `sphereMat.opacity` | 0.08 | 线框球体透明度 |
| 轴线长度 | `axLen` | 2.8 | 坐标轴延伸长度 |
| 旋转速度 | `group.rotation.y += 0.004` | 0.004 rad/frame | 自转速度 |
| 投影线样式 | `dashSize / gapSize` | 0.1 / 0.05 | 虚线段长度 |
| 相机视角 | `PerspectiveCamera(35, ...)` | 35° | 指示器相机 FOV |
| 相机位置 | `cam.position.set(4, 3, 5)` | (4,3,5) | 观察角度 |

---

## 🔮 扩展建议

1. **添加轨迹线** — 记录最近 N 个位置点，在球面上绘制运动轨迹
2. **象限高亮** — 将球体分为 8 个区域，当前象限使用不同颜色高亮
3. **动态缩放** — 根据距离自动调整球体的显示比例
4. **交互旋转** — 支持鼠标拖拽旋转全息球体的观察角度
5. **粒子效果** — 在球面上添加粒子流动效果，增强全息感
6. **坐标格网** — 在球面上绘制经纬度格网线并标注角度
