import { app, auth, db } from "https://cadlaxa.github.io/SaveEats/Scripts/site/firebase-init.js";
import {
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
  getDoc,
  doc,
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

function openRedeemModal(itemId) {
  qrModal.classList.add("visible");
  qrBackdrop.classList.add("visible");
  listenRedeemedItems(itemId);
  modalManager.open([qrModal, qrBackdrop]);
  navigator.vibrate([40])
}

function listenRedeemedItems(itemId) {
  if (!auth.currentUser) return;

  const redeemedCol = collection(db, "users", auth.currentUser.uid, "redeemedItems");
  const q = query(redeemedCol, where("itemId", "==", itemId));

  // Listen for changes in real-time
  const unsubscribe = onSnapshot(q, (snap) => {
      if (!qrModal.classList.contains("visible")) return;

      if (!snap.empty) {
          // At least 1 redeemed entry exists
          closeRedeemModalWithFX();
          unsubscribe();
      }
  });
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
  }, 300);
  modalManager.close([qrModal, qrBackdrop]);
}

// Clicking background closes
qrCanvas.addEventListener("click", closeRedeemModal);
qrBackdrop.addEventListener("click", closeRedeemModal);

