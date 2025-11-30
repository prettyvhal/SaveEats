const paletteBtn = document.querySelector('.palette-btn');
const paletteOptions = document.querySelector('.palette-options');
const palettes = document.querySelectorAll('.palette');
const hueSlider = document.getElementById("hue-slider");
let hideTimeout;

const sfxSelects = [
    new Audio('Resources/sfx/color.mp3'),
    new Audio('Resources/sfx/color1.mp3')
];

// Palette variable sets
const themes = {
    base: {
        "--yellow": "#ffd6a5",
        "--orange": "#fc3126",
        "--orangeL": "#fc5c53",
        "--orangeL1": "#fa857d",
        "--orangeHL": "#f5bdb3",
        "--orangeD": "#b91c1c",
        "--ptext": "#3a0d0d",
        "--light-gray": "#fff2f1",
        "--dark-gray": "#2a0505",
        "--icon-drop-shadow": "#cc3c35",
        "--light-orange": "#ffe4e1",
        "--light-orange1": "#ffecec",
        "--dark-orange": "#7f0e0e",
        "--dark-orange1": "#a71a1a",
        "--mobile-icon-item": "#ffbcb880",
        "--cursor": "#fa857d50"
    },
    orange: {
        "--yellow": "#ffef5b",
        "--orange": "#ffa600",
        "--orangeL": "#ffdb65",
        "--orangeL1": "#fbce3d",
        "--orangeHL": "#ffeed0",
        "--orangeD": "#fa8b4b",
        "--ptext": "#4a3101",
        "--light-gray": "#f2f2f2",
        "--dark-gray": "#4a3101",
        "--icon-drop-shadow": "#be976b",
        "--light-orange": "#fff6e7",
        "--light-orange1": "#fffbf4",
        "--dark-orange": "#6e4800",
        "--dark-orange1": "#cb682e",
        "--mobile-icon-item": "#ffeed0c5",
        "--cursor": "#ffeed050"
    },
    blue: {
        "--yellow": "#e0f2fe",
        "--orange": "#3b82f6",     // Primary Blue
        "--orangeL": "#60a5fa",    // Lighter Blue
        "--orangeL1": "#93c5fd",   // Even Lighter Blue
        "--orangeHL": "#c2dcff",   // Blue Highlight/Accent
        "--orangeD": "#2563eb",    // Darker Blue
        "--ptext": "#1e3a8a",
        "--light-gray": "#f0f9ff",
        "--dark-gray": "#1e293b",
        "--icon-drop-shadow": "#60a5fa",
        "--light-orange": "#e0f2fe",
        "--light-orange1": "#f0f9ff",
        "--dark-orange": "#1e3a8a", // Dark Blue
        "--dark-orange1": "#2563eb",
        "--mobile-icon-item": "#c2dcffc5", // Transparent Blue Highlight
        "--cursor": "#c2dcff50"
    },
    green: {
        "--yellow": "#e6f9df",
        "--orange": "#10b981",     // Primary Green
        "--orangeL": "#34d399",    // Lighter Green
        "--orangeL1": "#86efac",   // Even Lighter Green
        "--orangeHL": "#c5fcd8",   // Green Highlight/Accent
        "--orangeD": "#059669",    // Darker Green
        "--ptext": "#053427",
        "--light-gray": "#f7fff9",
        "--dark-gray": "#063e2f",
        "--icon-drop-shadow": "#64bd9c",
        "--light-orange": "#f0fff7",
        "--light-orange1": "#f0fff7",
        "--dark-orange": "#053427", // Dark Green
        "--dark-orange1": "#059669",
        "--mobile-icon-item": "#c5fcd8c5", // Transparent Green Highlight
        "--cursor": "#c5fcd850"
    },

    pink: {
        "--yellow": "#fdf2f8",
        "--orange": "#ec4899",     // Primary Pink
        "--orangeL": "#f472b6",    // Lighter Pink
        "--orangeL1": "#f9a8d4",   // Even Lighter Pink
        "--orangeHL": "#fccce8",   // Pink Highlight/Accent
        "--orangeD": "#be185d",    // Darker Pink
        "--ptext": "#831843",
        "--light-gray": "#fff0f7",
        "--dark-gray": "#500724",
        "--icon-drop-shadow": "#f472b6",
        "--light-orange": "#fdf2f8",
        "--light-orange1": "#fff0f7",
        "--dark-orange": "#831843", // Dark Pink
        "--dark-orange1": "#be185d",
        "--mobile-icon-item": "#fccce8c5", // Transparent Pink Highlight
        "--cursor": "#fccce850"
    },
    purple: {
        "--yellow": "#f5e1ff",
        "--orange": "#8b5cf6",     // Primary Purple
        "--orangeL": "#a78bfa",    // Lighter Purple
        "--orangeL1": "#c4b5fd",   // Even Lighter Purple
        "--orangeHL": "#d8cffc",   // Purple Highlight/Accent
        "--orangeD": "#7c3aed",    // Darker Purple
        "--ptext": "#2e1065",
        "--light-gray": "#faf5ff",
        "--dark-gray": "#4c1d95",
        "--icon-drop-shadow": "#8f6fd6",
        "--light-orange": "#f3e8ff",
        "--light-orange1": "#faf5ff",
        "--dark-orange": "#3b0764", // Dark Purple
        "--dark-orange1": "#7c3aed",
        "--mobile-icon-item": "#d8cffcc5", // Transparent Purple Highlight
        "--cursor": "#d8cffc50"
    },
    red: {
        "--yellow": "#ffeeee",      // Lightest accent
        "--orange": "#fc5656",      // Primary Red
        "--orangeL": "#f87171",     // Lighter Red
        "--orangeL1": "#fca5a5",    // Even Lighter Red
        "--orangeHL": "#fabebe",    // Red Highlight/Accent
        "--orangeD": "#dc2626",     // Darker Red
        "--ptext": "#7f1d1d",       // Dark text (dark red)
        "--light-gray": "#fffafa",  // Very light background
        "--dark-gray": "#450a0a",   // Dark background/text
        "--icon-drop-shadow": "#f87171",
        "--light-orange": "#ffeeee",
        "--light-orange1": "#fffafa",
        "--dark-orange": "#7f1d1d", // Dark Red
        "--dark-orange1": "#dc2626",
        "--mobile-icon-item": "#fabebec5", // Transparent Red Highlight
        "--cursor": "#fabebe50"
    }
};

function getThemeHue(theme) {
    const primary = theme["--orange"] ;
    const { h } = hexToHSL(primary);
    return h;
}

// Toggle palette menu
paletteBtn.addEventListener('click', () => {
    paletteOptions.classList.toggle('show');
    resetHideTimer();
});

function hidePalette() {
    paletteOptions.classList.remove('show');
}

function resetHideTimer() {
  clearTimeout(hideTimeout);
  hideTimeout = setTimeout(() => {
    hidePalette();
  }, 3000); // 3 seconds
}

['mousemove', 'click', 'touchstart', 'touchmove'].forEach(event => {
    paletteOptions.addEventListener(event, resetHideTimer);
});
['mousemove', 'click', 'touchstart', 'touchmove'].forEach(event => {
    hueSlider.addEventListener(event, resetHideTimer);
});

// Apply palette + save to cookies
palettes.forEach(palette => {
    palette.addEventListener('click', () => {
        const choice = palette.dataset.palette;
        const paletteIcon = paletteBtn.querySelector("i");
        paletteIcon.classList.add("switching");
        

        if (choice === "hue-shift") {
            const newHue = Math.floor(Math.random() * 360);

            // Cache both theme + hue
            document.cookie = `theme=hue-shift; path=/; max-age=31536000`;
            document.cookie = `hueShift=${newHue}; path=/; max-age=31536000`;

            applyHueShiftTheme(newHue);
        } else {
            document.cookie = `theme=${choice}; path=/; max-age=31536000`;
            applyTheme(choice);
        }

        setTimeout(() => {
            paletteIcon.classList.remove("switching");
        }, 800);
        //tryShowModalMessage('color');

        const randomSFX = sfxSelects[Math.floor(Math.random() * sfxSelects.length)];
        playSound(randomSFX);

        paletteOptions.classList.remove('show');
    });
});


// Load theme from cookies on startup
window.addEventListener("load", () => {
    const theme = document.cookie.split('; ').find(r => r.startsWith("theme="))?.split("=")[1];
    const savedHue = parseInt(document.cookie.split('; ').find(r => r.startsWith("hueShift="))?.split("=")[1]);

    if (!theme) return;

    if (theme === "hue-shift") {
        hueSlider.value = savedHue;
        applyHueShiftTheme(savedHue);
    } else {
        applyTheme(theme);
        const themeHue = getThemeHue(themes[theme]);
        hueSlider.value = themeHue;
    }
});


function applyTheme(name) {
    if (name === "hue-shift") {
        let hueValue = parseInt(
            document.cookie.split("; ")
            .find(r => r.startsWith("hueShift="))
            ?.split("=")[1] ?? 0
        );
        hueSlider.value = hueValue;
        applyHueShiftTheme(hueValue);
        return;
    }

    const themeVars = themes[name];
    for (let key in themeVars) {
        document.documentElement.style.setProperty(key, themeVars[key]);
    }

    const themeHue = getThemeHue(themeVars);
    hueSlider.value = themeHue;

    document.cookie = `hueShift=${themeHue}; path=/; max-age=31536000`;
}

function applyHueShiftTheme(deg) {
    const base = themes.base; // baseline palette

    for (let key in base) {
        const shifted = hueShiftColor(base[key], deg);
        document.documentElement.style.setProperty(key, shifted);
    }

    // Save hue value and update slider + cookies
    document.documentElement.style.setProperty("--hue-value", deg);
    
    localStorage.setItem("savedHue", deg);
    document.cookie = `hueShift=${deg}; path=/; max-age=31536000`;

    // Sync slider if visible
    if (hueSlider) hueSlider.value = deg;
}

hueSlider.addEventListener("input", (e) => {
    const hue = parseInt(e.target.value);

    // Force theme into hue-shift mode
    document.cookie = `theme=hue-shift; path=/; max-age=31536000`;

    applyHueShiftTheme(hue);
});


/* Convert hex → HSL → shift Hue → back to hex */
function shiftHue(deg) {
    const styles = getComputedStyle(document.documentElement);

    for (let varName in themes.base) { 
        let original = styles.getPropertyValue(varName).trim();
        if (!original.startsWith("#")) continue;

        let shifted = hueShiftColor(original, deg);
        document.documentElement.style.setProperty(varName, shifted);
    }
}

function hueShiftColor(hex, deg) {
    let { h, s, l, a } = hexToHSL(hex);

    h = (h + deg) % 360;

    // saturation & brightness
    s = Math.min(100, s * 0.6);
    l = Math.min(100, Math.max(10, l)); 

    return HSLToHex(h, s, l, a);
}

function hexToHSL(H) {
    let r = 0, g = 0, b = 0, a = 1;

    // 4-digit hex (#RGBA)
    if (H.length === 5) {
        r = parseInt(H[1] + H[1], 16);
        g = parseInt(H[2] + H[2], 16);
        b = parseInt(H[3] + H[3], 16);
        a = parseInt(H[4] + H[4], 16) / 255;
    } 
    // 8-digit hex (#RRGGBBAA)
    else if (H.length === 9) {
        r = parseInt(H[1] + H[2], 16);
        g = parseInt(H[3] + H[4], 16);
        b = parseInt(H[5] + H[6], 16);
        a = parseInt(H[7] + H[8], 16) / 255;
    } 
    // 3-digit hex (#RGB)
    else if (H.length === 4) {
        r = parseInt(H[1] + H[1], 16);
        g = parseInt(H[2] + H[2], 16);
        b = parseInt(H[3] + H[3], 16);
    } 
    // 6-digit hex (#RRGGBB)
    else {
        r = parseInt(H[1] + H[2], 16);
        g = parseInt(H[3] + H[4], 16);
        b = parseInt(H[5] + H[6], 16);
    }

    r /= 255; g /= 255; b /= 255;

    let cmin = Math.min(r, g, b),
        cmax = Math.max(r, g, b),
        delta = cmax - cmin;

    let h = 0, s = 0, l = (cmax + cmin) / 2;

    if (delta !== 0) {
        if (cmax === r) h = ((g - b) / delta) % 6;
        else if (cmax === g) h = (b - r) / delta + 2;
        else h = (r - g) / delta + 4;
        h = Math.round(h * 60);
        if (h < 0) h += 360;
        s = delta / (1 - Math.abs(2 * l - 1));
    }

    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);

    return { h, s, l, a };
}

function HSLToHex(h, s, l, a = 1) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a1 = s * Math.min(l, 1 - l);
    const f = n => l - a1 * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = x => `0${Math.round(x * 255).toString(16)}`.slice(-2).toUpperCase();
    const alphaHex = `0${Math.round(a * 255).toString(16)}`.slice(-2).toUpperCase();
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}${alphaHex}`;
}
