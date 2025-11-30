const darkModeSound = new Audio("Resources/sfx/darkmode.mp3");
const lightModeSound = new Audio("Resources/sfx/lightmode.mp3");

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
const prefersLight = window.matchMedia('(prefers-color-scheme: light)'); 

let currentMode = null;

function toggleDarkMode(newState, shouldPlaySound = true, updateCookie = true) {
    const toggleIcon = document.querySelector(".dark-mode-toggle i");

    // Trigger animation class
    toggleIcon.classList.add("switching");

    setTimeout(() => {
        if (newState === "on" && currentMode !== "on") {
            DarkReader.enable({ contrast: 110 });
            toggleIcon.className = "fa-solid fa-sun";

            if (shouldPlaySound) {
                playSound(darkModeSound);
            }
            if (updateCookie) setCookie("darkmode", "on", 9999);
            tryShowModalMessage('dark');
            currentMode = "on";
        } 
        else if (newState === "off" && currentMode !== "off") {
            DarkReader.disable();
            toggleIcon.className = "fa-solid fa-moon";

            if (shouldPlaySound) {
                playSound(lightModeSound);
            }
            if (updateCookie) setCookie("darkmode", "off", 9999);
            tryShowModalMessage('light');
            currentMode = "off";
        }

        toggleIcon.classList.remove("switching");
    }, 300);
}


document.querySelector(".dark-mode-toggle").addEventListener("click", function () {
    const darkreaderActive = document.querySelector(".darkreader");
    toggleDarkMode(darkreaderActive ? "off" : "on");
}, false);

function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    document.cookie = `${cname}=${cvalue};expires=${d.toUTCString()};path=/`;
}

function getCookie(cname) {
    const name = cname + "=";
    return document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith(name))?.substring(name.length) || "";
}

window.addEventListener("load", function () {
    const darkModeCookie = getCookie("darkmode");

    if (prefersDark.matches) {
        // Device prefers dark
        if (darkModeCookie !== "on") {
            toggleDarkMode("on", false, true); // force dark + update cookie
        } else {
            toggleDarkMode("on", false, false); // already correct, no cookie overwrite
        }
    } else if (prefersLight.matches) {
        // Device prefers light
        if (darkModeCookie !== "off") {
            toggleDarkMode("off", false, true); // force light + update cookie
        } else {
            toggleDarkMode("off", false, false);
        }
    } else {
        // fallback if system doesn’t specify, default to light
        toggleDarkMode(darkModeCookie === "on" ? "on" : "off", false, darkModeCookie === "");
    }
}, false);

if (window.matchMedia) {
    prefersDark.addEventListener("change", (e) => {
        const systemPref = e.matches ? "on" : "off";
        toggleDarkMode(systemPref, true, true); // always update cookie when system changes
    });
}

