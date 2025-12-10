document.addEventListener('DOMContentLoaded', () => {
    const mainContainer = document.querySelector('.main-window');
    const closeButtons = document.querySelectorAll('.close-btn');
    const MobileCloseButtons = document.querySelectorAll('.nav-bar');
    const modalContainers = document.querySelectorAll('.modal-container');
    const toggleModalBtn = document.querySelector('.toggle-modal-btn');
    
    let highestZIndex = 1000;
    let activeModal = null;

    document.addEventListener('contextmenu', function (event) {
        // Prevent the context menu from appearing
        event.preventDefault();
    });

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
        button.addEventListener('click', () => {
            const parentModalContainer = button.closest('.modal-container');
            if (window.innerWidth > 600) {
                button.addEventListener('click', () => {
                    if (parentModalContainer) {
                        parentModalContainer.classList.remove('visible');
                        modalManager.close([parentModalContainer]);
                    }
                    toggleModalBtn.style.display = 'none';
                    activeModal = null;
                });
            }

        });
    });

    MobileCloseButtons.forEach(button => {
        let startY1 = 0;
        let endY1 = 0;
        let moved = false;

        button.addEventListener('touchstart', e => {
            startY1 = e.touches[0].clientY;
            endY1 = startY1;
            moved = false;
        });

        button.addEventListener('touchmove', e => {
            endY1 = e.touches[0].clientY;
            moved = true; // mark that a move happened
        });

        button.addEventListener('touchend', () => {
            if (moved && startY1 - endY1 > 50) {
                const parentModalContainer = button.closest('.modal-container');
                if (parentModalContainer) {
                    parentModalContainer.classList.remove('visible');
                    modalManager.close([parentModalContainer]);
                }
                navigator.vibrate([30])
                toggleModalBtn.style.display = 'none';
                activeModal = null;
            }
            startY1 = endY1 = 0;
            moved = false;
        });
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
            const modalWindow = e.target.closest('.modal-window');
            if (modalWindow) {
                bringToFront(modalWindow);
            }
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


    // Function to handle the FAQ dropdown
    function setupFaqDropdown() {
        const faqQuestions = document.querySelectorAll('.faq-question');

        faqQuestions.forEach(question => {
            question.addEventListener('click', () => {
                const faqItem = question.parentElement;
                const faqAnswer = faqItem.querySelector('.faq-answer');
                faqItem.classList.toggle('open');
                tryShowModalMessage('faq-modal');
                navigator.vibrate([20])
            });
        });
    }
    setupFaqDropdown();


    const faqIcon = document.getElementById('faq-icon');
    const faqModal = document.getElementById('faq-modal');

    if (faqIcon && faqModal) {
        faqIcon.addEventListener('click', () => {
            faqModal.classList.add('visible');
        });

        faqModal.querySelector('.close-btn').addEventListener('click', () => {
            faqModal.classList.remove('visible');
        });

        faqModal.addEventListener('click', (e) => {
            if (e.target === faqModal) {
                faqModal.classList.remove('visible');
            }
        });
    }
    
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
    window.modalManager = {
        stack: [],          // each entry is an array of elements
        historyLocked: false, // true if we already pushed a history entry

        open(elements) {
            if (!Array.isArray(elements)) elements = [elements];
            // Show elements
            elements.forEach(el => el.classList.add("visible"));
            // Add to stack
            this.stack.push(elements);
            // Lock history only if not locked yet
            if (!this.historyLocked) {
                history.pushState({ modalOpen: true }, "");
                this.historyLocked = true;
            }
        },

        close(elements) {
            if (!Array.isArray(elements)) elements = [elements];
            elements.forEach(el => el.classList.remove("visible"));
            // Remove from stack
            this.stack = this.stack.filter(group => group !== elements);
            // If nothing left, unlock history
            if (this.stack.length === 0) {
                this.historyLocked = false;
            }
        },

        closeTop() {
            if (this.stack.length === 0) return;
            const topGroup = this.stack.pop();
            topGroup.forEach(el => el.classList.remove("visible"));
            navigator.vibrate([40]);
 
            // If nothing left, unlock history
            if (this.stack.length === 0) {
                this.historyLocked = false;
            }
        }
    };

    // Intercept back button
    window.addEventListener("popstate", (e) => {
        // Only handle if stack is not empty
        if (window.modalManager.stack.length > 0) {
            window.modalManager.closeTop();
        }
    });

});