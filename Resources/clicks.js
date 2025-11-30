// =======================
// Global audio variables
// =======================
let saitoAudio = null;
let otherAudio = null; // optional future sound
let audioContext = null;
let hoverAudioBuffer = null;
let firstInteractionOccurred = false;

const clickAudioFilePaths = [
    'Resources/sfx/click_sfx.mp3',
    'Resources/sfx/click_general.mp3',
    'Resources/sfx/click_close.mp3',
];
const clickAudioPlayers = [];
const hoverAudioFilePath = 'Resources/sfx/hover.mp3';
const clickToggle = 'Resources/sfx/click-toggle.mp3';

let audioEnabled = getCookie("audioEnabled") !== "false"; // default ON

// =======================
// Init click + hover audio
// =======================
document.addEventListener('DOMContentLoaded', () => {
    // Preload click sounds
    clickAudioFilePaths.forEach(path => {
        try {
            const audio = new Audio(path);
            audio.volume = 0.5;
            audio.preload = 'auto';
            clickAudioPlayers.push(audio);
        } catch (e) {
            console.error(`Error creating HTML Audio for "${path}":`, e);
        }
    });

    async function loadHoverSound() {
        if (!audioContext) return;
        try {
            const response = await fetch(hoverAudioFilePath);
            const arrayBuffer = await response.arrayBuffer();
            hoverAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            console.log("Hover audio loaded.");
        } catch (e) {
            console.error(`Failed to load hover sound:`, e);
        }
    }

    async function initAudio() {
        if (firstInteractionOccurred) return;

        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === 'suspended') {
            try {
                await audioContext.resume();
                console.log("AudioContext resumed.");
            } catch (e) {
                console.warn("AudioContext resume failed:", e);
            }
        }

        try {
            const testAudio = clickAudioPlayers[0];
            if (testAudio) {
                testAudio.muted = true;
                await testAudio.play();
                testAudio.pause();
                testAudio.currentTime = 0;
                testAudio.muted = false;
                console.log("HTMLAudio unlocked.");
            }
        } catch (e) {
            console.warn("Silent HTMLAudio unlock failed:", e);
        }

        await loadHoverSound();

        firstInteractionOccurred = true;
        console.log("Audio systems fully unlocked.");
    }

    // Interactive selectors
    const interactiveSelectors = `
        a, button, image, input, select, textarea, i, [class="cad-name"],
        project-item, .palette,
        [role="button"], [role="link"], [role="checkbox"],
        [role="radio"], [role="switch"], 
        [tabindex]:not([tabindex="-1"]),
        [onclick], [contenteditable="true"]`;

    // Unlock on first user input
    document.body.addEventListener('click', initAudio, { once: true });
    document.body.addEventListener('keydown', initAudio, { once: true });

    // Attach listeners
    document.body.addEventListener('click', (event) => {
        if (event.target.closest(interactiveSelectors)) {
            playRandomClickSound();
        }
    });

    document.body.addEventListener('mouseover', (event) => {
        if (event.target.closest(interactiveSelectors)) {
            playPitchedHoverSound();
        }
    });
});

// =======================
// Saito audio section
// =======================
document.addEventListener('DOMContentLoaded', () => {
    const saitoSection = document.getElementById('saito-section');
    saitoAudio = document.getElementById('saitoAudio');

    if (!saitoSection || !saitoAudio) return;

    let saitoUnlocked = false;

    document.body.addEventListener('click', async () => {
        if (!saitoUnlocked) {
            try {
                await saitoAudio.play();
                saitoAudio.pause();
                saitoAudio.currentTime = 0;
                saitoUnlocked = true;
                console.log("Saito audio unlocked.");
            } catch (e) {
                console.warn("Saito unlock failed:", e);
            }
        }
    }, { once: true });

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting && saitoUnlocked) {
                setTimeout(() => {
                    playSaitoAudio();
                }, 1000);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    observer.observe(saitoSection);
});

// =======================
// Toggle button system
// =======================
document.addEventListener('DOMContentLoaded', () => {
    const clicksBtn = document.querySelector('.clicks-btn');
    if (!clicksBtn) return;

    const clicksIcon = clicksBtn.querySelector('i');
    updateIcon();

    clicksBtn.addEventListener("click", () => {
        clicksIcon.classList.add("switching");

        setTimeout(() => {
            audioEnabled = !audioEnabled;
            setCookie("audioEnabled", audioEnabled, 9999);
            updateIcon();

            if (!audioEnabled) {
                try { saitoAudio?.pause(); } catch (e) {}
                tryShowModalMessage('mute');
            }
            playSound(new Audio(clickToggle));
            if (audioEnabled) {
                tryShowModalMessage('sound');
            }
            clicksIcon.classList.remove("switching");
        }, 800);
    });

    function updateIcon() {
        clicksIcon.className = audioEnabled
            ? "fa-solid fa-volume-high" 
            : "fa-solid fa-volume-xmark";
    }
});

// =======================
// Global sound wrappers
// =======================
function playRandomClickSound() {
    if (!audioEnabled || !firstInteractionOccurred || clickAudioPlayers.length === 0) return;
    try {
        const randomIndex = Math.floor(Math.random() * clickAudioPlayers.length);
        const audio = clickAudioPlayers[randomIndex];
        audio.pause();
        audio.currentTime = 0;
        audio.play().catch(e => console.warn("Click SFX blocked:", e));
    } catch (e) {
        console.error("Error playing click sound:", e);
    }
}

function playPitchedHoverSound() {
    if (!audioEnabled || !firstInteractionOccurred || !hoverAudioBuffer || !audioContext) return;
    try {
        const source = audioContext.createBufferSource();
        source.buffer = hoverAudioBuffer;
        source.playbackRate.value = 0.8 + Math.random() * 0.4;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0.6;

        source.connect(gainNode).connect(audioContext.destination);
        source.start(0);
    } catch (e) {
        console.error("Error playing hover sound:", e);
    }
}

window.attachHoverListeners = function () {
    document.querySelectorAll
        ('.project-item, .link-item, .icon-item, .faq-question, .skill-tag').forEach(item => {
        let isHovered = false;
        item.addEventListener('mouseenter', () => {
            if (!isHovered) {
                playPitchedHoverSound();
                isHovered = true;
            }
        });
        item.addEventListener('mouseleave', () => {
            isHovered = false;
        });
    });
};

document.querySelectorAll('.icon-item, .faq-question, .faq-modal').forEach(item => {
    let isHovered = false;
    item.addEventListener('click', () => {
        if (!isHovered) {
            playRandomClickSound();
            isHovered = true;
        }
    });
    item.addEventListener('mouseleave', () => {
        isHovered = false;
    });
});

function playSound(audio = null) {
    if (!audioEnabled || !audio) return; // <-- checks global toggle
    try {
        audio.pause();
        audio.currentTime = 0;
        audio.play().catch(e => console.warn("Sound blocked:", e));
    } catch (e) {
        console.error("Error playing audio:", e);
    }
}

function playSound(audio = null) {
    if (!audioEnabled || !audio) return;
    try {
        audio.currentTime = 0;
        audio.play().catch(e => console.warn("Sound blocked:", e));
    } catch (e) {
        console.error("Error playing audio:", e);
    }
}

// =======================
// Cookie helpers
// =======================
function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    document.cookie = `${cname}=${cvalue};expires=${d.toUTCString()};path=/`;
}

function getCookie(cname) {
    const name = cname + "=";
    return document.cookie
        .split(';')
        .map(c => c.trim())
        .find(c => c.startsWith(name))
        ?.substring(name.length) || "";
}
