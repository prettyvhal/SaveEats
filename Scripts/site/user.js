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
  increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

    snap.forEach(docSnap => {
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
          <img src="${banner}" alt="Banner">
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


async function openRestaurant(name, restoId, logo, banner) {
  // Fetch resto document
  const restoRef = doc(db, "users", restoId);
  const restoSnap = await getDoc(restoRef);
  const restoData = restoSnap.exists() ? restoSnap.data() : {};

  // Set modal dataset
  modal.dataset.theme = restoData.theme || "green";
  modal.dataset.hueShift = restoData.hueShift || 0;

  // Show modal
  modal.classList.add("visible");
  modalManager.open([modal]);

  document.querySelector(".window-title1").textContent = name;
  document.getElementById("restoName").textContent = name;

  document.getElementById("profileImage").src = logo;
  document.getElementById("bannerImage").src = banner;

  document.getElementById("restoName1").textContent = restoData.username || "Unnamed Restaurant";
  document.getElementById("restoEmail").textContent = restoData.email || "No email";

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
      if (updated) updateOpenItemModal(updated);
    }
  });
}

// Render function stays the same
function renderItems() {
  const itemsGrid = document.getElementById("itemsGrid");
  itemsGrid.innerHTML = "";

  const sortField = document.getElementById("sortField").value;
  const sortOrder = document.getElementById("sortOrder").value;

  const sortedItems = [...allItems].sort((a, b) => {
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

  sortedItems.forEach(item => {
    let expireStr = "N/A";
    if (item.expiryTime) {
      const date = item.expiryTime.toDate ? item.expiryTime.toDate() : new Date(item.expiryTime);
      expireStr = date.toLocaleString();
    }

    const card = document.createElement("div");
    card.className = "item-card";

    const desc = item.description
      ? (item.description.length > 30 
          ? item.description.substring(0, 30) + "..." 
          : item.description)
      : "No item description";

    card.innerHTML = `
      <img src="${item.imageBase64 || 'assets/default-food.png'}" class="item-image">
      <div class="item-details">
        <h3>${item.name}</h3>
        <p>${desc}</p>

        <div class="bottom-row">
          <div class="price-row">
            <span class="original-price">₱${item.originalPrice}</span>
            <span class="discounted-price">₱${item.discountedPrice}</span>
          </div>
          <p>Stock: ${item.quantity}</p>
          <b>Expires: ${expireStr}</b>
        </div>

      </div>
    `;

    itemsGrid.appendChild(card);
    card.addEventListener("click", () => openUserItemModal(item));
    // Re-attach hover/click sounds only once
    if (window.attachHoverListeners) {
      window.attachHoverListeners();
    }
  });
}

// Listen to sort changes
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
    modal.classList.add("visible");
    modalManager.open([modal]);
}
function updateOpenItemModal(item) {
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

document.getElementById("redeemItemBtn").addEventListener("click", () => {
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

    // ❌ Already fully reserved
    if (reservedCount >= stock) {
      showError("This item is fully reserved. No stock left to redeem.");
      return;
    }

    // -----------------------------
    // Otherwise → OPEN QR MODAL
    // -----------------------------
    qrModal.classList.add("visible");
    qrBackdrop.classList.add("visible");
    listenRedeemedItems(itemId);
    modalManager.open([qrModal, qrBackdrop]);
    navigator.vibrate([40]);

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
    qrModal.classList.add("visible");
    qrBackdrop.classList.add("visible");
    modalManager.open([qrModal, qrBackdrop]);
    navigator.vibrate([40]);

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
        await runTransaction(db, async (transaction) => {
          // 1. Decrease item qty
          transaction.update(itemRef, {
            quantity: increment(-1)
          });

          // 2. Delete reservation doc
          transaction.delete(reservationRef);
        });

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
  modalManager.close([qrModal, qrBackdrop]);
}

function closeRedeemModalWithFX() {
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
    
  navigator.vibrate([80, 50, 80]);
  qrModal.classList.remove("visible");
  setTimeout(() => {
      qrBackdrop.classList.remove("visible");
  }, 400);
  setTimeout(() => {
      const modal1 = document.getElementById("Items-modal");
      modal1.classList.remove("visible");
  }, 400);
  modalManager.close([qrModal, qrBackdrop]);
}

// Clicking background closes
qrCanvas.addEventListener("click", closeRedeemModal);
qrBackdrop.addEventListener("click", closeRedeemModal);

function listenUserProfile() {
  auth.onAuthStateChanged(async user => {
    if (!user) return;

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

      if (customPhoto) {
        profileImg.src = customPhoto;
      } else if (providerPhoto) {
        profileImg.src = providerPhoto;
      } else {
        profileImg.src = "Resources/assets/profile.jpg";
      }
    });
  });
}
listenUserProfile();
document.getElementById("profileImageHome").addEventListener("click", () => {
    openProfileEditModal();
});
const profileHomeImg = document.getElementById("profileImageHome");
const profileImgModal = document.getElementById("profile-img-modal");
const profileCloseBtn = profileImgModal.querySelector(".close-btn");

profileHomeImg.addEventListener("click", () => {
    profileImgModal.classList.add("visible");
});

profileCloseBtn.addEventListener("click", () => {
    profileImgModal.classList.remove("visible");
});

const profileInput = document.getElementById("profileSelectInput");
const cropCanvas = document.getElementById("cropCanvas");
const ctxCrop = cropCanvas.getContext("2d");

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

document.getElementById("saveProfileImage").addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("Not logged in");

    const croppedBase64 = cropCanvas.toDataURL("image/jpeg", 1);

    try {
        await updateDoc(doc(db, "users", user.uid), {
            profileImage: croppedBase64
        });

        profileImgModal.classList.remove("visible");
        showNotif("Profile updated");
    } catch (err) {
        console.error("Failed to save profile:", err);
        showError("Failed to save profile: " + err.message);
    }
});

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const target = btn.dataset.tab;

    document.querySelectorAll("[data-tab-content]").forEach(grid => {
      grid.style.display = "none";
    });

    document.querySelector(`[data-tab-content='${target}']`).style.display = "grid";
  });
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

function listenReservedItems(userId) {
  if (!userId) return;

  const q = query(
    collection(db, "reservations"),
    where("userId", "==", userId),
    where("redeemed", "==", false)
  );

  onSnapshot(q, snap => {
    const newReservationIds = new Set(snap.docs.map(d => d.id));

    // Remove old cards
    reservationCards.forEach((val, resId) => {
      if (!newReservationIds.has(resId)) {
        val.unsubscribeItem?.();
        val.div.remove();
        reservationCards.delete(resId);
      }
    });

    // Add/update reservations
    snap.docs.forEach(docSnap => {
      const reservation = { ...docSnap.data(), id: docSnap.id };

      if (!reservationCards.has(reservation.id)) {
        const div = document.createElement("div");
        div.className = "item-card";
        reservedGrid.appendChild(div);

        // Listen to item document in realtime
        const itemRef = doc(db, "items", reservation.itemId);
        const unsubscribeItem = onSnapshot(itemRef, itemSnap => {
          const item = itemSnap.exists() ? itemSnap.data() : {};

          div.innerHTML = `
            <img src="${item.imageBase64 || 'assets/default-food.png'}" class="item-image">
            <div class="item-details">
              <h3>${item.name || reservation.name}</h3>
              <div class="bottom-row">
                <div class="price-row">
                  <span class="original-price">₱${item.originalPrice ?? 'N/A'}</span>
                  <span class="discounted-price">₱${item.discountedPrice ?? 'N/A'}</span>
                </div>
                <p>Reserved At: ${reservation.reservedAt?.toDate ? reservation.reservedAt.toDate().toLocaleString() : new Date(reservation.reservedAt).toLocaleString()}</p>
                <div class="item-actions">
                  <button class="redeem-btn">Redeem</button>
                </div>
              </div>
            </div>
          `;

          const redeemBtn = div.querySelector(".redeem-btn");
          redeemBtn.onclick = () => {
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
            QRCode.toCanvas(canvas, qrData, { width: 220 }, error => { if (error) console.error(error); });

            openReserveModal(reservation.id, reservation.itemId);
          };
        });

        reservationCards.set(reservation.id, { div, unsubscribeItem });
      }
    });

    if (window.attachHoverListeners) window.attachHoverListeners();
  });
}

document.getElementById("reserveItemBtn").addEventListener("click", async () => {
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
      name: itemData.name,
      reservedAt: new Date(),
      redeemed: false
    });

    showNotif(`Item "${itemData.name}" reserved successfully!`);
  } catch (err) {
    console.error(err);
    showError("Failed to reserve item: " + err.message);
  }
});