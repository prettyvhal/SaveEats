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
let itemName, itemDescription, itemOriginalPrice, itemDiscountedPrice, itemQuantity, itemExpiry;
let saveItemBtn;

let selectedItemImage = new Image();
let currentEditId = null;
let unsubscribeItems = null;
let itemsArray = [];

let sortField = "name";
let sortOrder = "asc";

document.addEventListener("DOMContentLoaded", () => {
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
  itemQuantity = document.getElementById("itemQuantity");
  itemExpiry = document.getElementById("itemExpiry");

  saveItemBtn = document.getElementById("saveItemBtn");

  addItemBtn?.addEventListener("click", () => {
    clearItemForm();
    itemsModal.classList.add("visible");
  });
  closeModalBtn?.addEventListener("click", () => {
    itemsModal.classList.remove("visible");
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

  sorted.forEach(item => {
    itemsGrid.appendChild(createItemElement(item.id, item));
  });
}

// -------------------------------
// ITEM CARD
// -------------------------------
function createItemElement(id, item) {
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

  div.innerHTML = `
    <div class="item-image-wrapper">
      <img src="${item.imageBase64 || 'assets/default-food.png'}" class="item-image">
      <img src="${item.imageBase64 || 'assets/default-food.png'}" class="item-image-bg">
      <div class="reservation-preview" id="reservationPreview-${id}"></div>
      
      <div class="price-img">
          <span class="discounted-price">₱${item.discountedPrice}</span>
      </div>
    </div>
    <div class="item-details">
      <h3>${item.name}</h3>

      <div class="bottom-row">
        <div class="price-row">
          <span class="original-price">₱${item.originalPrice}</span>
          <b>${item.quantity} left</b>
        </div>
        
        <b>Expires: ${expireStr}</b>
      </div>

    </div>

    <div class="item-actions">
      <button onclick="editItem('${id}')">Edit</button>
      <button onclick="deleteItem('${id}')">Delete</button>
    </div>
  `;
    div.addEventListener("click", () => {
      editItem(id);
    });
   
  // Re-attach hover/click sounds only once
  if (window.attachHoverListeners) {
    window.attachHoverListeners();
  }

  // Reservation dots overlay
  const previewContainer = div.querySelector(`#reservationPreview-${id}`);
  const q = query(
    collection(db, "reservations"),
    where("itemId", "==", id),
    where("redeemed", "==", false)
  );

  onSnapshot(q, async (snap) => {
    previewContainer.innerHTML = "";
    const docs = snap.docs.slice(0, 5);

    for (const docSnap of docs) {
      const reservation = docSnap.data();
      const userRef = doc(db, "users", reservation.userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};

      const dot = document.createElement("img");
      dot.className = "reservation-dot";
      dot.title = userData.username || "User";

      // Priority: Firestore photo → current logged-in auth photo if same user → fallback
      let profileSrc = "Resources/assets/profile.jpg"; // default fallback
      if (userData.profileImage) {
        profileSrc = userData.profileImage;
      } else if (auth.currentUser && auth.currentUser.uid === reservation.userId && auth.currentUser.photoURL) {
        profileSrc = auth.currentUser.photoURL;
      }

      dot.src = profileSrc;
      previewContainer.appendChild(dot);
    }

    // More count if > 5
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

    for (const docSnap of snap.docs) {
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
          <div class="reserved-time">Reserved At: ${reservation.reservedAt?.toDate ? reservation.reservedAt.toDate().toLocaleString() : new Date(reservation.reservedAt).toLocaleString()}</div>
        </div>
      `;

      modalContent.appendChild(div);
    }
  });
  // Show modal
  modal.classList.add("visible");
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
let originalExpiry = null;
window.editItem = async function(id) {
  try {
    const docSnap = await getDoc(doc(db, "items", id));
    if (!docSnap.exists()) return showError("Item not found");

    const item = docSnap.data();
    currentEditId = id;

    itemsModal.classList.add("visible");
    document.querySelector(".window-title").textContent = "Edit Item";

    itemName.value = item.name;
    itemDescription.value = item.description || "";
    itemOriginalPrice.value = item.originalPrice;
    itemDiscountedPrice.value = item.discountedPrice;
    itemQuantity.value = item.quantity;
    //itemExpiry.value = item.expiryTime ? new Date(item.expiryTime.toDate ? item.expiryTime.toDate() : item.expiryTime).toISOString().slice(0,16) : "";
    originalExpiry = item.expiryTime ?? null;

    itemPreviewImage.src = item.imageBase64 || "Resources/assets/food.png";
    selectedItemImage.src = item.imageBase64 || "";
  } catch (err) {
    showError("Failed to load item for editing: " + err.message);
  }
}

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
  const discountedPrice = Number(itemDiscountedPrice.value);
  const quantity = Number(itemQuantity.value);
  let expiryTime = null;
  if (!currentEditId) {
      // Add Mode
      expiryTime = itemExpiry.value ? new Date(itemExpiry.value) : null;
  } else {
      // Edit Mode — only update if user typed something
      if (itemExpiry.value) {
          expiryTime = new Date(itemExpiry.value);
      } else {
          expiryTime = originalExpiry; // <- keep original
      }
  }

  if (!name || !selectedItemImage.src || !originalPrice || !discountedPrice || !quantity) {
    isSaving = false;
    return alert("Please fill all required fields");
  }

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
        quantity,
        expiryTime,
        imageBase64: compressedBase64
      });

      showNotif("Item updated successfully!");
    } else {
      // TRUE ADD MODE
      await addDoc(collection(db, "items"), {
        ownerId: user.uid,
        name,
        description,
        originalPrice,
        discountedPrice,
        quantity,
        expiryTime,
        imageBase64: compressedBase64,
        createdAt: serverTimestamp()
      });

      showNotif("Item added successfully!");
    }

    clearItemForm();
    itemsModal.classList.remove("visible");
  } catch (err) {
    showError("Failed to save item: " + err.message);
  }

  isSaving = false;
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
  itemDiscountedPrice.value = "";
  itemQuantity.value = "";
  itemExpiry.value = "";
  selectedItemImage.src = "";
  currentEditId = null;
  document.querySelector(".window-title").textContent = "Adding new Item";
}