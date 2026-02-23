import React, { useState } from "react";
import {
  Folder,
  Disc,
  HardDrive,
  FileText,
  ChevronDown,
  ChevronRight,
  Layout,
  Settings,
  Sliders,
  Palette,
  Zap,
  Layers,
  Box,
  Shield,
  Code,
  Copy,
  Check,
} from "lucide-react";

// --- Types & Constants ---

type ColorPreset = "champagne" | "iceTitanium" | "roseGold" | "blackGold";
type TexturePreset = "mirror" | "brushed" | "molten";
type HighlightPreset =
  | "flow"
  | "shimmer"
  | "pulse"
  | "asymmetric_flow"
  | "asymmetric_shimmer"
  | "asymmetric_breathe";
type ProfilePreset = "flat" | "convex" | "ridge";

const COLOR_MAP: Record<ColorPreset, string> = {
  champagne:
    "linear-gradient(90deg, #8C6A28, #F3E5AB, #C5A059, #F3E5AB, #8C6A28)",
  iceTitanium:
    "linear-gradient(90deg, #4B5563, #6B7280, #E5E7EB, #6B7280, #4B5563)",
  roseGold:
    "linear-gradient(90deg, #B76E79, #FFD1DC, #E6A8B5, #FFD1DC, #B76E79)",
  blackGold:
    "linear-gradient(90deg, #000000, #444444, #D4AF37, #444444, #000000)",
};

// --- Dynamic Styles Generator ---
const getDynamicStyles = (
  borderWidth: number,
  colorGradient: string,
  animName: HighlightPreset,
  profile: ProfilePreset,
  isDarkMode: boolean,
) => {
  // 1. Profile Shadows Logic (3D Shape)
  let innerShadow = "";
  let dropShadow = "";

  const highlightColor = isDarkMode
    ? "rgba(255,255,255,0.15)"
    : "rgba(255,255,255,0.8)";
  const shadowColor = isDarkMode ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.2)";

  if (profile === "flat") {
    dropShadow = `0 0 0 1px ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}`;
  } else if (profile === "convex") {
    // Round tube look
    innerShadow = `inset 1px 1px 2px ${highlightColor}, inset -1px -1px 2px ${shadowColor}`;
    dropShadow = "0 4px 6px rgba(0,0,0,0.1)";
  } else if (profile === "ridge") {
    // Sharp triangle look
    innerShadow = `inset 0 0 0 ${borderWidth / 3}px ${shadowColor}`;
    dropShadow = "0 2px 4px rgba(0,0,0,0.15)";
  }

  // 2. Rendering Logic Switch
  const isAsymmetric = animName.startsWith("asymmetric");

  // Animation speeds
  let animSpeed = "4s";
  if (animName.includes("shimmer")) animSpeed = "1.5s";
  if (animName.includes("breathe")) animSpeed = "5s";

  const contentBg = isDarkMode ? "#1e1e1e" : "#ffffff";

  // A. LIQUID FLOW (Linear Gradient)
  const liquidCSS = `
    .liquid-metal-base {
      position: relative;
      /* Use border for Liquid Mode as it relies on background-clip logic */
      border: ${borderWidth}px solid transparent;
      border-radius: 9999px;
      background-clip: padding-box, border-box;
      background-origin: padding-box, border-box;
      background-image: linear-gradient(to right, ${contentBg}, ${contentBg}), ${colorGradient};
      background-size: 200% 100%;
      box-shadow: ${dropShadow};
    }
    /* Profile Overlay for Liquid Mode */
    .liquid-metal-base::after {
      content: "";
      position: absolute;
      inset: -${borderWidth}px;
      border-radius: inherit;
      box-shadow: ${innerShadow};
      pointer-events: none;
      z-index: 10;
      border: ${borderWidth}px solid transparent;
    }
  `;

  // B. ASYMMETRIC ROTATION (Conic Gradient) - REVISED FIX
  const isTitanium = colorGradient.includes("4B5563");
  const isRose = colorGradient.includes("B76E79");
  const isBlack = colorGradient.includes("000000");

  let conicColors = "";
  if (isTitanium) {
    conicColors =
      "transparent 0%, transparent 60%, #6B7280 70%, #FFFFFF 85%, #6B7280 95%, transparent 100%";
  } else if (isRose) {
    conicColors =
      "transparent 0%, transparent 60%, #B76E79 70%, #FFD1DC 85%, #B76E79 95%, transparent 100%";
  } else if (isBlack) {
    conicColors =
      "transparent 0%, transparent 60%, #333 70%, #D4AF37 85%, #333 95%, transparent 100%";
  } else {
    // Champagne
    conicColors =
      "transparent 0%, transparent 60%, #C5A059 70%, #F3E5AB 85%, #C5A059 95%, transparent 100%";
  }

  // Animation Keyframes
  let animationDef = `animation: spin-asymmetric ${animSpeed} linear infinite;`;
  if (animName.includes("shimmer")) {
    animationDef = `animation: spin-asymmetric ${animSpeed} cubic-bezier(0.4, 0, 0.2, 1) infinite, pulse-opacity ${animSpeed} ease-in-out infinite;`;
  }
  if (animName.includes("breathe")) {
    animationDef = `animation: spin-asymmetric ${animSpeed} linear infinite, breathe-scale ${animSpeed} ease-in-out infinite;`;
  }

  const asymmetricCSS = `
    .liquid-metal-base {
      position: relative;
      border-radius: 9999px;
      /* FIX: Use padding instead of border to ensure overflow:hidden includes the ring area */
      padding: ${borderWidth}px;
      /* No border on parent */
      border: none;

      background: transparent;
      z-index: 0; /* Stacking context */
      box-shadow: ${dropShadow};
      overflow: hidden; /* Clips the rotating square to the pill shape (padding box) */
    }

    /* 1. The Spinning Gradient (Bottom Layer) */
    .liquid-metal-base::before {
      content: "";
      position: absolute;
      /* Large enough to cover rotation */
      inset: -150%;
      z-index: -2;
      background: conic-gradient(from 0deg, ${conicColors});
      ${animationDef}
    }

    /* 2. The Inner Mask (Middle Layer) */
    /* Mimics the "Content Box" background */
    .liquid-metal-base::after {
      content: "";
      position: absolute;
      inset: 0; /* Fills the whole container (including padding) */
      z-index: -1;
      border-radius: inherit;

      /* THE TRICK: */
      /* Use a transparent border equal to the padding width */
      border: ${borderWidth}px solid transparent;

      /* Paint background only in the content box (center) */
      background: ${contentBg};
      background-clip: content-box;

      /* Add the 3D profile shadow here inside the content area if needed */
      /* Or apply it via shadow on this element */
      box-shadow: ${innerShadow};
    }
  `;

  // Decide which CSS to return
  const baseCSS = isAsymmetric ? asymmetricCSS : liquidCSS;

  return `
    @keyframes liquid-flow {
      0% { background-position: 0% 50%; }
      100% { background-position: 200% 50%; }
    }
    @keyframes shimmer-pulse {
      0% { background-position: 0% 50%; filter: brightness(1); }
      50% { background-position: 100% 50%; filter: brightness(1.2); }
      100% { background-position: 0% 50%; filter: brightness(1); }
    }

    @keyframes spin-asymmetric {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes pulse-opacity {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    @keyframes breathe-scale {
      0%, 100% { filter: brightness(1); }
      50% { filter: brightness(0.7); }
    }

    ${baseCSS}

    .anim-flow { animation: liquid-flow ${animSpeed} linear infinite; }
    .anim-shimmer { animation: shimmer-pulse ${animSpeed} ease-in-out infinite; }
    .anim-pulse { animation: liquid-flow ${animSpeed} ease infinite; }

    .liquid-metal-panel {
      border-radius: 24px;
    }
  `;
};

// --- Display Code Generator (For Copy/Paste) ---
const generateDisplayCode = (
  borderWidth: number,
  colorGradient: string,
  animName: HighlightPreset,
  profile: ProfilePreset,
  isDarkMode: boolean,
) => {
  const isAsymmetric = animName.startsWith("asymmetric");
  const styleRaw = getDynamicStyles(
    borderWidth,
    colorGradient,
    animName,
    profile,
    isDarkMode,
  );

  // Format for display
  return `/* Focus Ring Style: ${isAsymmetric ? "Asymmetric Spin (Conic)" : "Liquid Flow (Linear)"}
  Profile: ${profile}
  Dark Mode: ${isDarkMode}
*/

${styleRaw.replace(/^\s+/gm, "").trim()}
`;
};

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showCode, setShowCode] = useState(false); // New state for code view
  const [borderWidth, setBorderWidth] = useState<number>(3);
  const [activeColor, setActiveColor] = useState<ColorPreset>("champagne");
  const [activeTexture, setActiveTexture] = useState<TexturePreset>("mirror");
  const [activeHighlight, setActiveHighlight] =
    useState<HighlightPreset>("asymmetric_flow");
  const [activeProfile, setActiveProfile] = useState<ProfilePreset>("convex");
  const [copied, setCopied] = useState(false);

  const getAnimClass = () =>
    activeHighlight.startsWith("asymmetric")
      ? ""
      : `anim-${activeHighlight.replace("liquid_", "")}`;
  const currentGradient = COLOR_MAP[activeColor];

  // Helper speed label
  let speedLabel = "4s";
  if (activeHighlight.includes("shimmer")) speedLabel = "1.5s";
  if (activeHighlight.includes("breathe")) speedLabel = "5s";

  const bgClass = isDarkMode
    ? "bg-[#09090b] text-gray-200"
    : "bg-[#F0F2F5] text-gray-700";
  const panelBg = isDarkMode
    ? "bg-[#18181b] border-gray-800"
    : "bg-white border-gray-200";

  const handleCopy = () => {
    const code = generateDisplayCode(
      borderWidth,
      currentGradient,
      activeHighlight,
      activeProfile,
      isDarkMode,
    );
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`min-h-screen font-sans flex flex-col md:flex-row transition-colors duration-300 ${bgClass}`}
    >
      <style>
        {getDynamicStyles(
          borderWidth,
          currentGradient,
          activeHighlight,
          activeProfile,
          isDarkMode,
        )}
      </style>

      {/* === Left Control Panel === */}
      <div
        className={`w-full md:w-80 flex-shrink-0 border-r p-6 flex flex-col gap-8 h-screen overflow-y-auto sticky top-0 z-10 shadow-xl ${panelBg}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-1">
              <Settings className="w-6 h-6 text-amber-600" />
              FocusRing v3
            </h2>
            <p className="text-xs opacity-60">工业级光效与质感模拟</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCode(!showCode)}
              className={`p-2 rounded-full transition-all ${showCode ? "bg-blue-500/20 text-blue-500" : "bg-gray-100 text-gray-600"} ${isDarkMode && !showCode ? "bg-gray-800" : ""}`}
              title="View Code"
            >
              <Code size={18} />
            </button>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-full transition-all ${isDarkMode ? "bg-yellow-500/20 text-yellow-400" : "bg-gray-100 text-gray-600"}`}
              title="Toggle Dark Mode"
            >
              {isDarkMode ? <SunIcon size={18} /> : <MoonIcon size={18} />}
            </button>
          </div>
        </div>

        {/* 1. 配色选择 */}
        <div className="space-y-3">
          <label className="text-sm font-semibold flex items-center gap-2 opacity-80">
            <Palette className="w-4 h-4" /> 金属配色
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "champagne", label: "流光香槟", color: "#F3E5AB" },
              { id: "iceTitanium", label: "冰川钛银", color: "#E5E7EB" },
              { id: "roseGold", label: "奢华玫瑰", color: "#FFD1DC" },
              { id: "blackGold", label: "暗夜黑金", color: "#444" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveColor(item.id as ColorPreset)}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all
                  ${
                    activeColor === item.id
                      ? "border-amber-500 bg-amber-500/10 text-amber-500 ring-1 ring-amber-500"
                      : `border-transparent hover:bg-opacity-80 ${isDarkMode ? "bg-gray-800" : "bg-gray-100"}`
                  }
                `}
              >
                <div
                  className="w-3 h-3 rounded-full shadow-sm"
                  style={{ background: item.color }}
                ></div>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. 质感与截面 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-xs font-bold opacity-60 uppercase">
              Texture
            </label>
            <select
              value={activeTexture}
              onChange={(e) =>
                setActiveTexture(e.target.value as TexturePreset)
              }
              className={`w-full p-2 rounded-lg text-sm border outline-none ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}
            >
              <option value="mirror">Mirror (镜面)</option>
              <option value="brushed">Brushed (拉丝)</option>
              <option value="molten">Molten (熔岩)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold opacity-60 uppercase">
              Profile (3D)
            </label>
            <select
              value={activeProfile}
              onChange={(e) =>
                setActiveProfile(e.target.value as ProfilePreset)
              }
              className={`w-full p-2 rounded-lg text-sm border outline-none ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}
            >
              <option value="flat">Flat (扁平)</option>
              <option value="convex">Convex (圆弧)</option>
              <option value="ridge">Ridge (棱脊)</option>
            </select>
          </div>
        </div>

        {/* 3. 光效动态 */}
        <div className="space-y-3">
          <label className="text-sm font-semibold flex items-center gap-2 opacity-80">
            <Zap className="w-4 h-4" /> 光效动态
          </label>
          <select
            value={activeHighlight}
            onChange={(e) =>
              setActiveHighlight(e.target.value as HighlightPreset)
            }
            className={`w-full p-2.5 rounded-lg text-sm border outline-none ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}
          >
            <optgroup label="Liquid Flow (Linear)">
              <option value="flow">Standard Flow (液态流动)</option>
              <option value="shimmer">Rapid Shimmer (快速闪烁)</option>
              <option value="pulse">Breathing Pulse (缓慢呼吸)</option>
            </optgroup>
            <optgroup label="Asymmetric Spin (Conic)">
              <option value="asymmetric_flow">
                Asymmetric Flow (非对称流)
              </option>
              <option value="asymmetric_shimmer">
                Asymmetric Shimmer (非对称闪)
              </option>
              <option value="asymmetric_breathe">
                Asymmetric Breathe (非对称吸)
              </option>
            </optgroup>
          </select>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`w-2 h-2 rounded-full ${activeHighlight.includes("shimmer") ? "bg-red-500" : "bg-green-500"}`}
            ></span>
            <span className="text-[10px] opacity-50">
              Engine:{" "}
              {activeHighlight.startsWith("asymmetric")
                ? "CONIC (Rotating)"
                : "LINEAR (Translating)"}{" "}
              | Speed: {speedLabel}
            </span>
          </div>
        </div>

        {/* 4. 粗细调节 */}
        <div className="space-y-3 pt-4 border-t border-dashed border-gray-500/20">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold flex items-center gap-2 opacity-80">
              <Sliders className="w-4 h-4" /> 边框粗细
            </label>
            <span className="text-xs font-mono opacity-60 bg-gray-500/10 px-2 py-0.5 rounded">
              {borderWidth}px
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={borderWidth}
            onChange={(e) => setBorderWidth(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>
      </div>

      {/* === Right Preview Area (Conditional Render) === */}
      <div className="flex-1 p-8 md:p-12 overflow-y-auto relative">
        {showCode ? (
          // --- CODE VIEW ---
          <div className="max-w-4xl mx-auto space-y-6 h-full">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  CSS Generator
                </h1>
                <p className="opacity-60 text-sm mt-1">
                  Ready-to-use CSS based on your current selection.
                </p>
              </div>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDarkMode ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copied!" : "Copy Code"}
              </button>
            </div>

            <div
              className={`p-6 rounded-2xl overflow-x-auto text-sm font-mono leading-relaxed border shadow-sm ${isDarkMode ? "bg-[#121212] border-gray-800 text-gray-300" : "bg-gray-900 border-gray-800 text-gray-300"}`}
            >
              <pre className="whitespace-pre-wrap">
                {generateDisplayCode(
                  borderWidth,
                  currentGradient,
                  activeHighlight,
                  activeProfile,
                  isDarkMode,
                )}
              </pre>
            </div>
          </div>
        ) : (
          // --- PREVIEW VIEW ---
          <div className="max-w-4xl mx-auto space-y-12 pb-20">
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                UI Component Preview V3
              </h1>
              <p className="opacity-60 text-sm">
                {activeHighlight.startsWith("asymmetric")
                  ? "非对称 Conic Rotation 引擎激活 - 模拟彗星拖尾光效"
                  : "标准 Linear Gradient 引擎激活 - 模拟液态金属流动"}
              </p>
            </div>

            {/* --- Level 1: Micro Elements --- */}
            <section>
              <h3 className="text-xs font-bold opacity-40 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-6 h-[1px] bg-current opacity-50"></span>{" "}
                Level 1: Micro Elements
              </h3>
              <div className="flex flex-wrap gap-6 items-center">
                <div
                  className={`liquid-metal-base ${getAnimClass()} w-12 h-12 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform`}
                >
                  <Settings className="w-5 h-5 opacity-70" />
                </div>

                <div
                  className={`liquid-metal-base ${getAnimClass()} px-5 py-2 text-xs font-bold cursor-pointer`}
                >
                  PREMIUM TAG
                </div>

                <div
                  className={`liquid-metal-base ${getAnimClass()} w-16 h-16 p-0.5 rounded-full overflow-hidden`}
                >
                  <img
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                    alt="avatar"
                    className="w-full h-full rounded-full bg-gray-100"
                  />
                </div>
              </div>
            </section>

            {/* --- Level 2: Interactive Lists --- */}
            <section>
              <h3 className="text-xs font-bold opacity-40 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-6 h-[1px] bg-current opacity-50"></span>{" "}
                Level 2: Interactive Lists
              </h3>
              <div
                className={`w-full max-w-md rounded-2xl shadow-sm border p-4 space-y-3 ${isDarkMode ? "bg-[#18181b] border-gray-800" : "bg-white border-gray-200"}`}
              >
                <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-500/5 transition-colors cursor-pointer border border-transparent">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                      <Folder size={16} />
                    </div>
                    <span className="text-sm font-medium opacity-80">
                      Standard Folder
                    </span>
                  </div>
                  <ChevronRight size={16} className="opacity-30" />
                </div>

                <div
                  className={`liquid-metal-base ${getAnimClass()} flex items-center justify-between p-3 cursor-pointer shadow-sm`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <Disc size={16} />
                    </div>
                    <span className="text-sm font-bold">Selected Focus</span>
                  </div>
                  <span className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>
              </div>
            </section>

            {/* --- Level 3: Large Panels --- */}
            <section>
              <h3 className="text-xs font-bold opacity-40 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-6 h-[1px] bg-current opacity-50"></span>{" "}
                Level 3: Container / Panel Focus
              </h3>

              <div
                className={`liquid-metal-base liquid-metal-panel ${getAnimClass()} w-full p-8 flex flex-col items-center text-center`}
              >
                <div className="w-16 h-16 bg-gradient-to-br from-gray-500/10 to-gray-500/20 rounded-2xl mb-4 flex items-center justify-center shadow-inner">
                  <Layout className="w-8 h-8 opacity-50" />
                </div>
                <h2 className="text-xl font-bold mb-2">High Priority Panel</h2>
                <p className="opacity-60 text-sm max-w-xs leading-relaxed mb-6">
                  使用了 {activeProfile} 3D截面工艺，搭配 {activeColor} 材质。
                  <br />
                  非对称光效引擎正在运行。
                </p>
                <button
                  className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg flex items-center gap-2 ${isDarkMode ? "bg-gray-100 text-gray-900 hover:bg-white" : "bg-gray-800 text-white hover:bg-gray-900"}`}
                >
                  <Shield size={14} /> Action
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function MoonIcon({ size }: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function SunIcon({ size }: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}
