import { app, auth, db } from "https://cadlaxa.github.io/SaveEats/Scripts/site/firebase-init.js";
import {
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
  getDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

window.addEventListener("load", loadRestaurants);

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
        <div class="restaurant-name">${name}</div>
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
  });
}

// Listen to sort changes
document.getElementById("sortField").addEventListener("change", renderItems);
document.getElementById("sortOrder").addEventListener("change", renderItems);
