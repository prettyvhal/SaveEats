document.addEventListener('DOMContentLoaded', () => {
    const mainContainer = document.querySelector('.main-window');
    const closeButtons = document.querySelectorAll('.close-btn');
    const MobileCloseButtons = document.querySelectorAll('.nav-bar');
    const modalContainers = document.querySelectorAll('.modal-container');
    const toggleModalBtn = document.querySelector('.toggle-modal-btn');
    const qrModal = document.getElementById("qrSlideModal");
    const qrBackdrop = document.getElementById("qrBackdrop");
    const qrscanner = document.querySelector(".qr-center");

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('Scripts/site/service-worker.js')
            .then(reg => console.log('Service Worker registered', reg))
            .catch(err => console.log('Service Worker registration failed', err));
        });
    }

    // Request permission once
    window.requestNotificationPermission = async function () {
        if (!('Notification' in window)) return false;

        // Already granted
        if (Notification.permission === 'granted') {
            return true;
        }

        // Already denied
        if (Notification.permission === 'denied') {
            console.warn('Notification permission previously denied');
            return false;
        }

        // Ask user
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    };


    // Send a notification anywhere
    window.sendNotification = async function(title, options = {}) {
    if (!('serviceWorker' in navigator)) return;

    if (Notification.permission !== 'granted') {
        console.warn('Notification permission not granted.');
        return;
    }

    const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
            registration.showNotification(title, options);
        }
    }
    
    let highestZIndex = 1000;
    let activeModal = null;

   document.addEventListener('contextmenu', function (event) {
        const allowedTags = ['TEXTAREA'];

        const isInsideForm = event.target.closest('form');
        const isAllowedTag = allowedTags.includes(event.target.tagName);

        if (isAllowedTag || isInsideForm) {
            return;
        }
        event.preventDefault();
    });

    window.safeVibrate ||= function (pattern) {
        try {
            if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
            navigator.vibrate(pattern);
            }
        } catch {}
    };

    const element = document.querySelector('.cad-name-special');
    if (element) {
        const text = element.textContent;
        element.textContent = '';

        text.split('').forEach((char, index) => {
            const span = document.createElement('span');
            span.textContent = char;
            span.style.animationDelay = `${index * 0.1}s`;
            element.appendChild(span);
        });
    }

    // Select all link-item elements
    const linkItems = document.querySelectorAll('.link-item');
    linkItems.forEach(item => {
        item.addEventListener('click', () => {
            const url = item.dataset.link;
            if (url) {
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        });
    });

    // --- General Setup ---
    function applyFloatAnimation() {
        if (window.innerWidth > 768) {
            mainContainer.style.animationPlayState = 'running';
        } else {
            mainContainer.style.animationPlayState = 'paused';
            mainContainer.style.transform = 'none';
        }
    }

    window.addEventListener('resize', applyFloatAnimation);
    applyFloatAnimation();

    // --- Z-Index Management for Multiple Windows ---
    function bringToFront(modalWindow) {
        highestZIndex++;
        modalWindow.style.zIndex = highestZIndex;
    }

    // --- Modal Closing and Reset ---
    closeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            // Route through manager only
            //window.modalManager.close(); 
            const parentModal = button.closest('.modal-container');
            parentModal.classList.remove('visible');
            
            // Hide the floating toggle button
            toggleModalBtn.style.display = 'none';
            activeModal = null;
        });
    });

    // --- Floating Button Toggle Functionality ---
    toggleModalBtn.addEventListener('click', () => {
        if (activeModal) {
            activeModal.classList.toggle('visible');
            const icon = toggleModalBtn.querySelector('i');
            if (activeModal.classList.contains('visible')) {
                icon.classList.remove('fa-square-plus');
                icon.classList.add('fa-square-minus');
            } else {
                icon.classList.remove('fa-square-minus');
                icon.classList.add('fa-square-plus');
            }
        }
    });

    MobileCloseButtons.forEach(button => {
        let startY = 0;
        let moved = false;
        let isTouch = false;

        const closeModal = (e) => {
            const parentModal = button.closest('.modal-container');
            if (!parentModal) return;

            parentModal.classList.remove('visible');
            //modalManager.close([parentModal]);
            //window.modalManager.close(); 

            safeVibrate([30]);
            toggleModalBtn.style.display = 'none';
            activeModal = null;

            e?.preventDefault();
            e?.stopPropagation();
        };

        /* ---------- TOUCH ---------- */

        button.addEventListener('touchstart', e => {
            isTouch = true;
            startY = e.touches[0].clientY;
            moved = false;
        }, { passive: true });

        button.addEventListener('touchmove', e => {
            const currentY = e.touches[0].clientY;
            if (Math.abs(currentY - startY) > 5) {
                moved = true;
            }
        }, { passive: true });

        button.addEventListener('touchend', e => {
            const endY = e.changedTouches[0].clientY;
            const swipeDistance = startY - endY;

            const isSwipeUp = moved && swipeDistance > 10;
            const isTap = !moved || Math.abs(swipeDistance) < 5;

            if (isSwipeUp || isTap) {
                closeModal(e);
            }

            startY = 0;
            moved = false;

            // Reset after touch so click doesn't fire
            setTimeout(() => (isTouch = false), 0);
        });

        /* ---------- MOUSE / DESKTOP ---------- */

        button.addEventListener('click', e => {
            // Ignore synthetic click after touch
            if (isTouch) return;

            closeModal(e);
        });

        /* ---------- OPTIONAL HOVER ---------- */

        if (window.attachHoverListeners) {
            window.attachHoverListeners();
        }
    });

    // Reset window position and size after closing animation finishes
    modalContainers.forEach(container => {
        const modalWindow = container.querySelector('.modal-window');
        if (modalWindow) {
            modalWindow.addEventListener('transitionend', (e) => {
                if (e.propertyName === 'transform' && !container.classList.contains('visible')) {
                    
                    setTimeout(() => {
                        modalWindow.style.left = '';
                        modalWindow.style.top = '';
                        modalWindow.style.width = '';
                        modalWindow.style.height = '';
                    }, 500); // 500 milliseconds delay
                }
            });
        }
    });

    // Handle clicks on modals to bring them to the front
    modalContainers.forEach(container => {
        container.addEventListener('mousedown', (e) => {
            toggleModalBtn.style.display = 'block';
            const modalWindow = e.target.closest('.modal-window');
            if (modalWindow) {
                bringToFront(modalWindow);
                activeModal = container;
            }
        });
    });

    // --- Draggable Window Functionality ---
    let activeDraggable = null;
    let initialX, initialY;

    function dragStart(e) {
        // This is the key fix. Check if the element is the close button and return early if it is.
        if (e.target.classList.contains('close-btn')) {
            return;
        }

        const handle = e.target.closest('.window-header.handle');
        if (!handle) return;

        e.preventDefault();

        activeDraggable = handle.closest('.modal-window, .nav-bar');
        if (!activeDraggable) return;

        activeDraggable.classList.add('is-dragging');

        const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;

        const rect = activeDraggable.getBoundingClientRect();
        initialX = clientX - rect.left;
        initialY = clientY - rect.top;

        activeDraggable.style.position = 'absolute';
        activeDraggable.style.left = `${rect.left}px`;
        activeDraggable.style.top = `${rect.top}px`;

        activeDraggable.style.cursor = 'grabbing';
        bringToFront(activeDraggable);
    }

    function dragEnd() {
        if (activeDraggable) {
            activeDraggable.classList.remove('is-dragging');
            activeDraggable.style.cursor = 'grab';
            activeDraggable = null;
        }
    }

    function drag(e) {
        if (!activeDraggable) return;

        const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;

        const newX = clientX - initialX;
        const newY = clientY - initialY;

        activeDraggable.style.left = `${newX}px`;
        activeDraggable.style.top = `${newY}px`;
    }

    document.querySelectorAll('.modal-window .window-header').forEach(handle => {
        handle.classList.add('handle');
        handle.addEventListener('mousedown', dragStart);
        handle.addEventListener('touchstart', dragStart);
    });

    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('touchend', dragEnd);
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);

    // --- Resizeavle Window Functionality ---
    (function () {
        // ensure handles exist
        document.querySelectorAll('.modal-window-base').forEach(modal => {
            if (!modal.querySelector('.resize-handle')) {
                const handle = document.createElement('div');
                handle.className = 'resize-handle';
                modal.appendChild(handle);
            }
        });

        let resizing = false;
        let resizeEl = null;
        let startX = 0,
            startY = 0,
            startW = 0,
            startH = 0,
            startLeft = 0,
            startTop = 0;

        const MIN_WIDTH = 400;
        const MIN_HEIGHT = window.innerHeight * 0.30;
        const MAX_HEIGHT = window.innerHeight * 0.90;
        const EDGE_PADDING = 20;

        function getCoords(ev) {
            return {
                clientX: ev.clientX !== undefined ? ev.clientX : (ev.touches ? ev.touches[0].clientX : (ev.changedTouches ? ev.changedTouches[0].clientX : 0)),
                clientY: ev.clientY !== undefined ? ev.clientY : (ev.touches ? ev.touches[0].clientY : (ev.changedTouches ? ev.changedTouches[0].clientY : 0))
            };
        }

        function onDown(ev) {
            const targetHandle = ev.target.closest?.('.resize-handle');
            if (!targetHandle) return;
            ev.preventDefault?.();

            const base = targetHandle.closest('.modal-window-base');
            if (!base) return;

            // bring parent modal-window to front
            const parentWindow = base.closest('.modal-window');
            if (parentWindow) bringToFront(parentWindow);

            // get rect of the base
            const rect = base.getBoundingClientRect();
            const coords = getCoords(ev);

            startX = coords.clientX;
            startY = coords.clientY;
            startW = rect.width;
            startH = rect.height;
            startLeft = rect.left;
            startTop = rect.top;

            resizeEl = base;
            resizing = true;

            if (parentWindow) parentWindow.classList.add('is-resizing');

            document.body.style.cursor = 'nwse-resize';
            if (ev.pointerId && typeof targetHandle.setPointerCapture === 'function') {
                try {
                    targetHandle.setPointerCapture(ev.pointerId);
                } catch (_) {}
            }
        }

        function onMove(ev) {
            if (!resizing || !resizeEl) return;
            ev.preventDefault && ev.preventDefault();

            const coords = getCoords(ev);
            const dx = coords.clientX - startX;
            const dy = coords.clientY - startY;

            let newW = Math.round(startW + dx);
            let newH = Math.round(startH + dy);

            // clamp to viewport bounds
            const maxW = Math.max(MIN_WIDTH, window.innerWidth - startLeft - EDGE_PADDING);
            const maxH = Math.max(MIN_HEIGHT, window.innerHeight - startTop - EDGE_PADDING);

            newW = Math.max(MIN_WIDTH, Math.min(maxW, newW));
            newH = Math.max(MIN_HEIGHT, Math.min(maxH, newH));

            resizeEl.style.width = `${newW}px`;
            resizeEl.style.height = `${newH}px`;

            // 🔹 update .modal-content max-height dynamically
            const modalContent = resizeEl.querySelector('.modal-content');
            if (modalContent) {
                // give padding space (~40px or use computed)
                modalContent.style.maxHeight = `${newH - 40}px`;
            }
        }

        function onUp(ev) {
            if (!resizing) return;
            resizing = false;

            try {
                if (ev.pointerId && ev.target && typeof ev.target.releasePointerCapture === 'function') {
                    ev.target.releasePointerCapture(ev.pointerId);
                }
            } catch (_) {}

            if (resizeEl) {
                const parentWindow = resizeEl.closest('.modal-window');
                if (parentWindow) {
                    setTimeout(() => {
                        parentWindow.classList.remove('is-resizing');
                        void parentWindow.offsetWidth;
                    }, 40);
                }
                resizeEl = null;
            }
            document.body.style.cursor = '';
        }

        // attach listeners
        document.querySelectorAll('.modal-window-base .resize-handle').forEach(handle => {
            handle.addEventListener('pointerdown', onDown, {
                passive: false
            });
        });
        window.addEventListener('pointermove', onMove, {
            passive: false
        });
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);

        // touch fallback
        if (!window.PointerEvent) {
            document.querySelectorAll('.modal-window-base .resize-handle').forEach(handle => {
                handle.addEventListener('touchstart', ev => onDown(ev.touches[0]), {
                    passive: false
                });
            });
            window.addEventListener('touchmove', ev => onMove(ev.touches[0]), {
                passive: false
            });
            window.addEventListener('touchend', ev => onUp(ev.changedTouches ? ev.changedTouches[0] : ev), {
                passive: false
            });
        }
    })();

    // navbar animation
    document.addEventListener("DOMContentLoaded", () => {
        const navBar = document.querySelector(".nav-bar");

        function triggerBounce() {
            void navBar.offsetWidth;

            const duration = 600 * 3; // 600ms * 3 loops = 1800ms
            const randomDelay = Math.random() * 7000 + 3000; // 3s–10s
            setTimeout(triggerBounce, duration + randomDelay);
        }

        setTimeout(triggerBounce, 4000);
    });
    
    // GLOBAL MODAL BACK-BUTTON MANAGER
    /*window.modalManager = {
        stack: [],
        zoomedImg: null,

        open(elements) {
            // 1. Ensure elements is an array
            const elementArray = Array.isArray(elements) ? elements : [elements];
            
            // 2. Push to local stack and update browser history
            this.stack.push(elementArray);
            history.pushState({ modalLevel: this.stack.length }, "");

            // 3. Visual Open with slight delay for CSS transition stability
            setTimeout(() => {
                requestAnimationFrame(() => {
                    elementArray.forEach(el => {
                        if (el) el.classList.add("visible");
                    });
                });
            }, 50);
        },

        close() {
            // Simply trigger history back; let handlePop do the work
            if (this.stack.length > 0) {
                history.back();
            }
        },

        handlePop() {
            // 1. Get the last opened group from the stack
            const topGroup = this.stack.pop();
            if (!topGroup) return;

            // 2. Visual Close with 50ms delay
            setTimeout(() => {
                requestAnimationFrame(() => {
                    topGroup.forEach(el => {
                        if (el) el.classList.remove("visible");
                    });
                    
                    // Handle Zoomed Image resets
                    this.zoomedImg = this.zoomedImg || document.getElementById("zoomedImage");
                    if (this.zoomedImg && topGroup.some(el => el && (el.contains(this.zoomedImg) || el === this.zoomedImg))) {
                        this.zoomedImg.classList.remove("is-zoomed");
                        if (typeof window.resetImage === "function") window.resetImage();
                    }
                });
            }, 50);

            // 3. Haptics
            if (typeof safeVibrate === "function") safeVibrate([40]);
        }
    };

    // Listen for the back button / history.back()
    window.addEventListener('popstate', () => window.modalManager.handlePop());*/

    if (qrModal && qrBackdrop) {
        let startY = 0;
        let currentY = 0;
        let dragging = false;

        qrModal.addEventListener("pointerdown", (e) => {
            //if (e.target.closest("[data-ignore-drag]")) return;
            if (e.pointerType === "mouse" && e.button !== 0) return;
            startY = e.clientY;
            dragging = true;
            qrModal.setPointerCapture(e.pointerId);
            qrModal.style.transition = "none";
        });

        qrModal.addEventListener("pointermove", (e) => {
            if (!dragging) return;
            currentY = e.clientY;
            const deltaY = Math.max(0, currentY - startY);
            qrModal.style.transform = `translate(-50%, ${deltaY}px)`;
        });

        qrModal.addEventListener("pointerup", finishDrag);
        qrModal.addEventListener("pointercancel", finishDrag);

        function finishDrag(e) {
            if (!dragging) return;
            dragging = false;
            qrModal.releasePointerCapture?.(e.pointerId);
            qrModal.style.transition = "transform 0.25s ease";

            const deltaY = Math.max(0, currentY - startY);

            if (deltaY > 120) {
                // Success: Close via Manager to keep history in sync
                qrModal.classList.remove("visible");
                qrBackdrop.classList.remove("visible");
                
                if (typeof window.stopQrScan === "function") window.stopQrScan();

                qrModal.style.transform = "translate(-50%, 100%)";
                setTimeout(() => {
                    qrModal.style.transform = "";
                }, 250);
                
                if (typeof safeVibrate === "function") safeVibrate([50]);
            } else {
                // Cancel: Snap back
                qrModal.style.transform = "translate(-50%, 0)";
            }
            startY = currentY = 0;
        }
    }

    // GLOBAL BUTTON ACTION SPINNER
    window.handleActionClick = async function(btn, actionFn) {
      const spinner = btn.querySelector('.btn-spinner');
      
      // 1. Enter Loading State
      btn.disabled = true;
      if (spinner) spinner.style.display = 'inline-block';
    
      try {
        // 2. Execute the passed function and WAIT for it
        await actionFn(); 
      } catch (err) {
        console.error("Action failed:", err);
        setTimeout(() => {
          if (typeof showError === "function") showError(err.message || err);
        }, 100);
      } finally {
        btn.disabled = false;
        if (spinner) spinner.style.display = 'none';
      }
    };

});