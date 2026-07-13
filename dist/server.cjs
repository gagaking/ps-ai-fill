var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_undici = require("undici");
import_dotenv.default.config();
var dispatcher = new import_undici.Agent({
  headersTimeout: 6e5,
  // 10 minutes
  bodyTimeout: 6e5,
  // 5 minutes
  connectTimeout: 6e4
  // 1 minute
});
(0, import_undici.setGlobalDispatcher)(dispatcher);
var ai = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new import_genai.GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    console.log("Gemini client initialized for backend fallback simulations.");
  } catch (err) {
    console.error("Failed to initialize Gemini Client:", err);
  }
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = parseInt(process.env.SERVER_PORT) || 3001;
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
  const simulationKeywords = [
    {
      keywords: ["cat", "kitten", "feline"],
      url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=600&auto=format&fit=crop",
      label: "A cute fluffy cat"
    },
    {
      keywords: ["dog", "puppy", "retriever"],
      url: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=600&auto=format&fit=crop",
      label: "A playful golden retriever puppy"
    },
    {
      keywords: ["car", "sports car", "vehicle", "ferrari", "porsche"],
      url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=600&auto=format&fit=crop",
      label: "A high-performance modern sports car"
    },
    {
      keywords: ["city", "skyscrapers", "skyline", "buildings"],
      url: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=600&auto=format&fit=crop",
      label: "A futuristic city with high skyscrapers"
    },
    {
      keywords: ["starry", "galaxy", "space", "nebula", "universe"],
      url: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=600&auto=format&fit=crop",
      label: "A deep purple space nebula with glowing stars"
    },
    {
      keywords: ["balloon", "hot air", "balloons"],
      url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop",
      label: "Vibrant hot air balloons in the sky"
    },
    {
      keywords: ["ocean", "beach", "waves", "sea", "sunset"],
      url: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?q=80&w=600&auto=format&fit=crop",
      label: "A serene ocean sunset view"
    },
    {
      keywords: ["mountain", "lake", "peaks", "snow"],
      url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop",
      label: "Serene mountain landscape with snow-capped peaks"
    },
    {
      keywords: ["robot", "cyberpunk", "futuristic", "android"],
      url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=600&auto=format&fit=crop",
      label: "A futuristic chrome android"
    },
    {
      keywords: ["forest", "trees", "jungle", "nature"],
      url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=600&auto=format&fit=crop",
      label: "Sunlight beaming through a dense green forest"
    }
  ];
  function getSimulationSVG(prompt, index = 0) {
    const promptLower = prompt.toLowerCase();
    const escapedPrompt = prompt.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
    let svgString = "";
    let label = "Abstract Design";
    if (promptLower.includes("car") || promptLower.includes("vehicle") || promptLower.includes("ferrari") || promptLower.includes("porsche")) {
      label = "Sleek Sports Car";
      const gradients = [
        { start: "#ff0055", mid: "#ff5500", end: "#ffcc00" },
        { start: "#00f0ff", mid: "#0072ff", end: "#0022ff" },
        { start: "#7b2cbf", mid: "#9d4edd", end: "#e0aaff" },
        { start: "#39ff14", mid: "#00aa00", end: "#053305" }
      ];
      const grad = gradients[index % gradients.length];
      svgString = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="100%" height="100%">
  <defs>
    <linearGradient id="bodyGrad_${index}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${grad.start}" />
      <stop offset="50%" stop-color="${grad.mid}" />
      <stop offset="100%" stop-color="${grad.end}" />
    </linearGradient>
    <linearGradient id="wheelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#111" />
      <stop offset="100%" stop-color="#444" />
    </linearGradient>
    <linearGradient id="glassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#00ffff" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#0055ff" stop-opacity="0.2" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <ellipse cx="200" cy="175" rx="160" ry="15" fill="black" opacity="0.6" />
  <path d="M 40,150 C 40,150 35,110 70,105 C 105,100 130,75 180,75 C 230,75 290,80 320,110 C 350,115 370,125 370,150 C 370,165 350,165 350,165 L 50,165 Z" fill="url(#bodyGrad_${index})" />
  <path d="M 140,102 C 150,82 175,82 195,82 C 220,82 255,85 275,105 Z" fill="url(#glassGrad)" />
  <path d="M 195,82 L 195,103" stroke="#00ffff" stroke-width="2" opacity="0.5" />
  <path d="M 355,130 C 365,130 370,135 370,140 C 370,145 365,148 355,148 Z" fill="#ffff00" filter="url(#glow)" />
  <ellipse cx="200" cy="170" rx="130" ry="6" fill="#00ffff" opacity="0.8" filter="url(#glow)" />
  <circle cx="100" cy="155" r="30" fill="url(#wheelGrad)" stroke="#555" stroke-width="4" />
  <circle cx="100" cy="155" r="15" fill="#111" stroke="#00ffff" stroke-width="2" filter="url(#glow)" />
  <circle cx="300" cy="155" r="30" fill="url(#wheelGrad)" stroke="#555" stroke-width="4" />
  <circle cx="300" cy="155" r="15" fill="#111" stroke="#00ffff" stroke-width="2" filter="url(#glow)" />
  <path d="M 45,115 L 30,100 L 50,100 L 60,115 Z" fill="#222" />
</svg>
      `;
    } else if (promptLower.includes("cat") || promptLower.includes("kitten") || promptLower.includes("feline")) {
      label = "Fluffy Cat";
      const furs = [
        { start: "#ffaa44", end: "#d46a00" },
        { start: "#a1a1a1", end: "#424242" },
        { start: "#fbfbfb", end: "#cccccc" },
        { start: "#242424", end: "#050505" }
      ];
      const fur = furs[index % furs.length];
      svgString = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
  <defs>
    <linearGradient id="furGrad_${index}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${fur.start}" />
      <stop offset="100%" stop-color="${fur.end}" />
    </linearGradient>
    <linearGradient id="eyeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#aaff00" />
      <stop offset="100%" stop-color="#00aa00" />
    </linearGradient>
  </defs>
  <ellipse cx="100" cy="180" rx="60" ry="10" fill="black" opacity="0.4" />
  <path d="M 140,160 C 170,160 180,110 170,80 C 165,65 155,70 160,80 C 165,100 155,145 130,145 Z" fill="url(#furGrad_${index})" />
  <ellipse cx="100" cy="130" rx="45" ry="50" fill="url(#furGrad_${index})" />
  <ellipse cx="100" cy="135" rx="20" ry="30" fill="#fff" opacity="0.9" />
  <circle cx="100" cy="75" r="38" fill="url(#furGrad_${index})" />
  <polygon points="65,55 60,15 90,45" fill="url(#furGrad_${index})" />
  <polygon points="69,50 65,23 85,42" fill="#ff9999" />
  <polygon points="135,55 140,15 110,45" fill="url(#furGrad_${index})" />
  <polygon points="131,50 135,23 115,42" fill="#ff9999" />
  <ellipse cx="85" cy="72" rx="7" ry="10" fill="url(#eyeGrad)" />
  <ellipse cx="85" cy="72" rx="2" ry="8" fill="black" />
  <circle cx="83" cy="69" r="2" fill="white" />
  <ellipse cx="115" cy="72" rx="7" ry="10" fill="url(#eyeGrad)" />
  <ellipse cx="115" cy="72" rx="2" ry="8" fill="black" />
  <circle cx="113" cy="69" r="2" fill="white" />
  <polygon points="96,85 104,85 100,89" fill="#ff9999" />
  <path d="M 100,89 C 97,93 93,93 93,93 M 100,89 C 103,93 107,93 107,93" stroke="#222" stroke-width="1.5" stroke-linecap="round" fill="none" />
  <line x1="60" y1="88" x2="35" y2="85" stroke="#fff" stroke-width="1.5" stroke-linecap="round" />
  <line x1="60" y1="93" x2="30" y2="94" stroke="#fff" stroke-width="1.5" stroke-linecap="round" />
  <line x1="140" y1="88" x2="165" y2="85" stroke="#fff" stroke-width="1.5" stroke-linecap="round" />
  <line x1="140" y1="93" x2="170" y2="94" stroke="#fff" stroke-width="1.5" stroke-linecap="round" />
  <ellipse cx="85" cy="175" rx="10" ry="8" fill="url(#furGrad_${index})" />
  <ellipse cx="115" cy="175" rx="10" ry="8" fill="url(#furGrad_${index})" />
</svg>
      `;
    } else if (promptLower.includes("dog") || promptLower.includes("puppy") || promptLower.includes("retriever")) {
      label = "Playful Puppy";
      const golds = [
        { start: "#f3e5ab", end: "#c5a059" },
        { start: "#e0d3cb", end: "#8f7e73" },
        { start: "#4a3c31", end: "#1d140e" }
      ];
      const gold = golds[index % golds.length];
      svgString = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
  <defs>
    <linearGradient id="goldGrad_${index}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${gold.start}" />
      <stop offset="100%" stop-color="${gold.end}" />
    </linearGradient>
  </defs>
  <ellipse cx="100" cy="180" rx="55" ry="9" fill="black" opacity="0.4" />
  <ellipse cx="100" cy="135" rx="42" ry="45" fill="url(#goldGrad_${index})" />
  <ellipse cx="100" cy="135" rx="16" ry="24" fill="#fff" opacity="0.85" />
  <circle cx="100" cy="80" r="38" fill="url(#goldGrad_${index})" />
  <path d="M 65,65 C 50,75 40,110 52,120 C 62,120 72,90 72,75 Z" fill="#9e7b3b" />
  <path d="M 135,65 C 150,75 160,110 148,120 C 138,120 128,90 128,75 Z" fill="#9e7b3b" />
  <circle cx="85" cy="78" r="6" fill="#1a0d00" />
  <circle cx="83" cy="75" r="2" fill="white" />
  <circle cx="115" cy="78" r="6" fill="#1a0d00" />
  <circle cx="113" cy="75" r="2" fill="white" />
  <ellipse cx="100" cy="94" rx="16" ry="12" fill="#fff" opacity="0.9" />
  <path d="M 94,88 C 94,88 95,84 100,84 C 105,84 106,88 106,88 C 106,91 102,94 100,94 C 98,94 94,91 94,88 Z" fill="#111" />
  <path d="M 100,94 C 97,97 94,97 94,97 M 100,94 C 103,97 106,97 106,97" stroke="#111" stroke-width="1.5" fill="none" />
  <path d="M 98,97 C 98,97 98,107 100,107 C 102,107 102,97 102,97 Z" fill="#ff6688" />
  <ellipse cx="82" cy="174" rx="12" ry="8" fill="url(#goldGrad_${index})" />
  <ellipse cx="118" cy="174" rx="12" ry="8" fill="url(#goldGrad_${index})" />
</svg>
      `;
    } else if (promptLower.includes("balloon") || promptLower.includes("hot air")) {
      label = "Hot Air Balloon";
      const colors = [
        { start: "#ff0055", end: "#ffbb00" },
        { start: "#00ffcc", end: "#0055ff" },
        { start: "#ff00ff", end: "#7700ff" },
        { start: "#ff5500", end: "#39ff14" }
      ];
      const col = colors[index % colors.length];
      svgString = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 250" width="100%" height="100%">
  <defs>
    <linearGradient id="rainbow_${index}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${col.start}" />
      <stop offset="100%" stop-color="${col.end}" />
    </linearGradient>
    <linearGradient id="basket" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ab7a4e" />
      <stop offset="100%" stop-color="#5c3a1a" />
    </linearGradient>
  </defs>
  <path d="M 100,20 C 45,20 30,85 55,130 C 70,160 85,180 100,180 C 115,180 130,160 145,130 C 170,85 155,20 100,20 Z" fill="url(#rainbow_${index})" />
  <path d="M 100,20 C 75,20 65,85 78,130 C 85,155 95,180 100,180 C 105,180 115,155 122,130 C 135,85 125,20 100,20 Z" fill="black" opacity="0.15" />
  <path d="M 100,20 C 90,20 85,85 92,130 C 96,155 99,180 100,180 C 101,180 104,155 108,130 C 115,85 110,20 100,20 Z" fill="white" opacity="0.15" />
  <line x1="75" y1="175" x2="85" y2="210" stroke="#777" stroke-width="1.5" />
  <line x1="125" y1="175" x2="115" y2="210" stroke="#777" stroke-width="1.5" />
  <line x1="100" y1="180" x2="100" y2="210" stroke="#555" stroke-width="1" />
  <rect x="83" y="210" width="34" height="24" rx="4" fill="url(#basket)" stroke="#3d220a" stroke-width="1" />
  <line x1="83" y1="218" x2="117" y2="218" stroke="#3d220a" stroke-width="1" />
  <line x1="83" y1="226" x2="117" y2="226" stroke="#3d220a" stroke-width="1" />
</svg>
      `;
    } else if (promptLower.includes("coffee") || promptLower.includes("mug") || promptLower.includes("cup")) {
      label = "Steaming Coffee Mug";
      const cups = ["#ffffff", "#ff4444", "#44aaff", "#ffd700"];
      const cupColor = cups[index % cups.length];
      svgString = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
  <defs>
    <linearGradient id="cupGrad_${index}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${cupColor}" />
      <stop offset="100%" stop-color="#444444" stop-opacity="0.2" />
    </linearGradient>
    <linearGradient id="coffeeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#4a2711" />
      <stop offset="100%" stop-color="#241005" />
    </linearGradient>
  </defs>
  <ellipse cx="100" cy="170" rx="65" ry="12" fill="black" opacity="0.25" />
  <ellipse cx="100" cy="160" rx="60" ry="14" fill="#e8e8e8" stroke="#ccc" stroke-width="1" />
  <ellipse cx="100" cy="158" rx="40" ry="8" fill="#d8d8d8" />
  <path d="M 140,95 C 165,95 165,135 140,135" fill="none" stroke="${cupColor}" stroke-width="10" stroke-linecap="round" />
  <path d="M 60,85 C 60,85 58,145 100,145 C 142,145 140,85 140,85 Z" fill="${cupColor}" stroke="#e0e0e0" stroke-width="1" />
  <ellipse cx="100" cy="85" rx="40" ry="10" fill="#e0e0e0" />
  <ellipse cx="100" cy="87" rx="36" ry="8" fill="url(#coffeeGrad)" />
  <path d="M 85,65 C 80,50 95,40 90,25" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.5" />
  <path d="M 105,68 C 100,53 115,43 110,28" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.5" />
  <path d="M 120,70 C 115,58 125,50 120,38" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.4" />
</svg>
      `;
    } else if (promptLower.includes("plant") || promptLower.includes("vase")) {
      label = "Potted Green Plant";
      const pots = ["#e07a5f", "#4f772d", "#3d5a80", "#222222"];
      const potColor = pots[index % pots.length];
      svgString = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 250" width="100%" height="100%">
  <defs>
    <linearGradient id="potGrad_${index}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${potColor}" />
      <stop offset="100%" stop-color="#111" />
    </linearGradient>
    <linearGradient id="leafGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#4f772d" />
      <stop offset="100%" stop-color="#132a13" />
    </linearGradient>
  </defs>
  <ellipse cx="100" cy="225" rx="40" ry="9" fill="black" opacity="0.3" />
  <path d="M 75,160 L 125,160 L 118,220 L 82,220 Z" fill="url(#potGrad_${index})" />
  <ellipse cx="100" cy="160" rx="25" ry="5" fill="#a6523c" />
  <path d="M 100,160 Q 70,120 50,110" stroke="#31572c" stroke-width="3" fill="none" />
  <path d="M 50,110 C 30,110 35,70 65,80 C 85,90 90,120 50,110 Z" fill="url(#leafGrad)" />
  <path d="M 100,160 Q 130,110 150,95" stroke="#31572c" stroke-width="3" fill="none" />
  <path d="M 150,95 C 170,95 165,55 135,65 C 115,75 110,105 150,95 Z" fill="url(#leafGrad)" />
  <path d="M 100,160 Q 100,90 100,70" stroke="#31572c" stroke-width="4" fill="none" />
  <path d="M 100,70 C 80,60 85,20 100,30 C 115,20 120,60 100,70 Z" fill="url(#leafGrad)" />
  <path d="M 45,95 L 35,90 M 52,88 L 42,80 M 145,80 L 155,75 M 138,72 L 148,65" stroke="#132a13" stroke-width="2" />
</svg>
      `;
    } else if (promptLower.includes("laptop") || promptLower.includes("computer")) {
      label = "Premium Laptop";
      const screens = ["#3b82f6", "#ef4444", "#10b981", "#8b5cf6"];
      const screenColor = screens[index % screens.length];
      svgString = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 180" width="100%" height="100%">
  <defs>
    <linearGradient id="metal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#d1d5db" />
      <stop offset="50%" stop-color="#9ca3af" />
      <stop offset="100%" stop-color="#4b5563" />
    </linearGradient>
    <linearGradient id="screen_${index}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${screenColor}" />
      <stop offset="100%" stop-color="#000000" />
    </linearGradient>
    <filter id="screenGlow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <ellipse cx="125" cy="160" rx="110" ry="10" fill="black" opacity="0.35" />
  <rect x="40" y="30" width="170" height="110" rx="6" fill="#374151" />
  <rect x="44" y="34" width="162" height="102" rx="4" fill="#111827" />
  <rect x="48" y="38" width="154" height="90" fill="url(#screen_${index})" filter="url(#screenGlow)" />
  <rect x="56" y="48" width="50" height="5" rx="1.5" fill="#38bdf8" opacity="0.8" />
  <rect x="56" y="58" width="80" height="5" rx="1.5" fill="#34d399" opacity="0.8" />
  <rect x="56" y="68" width="65" height="5" rx="1.5" fill="#f472b6" opacity="0.8" />
  <rect x="56" y="78" width="40" height="5" rx="1.5" fill="#fbbf24" opacity="0.8" />
  <path d="M 48,38 L 150,38 L 48,120 Z" fill="#fff" opacity="0.08" />
  <rect x="90" y="136" width="70" height="6" fill="#1f2937" />
  <path d="M 30,142 L 220,142 L 240,158 L 10,158 Z" fill="url(#metal)" />
  <polygon points="50,145 200,145 210,154 40,154" fill="#111" />
  <rect x="105" y="154" width="40" height="3" rx="1" fill="#6b7280" />
</svg>
      `;
    } else if (promptLower.includes("robot") || promptLower.includes("cyberpunk") || promptLower.includes("android")) {
      label = "Futuristic Android Robot";
      const neonColors = ["#00f0ff", "#ff00ff", "#39ff14", "#ffff00"];
      const neon = neonColors[index % neonColors.length];
      svgString = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 250" width="100%" height="100%">
  <defs>
    <linearGradient id="chrome" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="30%" stop-color="#cbd5e1" />
      <stop offset="70%" stop-color="#475569" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <filter id="neon_${index}" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <ellipse cx="100" cy="230" rx="50" ry="10" fill="black" opacity="0.4" />
  <path d="M 70,120 L 130,120 L 120,190 L 80,190 Z" fill="url(#chrome)" stroke="#334155" stroke-width="2" />
  <circle cx="100" cy="155" r="16" fill="#0f172a" stroke="${neon}" stroke-width="2" filter="url(#neon_${index})" />
  <rect x="92" y="102" width="16" height="20" fill="#334155" />
  <rect x="70" y="55" width="60" height="50" rx="15" fill="url(#chrome)" stroke="#334155" stroke-width="2" />
  <rect x="76" y="68" width="48" height="14" rx="7" fill="#000" />
  <rect x="80" y="72" width="40" height="6" rx="3" fill="${neon}" filter="url(#neon_${index})" />
  <line x1="75" y1="58" x2="60" y2="35" stroke="#475569" stroke-width="3" />
  <circle cx="60" cy="35" r="4" fill="${neon}" filter="url(#neon_${index})" />
  <line x1="125" y1="58" x2="140" y2="35" stroke="#475569" stroke-width="3" />
  <circle cx="140" cy="35" r="4" fill="${neon}" filter="url(#neon_${index})" />
  <circle cx="62" cy="130" r="10" fill="#334155" />
  <circle cx="138" cy="130" r="10" fill="#334155" />
  <ellipse cx="100" cy="200" rx="25" ry="12" fill="url(#chrome)" stroke="#334155" stroke-width="2" />
  <rect x="94" y="206" width="12" height="20" fill="#1e293b" />
</svg>
      `;
    } else if (promptLower.includes("bird")) {
      label = "Flock of Flying Birds";
      svgString = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150" width="100%" height="100%">
  <path d="M 30,50 Q 40,35 50,45 Q 60,35 70,50 Q 60,45 50,55 Q 40,45 30,50 Z" fill="#111" />
  <path d="M 90,80 Q 97,68 105,76 Q 112,68 120,80 Q 112,76 105,84 Q 97,76 90,80 Z" fill="#333" />
  <path d="M 130,40 Q 135,30 142,37 Q 148,30 155,40 Q 148,37 142,44 Q 135,37 130,40 Z" fill="#222" opacity="0.8" />
  <path d="M 60,100 Q 64,92 70,97 Q 75,92 80,100 Q 75,97 70,103 Q 64,97 60,100 Z" fill="#444" opacity="0.9" />
</svg>
      `;
    } else if (promptLower.includes("sun")) {
      label = "Glowing Golden Sun";
      svgString = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
  <defs>
    <radialGradient id="sunGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fffb00" />
      <stop offset="40%" stop-color="#ff7b00" />
      <stop offset="100%" stop-color="#ff3c00" stop-opacity="0" />
    </radialGradient>
  </defs>
  <circle cx="100" cy="100" r="80" fill="url(#sunGrad)" />
  <circle cx="100" cy="100" r="40" fill="#fffb00" opacity="0.9" />
</svg>
      `;
    } else {
      label = "AI Hologram Zone";
      const neonColors = ["#00f0ff", "#ff00ff", "#39ff14", "#ffff00"];
      const neon = neonColors[index % neonColors.length];
      svgString = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
  <defs>
    <linearGradient id="neonGrad_${index}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${neon}" />
      <stop offset="100%" stop-color="#000000" />
    </linearGradient>
    <filter id="neonGlow_${index}" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect x="10" y="10" width="180" height="180" rx="12" fill="none" stroke="${neon}" stroke-width="2" filter="url(#neonGlow_${index})" opacity="0.7" />
  <rect x="12" y="12" width="176" height="176" rx="10" fill="#000" opacity="0.25" />
  <path d="M 100,50 L 103,62 L 115,65 L 103,68 L 100,80 L 97,68 L 85,65 L 97,62 Z" fill="#ffff00" filter="url(#neonGlow_${index})" />
  <path d="M 45,135 L 47,141 L 53,142 L 47,143 L 45,149 L 43,143 L 37,142 L 43,141 Z" fill="#00ffff" />
  <path d="M 155,125 L 156,129 L 160,130 L 156,131 L 155,135 L 154,131 L 150,130 L 154,129 Z" fill="#ff00ff" />
  <circle cx="100" cy="100" r="45" fill="none" stroke="${neon}" stroke-width="0.5" stroke-dasharray="2 3" opacity="0.4" />
  <text x="100" y="105" font-family="monospace" font-size="9" fill="${neon}" text-anchor="middle" font-weight="bold" filter="url(#neonGlow_${index})">
    ${escapedPrompt.substring(0, 18)}
  </text>
  <text x="100" y="120" font-family="sans-serif" font-size="7.5" fill="#aaa" text-anchor="middle" letter-spacing="1">
    GENERATED OBJECT
  </text>
</svg>
      `;
    }
    const svgDataUrl = "data:image/svg+xml;utf8," + encodeURIComponent(svgString.trim());
    return { svgUrl: svgDataUrl, label };
  }
  app.post("/api/ps/generate", async (req, res) => {
    try {
      const {
        model,
        prompt,
        n = 1,
        response_format = "b64_json",
        aspect_ratio,
        image_size,
        size,
        quality,
        image,
        // input image base64
        image_base64,
        // pure input image base64
        ref_image_base64,
        // reference image base64
        style_image_base64,
        // style image base64
        apiKey,
        // key entered in settings panel
        isSimulation = false,
        isOutpaint = false,
        isExtend: isExtend2 = false,
        targetW,
        targetH
      } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required." });
      }
      const apiKeyToUse = apiKey && apiKey.trim() !== "" && !apiKey.includes("your_api_key_here") ? apiKey.trim() : process.env.APILIO_API_KEY ? process.env.APILIO_API_KEY.trim() : null;
      if (!apiKeyToUse && !isSimulation) {
        return res.status(401).json({
          error: "API Key is required to generate images. Please open the settings panel (API Keys) and enter your OpenAI/Apilio key for the selected model."
        });
      }
      const finalIsSimulation = isSimulation;
      if (finalIsSimulation) {
        console.log(`[Simulation Mode] Model: ${model}, Prompt: "${prompt}", isOutpaint: ${isOutpaint}, isExtend: ${isExtend2}`);
        const data = [];
        let matchedLabel = "Holographic Asset";
        if (isOutpaint && image_base64) {
          matchedLabel = "\u4E00\u952EAI\u667A\u80FD\u6269\u56FE";
          const outpaintSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
  <defs>
    <linearGradient id="outpaintGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0c10" />
      <stop offset="30%" stop-color="#141923" />
      <stop offset="70%" stop-color="#1e2537" />
      <stop offset="100%" stop-color="#05070a" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <!-- Background behind everything -->
  <rect width="600" height="400" fill="url(#outpaintGrad)" />
  
  <!-- Simulated extended scenery elements -->
  <!-- Left Side extension -->
  <path d="M 0,250 Q 40,220 75,235 L 75,400 L 0,400 Z" fill="#1b2234" opacity="0.6" />
  <path d="M 0,280 Q 30,260 75,270 L 75,400 L 0,400 Z" fill="#242c42" />
  <!-- Right Side extension -->
  <path d="M 525,235 Q 560,220 600,250 L 600,400 L 525,400 Z" fill="#1b2234" opacity="0.6" />
  <path d="M 525,270 Q 570,260 600,280 L 600,400 L 525,400 Z" fill="#242c42" />
  
  <!-- Cool connecting neon lights -->
  <line x1="75" y1="50" x2="75" y2="350" stroke="#00c6ff" stroke-width="2" opacity="0.8" filter="url(#glow)" />
  <line x1="525" y1="50" x2="525" y2="350" stroke="#00c6ff" stroke-width="2" opacity="0.8" filter="url(#glow)" />
  <line x1="75" y1="50" x2="525" y2="50" stroke="#00c6ff" stroke-width="1.5" opacity="0.5" />
  <line x1="75" y1="350" x2="525" y2="350" stroke="#00c6ff" stroke-width="1.5" opacity="0.5" />

  <!-- Stars in the sky -->
  <circle cx="40" cy="60" r="1.5" fill="#fff" opacity="0.8" />
  <circle cx="560" cy="80" r="1.2" fill="#fff" opacity="0.9" />
  <circle cx="120" cy="30" r="1" fill="#fff" opacity="0.5" />
  <circle cx="480" cy="40" r="1.5" fill="#00c6ff" opacity="0.7" filter="url(#glow)" />
  
  <!-- Embedded original image in the center -->
  <image href="data:image/png;base64,${image_base64}" x="75" y="50" width="450" height="300" rx="4" />
  
  <!-- Subtle overlay text indicating outpainting -->
  <rect x="180" y="325" width="240" height="24" rx="12" fill="black" opacity="0.8" />
  <text x="300" y="341" font-family="sans-serif" font-size="9" fill="#00c6ff" text-anchor="middle" font-weight="bold" letter-spacing="0.5">
    \uFFFD?AI \u4E00\u952E\u521B\u6210\u5F0F\u6269\u56FE (450\xD7300 \uFFFD?600\xD7400)
  </text>
</svg>
`;
          const svgDataUrl = "data:image/svg+xml;utf8," + encodeURIComponent(outpaintSvg.trim());
          for (let i = 0; i < n; i++) {
            data.push({ url: svgDataUrl, b64_json: "" });
          }
        } else if (isExtend2) {
          const w = Number(targetW) || 1280;
          const h = Number(targetH) || 720;
          matchedLabel = `\u667A\u80FD\u5C3A\u5BF8\u5EF6\u5C55 (${w}x${h})`;
          const padding = 0.8;
          let imgW, imgH;
          if (w / h > 1.5) {
            imgH = h * padding;
            imgW = imgH * 1.5;
          } else {
            imgW = w * padding;
            imgH = imgW / 1.5;
          }
          const imgX = (w - imgW) / 2;
          const imgY = (h - imgH) / 2;
          const extendSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%">
  <defs>
    <linearGradient id="extendGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#07090e" />
      <stop offset="50%" stop-color="#111827" />
      <stop offset="100%" stop-color="#020305" />
    </linearGradient>
    <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="10" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#extendGrad)" />
  
  <!-- Decorative grid lines on extended margins to give high tech feel -->
  <g opacity="0.15" stroke="#00c6ff" stroke-width="0.5">
    <line x1="0" y1="${h * 0.25}" x2="${w}" y2="${h * 0.25}" />
    <line x1="0" y1="${h * 0.5}" x2="${w}" y2="${h * 0.5}" />
    <line x1="0" y1="${h * 0.75}" x2="${w}" y2="${h * 0.75}" />
    <line x1="${w * 0.25}" y1="0" x2="${w * 0.25}" y2="${h}" />
    <line x1="${w * 0.5}" y1="0" x2="${w * 0.5}" y2="${h}" />
    <line x1="${w * 0.75}" y1="0" x2="${w * 0.75}" y2="${h}" />
  </g>

  <!-- Side extension ambient rays -->
  <circle cx="${w / 2}" cy="${h / 2}" r="${Math.max(w, h) * 0.6}" fill="none" stroke="#00c6ff" stroke-width="1" opacity="0.1" />
  <circle cx="${w / 2}" cy="${h / 2}" r="${Math.max(w, h) * 0.4}" fill="none" stroke="#0072ff" stroke-width="1.5" stroke-dasharray="10 15" opacity="0.15" />

  <!-- Neon border highlighting the embedded image -->
  <rect x="${imgX - 4}" y="${imgY - 4}" width="${imgW + 8}" height="${imgH + 8}" rx="8" fill="none" stroke="#00c6ff" stroke-width="2.5" filter="url(#neonGlow)" opacity="0.8" />
  
  <!-- Embedded original stamped image -->
  <image href="data:image/png;base64,${image_base64}" x="${imgX}" y="${imgY}" width="${imgW}" height="${imgH}" rx="4" />

  <!-- Technical specs metadata overlay -->
  <rect x="${w / 2 - 140}" y="${h - 40}" width="280" height="26" rx="13" fill="#000" opacity="0.85" stroke="#00c6ff" stroke-width="1" />
  <text x="${w / 2}" y="${h - 23}" font-family="monospace" font-size="11" fill="#00c6ff" text-anchor="middle" font-weight="bold">
    \u{1F4CF} \u667A\u80FD\u5C3A\u5BF8\u5EF6\u5C55: ${w} \xD7 ${h}\u50CF\u7D20
  </text>
</svg>
`;
          const svgDataUrl = "data:image/svg+xml;utf8," + encodeURIComponent(extendSvg.trim());
          for (let i = 0; i < n; i++) {
            data.push({ url: svgDataUrl, b64_json: "" });
          }
        } else {
          for (let i = 0; i < n; i++) {
            const result = getSimulationSVG(prompt, i);
            if (i === 0) {
              matchedLabel = result.label;
            }
            if (response_format === "url") {
              data.push({ url: result.svgUrl });
            } else {
              data.push({ url: result.svgUrl, b64_json: "" });
            }
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return res.json({
          created: Date.now(),
          data,
          isSimulation: true,
          simulationType: matchedLabel
        });
      }
      const hasInputImage = !!(image || image_base64);
const isChatModel = model === "gemini-3.1-flash-lite-image";
      const endpoint = isChatModel ? "/v1/chat/completions" : (hasInputImage ? "/v1/images/edits" : "/v1/images/generations");
      const targetURL = `https://api.apilio.ai${endpoint}`;
      let fetchOptions;
      if (isChatModel) {
        var chatContent = [{ type: "text", text: prompt }];
        if (image_base64) chatContent.push({ type: "image_url", image_url: { url: "data:image/png;base64," + image_base64 } });
        if (ref_image_base64) chatContent.push({ type: "image_url", image_url: { url: "data:image/png;base64," + ref_image_base64 } });
        if (style_image_base64) chatContent.push({ type: "image_url", image_url: { url: "data:image/png;base64," + style_image_base64 } });
        var chatPayload = { model: model, messages: [{ role: "user", content: chatContent }], n: Number(n) };
        fetchOptions = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKeyToUse}`
          },
          body: JSON.stringify(chatPayload)
        };
      } else if (hasInputImage) {
        const formData = new FormData();
        formData.append("model", model);
        formData.append("prompt", prompt);
        // n is not valid in FormData mode
        formData.append("response_format", response_format);
        if (model === "gpt-image-2") {
          if (size) formData.append("size", size);
          if (quality) formData.append("quality", quality);
        } else {
          if (aspect_ratio) formData.append("aspect_ratio", aspect_ratio);
          if (image_size) formData.append("image_size", image_size);
        }
        const base64Str = image || image_base64;
        const buffer = Buffer.from(base64Str, "base64");
        const blob = new Blob([buffer], { type: "image/png" });
        formData.append("image", blob, "input.png");
        if (ref_image_base64) {
          const refBuffer = Buffer.from(ref_image_base64, "base64");
          const refBlob = new Blob([refBuffer], { type: "image/png" });
          formData.append("image", refBlob, "ref_1.png");
        }
        if (style_image_base64) {
          const styleBuffer = Buffer.from(style_image_base64, "base64");
          const styleBlob = new Blob([styleBuffer], { type: "image/png" });
          formData.append("image", styleBlob, "ref_2.png");
        }
        fetchOptions = {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKeyToUse}`
            // Content-Type is intentionally omitted so fetch sets it to multipart/form-data with boundary
          },
          body: formData
        };
      } else {
        const payload = {
          model,
          prompt,
          n: Number(n),
          response_format
        };
        if (model === "gpt-image-2") {
          if (image_base64) payload.image_base64 = image_base64;
          if (ref_image_base64) payload.ref_image_base64 = ref_image_base64;
          if (style_image_base64) payload.style_image_base64 = style_image_base64;
          if (size) payload.size = size;
          if (quality) payload.quality = quality;
        } else {
          if (aspect_ratio) payload.aspect_ratio = aspect_ratio;
          if (image_size) payload.image_size = image_size;
        }
        fetchOptions = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKeyToUse}`
          },
          body: JSON.stringify(payload)
        };
      }
      console.log(`[Proxy Request] URL: ${targetURL}, Model: ${model}, Has Input Image: ${hasInputImage}`);
      if (isExtend2) {
        console.log(`[Extend Task] Size: ${size}, Quality: ${quality}, Prompt Preview: ${(prompt || "").substring(0, 120)}... isExtend: ${isExtend2}`);
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6e5);
      fetchOptions.signal = controller.signal;
      const response = await fetch(targetURL, fetchOptions).finally(() => clearTimeout(timeoutId));
      const responseBodyText = await response.text();
      if (!response.ok) {
        console.error(`[Apilio API Error] Status: ${response.status}`, responseBodyText);
        return res.status(response.status).json({
          error: `Apilio API returned error status ${response.status}`,
          details: responseBodyText
        });
      }
      const jsonResponse = JSON.parse(responseBodyText);
      if (isChatModel) {
        var chatContent = jsonResponse.choices?.[0]?.message?.content || "";
        var urlMatch = chatContent.match(/\!\[.*?\]\((.*?)\)/);
        var imageUrl = urlMatch ? urlMatch[1] : (chatContent.startsWith("http") || chatContent.startsWith("data:image") ? chatContent : "");
        var txResponse = { created: jsonResponse.created || Date.now(), data: imageUrl ? [{ url: imageUrl }] : [{ b64_json: chatContent }] };
        return res.json(txResponse);
      }
      console.log(`[Proxy Response] Status: ${response.status}, hasData: ${jsonResponse.data ? jsonResponse.data.length : 0}, isExtend: ${isExtend2}`);
      return res.json(jsonResponse);
    } catch (error) {
      console.error("Error during Gemini generative fill:", error);
      console.log(`[Proxy Error] isExtend: ${isExtend}, error: ${error?.message || error}`);
      return res.status(500).json({
        error: "Internal server error occurred during generative fill proxy.",
        details: error?.message || error
      });
    }
  });
  app.post("/api/ps/download", async (req, res) => {
    const { url, filename } = req.body;
    if (!url) {
      return res.status(400).json({ error: "Missing url parameter" });
    }
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(response.status).send("Failed to fetch image");
      }
      const contentType = response.headers.get("content-type") || "image/png";
      const buffer = Buffer.from(await response.arrayBuffer());
      const safeFilename = filename ? filename.replace(/[^a-zA-Z0-9_\u4e00-\u9fff.-]/g, "_") : "image.png";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", 'attachment; filename="' + safeFilename + '"');
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (err) {
      console.error("Download image proxy error:", err);
      res.status(500).send("Failed to download image");
    }
  });
  app.get("/api/ps/download", async (req, res) => {
    const url = String(req.query.url || "");
    const filename = String(req.query.filename || "image.png");
    if (!url) {
      return res.status(400).send("Missing url query parameter");
    }
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(response.status).send("Failed to fetch image");
      }
      const contentType = response.headers.get("content-type") || "image/png";
      const buffer = Buffer.from(await response.arrayBuffer());
      const safeFilename = String(filename).replace(/[^a-zA-Z0-9_\u4e00-\u9fff.-]/g, "_") || "image.png";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", 'attachment; filename="' + safeFilename + '"');
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (err) {
      console.error("Download image GET error:", err);
      res.status(500).send("Failed to download image");
    }
  });
  {
    const rootDir = process.env.APP_ROOT || process.cwd();
    const distPath = import_path.default.join(rootDir, "dist");
    app.use(import_express.default.static(distPath));
const cacheDir = import_path.default.join(rootDir, "cache");
try { require("fs").mkdirSync(cacheDir, { recursive: true }); } catch(e) {}
app.use("/cache", import_express.default.static(cacheDir));

    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.use((err, req, res, next) => {
    console.error("[Express Error]", err?.message || err);
    if (err?.type === "entity.too.large") {
      return res.status(413).json({
        error: "\u6587\u4EF6\u592A\u5927\uFF0C\u5EFA\u8BAE\u6587\u4EF6\u50CF\u7D20\u57284000*4000\uFF0C5M\u4EE5\u5185"
      });
    }
    res.status(err?.status || 500).json({
      error: err?.message || "Internal server error occurred."
    });
  });
  function tryListen(port) {
    const srv = app.listen(port, "0.0.0.0", () => {
      console.log(`Express Photoshop Simulator server is running on http://localhost:${port}`);
    });
    srv.on("error", (err) => {
      if (err.code === "EADDRINUSE" && port < PORT + 10) {
        console.log(`Port ${port} in use, trying ${port + 1}...`);
        tryListen(port + 1);
      } else {
        console.error("Failed to start server:", err.message);
        process.exit(1);
      }
    });
  }
  tryListen(PORT);
}
startServer();
//# sourceMappingURL=server.cjs.map
