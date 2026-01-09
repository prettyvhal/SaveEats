import { auth, db } from "https://cadlaxa.github.io/SaveEats/Scripts/site/firebase-init.js";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  getDocs,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let itemsGrid;
let addItemBtn, itemsModal, closeModalBtn;
let itemImageInput, itemPreviewImage;
let itemName, itemDescription, itemOriginalPrice, itemDiscountedPrice, itemQuantity, itemExpiry, itemMinSellingPrice;
let saveItemBtn;

let selectedItemImage = new Image();
let currentEditId = null;
let unsubscribeItems = null;
let itemsArray = [];

let sortField = "name";
let sortOrder = "asc";
let isInitialLoad = true;
let availabilitySyncTimer = null;


document.addEventListener("DOMContentLoaded", () => {
  setupTooltips();
  itemsGrid = document.getElementById("itemsGrid");
  addItemBtn = document.getElementById("addItemBtn");
  itemsModal = document.getElementById("Items-modal");
  closeModalBtn = itemsModal?.querySelector(".close-btn");

  itemImageInput = document.getElementById("itemImageInput");
  itemPreviewImage = document.getElementById("itemPreviewImage");

  itemName = document.getElementById("itemName");
  itemDescription = document.getElementById("itemDescription");
  itemOriginalPrice = document.getElementById("itemOriginalPrice");
  itemDiscountedPrice = document.getElementById("itemDiscountedPrice");
  itemMinSellingPrice = document.getElementById("itemMinSellingPrice");
  itemQuantity = document.getElementById("itemQuantity");
  itemExpiry = document.getElementById("itemExpiry");

  saveItemBtn = document.getElementById("saveItemBtn");

  addItemBtn?.addEventListener("click", () => {
    clearItemForm();
    modalManager.open([itemsModal]);
  });
  closeModalBtn?.addEventListener("click", () => {
    setTimeout(() => {
    modalManager.close([itemsModal]);
    }, 50);
    clearItemForm();
  });

  itemImageInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      selectedItemImage.src = reader.result;
      itemPreviewImage.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  saveItemBtn?.addEventListener("click", saveItem);

  // Sorting controls
  const sortFieldSelect = document.getElementById("sortField");
  const sortOrderSelect = document.getElementById("sortOrder");
  sortFieldSelect?.addEventListener("change", () => {
    sortField = sortFieldSelect.value;
    renderItemsGrid();
  });
  sortOrderSelect?.addEventListener("change", () => {
    sortOrder = sortOrderSelect.value;
    renderItemsGrid();
  });
});

auth.onAuthStateChanged((user) => {
  if (!user) return;
  subscribeToItems(user.uid);
});

auth.onAuthStateChanged(user => {
  if (user) {
    startGlobalAvailabilityBackgroundSync(60_000); // every 1 min
  } else {
    stopGlobalAvailabilityBackgroundSync();
  }
});

auth.onAuthStateChanged(user => {
  if (!user) stopGlobalAvailabilityBackgroundSync();
});

// -------------------------------
// SUBSCRIBE & RENDER
// -------------------------------
function subscribeToItems(ownerId) {
  if (unsubscribeItems) unsubscribeItems();

  const q = query(collection(db, "items"), where("ownerId", "==", ownerId));
  unsubscribeItems = onSnapshot(q, (snapshot) => {
    itemsArray = [];
    snapshot.forEach(docSnap => {
      const item = docSnap.data();
      itemsArray.push({ id: docSnap.id, ...item });
    });
    renderItemsGrid();
  }, (err) => {
    console.error("Failed to load items:", err);
    itemsGrid.innerHTML = "<p>Failed to load items.</p>";
  });
}

// Render grid with sorting
function renderItemsGrid() {
  itemsGrid.innerHTML = "";
  if (!itemsArray.length) {
    itemsGrid.innerHTML = "<p>No items added yet.</p>";
    return;
  }

  const sorted = [...itemsArray].sort((a, b) => {
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

  sorted.forEach((item, index) => {
    itemsGrid.appendChild(createItemElement(item.id, item, index));
  });
}

// -------------------------------
// ITEM CARD
// -------------------------------
function createItemElement(id, item, index) {
  const div = document.createElement("div");
  div.className = "item-card";

  let expireStr = "N/A";
  if (item.expiryTime) {
    const date = item.expiryTime.toDate ? item.expiryTime.toDate() : new Date(item.expiryTime);
    expireStr = date.toLocaleString();
  }
  const desc = item.description
    ? (item.description.length > 30 
        ? item.description.substring(0, 30) + "..." 
        : item.description)
    : "No item description";

  // Check availability (assume true if tag missing)
  const isAvailable = item.available !== undefined ? item.available : true;

  div.innerHTML = `
    <div class="item-image-wrapper" style="position: relative;">
      <img src="${item.imageBase64 || 'assets/default-food.png'}" class="item-image" style="${!isAvailable ? 'filter: grayscale(100%); opacity: 0.6;' : ''}">
      <img src="${item.imageBase64 || 'assets/default-food.png'}" class="item-image-bg">
      
      ${!isAvailable ? `<div class="unavailable-overlay">UNAVAILABLE</div>` : ''}

      <div class="reservation-preview" id="reservationPreview-${id}"></div>
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

    <div class="item-actions">
      <button onclick="handleEditClick(this, '${id}')">Edit
        <i class="fa-solid fa-spinner fa-spin btn-spinner" style="display: none;"></i>
      </button>
      <button onclick="handleDelClick(this, '${id}')">Delete
        <i class="fa-solid fa-spinner fa-spin btn-spinner" style="display: none;"></i>
      </button>
    </div>
  `;

  // Style unavailable name
  if (!isAvailable) {
    div.querySelector("h3.unavailable").style.textDecoration = "line-through";
    div.querySelector("h3.unavailable").style.color = "var(--dark-orange)";
  }

  requestAnimationFrame(() => {
    div.style.transitionDelay = `${index * 60}ms`;
    div.getBoundingClientRect();
    div.classList.add("enter");
    setTimeout(() => {
      div.style.transitionDelay = "0ms";
    }, index * 60 + 500);
  });

  // Re-attach hover/click sounds only once
  if (window.attachHoverListeners) window.attachHoverListeners();

  // Reservation dots overlay
  const previewContainer = div.querySelector(`#reservationPreview-${id}`);
  const q = query(
    collection(db, "reservations"),
    where("itemId", "==", id),
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

    previewContainer.onclick = (e) => {
      e.stopPropagation();
      openReservationModal(id);
    };

    // Push Notification for new reservations
    if (isInitialLoad) {
      isInitialLoad = false;
      return; 
    }

    for (const change of snap.docChanges()) {
        if (change.type === "added") {
            const reservation = change.doc.data();

            // Fetch user data
            const userSnap = await getDoc(doc(db, "users", reservation.userId));
            const userData = userSnap.exists() ? userSnap.data() : {};
            const username = userData.username || "Someone";
            const itemName = item?.name || "an item";

            // Check permission and send via service worker
            if (Notification.permission === "granted") {
                // Use the global function from your script.js
                window.sendNotification("New Reservation 🥕", {
                    body: `${username} reserved this item: ${itemName}`,
                    icon: "Resources/assets/icon1.png",
                    data: { url: "resto-dashboard.html" }
                });
            }
        }
    }
  });
  return div;
}


async function openReservationModal(itemId) {
  const modal = document.getElementById("reserved-modal");
  const modalContent = modal.querySelector(".reserved-card");
  modalContent.innerHTML = ""; // clear previous content

  const q = query(
    collection(db, "reservations"),
    where("itemId", "==", itemId),
    where("redeemed", "==", false)
  );

  onSnapshot(q, async (snap) => {
    modalContent.innerHTML = "";

    if (snap.empty) {
      modalContent.innerHTML = "<p style='text-align:center; padding:20px;'>No reservations yet.</p>";
      return;
    }
    const sortedDocs = [...snap.docs].sort((a, b) => {
      const timeA = a.data().reservedAt?.toDate ? a.data().reservedAt.toDate().getTime() : 0;
      const timeB = b.data().reservedAt?.toDate ? b.data().reservedAt.toDate().getTime() : 0;
      return timeB - timeA; 
    });

    for (const docSnap of sortedDocs) {
      const reservation = docSnap.data();

      // Fetch user data
      const userRef = doc(db, "users", reservation.userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};

      // Build reservation div
      const div = document.createElement("div");
      div.className = "reserved-user-card";

      // Use profile image or fallback
      let profileSrc = "Resources/assets/profile.jpg";
      if (userData.profileImage) {
        profileSrc = userData.profileImage;
      } else if (auth.currentUser && auth.currentUser.uid === reservation.userId && auth.currentUser.photoURL) {
        profileSrc = auth.currentUser.photoURL;
      }

      div.innerHTML = `
        <img src="${profileSrc}" class="reserved-user-img">
        <div class="reserved-user-info">
          <span>${userData.username || "User"}</span>
          <small>${userData.email || "No email"}</small>
          <div class="reserved-time"> <i class="fa-regular fa-clock"></i> Reserved At: ${reservation.reservedAt?.toDate ? reservation.reservedAt.toDate().toLocaleString() : new Date(reservation.reservedAt).toLocaleString()}</div>
        </div>
      `;

      modalContent.appendChild(div);
    }
  });
  // Show modal
  modalManager.open([modal]);
}

// -------------------------------
// DELETE ITEM
// -------------------------------
window.deleteItem = async function(id) {
  try {
    // 1. Get active reservations
    const reservationsQuery = query(
      collection(db, "reservations"),
      where("itemId", "==", id),
      where("redeemed", "==", false)
    );
    const reservationsSnap = await getDocs(reservationsQuery);
    const batch = writeBatch(db);

    reservationsSnap.forEach(docSnap => {
      batch.delete(doc(db, "reservations", docSnap.id));
    });

    // Commit reservation deletions first
    await batch.commit();

    // 2. Unsubscribe any listeners for this item before deleting it
    if (window.itemListeners && window.itemListeners[id]) {
      window.itemListeners[id].forEach(unsub => unsub());
      delete window.itemListeners[id];
    }

    // 3. Delete the item
    await deleteDoc(doc(db, "items", id));

    showNotif("Item deleted successfully!");
  } catch (err) {
    console.error(err);
    showError("Failed to delete item: " + err.message);
  }
};

// -------------------------------
// EDIT ITEM
// -------------------------------
function toLocalInputValue(date) {
  const pad = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
         `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

let originalExpiry = null;

window.handleEditClick = async function(btn, id) {
  const spinner = btn.querySelector('.btn-spinner');
  
  btn.disabled = true;
  spinner.style.display = 'inline-block';

  try {
      await window.editItem(id); 
  } catch (err) {
    setTimeout(() => {
      showError(err);
    }, 100);
  } finally {
      btn.disabled = false;
      spinner.style.display = 'none';
  }
}

window.handleDelClick = async function(btn, id) {
  const spinner = btn.querySelector('.btn-spinner');
  
  btn.disabled = true;
  spinner.style.display = 'inline-block';

  try {
      await window.deleteItem(id); 
  } catch (err) {
    setTimeout(() => {
      showError(err);
    }, 100);
  } finally {
      btn.disabled = false;
      spinner.style.display = 'none';
  }
}

window.editItem = async function(id) {
  try {
    const docSnap = await getDoc(doc(db, "items", id));
    if (!docSnap.exists()) return showError("Item not found");

    const item = docSnap.data();
    currentEditId = id;

    modalManager.open([itemsModal]);
    //itemsModal.classList.add("visible");
    document.querySelector(".window-title").textContent = "Edit Item";

    const now = new Date();
    itemExpiry.min = toLocalInputValue(now); 

    if (item.expiryTime) {
      originalExpiry = item.expiryTime.toDate
        ? item.expiryTime.toDate()
        : new Date(item.expiryTime);

      // Ensure originalExpiry is not in the past
      if (originalExpiry < now) originalExpiry = now;

      itemExpiry.value = toLocalInputValue(originalExpiry);
    } else {
      itemExpiry.value = toLocalInputValue(now);
      originalExpiry = now;
    }

    itemExpiry.addEventListener("click", () => {
      if (itemExpiry.showPicker) itemExpiry.showPicker();
    });

    itemExpiry.addEventListener("focus", () => {
      if (itemExpiry.value) {
        const v = itemExpiry.value;
        itemExpiry.value = "";
        itemExpiry.value = v;
      }
    });

    itemName.value = item.name;
    itemDescription.value = item.description || "";
    itemOriginalPrice.value = item.originalPrice;
    //itemDiscountedPrice.value = item.discountedPrice || "1";
    itemMinSellingPrice.value = item.minSellingPrice || "0";
    itemQuantity.value = item.quantity;

    itemPreviewImage.src = item.imageBase64 || "Resources/assets/food.png";
    selectedItemImage.src = item.imageBase64 || "";

  } catch (err) {
    showError("Failed to load item for editing: " + err.message);
  }
}

window.PasteImageFromClipboard = async function() {
  try {
    const items = await navigator.clipboard.read();
    
    for (const item of items) {
      const imageTypes = item.types.filter(type => type.startsWith('image/'));
      
      if (imageTypes.length > 0) {
        const blob = await item.getType(imageTypes[0]);
        const reader = new FileReader();

        await new Promise((resolve, reject) => {
          reader.onload = (e) => {
              const img = new Image();
              img.onload = () => {
                  // 1. Prepare 300x300 canvas for high-quality compression
                  const canvas = document.createElement("canvas");
                  canvas.width = 300;
                  canvas.height = 300;
                  const ctx = canvas.getContext("2d");

                  const minSide = Math.min(img.width, img.height);
                  const sx = (img.width - minSide) / 2;
                  const sy = (img.height - minSide) / 2;

                  ctx.drawImage(
                      img,
                      sx, sy, minSide, minSide, 
                      0, 0, 300, 300
                  );

                  const compressedBase64 = canvas.toDataURL("image/jpeg", 0.9);
                  
                  if (typeof itemPreviewImage !== 'undefined') itemPreviewImage.src = compressedBase64;
                  if (typeof selectedItemImage !== 'undefined') selectedItemImage.src = compressedBase64;
                  resolve(); 
              };
              img.onerror = () => reject(new Error("Failed to load image from clipboard."));
              img.src = e.target.result;
          };
          reader.onerror = () => reject(new Error("Failed to read clipboard data."));
          reader.readAsDataURL(blob);
      });
        
        return;
      }
    }
    throw new Error("No image found in clipboard."); 
    
  } catch (err) {
    console.error("Paste failed:", err);
    throw err; 
  }
};

// -------------------------------
// SAVE ITEM
// -------------------------------
document.getElementById("addItemForm").addEventListener("submit", saveItem);
let isSaving = false;

async function saveItem(e) {
  e?.preventDefault();
  if (isSaving) return;
  isSaving = true;

  const user = auth.currentUser;
  if (!user) {
    isSaving = false;
    return alert("Not logged in");
  }

  const name = itemName.value.trim();
  const description = itemDescription.value.trim();
  const originalPrice = Number(itemOriginalPrice.value);
  const discountedPrice = Number(1);
  const minSellingPrice = Number(itemMinSellingPrice.value);
  const quantity = Number(itemQuantity.value);

  // Handle expiryTime
  let expiryTime = null;
  if (!currentEditId) {
    // Add Mode
    expiryTime = itemExpiry.value ? new Date(itemExpiry.value) : null;
  } else {
    // Edit Mode
    if (itemExpiry.value) {
      expiryTime = new Date(itemExpiry.value);
    } else {
      expiryTime = null; // cleared input => remove expiry
    }
  }

  // Determine availability
  let available = true;
  const now = new Date();
  if (expiryTime && expiryTime <= now) {
    available = false;
  }

  // Basic validation
  if (!name || !selectedItemImage.src || !originalPrice || !quantity || ! minSellingPrice)  {
    isSaving = false;
    return showNotif("Please fill all required fields");
  }

  // Prepare compressed image
  const canvas = document.createElement("canvas");
  canvas.width = 300;
  canvas.height = 300;
  const ctx = canvas.getContext("2d");
  const minSide = Math.min(selectedItemImage.width, selectedItemImage.height);
  ctx.drawImage(
    selectedItemImage,
    (selectedItemImage.width - minSide) / 2,
    (selectedItemImage.height - minSide) / 2,
    minSide,
    minSide,
    0, 0, 300, 300
  );
  const compressedBase64 = canvas.toDataURL("image/jpeg", 0.9);

  try {
    if (currentEditId) {
      // TRUE UPDATE — NO DUPLICATES POSSIBLE
      await updateDoc(doc(db, "items", currentEditId), {
        name,
        description,
        originalPrice,
        discountedPrice,
        minSellingPrice,
        quantity,
        expiryTime: expiryTime || null, // cleared => null
        available,
        imageBase64: compressedBase64
      });
      setTimeout(() => {
        showNotif("Item updated successfully!");
      }, 50);
    } else {
      // TRUE ADD MODE
      await addDoc(collection(db, "items"), {
        ownerId: user.uid,
        name,
        description,
        originalPrice,
        discountedPrice,
        minSellingPrice,
        quantity,
        expiryTime: expiryTime || null,
        available,
        imageBase64: compressedBase64,
        createdAt: serverTimestamp()
      });
      setTimeout(() => {
        showNotif("Item added successfully!");
      }, 50);
    }
    clearItemForm();
    modalManager.close([itemsModal]);

    if (typeof runGlobalAvailabilitySync === "function") {
      runGlobalAvailabilitySync();
    }
    
  } catch (err) {
    showError("Failed to save item: " + err.message);
  } finally {
    isSaving = false;
  }

}

function setupTooltips() {
  const tooltips = {
    "orig-help": "The initial full price of the item before any surplus discount.",
    "disc-help": "The current price customers will pay for this surplus item. Note that the system may adjust this price automatically over time based on expiry and stock levels.",
    "min-help": "The lowest price you are willing to accept for this item during automated clearances."
  };

  Object.keys(tooltips).forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        showNotif(tooltips[id]);
      });
    }
  });
}

// -------------------------------
// CLEAR FORM
// -------------------------------
function clearItemForm() {
  itemImageInput.value = "";
  itemPreviewImage.src = "Resources/assets/food.png";
  itemName.value = "";
  itemDescription.value = "";
  itemOriginalPrice.value = "";
  //itemDiscountedPrice.value = "";
  itemMinSellingPrice.value = "";
  itemQuantity.value = "";
  itemExpiry.value = "";
  selectedItemImage.src = "";
  currentEditId = null;
  document.querySelector(".window-title").textContent = "Adding new Item";
}
async function runGlobalAvailabilitySync() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const q = query(collection(db, "items"));
    const snap = await getDocs(q);
    if (snap.empty) return;

    const now = Date.now();
    const batch = writeBatch(db);
    let updated = 0;

    snap.forEach(docSnap => {
      const item = docSnap.data();
      if (!item.expiryTime) return;

      const expiryMs = typeof item.expiryTime.toDate === "function"
          ? item.expiryTime.toDate().getTime()
          : new Date(item.expiryTime).getTime();
          
      const createdAtMs = item.createdAt?.toDate 
          ? item.createdAt.toDate().getTime() 
          : now - (24 * 60 * 60 * 1000); // Default to 24h ago if missing

      const isAvailable = item.available !== false;

      // 1. HANDLE EXPIRATION (One-way state change)
      if (expiryMs <= now && isAvailable) {
        batch.update(docSnap.ref, {
          available: false,
          availabilityUpdatedAt: new Date()
        });
        updated++;
        return; // Skip pricing for expired items
      }

      // 2. DYNAMIC PRICING LOGIC (Only for available items)
      if (isAvailable && item.minSellingPrice !== undefined) {
        const maxPrice = parseFloat(item.originalPrice);
        const minPrice = parseFloat(item.minSellingPrice);
        
        // Calculate Time Factor (Percentage of life remaining)
        const totalLife = expiryMs - createdAtMs;
        const timeLeft = expiryMs - now;
        const timeRatio = Math.max(0, Math.min(1, timeLeft / totalLife)); // 1.0 (new) to 0.0 (expired)

        // Calculate Quantity Factor (Scarcity)
        // If only 1-2 items left, price stays higher. If 10+ left, price drops faster.
        const qty = parseInt(item.quantity) || 0;
        const qtyFactor = qty <= 2 ? 0.2 : 0; // Scarcity buffer

        // Formula: Price = Min + (Range * (TimeRatio + Scarcity))
        let targetPrice = minPrice + (maxPrice - minPrice) * (timeRatio + qtyFactor);
        
        // Clamp the price between min and max
        targetPrice = Math.max(minPrice, Math.min(maxPrice, targetPrice));
        targetPrice = Math.round(targetPrice); // Clean integers for currency

        // Only update if the price has actually changed to save Firestore writes
        if (Math.round(item.discountedPrice) !== targetPrice) {
          batch.update(docSnap.ref, {
            discountedPrice: targetPrice, // Updated directly here
            priceUpdatedAt: new Date()
          });
          updated++;
        }
      }
    });

    if (updated > 0) {
      await batch.commit();
      console.log(`✔ Global sync: ${updated} items updated (Availability/Price)`);
    }
  } catch (err) {
    console.error("Global availability sync failed:", err.code || err.message);
  }
}

function startGlobalAvailabilityBackgroundSync(intervalMs = 60_000) {
  if (availabilitySyncTimer) return; 
  runGlobalAvailabilitySync();

  availabilitySyncTimer = setInterval(
    runGlobalAvailabilitySync,
    intervalMs
  );
}

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
    modalManager.open([zoomModal]);
    
    zoomedImg.classList.remove("is-zoomed"); 
    zoomInstructions.classList.remove("hidden");
    
    resetImage(); 
    if (window.modalManager) window.modalManager.open([zoomModal]);
  });

  const hideZoom = () => {
    zoomModal.classList.remove("visible");
    zoomedImg.classList.remove("is-zoomed");
    modalManager.close([zoomModal, zoomWrapper]);
    resetImage();
    if (window.modalManager) window.modalManager.close([zoomModal]);
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