<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>奢华质感样式对比 (实心版)</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #e5e7eb;
        }

        /* --- 1. 流光溢彩 (Solid/Filled Variant) --- */
        /* 这个版本因为 background-clip: padding-box 且 border 为 transparent，
           导致背景色填充满了整个 padding 区域，呈现出一种“实心”的高级感 */
        .style-liquid {
            position: relative;
            background: linear-gradient(135deg, #fffcf5 0%, #fff 100%);
            background-clip: padding-box; 
            border: var(--border-width, 3px) solid transparent; 
            isolation: isolate; 
            box-shadow: 0 4px 12px rgba(212, 175, 55, 0.15);
            transition: all 0.3s ease;
            border-radius: inherit;
        }
        .style-liquid::before {
            content: '';
            position: absolute;
            top: calc(-1 * var(--border-width, 3px));
            left: calc(-1 * var(--border-width, 3px));
            right: calc(-1 * var(--border-width, 3px));
            bottom: calc(-1 * var(--border-width, 3px));
            z-index: -1; 
            border-radius: inherit;
            background: linear-gradient(45deg, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c);
            background-size: 300% 300%;
            animation: liquidShimmer 4s ease infinite;
        }
        @keyframes liquidShimmer {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        /* --- 2. 香槟微光 (Champagne Halo) --- */
        .style-champagne {
            background-color: #fff;
            border: var(--border-width, 1px) solid rgba(212, 175, 55, 0.6);
            box-shadow: 
                0 0 0 1px rgba(243, 229, 171, 0.3),
                0 0 15px rgba(212, 175, 55, 0.25),
                inset 0 0 10px rgba(255, 223, 0, 0.05);
            animation: breatheHalo 3s infinite ease-in-out;
        }
        @keyframes breatheHalo {
            0%, 100% { box-shadow: 0 0 0 1px rgba(243, 229, 171, 0.3), 0 0 12px rgba(212, 175, 55, 0.2); }
            50% { box-shadow: 0 0 0 4px rgba(243, 229, 171, 0.4), 0 0 25px rgba(212, 175, 55, 0.5); }
        }

        /* --- 3. 复古黄铜 (Antique Brass) --- */
        .style-antique {
            background: linear-gradient(to bottom, #fffff0, #fcfcfc);
            border: var(--border-width, 1px) solid #b8860b;
            box-shadow: 
                0 1px 0 #fff inset,
                0 -1px 0 #d4af37 inset,
                0 4px 6px -1px rgba(139, 69, 19, 0.15);
            position: relative;
        }
        .style-antique::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            border-radius: inherit;
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.6);
            pointer-events: none;
        }

        /* --- 4. 珠宝流光 (Jewelry Flash) --- */
        .style-jewelry {
            position: relative;
            background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);
            border: var(--border-width, 1px) solid rgba(255, 255, 255, 0.01);
            box-shadow: 
                0 4px 6px -1px rgba(0, 0, 0, 0.05), 
                0 2px 4px -1px rgba(0, 0, 0, 0.03);
            overflow: hidden;
            z-index: 1;
        }
        .style-jewelry::before {
            content: '';
            position: absolute;
            top: -100%; left: -100%; right: -100%; bottom: -100%;
            background: linear-gradient(
                115deg, 
                transparent 40%, 
                rgba(255, 255, 255, 0.8) 45%, 
                rgba(255, 255, 255, 1) 50%, 
                rgba(255, 255, 255, 0.8) 55%, 
                transparent 60%
            );
            transform: rotate(0deg);
            animation: jewelrySheen 3.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            pointer-events: none;
            mix-blend-mode: overlay;
            z-index: 2;
        }
        .style-jewelry::after {
            content: '';
            position: absolute;
            top: -50%; left: -50%; width: 200%; height: 200%;
            background: conic-gradient(
                from 0deg at 50% 50%,
                transparent 0deg,
                rgba(255, 255, 255, 0.5) 30deg,
                transparent 60deg
            );
            animation: slowRotate 8s linear infinite;
            z-index: 1;
            opacity: 0.6;
            pointer-events: none;
        }
        
        @keyframes jewelrySheen {
            0% { transform: translate(-30%, -30%) rotate(0deg); opacity: 0; }
            20% { opacity: 1; }
            80% { opacity: 1; }
            100% { transform: translate(30%, 30%) rotate(0deg); opacity: 0; }
        }
        @keyframes slowRotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .base-card {
            background: white;
            border: 1px solid #e5e7eb;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
    </style>
</head>
<body>
    <div id="root"></div>

    <script type="text/babel">
        const { useState } = React;

        const showcaseStyles = [
            { 
                id: 'liquid', 
                name: '流光溢彩', 
                enName: 'Liquid Gold (Solid)',
                desc: '模拟液态黄金流动，高贵且动感',
                className: 'style-liquid'
            },
            { 
                id: 'champagne', 
                name: '香槟微光', 
                enName: 'Champagne Halo',
                desc: '呼吸感光晕，低调奢华',
                className: 'style-champagne'
            },
            { 
                id: 'antique', 
                name: '复古黄铜', 
                enName: 'Antique Brass',
                desc: '物理金属边缘，硬朗质感',
                className: 'style-antique'
            },
            { 
                id: 'jewelry', 
                name: '珠宝流光', 
                enName: 'Jewelry Flash',
                desc: '白银/铂金质感，斜切高光',
                className: 'style-jewelry'
            }
        ];

        // 顶部控制栏组件
        const ControlPanel = ({ mode, setMode, borderWidth, setBorderWidth }) => (
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center gap-8 mb-8">
                
                {/* 模式切换 */}
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-600">应用模式:</span>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setMode('container')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                                mode === 'container' 
                                ? 'bg-white text-gray-900 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            容器 (Container)
                        </button>
                        <button
                            onClick={() => setMode('element')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                                mode === 'element' 
                                ? 'bg-white text-gray-900 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            控件 (Element)
                        </button>
                    </div>
                </div>

                <div className="w-px h-8 bg-gray-200 hidden md:block"></div>

                {/* 宽度调节滑块 */}
                <div className="flex items-center gap-4 flex-1 w-full md:w-auto">
                    <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">
                        Focus Ring Width: <span className="text-blue-600 font-mono w-8 inline-block">{borderWidth}px</span>
                    </span>
                    <input 
                        type="range" 
                        min="1" 
                        max="8" 
                        step="0.5"
                        value={borderWidth} 
                        onChange={(e) => setBorderWidth(e.target.value)}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-800"
                    />
                </div>
            </div>
        );

        const StyleCard = ({ item, mode, borderWidth }) => {
            const customStyle = { '--border-width': `${borderWidth}px` };

            const containerClass = mode === 'container' 
                ? `${item.className} rounded-3xl`
                : `base-card rounded-3xl`;
            
            const elementClass = mode === 'element' 
                ? item.className 
                : 'bg-white border border-gray-300 shadow-sm';

            return (
                <div className="flex flex-col items-center">
                    <div 
                        className={`w-full aspect-[3/4] p-6 flex flex-col items-center justify-between transition-all duration-500 ${containerClass}`}
                        style={mode === 'container' ? customStyle : {}}
                    >
                        
                        <div className="text-center mt-4 z-10 relative">
                            <h3 className="text-lg font-bold text-gray-800">{item.name}</h3>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{item.enName}</p>
                        </div>

                        <div className="w-full flex-1 flex flex-col items-center justify-center gap-6 w-full z-10 relative">
                            
                            <button 
                                className={`w-full h-12 rounded-lg flex items-center justify-center font-medium transition-all duration-300 text-gray-700 ${elementClass}`}
                                style={mode === 'element' ? customStyle : {}}
                            >
                                {mode === 'element' ? 'Focused Button' : 'Normal Button'}
                            </button>

                            <div 
                                className={`w-full h-12 rounded-lg flex items-center px-4 bg-white transition-all duration-300 ${elementClass}`}
                                style={mode === 'element' ? customStyle : {}}
                            >
                                <span className="text-gray-400 mr-2"><i className="fas fa-search"></i></span>
                                <span className="text-gray-500 text-sm">Input field...</span>
                            </div>

                        </div>

                        <div className="text-center mb-2 z-10 relative">
                            <p className="text-xs text-gray-400">{item.desc}</p>
                        </div>
                    </div>
                </div>
            );
        };

        const App = () => {
            const [mode, setMode] = useState('element');
            const [borderWidth, setBorderWidth] = useState(3);

            return (
                <div className="min-h-screen p-8 md:p-12 max-w-7xl mx-auto flex flex-col items-center">
                    
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">奢华质感样式实验室 (实心版)</h1>
                        <p className="text-sm text-gray-500 max-w-2xl mx-auto mb-6">
                            这是一个保留版本，展示了流光溢彩在修复1px问题后呈现的独特实心效果。
                        </p>
                        
                        <ControlPanel 
                            mode={mode} 
                            setMode={setMode} 
                            borderWidth={borderWidth} 
                            setBorderWidth={setBorderWidth} 
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full">
                        {showcaseStyles.map(style => (
                            <StyleCard 
                                key={style.id} 
                                item={style} 
                                mode={mode}
                                borderWidth={borderWidth}
                            />
                        ))}
                    </div>

                </div>
            );
        };

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
    </script>
</body>
</html>
