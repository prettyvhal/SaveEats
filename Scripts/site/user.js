import { app, auth, db } from "https://cadlaxa.github.io/SaveEats/Scripts/site/firebase-init.js";
import {
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
  setDoc,
  getDoc,
  doc,
  updateDoc,
  increment,
  deleteDoc,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function checkSecondaryPermissions() {
  const modal = document.getElementById("notif-modal2");
  const yesBtn = document.getElementById("yesBtn");
  const noBtn = document.getElementById("noBtn");
  const closeBtn = modal.querySelector(".close-btn");
  const message = modal.querySelector(".notif-message");

  message.textContent = "Enable notifications and motion effects for the best SaveEats experience 🥕";
  if (Notification.permission === 'granted') {
    if (typeof initShakeDetection === 'function') initShakeDetection();
    return;
  }

  if (Notification.permission === 'denied') return;
  if (
    'Notification' in window &&
    Notification.permission === 'default' &&
    !localStorage.getItem('notifChoice')
  ) {
    //window.modalManager.open(modal);
    modal.classList.add("visible");

    yesBtn.onclick = async () => {
      const granted = await window.requestNotificationPermission();
      
      // 2. Handle Motion Permission
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
          try {
              const response = await DeviceMotionEvent.requestPermission();
              if (response === 'granted') {
                  initShakeDetection(); // Now it's safe to start listening
              }
          } catch (e) {
              console.error("Motion Permission Error:", e);
          }
      } else {
          initShakeDetection();
      }

      // 3. Now perform the cleanup tasks
      localStorage.setItem('notifChoice', 'asked');
      //window.modalManager.close();
      modal.classList.remove("visible");

      if (granted) {
          if (typeof window.sendNotification === 'function') {
              window.sendNotification('Welcome! 🥕', {
                  body: 'Notifications and motion effects enabled.',
                  icon: 'Resources/assets/icon1.png',
                  data: { url: 'home-user.html' }
              });
          }
      }
    };

    noBtn.onclick = () => {
      localStorage.setItem('notifChoice', 'declined');
      //window.modalManager.close();
      modal.classList.remove("visible");
    };

    closeBtn.onclick = () => {
      localStorage.setItem('notifChoice', 'dismissed');
      //window.modalManager.close();
      modal.classList.remove("visible");
    };
  }
}

let shakeAudio = null;
let shakeStopTimer = null;

function playShakeSound() {
    if (shakeAudio && !shakeAudio.paused) {
        resetShakeStopTimer(); // Keep playing as long as shaking continues
        return;
    }

    // 2. Initialize and play sound
    shakeAudio = new Audio("Resources/sfx/shaker.mp3");
    shakeAudio.loop = true; // Loop so it doesn't end while shaking
    
    if (typeof safeVibrate === 'function') safeVibrate([100, 50, 100]);
    shakeAudio.play().catch(e => console.warn("Shake SFX blocked:", e.message));
    resetShakeStopTimer();
}

function resetShakeStopTimer() {
    if (shakeStopTimer) clearTimeout(shakeStopTimer);
    shakeStopTimer = setTimeout(() => {
        if (shakeAudio) {
            shakeAudio.pause();
            shakeAudio.currentTime = 0;
        }
    }, 300); 
}

function initShakeDetection() {
    const shakeThreshold = 20;

    window.addEventListener('devicemotion', (event) => {
        const acc = event.accelerationIncludingGravity;
        if (!acc) return;

        const totalMovement = Math.abs(acc.x) + Math.abs(acc.y) + Math.abs(acc.z);

        if (totalMovement > shakeThreshold) {
            playShakeSound();
        }
    });
}

window.addEventListener("load", loadRestaurants);
const qrModal = document.getElementById("qrSlideModal");
const qrBackdrop = document.getElementById("qrBackdrop");

function loadRestaurants() {
  const grid = document.getElementById("restaurantGrid");
  const emptyState = document.getElementById("homeEmptyState");

  onSnapshot(collection(db, "users"), (snap) => {
    grid.innerHTML = "";
    emptyState.style.display = "none";

    let count = 0;

    snap.forEach((docSnap, index) => {
      const resto = docSnap.data();

      if (resto.type !== "restaurant") return;

      count++;

      const restoId = docSnap.id;
      const name = resto.username || "Unnamed Restaurant";
      const logo = resto.profileBase64 || "Resources/assets/profile.jpg";
      const banner = resto.bannerBase64 || "Resources/assets/banner.webp";

      const div = document.createElement("div");
      div.className = "restaurant-card";

      div.innerHTML = `
        <div class="restaurant-banner">
          <img class="item-image-bg1" src="${logo}">
          <img src="${banner}" alt="Banner" class="restaurant-banner-foreground">

          <div class="resto-rating" id="restoRating">
            <i class="star fa-solid fa-star"></i>
            <span id="avg-${restoId}" class="resto-average-rating">0.0</span>
          </div>

        </div>
        <div class="restaurant-logo-container">
          <img class="restaurant-logo" src="${logo}" alt="Logo">
        </div>
        <div class="bottom-row1">
          <div class="restaurant-name">${name}</div>
        </div>
      `;

      div.onclick = () => openRestaurant(name, restoId, logo, banner);
      grid.appendChild(div);

      // Resto Ratings
      const avgLabel = div.querySelector(`#avg-${restoId}`);
      const restoRef = doc(db, "users", restoId);

      onSnapshot(restoRef, (docUpdate) => {
        if (!docUpdate.exists()) return;
        const data = docUpdate.data();
        const rTotal = data.ratings?.total || 0;
        const rCount = data.ratings?.count || 0;
        const average = rCount ? (rTotal / rCount).toFixed(1) : "0.0";
        
        if (avgLabel) avgLabel.textContent = average;
      });

      requestAnimationFrame(() => {
        div.style.transitionDelay = `${index * 60}ms`;
        div.getBoundingClientRect();
        div.classList.add("enter");
        setTimeout(() => {
          div.style.transitionDelay = "0ms";
        }, index * 60 + 500);
      });
    });

    if (count === 0) emptyState.style.display = "flex";
    // Re-attach hover/click sounds only once
    if (window.attachHoverListeners) {
      window.attachHoverListeners();
    }
  });
}

// Modal
const modal = document.getElementById("resto-modal");

async function setupRatingSystem(restoId) {
  const user = auth.currentUser;
  const ratingContainer = document.getElementById("bannerRating");
  if (!ratingContainer) return;

  const avgLabel = document.getElementById("averageRating");
  const restoRef = doc(db, "users", restoId);

  function updateStarIcons(val) {
    const numericVal = Math.round(parseFloat(val));
    const liveStars = ratingContainer.querySelectorAll(".star");
    
    liveStars.forEach(star => {
      const starVal = parseInt(star.dataset.value);
      if (starVal <= numericVal && numericVal > 0) {
        // Switch to Solid Star
        star.classList.remove("fa-regular");
        star.classList.add("fa-solid", "filled");
      } else {
        // Switch to Regular Star
        star.classList.remove("fa-solid", "filled");
        star.classList.add("fa-regular");
      }
    });
  }

  // Initial Reset: Clear previous ghost stars immediately
  updateStarIcons(0);
  avgLabel.textContent = "0.0";

  // Real-time listener for average rating
  onSnapshot(restoRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    const total = data.ratings?.total || 0;
    const count = data.ratings?.count || 0;
    const average = count ? (total / count).toFixed(1) : "0.0";
    
    avgLabel.textContent = average;
    updateStarIcons(average);
  });

  // Setup interaction for logged-in users
  if (user) {
    const userRatingRef = doc(db, "users", restoId, "userRatings", user.uid);

    // Initial check for current user's previous rating
    const existingDoc = await getDoc(userRatingRef);
    if (existingDoc.exists()) {
      updateStarIcons(existingDoc.data().value);
    }

    // Attach click events
    const stars = ratingContainer.querySelectorAll(".star");
    stars.forEach(star => {
      const newStar = star.cloneNode(true);
      star.parentNode.replaceChild(newStar, star);

      newStar.addEventListener("click", async () => {
        const newVal = parseInt(newStar.dataset.value);
        
        try {
          const ratingSnap = await getDoc(userRatingRef);
          
          if (ratingSnap.exists()) {
            const oldVal = ratingSnap.data().value;
            const diff = newVal - oldVal;
            await updateDoc(restoRef, { "ratings.total": increment(diff) });
            await updateDoc(userRatingRef, { value: newVal });
          } else {
            await updateDoc(restoRef, {
              "ratings.total": increment(newVal),
              "ratings.count": increment(1)
            });
            await setDoc(userRatingRef, { value: newVal, timestamp: new Date() });
          }
          
          updateStarIcons(newVal);
          if (typeof showNotif === "function") showNotif(`Rated ${newVal} stars!`);
        } catch (err) {
          console.error("Rating error:", err);
          if (typeof showError === "function") showError("Failed to save rating.");
        }
      });
    });
  }
}

async function openRestaurant(name, restoId, logo, banner) {
  // Fetch resto document
  const restoRef = doc(db, "users", restoId);
  const restoSnap = await getDoc(restoRef);
  const restoData = restoSnap.exists() ? restoSnap.data() : {};

  // Set modal dataset
  modal.dataset.theme = restoData.theme || "green";
  modal.dataset.hueShift = restoData.hueShift || 0;

  // Show modal
  //modalManager.open([modal]);
  modal.classList.add("visible");

  document.querySelector(".window-title1").textContent = name;
  document.getElementById("restoName").textContent = name;

  document.getElementById("profileImage").src = logo;
  document.getElementById("bannerImage").src = banner;

  document.getElementById("restoName1").textContent = restoData.username || "Unnamed Restaurant";
  document.getElementById("restoEmail").textContent = restoData.email || "No email";

  setupRatingSystem(restoId);

  await loadRestaurantData(restoId);
}

let allItems = [];
let unsubscribeItems = null;

async function loadRestaurantData(restoId) {
  const itemsGrid = document.getElementById("itemsGrid");
  itemsGrid.innerHTML = "Loading...";

  // Unsubscribe previous listener if any
  if (unsubscribeItems) unsubscribeItems();

  const itemsCollection = collection(db, "items");
  const q = query(itemsCollection, where("ownerId", "==", restoId));

  unsubscribeItems = onSnapshot(q, (snap) => {
    allItems = [];
    snap.forEach(docSnap => {
      allItems.push({ id: docSnap.id, ...docSnap.data() });
    });

    if (allItems.length === 0) {
      itemsGrid.innerHTML = "<p>No items available.</p>";
      return;
    }

    renderItems(); // render sorted/filtered items
    const openedId = document.getElementById("Items-modal").dataset.itemId;
    if (openedId) {
      const updated = allItems.find(i => i.id === openedId);
      if (updated) window.updateOpenItemModal(updated);
    }
  });
}


// Render function stays the same
function renderItems() {
  const itemsGrid = document.getElementById("itemsGrid");
  const sortField = document.getElementById("sortField").value;
  const sortOrder = document.getElementById("sortOrder").value;
  const searchInput = document.getElementById("itemSearch");
  const filterText = searchInput ? searchInput.value.toLowerCase() : "";
  itemsGrid.innerHTML = "";

  const filteredItems = allItems.filter(item => {
    return item.name.toLowerCase().includes(filterText);
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === "expiryTime" || sortField === "createdAt") {
      valA = valA?.toDate ? valA.toDate().getTime() : new Date(valA).getTime();
      valB = valB?.toDate ? valB.toDate().getTime() : new Date(valB).getTime();
    }

    if (typeof valA === "string") valA = valA.toLowerCase();
    if (typeof valB === "string") valB = valB.toLowerCase();

    return sortOrder === "asc" ? (valA > valB ? 1 : valA < valB ? -1 : 0)
                               : (valA < valB ? 1 : valA > valB ? -1 : 0);
  });

  if (sortedItems.length === 0) {
    itemsGrid.innerHTML = `<div class="no-results">No items found matching "${filterText}"</div>`;
    return;
  }

  sortedItems.forEach((item, index) => {
    let expireStr = "N/A";
    if (item.expiryTime) {
      const date = item.expiryTime.toDate ? item.expiryTime.toDate() : new Date(item.expiryTime);
      expireStr = date.toLocaleString();
    }

    const user = auth.currentUser;
    if (!user) return;

    const userId = user.uid;

    const card = document.createElement("div");
    card.className = "item-card";

    const desc = item.description
      ? (item.description.length > 30 
          ? item.description.substring(0, 30) + "..." 
          : item.description)
      : "No item description";

    // Check availability, default true if missing
    const isAvailable = item.available !== undefined ? item.available : true;

    card.innerHTML = `
      <div class="item-image-wrapper" style="position: relative;">
        <img src="${item.imageBase64 || 'assets/default-food.png'}" class="item-image" style="${!isAvailable ? 'filter: grayscale(100%); opacity: 0.6;' : ''}">
        <img src="${item.imageBase64 || 'assets/default-food.png'}" class="item-image-bg">
        ${!isAvailable ? `<div class="unavailable-overlay">UNAVAILABLE</div>` : ''}
        <div class="reservation-preview" id="reservationPreview-${item.id}"></div>
        <div class="price-img">
            <span class="discounted-price">₱${item.discountedPrice}</span>
        </div>
      </div>
      <div class="item-details">
        <h3 class="${!isAvailable ? "unavailable" : ""}">
          ${item.name} ${!isAvailable ? "" : ""}
        </h3>

        <div class="bottom-row">
          <div class="price-row">
            <span class="original-price">₱${item.originalPrice}</span>
            <b>${item.quantity} left</b>
          </div>
          <b>Expires: ${expireStr}</b>
        </div>
      </div>
    `;

    // Apply strike-through style if unavailable
    if (!isAvailable) {
      const h3 = card.querySelector("h3.unavailable");
      if (h3) {
        h3.style.textDecoration = "line-through";
        h3.style.color = "var(--dark-orange)";
      }
    }

    itemsGrid.appendChild(card);

    requestAnimationFrame(() => {
      card.style.transitionDelay = `${index * 60}ms`;
      card.getBoundingClientRect();
      card.classList.add("enter");
      setTimeout(() => {
        card.style.transitionDelay = "0ms";
      }, index * 60 + 500);
    });

    card.addEventListener("click", () => {
        if (!isAvailable) {
            showError("This item is unavailable :(");
            return;
        }
        openUserItemModal(item);
    });

    // Reservation dots overlay
    const previewId = `reservationPreview-${item.id}`;
    const previewContainer = card.querySelector(`#${previewId}`);

    if (!previewContainer) return;

    const q = query(
      collection(db, "reservations"),
      where("itemId", "==", item.id),
      where("redeemed", "==", false)
    );

    onSnapshot(q, async (snap) => {
      previewContainer.innerHTML = "";
      // Sort docs chronologically
      const sortedDocs = [...snap.docs].sort((a, b) => {
        const timeA = a.data().reservedAt?.toDate ? a.data().reservedAt.toDate().getTime() : 0;
        const timeB = b.data().reservedAt?.toDate ? b.data().reservedAt.toDate().getTime() : 0;
        return timeB - timeA; 
      });

      const docs = sortedDocs.slice(0, 5);

      for (const docSnap of docs) {
        const reservation = docSnap.data();
        const userRef = doc(db, "users", reservation.userId);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : {};

        const dot = document.createElement("img");
        dot.className = "reservation-dot";
        dot.title = userData.username || "User";

        let profileSrc = "Resources/assets/profile.jpg";
        if (userData.profileImage) {
          profileSrc = userData.profileImage;
        } else if (auth.currentUser && auth.currentUser.uid === reservation.userId && auth.currentUser.photoURL) {
          profileSrc = auth.currentUser.photoURL;
        }

        dot.src = profileSrc;
        previewContainer.appendChild(dot);
      }

      if (snap.docs.length > 5) {
        const more = document.createElement("span");
        more.className = "reservation-dot-more";
        more.textContent = `+${snap.docs.length - 5}`;
        previewContainer.appendChild(more);
      }
    });

    // Re-attach hover/click sounds only once
    if (window.attachHoverListeners) {
      window.attachHoverListeners();
    }
  });
}

// Listen to sort changes
const searchInput = document.getElementById("itemSearch");
if (searchInput) {
    searchInput.addEventListener("input", renderItems);
}
document.getElementById("sortField").addEventListener("change", renderItems);
document.getElementById("sortOrder").addEventListener("change", renderItems);

function openUserItemModal(item) {
    const modal = document.getElementById("Items-modal");
    modal.dataset.itemId = item.id;
    window.currentItem = item;
    let expireStr = "N/A";
    if (item.expiryTime) {
      const date = item.expiryTime.toDate ? item.expiryTime.toDate() : new Date(item.expiryTime);
      expireStr = date.toLocaleString();
    }

    // Fill inputs
    document.getElementById("itemTitle").textContent = item.name || "Unamed Item";
    document.getElementById("itemPreviewImage").src = item.imageBase64 || "Resources/assets/food.png";
    document.getElementById("itemName").value = item.name || "";
    document.getElementById("itemDescription").value = item.description || "";
    document.getElementById("itemOriginalPrice").value = item.originalPrice || "";
    document.getElementById("itemDiscountedPrice").value = item.discountedPrice || "";
    document.getElementById("itemQuantity").value = item.quantity || "";
    document.getElementById("itemExpiry").value = expireStr || "";

    // Disable ALL fields
    document.querySelectorAll("#Items-modal input, #Items-modal textarea")
        .forEach(el => {
            el.setAttribute("readonly", true);
        });

    // Show modal
    //modalManager.open([modal]);
    modal.classList.add("visible");
}
window.updateOpenItemModal = async function(item) {
    let expireISO = "";
    if (item.expiryTime) {
        const d = item.expiryTime.toDate ? item.expiryTime.toDate() : new Date(item.expiryTime);
        expireISO = d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
    }

    document.getElementById("itemTitle").textContent = item.name || "Unnamed Item";
    document.getElementById("itemPreviewImage").src = item.imageBase64 || "Resources/assets/food.png";
    document.getElementById("itemName").value = item.name || "";
    document.getElementById("itemDescription").value = item.description || "";
    document.getElementById("itemOriginalPrice").value = item.originalPrice || "";
    document.getElementById("itemDiscountedPrice").value = item.discountedPrice || "";
    document.getElementById("itemQuantity").value = item.quantity || "";
    document.getElementById("itemExpiry").value = expireISO || "";
}

window.redeemCurrentItem = (async () => {
  if (!window.currentItem) return;

  const canvas = document.getElementById("qrCanvas");

  const user = auth.currentUser;

  // QR content structure
  const qrData = JSON.stringify({
      itemId: window.currentItem.id,
      userId: user ? user.uid : "guest",
      time: Date.now()
  });

  // Clear previous QR
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Generate QR
  QRCode.toCanvas(canvas, qrData, { width: 220 }, function (error) {
      if (error) console.error(error);
  });

  // Show modal
  openRedeemModal(window.currentItem.id);
});

async function openRedeemModal(itemId) {
  try {
    const itemRef = doc(db, "items", itemId);
    const itemSnap = await getDoc(itemRef);

    if (!itemSnap.exists()) {
      showError("This item no longer exists.");
      return;
    }

    const item = itemSnap.data();
    const stock = item.quantity ?? 0;

    // Count active reservations
    const q = query(
      collection(db, "reservations"),
      where("itemId", "==", itemId),
      where("redeemed", "==", false)
    );
    const resSnap = await getDocs(q);

    const reservedCount = resSnap.size;

    // Already fully reserved
    if (reservedCount >= stock) {
      showError("This item is fully reserved. No stock left to redeem.");
      return;
    }

    // -----------------------------
    // Otherwise → OPEN QR MODAL
    // -----------------------------
    listenRedeemedItems(itemId);
    //modalManager.open([qrModal, qrBackdrop]);
    qrModal.classList.add("visible");
    qrBackdrop.classList.add("visible");
    safeVibrate([40]);

  } catch (err) {
    showError("Unable to check item availability: " + err.message);
  }
}

async function openReserveModal(reservationId, itemId) {
  try {
    const docRef = doc(db, "reservations", reservationId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      showError("Reservation not found");
      return;
    }

    const data = docSnap.data();

    // Check if already redeemed
    if (data.redeemed) {
      showNotif("This item has already been redeemed.");
      return;
    }

    // If reservation is valid → open modal
    //modalManager.open([qrModal, qrBackdrop]);
    qrModal.classList.add("visible");
    qrBackdrop.classList.add("visible");
    safeVibrate([40]);

    // Start the listener for real-time updates
    listenReservedRedemptions(reservationId, itemId);

  } catch (error) {
    console.error("Error checking reservation:", error);
  }
}

function listenRedeemedItems(itemId) {
  if (!itemId) return;

  const itemRef = doc(db, "items", itemId);
  let previousQty = null;

  const unsubscribe = onSnapshot(itemRef, (snap) => {
    if (!qrModal.classList.contains("visible")) {
      unsubscribe();
      return;
    }

    // If item is deleted → stock reached 0
    if (!snap.exists()) {
      closeRedeemModalWithFX();
      unsubscribe();
      return;
    }

    const data = snap.data();
    const qty = data.quantity ?? 0;

    // First snapshot — set baseline
    if (previousQty === null) {
      previousQty = qty;
      return;
    }
    // Detect stock decrease
    if (qty < previousQty) {
      closeRedeemModalWithFX();
      unsubscribe();
      return;
    }
    previousQty = qty;
  });
  return unsubscribe;
}

function listenReservedRedemptions(reservationId, itemId) {
  if (!reservationId || !itemId) return;

  const itemRef = doc(db, "items", itemId);
  const reservationRef = doc(db, "reservations", reservationId);

  let previousQty = null;

  // ITEM LISTENER (detect stock change)
  const unsubscribeItem = onSnapshot(itemRef, (itemSnap) => {
    if (!qrModal.classList.contains("visible")) {
      unsubscribeItem();
      return;
    }

    if (!itemSnap.exists()) {
      closeRedeemModalWithFX();
      unsubscribeItem();
      return;
    }

    const currentQty = itemSnap.data().quantity ?? 0;

    if (previousQty === null) {
      previousQty = currentQty;
      return;
    }

    // If stock decreased → redeemed
    if (currentQty < previousQty) {
      closeRedeemModalWithFX();
      unsubscribeItem();
    }

    previousQty = currentQty;
  });

  // RESERVATION LISTENER (detect redeemed status)
  const unsubscribeReservation = onSnapshot(reservationRef, async (resSnap) => {
    if (!qrModal.classList.contains("visible")) {
      unsubscribeReservation();
      return;
    }

    // If reservation deleted already → close
    if (!resSnap.exists()) {
      closeRedeemModalWithFX();
      unsubscribeReservation();
      return;
    }

    const data = resSnap.data();

    // If redeemed → delete reservation + decrease stock
    if (data.redeemed === true) {
      try {
        // resto only can update not users
        
        /*await runTransaction(db, async (transaction) => {
          // 1. Decrease item qty
          transaction.update(itemRef, {
            quantity: increment(-1)
          });

          // 2. Delete reservation doc
          transaction.delete(reservationRef);
        });*/

        closeRedeemModalWithFX();
      } catch (err) {
        console.error("Failed to process redemption:", err);
      }

      unsubscribeReservation();
    }
  });

  return [unsubscribeItem, unsubscribeReservation];
}

function closeRedeemModal() {
  qrModal.classList.remove("visible");
  setTimeout(() => {
      qrBackdrop.classList.remove("visible");
  }, 300);
  //modalManager.close([qrModal, qrBackdrop]);
  qrBackdrop.classList.remove("visible");
}

function closeRedeemModalWithFX() {
    const fw = new Audio("Resources/assets/fireworks.mp3");
    playSound(fw);
    confetti({
        particleCount: 180,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: ['#ffbe0b', '#fb5607', '#ff006e', '#8338ec', '#3a86ff'],
        zIndex: 99999
    });
    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 100,
        spread: 100,
        origin: { x: 0.5, y: 0.8 },
        colors: ['#ffbe0b', '#fb5607', '#ff006e', '#8338ec', '#3a86ff'],
        zIndex: 99999
      });
    }, 300);
    setTimeout(() => {
      confetti({
        particleCount: 180,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: ['#ffbe0b', '#fb5607', '#ff006e', '#8338ec', '#3a86ff'],
        zIndex: 99999
      });
    }, 300);
    
  safeVibrate([80, 50, 80]);
  qrModal.classList.remove("visible");
  setTimeout(() => {
      qrBackdrop.classList.remove("visible");
  }, 400);
  setTimeout(() => {
      const modal1 = document.getElementById("Items-modal");
      modal1.classList.remove("visible");
  }, 400);
  //modalManager.close([qrModal, qrBackdrop]);
}

function listenUserProfile() {
  auth.onAuthStateChanged(async user => {
    if (!user) return window.location.href = "index.html";
    if (localStorage.getItem("loggedInUserType") !== "user") return window.location.href = "/";

    const profileImg = document.getElementById("profileImageHome");
    const userRef = doc(db, "users", user.uid);

    // Real-time listener
    onSnapshot(userRef, snap => {
      const data = snap.data() || {};

      // Priority:
      // 1. custom uploaded profile from Firestore
      // 2. Google/Apple account photo
      // 3. default avatar
      const customPhoto = data.profileImage;
      const providerPhoto = user.photoURL;

      // Check if 'agreedToTerms' field is missing or false
      if (!data.agreedToTerms) {
        //modalManager.open([termsModal]);
        termsModal.classList.add("visible");
      } else {
        //modalManager.close([termsModal]);
        termsModal.classList.remove("visible");
        checkSecondaryPermissions();
      }

      if (customPhoto) {
        profileImg.src = customPhoto;
      } else if (providerPhoto) {
        profileImg.src = providerPhoto;
      } else {
        profileImg.src = "Resources/assets/profile.jpg";
      }

      // Handle Agreement Click
      agreeBtn.addEventListener("click", async () => {
        try {
          await setDoc(
            userRef,
            {
              agreedToTerms: true,
              termsAgreedAt: new Date()
            },
            { merge: true }
          );
          //modalManager.close([termsModal]);
          termsModal.classList.remove("visible");
          setTimeout(() => {
            showNotif("Thank you for agreeing to our terms!");
          }, 100);

          setTimeout(() => {
            checkSecondaryPermissions();
          }, 400);
        } catch (err) {
          console.error("Error updating terms:", err);
          showError("Failed to save agreement. Please try again.");
        }
      });
    });
  });
}
listenUserProfile();

const profileHomeImg = document.getElementById("profileImageHome");
const profileImgModal = document.getElementById("profile-img-modal");
const profileCloseBtn = profileImgModal.querySelector(".close-btn");

profileHomeImg.addEventListener("click", () => {
    safeVibrate([50, 150, 50])
    loadCurrentProfile();
    //modalManager.open([profileImgModal]);
    profileImgModal.classList.add("visible");
});

profileCloseBtn.addEventListener("click", () => {
    //modalManager.close([profileImgModal]);
    profileImgModal.classList.remove("visible");
});

const profileInput = document.getElementById("profileSelectInput");
const cropCanvas = document.getElementById("cropCanvas");
const ctxCrop = cropCanvas.getContext("2d");
const triggerBtn = document.getElementById("profileSelectBtn");

triggerBtn.addEventListener("click", () => {
  profileInput.click();
});

profileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
        const img = new Image();
        img.onload = () => {
            // Fit image to 200x200 canvas
            const minSide = Math.min(img.width, img.height);
            const sx = (img.width - minSide) / 2;
            const sy = (img.height - minSide) / 2;

            ctxCrop.clearRect(0, 0, 200, 200);
            ctxCrop.drawImage(img, sx, sy, minSide, minSide, 0, 0, 200, 200);
        };
        img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
});

window.saveUserProfile = (async () => {
  const user = auth.currentUser;
  if (!user) return showError("Not logged in");

  const username = document.getElementById("usernameInput").value.trim();
  if (!username) return showError("Username cannot be empty");

  const updateData = { username };

  try {
    // 🚨 ONLY export canvas if image is local
    /*if (imageSource === "local") {
      updateData.profileImage = cropCanvas.toDataURL("image/jpeg", 0.9);
    }*/
    updateData.profileImage = cropCanvas.toDataURL("image/jpeg", 0.9);

    await updateDoc(doc(db, "users", user.uid), updateData);
    //modalManager.close([profileImgModal]);
    profileImgModal.classList.remove("visible");
    setTimeout(() => {
      showNotif("Profile updated");
    }, 300);
  } catch (err) {
    console.error(err);
    showError("Failed to save profile: " + err.message);
  }
});


let imageSource = "none"; // "none" | "provider" | "local"

async function loadCurrentProfile() {
  const user = auth.currentUser;
  if (!user) return;

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  const data = snap.data();
  document.getElementById("usernameInput").value = data.username || "";

  if (!data.profileImage) return;

  const img = new Image();

  // 🔑 THIS IS THE FIX
  if (data.profileImage.startsWith("http")) {
    imageSource = "provider";
    img.crossOrigin = "anonymous"; // allows drawing (not exporting)
  } else {
    imageSource = "local";
  }

  img.onload = () => {
    ctxCrop.clearRect(0, 0, 200, 200);
    ctxCrop.drawImage(img, 0, 0, 200, 200);
  };

  img.onerror = () => {
    console.warn("Profile image preview failed");
  };

  img.src = data.profileImage;
}

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const target = btn.dataset.tab;
    const grids = document.querySelectorAll("[data-tab-content]");

    grids.forEach(grid => {
      if (grid.dataset.tabContent === target) {
        // Remove display:none first
        grid.style.display = "grid";

        // Show + animate
        grid.classList.remove("hidden");
        Array.from(grid.children).forEach((child, i) => {
          child.classList.remove("enter");
          setTimeout(() => child.classList.add("enter"), i * 60); // stagger
        });
      } else {
        // Hide others
        grid.classList.add("hidden");
        grid.style.display = "none"; // hide completely
        Array.from(grid.children).forEach(child => child.classList.remove("enter"));
      }
    });
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const bgContainer = document.querySelector(".bg-container1");
  const tabButtons = Array.from(document.querySelectorAll(".tab-btn"));
  
  let touchStartX = 0;
  let touchEndX = 0;

  const switchTabByIndex = (index) => {
    if (index >= 0 && index < tabButtons.length) {
      tabButtons[index].click(); 
    }
  };

  bgContainer.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  bgContainer.addEventListener("touchend", (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  const handleSwipe = () => {
    const swipeThreshold = 80;
    const currentActiveIndex = tabButtons.findIndex(btn => btn.classList.contains("active"));

    // Swipe Left (User moves finger Right to Left -> Show Next Tab)
    if (touchStartX - touchEndX > swipeThreshold) {
      switchTabByIndex(currentActiveIndex + 1);
    }
    
    // Swipe Right (User moves finger Left to Right -> Show Previous Tab)
    if (touchEndX - touchStartX > swipeThreshold) {
      switchTabByIndex(currentActiveIndex - 1);
    }
  };
});

auth.onAuthStateChanged(user => {
  if (user) {
    // Show reserved items for the logged-in user
    listenReservedItems(user.uid);
  } else {
    // Optionally clear reserved grid if logged out
    reservedGrid.innerHTML = "<p style='text-align:center; padding:20px;'>Please log in to see reserved items.</p>";
  }
});

const reservedGrid = document.getElementById("reservedGrid");
const reservationCards = new Map(); // reservationId => {div, unsubscribeItem}

function updateReservedCounter(count) {
  const badge = document.getElementById("reservedCount");
  if (!badge) return;

  badge.textContent = count;
  badge.style.display = count > 0 ? "inline-block" : "none";
}

function listenReservedItems(userId) {
  if (!userId) return;

  const q = query(
    collection(db, "reservations"),
    where("userId", "==", userId),
    where("redeemed", "==", false)
  );
  let reservationSortOrder = "asc"; 
  onSnapshot(q, snap => {
    const newIds = new Set(snap.docs.map(d => d.id));
    updateReservedCounter(snap.size);
    // Animate removals
    reservationCards.forEach(({ div, unsubscribeItem }, id) => {
      if (!newIds.has(id)) {
        div.classList.add("exit");
        setTimeout(() => {
          unsubscribeItem?.();
          div.remove();
          reservationCards.delete(id);
        }, 350);
      }
    });

    const sortedDocs = [...snap.docs].sort((a, b) => {
      const tA = a.data().reservedAt?.toDate
        ? a.data().reservedAt.toDate().getTime()
        : new Date(a.data().reservedAt).getTime();

      const tB = b.data().reservedAt?.toDate
        ? b.data().reservedAt.toDate().getTime()
        : new Date(b.data().reservedAt).getTime();

      return reservationSortOrder === "desc"
        ? tA - tB
        : tB - tA;
    });

    sortedDocs.forEach((docSnap, index) => {
      const reservation = { ...docSnap.data(), id: docSnap.id };

      if (!reservationCards.has(reservation.id)) {
        const div = document.createElement("div");
        div.className = "item-card";

        // Insert at correct position
        if (index >= reservedGrid.children.length) {
          reservedGrid.appendChild(div);
        } else {
          reservedGrid.insertBefore(div, reservedGrid.children[index]);
        }

        // Trigger entrance animation
        requestAnimationFrame(() => {
          div.style.transitionDelay = `${index * 60}ms`;
          div.getBoundingClientRect();
          div.classList.add("enter");
          setTimeout(() => {
            div.style.transitionDelay = "0ms";
          }, index * 60 + 500);
        });

        // Listen to item document in realtime
        const itemRef = doc(db, "items", reservation.itemId);
        const unsubscribeItem = onSnapshot(itemRef, itemSnap => {
          const item = itemSnap.exists() ? itemSnap.data() : {};

          const isAvailable = item.available !== false; // treat undefined as true
          const ownerDisplayId = `owner-${reservation.id}`;

          div.innerHTML = `
            <div class="item-image-wrapper" style="position: relative;">
              <img src="${item.imageBase64 || 'assets/default-food.png'}" class="item-image" style="${!isAvailable ? 'filter: grayscale(80%); opacity: 0.6;' : ''}">
              <img src="${item.imageBase64 || 'assets/default-food.png'}" class="item-image-bg">
              ${!isAvailable ? '<div class="unavailable-overlay">UNAVAILABLE</div>' : ''}

              <div class="price-img">
                  <span class="discounted-price">₱${item.discountedPrice}</span>
              </div>

              <div class="resto-owner-badge" id="${ownerDisplayId}">
                <img src="Resources/assets/profile.jpg" class="owner-mini-img">
                <span class="owner-mini-name">Resto</span>
              </div>
              
            </div>
            <div class="item-details">
              <h3 style="${!isAvailable ? 'text-decoration: line-through;' : ''}">${item.name}</h3>

              <div class="bottom-row">
                <div class="price-row">
                  <span class="original-price">₱${item.originalPrice}</span>
                  <b>${item.quantity} left</b>
                </div>
                
                <b>Reserved At: ${reservation.reservedAt?.toDate ? reservation.reservedAt.toDate().toLocaleString() : new Date(reservation.reservedAt).toLocaleString()}</b>
              </div>
            </div>

            <div class="item-actions">
              <button class="cancel-redeem-btn">Cancel</button>
              <button class="redeem-btn">Redeem</button>
            </div>
          `;

          div.onclick = (e) => {
            if (e.target.closest('.item-actions')) return;

            if (itemSnap.exists()) {
              // Create the item object including its ID and Owner
              const itemData = { 
                ...itemSnap.data(), 
                id: itemSnap.id,
                ownerId: reservation.ownerId
              };

              // Call the global function
              if (typeof window.updateOpenItemModal === "function") {
                window.updateOpenItemModal(itemData);
              } else {
                console.error("Function updateOpenItemModal is not globally defined.");
              }
            } else {
              showError("This item no longer exists in the shop.");
            }
          };

          if (item.ownerId) {
            const ownerRef = doc(db, "users", item.ownerId);
            getDoc(ownerRef).then(ownerSnap => {
              const ownerContainer = div.querySelector(`#${ownerDisplayId}`);
              if (ownerSnap.exists() && ownerContainer) {
                const ownerData = ownerSnap.data();
                const rawName = ownerData.username || "Restaurant";
                // Limit name to 12 characters
                const displayName = rawName.length > 12 ? rawName.substring(0, 12) + "..." : rawName;
                const displayImg = ownerData.profileBase64 || "Resources/assets/profile.jpg";

                ownerContainer.querySelector(".owner-mini-img").src = displayImg;
                ownerContainer.querySelector(".owner-mini-name").textContent = displayName;
              }
            });
          }

          const redeemBtn = div.querySelector(".redeem-btn");
          redeemBtn.onclick = () => {
            if (!isAvailable) {
              showError("This item is unavailable, you cannot redeem it, sorry :(");
              return;
            }

            const canvas = document.getElementById("qrCanvas");
            const user = auth.currentUser;

            const qrData = JSON.stringify({
              itemId: reservation.itemId,
              reservationId: reservation.id,
              userId: user ? user.uid : "guest",
              time: Date.now()
            });

            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            QRCode.toCanvas(canvas, qrData, error => { if (error) console.error(error); });
            safeVibrate([50, 150, 50]);
            openReserveModal(reservation.id, reservation.itemId);
          };

          const cancelBtn = div.querySelector(".cancel-redeem-btn");
          cancelBtn.onclick = async () => {
            try {
              await deleteDoc(doc(db, "reservations", reservation.id));
              showNotif("Reservation cancelled");
            } catch (err) {
              console.error("Failed to cancel reservation:", err);
              showError("Failed to cancel reservation. Please try again.");
            }
          };

        });

        reservationCards.set(reservation.id, { div, unsubscribeItem });
      }
    });

    if (window.attachHoverListeners) window.attachHoverListeners();
  });
}

window.reserveCurrentItem = (async () => {
  const item = window.currentItem;
  const user = auth.currentUser;

  if (!item) return showError("No item selected.");
  if (!user) return showError("You must be logged in to reserve items.");

  try {
    const itemRef = doc(db, "items", item.id);
    const itemSnap = await getDoc(itemRef);
    if (!itemSnap.exists()) return showError("Item no longer exists.");

    const itemData = itemSnap.data();

    // Count active reservations
    const reservationsSnap = await getDocs(query(
      collection(db, "reservations"),
      where("itemId", "==", item.id),
      where("redeemed", "==", false)
    ));
    const reservedCount = reservationsSnap.size;
    const availableStock = (itemData.quantity ?? 0) - reservedCount;

    if (availableStock <= 0) {

      return showError("Sorry, all remaining stock has already been reserved.");
    }

    // Prevent double reservation
    const alreadyReserved = reservationsSnap.docs.some(doc => doc.data().userId === user.uid);
    if (alreadyReserved) return showError("You have already reserved this item.");

    // Make reservation
    await setDoc(doc(collection(db, "reservations")), {
      itemId: item.id,
      userId: user.uid,
      ownerId: itemData.ownerId,
      name: itemData.name,
      reservedAt: new Date(),
      redeemed: false
    });

    const modal = document.getElementById("Items-modal");
    //modalManager.close([modal]);
    modal.classList.remove("visible");
    setTimeout(() => {
      showNotif(`Item "${itemData.name}" reserved successfully!`);
    }, 300);
  } catch (err) {
    console.error(err);
    showError("Failed to reserve item: " + err.message);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const itemPreview = document.getElementById("itemPreviewImage");
  const zoomModal = document.getElementById("imageZoomModal");
  const zoomedImg = document.getElementById("zoomedImage");
  const closeZoom = zoomModal.querySelector(".zoom-close");
  const zoomWrapper = document.querySelector('.zoom-wrapper');
  const zoomInstructions = document.getElementById("zoomInstructions");

  let isDragging = false;
  let hasMoved = false;
  let startX, startY;
  let translateX = 0, translateY = 0;

  const resetImage = () => {
    translateX = 0;
    translateY = 0;
    hasMoved = false;
    const isZoomed = zoomedImg.classList.contains("is-zoomed");
    
    if (isZoomed) {
      zoomInstructions.classList.add("hidden");
    } else {
      zoomInstructions.classList.remove("hidden");
    }

    zoomedImg.style.transform = isZoomed ? "scale(2) translate(0px, 0px)" : "scale(1) translate(0px, 0px)";
  };

  itemPreview.addEventListener("click", () => {
    zoomedImg.src = itemPreview.src;
    //modalManager.open([zoomModal]);
    zoomModal.classList.add("visible");
    
    zoomedImg.classList.remove("is-zoomed"); 
    zoomInstructions.classList.remove("hidden");
    
    resetImage(); 
    if (window.modalManager)
      //window.modalManager.open([zoomModal]);
      zoomModal.classList.add("visible");
  });

  const hideZoom = () => {
    zoomModal.classList.remove("visible");
    zoomedImg.classList.remove("is-zoomed");
    //modalManager.close([zoomModal, zoomWrapper]);
    zoomModal.classList.remove("visible");
    zoomWrapper.classList.remove("visible");
    resetImage();
    if (window.modalManager)
      //window.modalManager.close([zoomModal]);
      zoomModal.classList.remove("visible");
  };

  const startDrag = (e) => {
    if (!zoomedImg.classList.contains("is-zoomed")) return;
    
    isDragging = true;
    hasMoved = false; // Reset movement flag
    zoomedImg.style.transition = "none"; 
    
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

    startX = clientX - translateX;
    startY = clientY - translateY;
  };

  const doDrag = (e) => {
    if (!isDragging) return;
    
    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

    const currentX = clientX - startX;
    const currentY = clientY - startY;

    // Check if movement is significant enough to be a drag
    if (Math.abs(currentX - translateX) > 2 || Math.abs(currentY - translateY) > 2) {
      hasMoved = true;
    }

    translateX = currentX;
    translateY = currentY;

    zoomedImg.style.transform = `scale(2) translate(${translateX / 2}px, ${translateY / 2}px)`;
  };

  const stopDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    zoomedImg.style.transition = "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
  };

  // Click handler updated to use the 'hasMoved' flag
  zoomedImg.addEventListener("click", (e) => {
    // If we dragged, don't toggle the zoom
    if (hasMoved) return;

    zoomedImg.classList.toggle("is-zoomed");
    resetImage(); // This now clears translates correctly
  });

  zoomedImg.addEventListener("mousedown", startDrag);
  window.addEventListener("mousemove", doDrag);
  window.addEventListener("mouseup", stopDrag);

  zoomedImg.addEventListener("touchstart", startDrag, { passive: false });
  window.addEventListener("touchmove", doDrag, { passive: false });
  window.addEventListener("touchend", stopDrag);

  closeZoom.addEventListener("click", hideZoom);
  zoomModal.addEventListener("click", (e) => {
    if (e.target === zoomModal || e.target === zoomWrapper) {
      hideZoom();
    }
  });
});
