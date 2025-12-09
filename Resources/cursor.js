function smoothing(a, b, decay, dt) {
  return a + (b - a) * Math.exp(-decay * dt);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

const mobileAndTabletCheck = function () {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  return /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|ipad|playbook|silk|iphone|ipod/i.test(ua);
};

const cursorCircleElement = document.getElementById("cursorCircle");

let mouse = { x: 0, y: 0 };
let prevCircle = { x: 0, y: 0 };
let circle = { x: 0, y: 0, scale: 1, speed: 0 };
let scale = 1;
let target = null;
let lastTick = performance.now();
const smooth = 15;
const phi = (1 + Math.sqrt(5)) / 2;
const stick = phi - 1;
const circleSize = 35;

// === Idle Hide System ===
let idleTimer;
const idleDelay = 500;
function resetIdleTimer() {
  cursorCircleElement.style.opacity = "1";
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    cursorCircleElement.style.opacity = "0";
  }, idleDelay);
}
["mousemove", "mousedown", "mouseup"].forEach(evt =>
  document.addEventListener(evt, resetIdleTimer)
);
resetIdleTimer(); // initialize

// === Click / Hold Shape Animation ===
document.addEventListener("mousedown", () => {
  cursorCircleElement.style.transition = "border-radius 0.2s ease, opacity 0.2s ease";
  cursorCircleElement.style.borderRadius = "6px"; // sharpens corners on click
});

document.addEventListener("mouseup", () => {
  cursorCircleElement.style.borderRadius = "50%"; // back to circle
});

document.addEventListener("mousemove", (e) => {
  if (!target || scale === 1) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  } else {
    const targetBox = target.getBoundingClientRect();
    const targetX = target.tagName === "AUDIO"
      ? targetBox.left
      : (targetBox.left + targetBox.right) / 2;
    const targetY = (targetBox.top + targetBox.bottom) / 2;
    mouse.x = lerp(e.clientX, targetX, stick);
    mouse.y = lerp(e.clientY, targetY, stick);
  }
});

document.addEventListener("mouseover", (e) => {
  let hoveredImportantElement = false;

  // List of important tags and classes
  const importantTags = ["A", "AUDIO", "BUTTON", "INPUT", "TEXTAREA", "BLOCKQUOTE"];
  const importantClasses = [
    "palette",
    "cad-name",
    "project-item",
    "icon-item",
    "link-item",
    "resize-handle",
    "faq-item",
    "item-card",
    "profileImage",
    "restoName",
    "restaurant-card"
  ];

  for (let element = e.target; element; element = element.parentElement) {
    // Check for tag name match
    if (importantTags.includes(element.tagName)) {
      hoveredImportantElement = true;
      target = element;
      break;
    }

    // Check for any of the important classes
    if (element.classList) {
      for (const cls of importantClasses) {
        if (element.classList.contains(cls)) {
          hoveredImportantElement = true;
          target = element;
          break;
        }
      }
      if (hoveredImportantElement) break;
    }
  }

  if (hoveredImportantElement && target) {
    const rect = target.getBoundingClientRect();
    scale = Math.min(rect.height, rect.width) / circleSize;
    scale *= phi * 0.9;
  } else {
    target = null;
    scale = 1;
  }
});


function cursorCircle(tick) {
  const dt = (tick - lastTick) / 1000;
  lastTick = tick;

  if (!isNaN(dt)) {
    circle.x = smoothing(mouse.x, circle.x, smooth, dt);
    circle.y = smoothing(mouse.y, circle.y, smooth, dt);
    circle.scale = smoothing(scale, circle.scale, smooth, dt);

    const dx = prevCircle.x - circle.x;
    const dy = prevCircle.y - circle.y;

    const speed = Math.sqrt(dx * dx + dy * dy);
    circle.speed = smoothing(circle.speed, speed, smooth, dt);
    const speedRemap = Math.min(circle.speed / 100, 0.3);

    const angle = Math.atan2(dy, dx);
    const translate = `translate(${circle.x}px, ${circle.y}px)`;
    const speedScale = `scale(${1 + speedRemap}, ${1 - speedRemap})`;
    const elementScale = `scale(${circle.scale})`;
    const rotate = `rotate(${angle}rad)`;

    // Adjust border thickness dynamically to compensate for scaling
    const adjustedBorder = 2 / circle.scale; // inverse of scale

    cursorCircleElement.style.borderWidth = `${adjustedBorder}px`;


    prevCircle.x = circle.x;
    prevCircle.y = circle.y;

    cursorCircleElement.style.transform = `${translate} ${rotate} ${speedScale} ${elementScale}`;
  }

  requestAnimationFrame(cursorCircle);
}

if (!mobileAndTabletCheck()) {
  cursorCircle();
} else {
  cursorCircleElement?.remove();
}
