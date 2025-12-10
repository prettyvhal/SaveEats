import { app, auth, db } from "https://cadlaxa.github.io/SaveEats/Scripts/site/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


document.addEventListener("DOMContentLoaded", () => {
  // -------------------------------
  // ELEMENTS
  // -------------------------------
  const profileImg = document.getElementById("profileImage");
  const bannerImg = document.getElementById("bannerImage");
  const restoName = document.getElementById("restoName");
  const restoEmail = document.getElementById("restoEmail");

  const profileFileInput = document.getElementById("profileSelectInput");
  const profileCanvas = document.getElementById("cropCanvas");
  const saveProfileBtn = document.getElementById("saveProfileImage");

  const bannerFileInput = document.getElementById("bannerSelectInput");
  const bannerCanvas = document.getElementById("cropBannerCanvas");
  const saveBannerBtn = document.getElementById("saveBannerImage");

  const profileCtx = profileCanvas.getContext("2d");
  const bannerCtx = bannerCanvas.getContext("2d");
  const profileModal = document.getElementById("profile-img-modal");
  const bannerModal = document.getElementById("banner-img-modal");
  const pay = new Audio("Resources/assets/Apple Pay sound effect.mp3");

  let selectedProfileImage = new Image();
  let selectedBannerImage = new Image();

  const profileCropSize = 200;
  const bannerCropSize = { width: 400, height: 225 }; // 16:9 ratio
  const resolution = 0.9; // Compression resolution

  // OPEN PROFILE MODAL
  const editProfileBtn = document.getElementById("editProfileBtn");
  const editBannerBtn = document.getElementById("editBannerBtn");
  editProfileBtn.addEventListener("click", () => {
      navigator.vibrate([50, 150, 50])
      profileModal.classList.add("visible");
      modalManager.open([profileModal]);
  });

  // OPEN BANNER MODAL
  editBannerBtn.addEventListener("click", () => {
      navigator.vibrate([50, 150, 50])
      bannerModal.classList.add("visible");
      modalManager.open([bannerModal]);
      
  });

  // ADD ITEM MODAL
  const addItemBtn = document.getElementById("addItemBtn");
  const addItemModal = document.getElementById("Items-modal");
  const toggleIcon = document.querySelector(".item-toggle i");
  toggleIcon.classList.add("switching");

  function animateToggleIcon() {
    toggleIcon.classList.add("switching");
    setTimeout(() => toggleIcon.classList.remove("switching"), 600);
  }

  addItemBtn.addEventListener("click", () => {
    navigator.vibrate([50, 150, 50]);
    
    const isVisible = addItemModal.classList.contains("visible");
    if (isVisible) {
      // Close modal
      addItemModal.classList.remove("visible");
      animateToggleIcon();
    } else {
      // Open modal
      addItemModal.classList.add("visible");
      animateToggleIcon();
    }
  });
  
  const itemImageInput = document.getElementById("itemImageInput");
  const itemPreviewImage = document.getElementById("itemPreviewImage");

  let selectedItemImage = new Image();

  itemImageInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      selectedItemImage.src = reader.result;
      itemPreviewImage.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  // SAVE ITEM TO FIRESTORE
  addItemForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) return alert("Not logged in");

    const name = document.getElementById("itemName").value.trim();
    const description = document.getElementById("itemDescription").value.trim();
    const originalPrice = Number(document.getElementById("itemOriginalPrice").value);
    const discountedPrice = Number(document.getElementById("itemDiscountedPrice").value);
    const expiryTime = document.getElementById("itemExpiry").value;
    const quantity = Number(document.getElementById("itemQuantity").value);

    if (!name || !originalPrice || !discountedPrice || !expiryTime || !quantity) {
      return alert("Please fill all fields");
    }

    // COMPRESS TO 300x300
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const size = 300;
    canvas.width = size;
    canvas.height = size;

    const minSize = Math.min(selectedItemImage.width, selectedItemImage.height);
    const startX = (selectedItemImage.width - minSize) / 2;
    const startY = (selectedItemImage.height - minSize) / 2;

    ctx.drawImage(
      selectedItemImage,
      startX,
      startY,
      minSize,
      minSize,
      0,
      0,
      size,
      size
    );

    const compressedBase64 = canvas.toDataURL("image/jpeg", resolution);

    try {
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

      addItemForm.reset();
      addItemModal.classList.remove("visible");
      showNotif("Item added successfully!");

    } catch (err) {
      showError("Failed to add item: " + err.message);
    }
  });

  // -------------------------------
  // LOAD RESTO DATA
  // -------------------------------
  onAuthStateChanged(auth, async (user) => {
    if (!user) return window.location.href = "index.html";
    if (localStorage.getItem("loggedInUserType") !== "restaurant") return window.location.href = "home-user.html";

    try {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return window.location.href = "index.html";

      const data = docSnap.data();
      restoName.textContent = data.restaurantName || data.username || "My Restaurant";
      restoEmail.textContent = user.email;

      // Load images from Firestore Base64 or defaults
      profileImg.src = data.profileBase64 || "Resources/assets/profile.jpg";
      bannerImg.src = data.bannerBase64 || "Resources/assets/banner.webp";

    } catch (err) {
      console.error("Failed loading resto data:", err);
      window.location.href = "index.html";
    }
  });

  // -------------------------------
  // PROFILE IMAGE SELECT & CROP
  // -------------------------------
  profileFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      selectedProfileImage.onload = drawProfilePreview;
      selectedProfileImage.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  function drawProfilePreview() {
    profileCtx.clearRect(0, 0, profileCanvas.width, profileCanvas.height);
    const size = Math.min(selectedProfileImage.width, selectedProfileImage.height);
    const startX = (selectedProfileImage.width - size) / 2;
    const startY = (selectedProfileImage.height - size) / 2;
    profileCtx.drawImage(selectedProfileImage, startX, startY, size, size, 0, 0, profileCropSize, profileCropSize);
  }

  saveProfileBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("Not logged in");
    if (!selectedProfileImage.src) return alert("No image selected");

    const base64 = profileCanvas.toDataURL("image/jpeg", resolution);
    try {
      await updateDoc(doc(db, "users", user.uid), { profileBase64: base64 });
      profileImg.src = base64;
      bannerModal.classList.remove("visible");
      showNotif("Profile image updated!");
    } catch (err) {
      showError("Update failed: " + err.message);
    }
  });

  // -------------------------------
  // BANNER IMAGE SELECT & CROP
  // -------------------------------
  bannerFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      selectedBannerImage.onload = drawBannerPreview;
      selectedBannerImage.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  function drawBannerPreview() {
    bannerCtx.clearRect(0, 0, bannerCanvas.width, bannerCanvas.height);
    const srcWidth = selectedBannerImage.width;
    const srcHeight = selectedBannerImage.height;

    // Simple center crop for 16:9
    const targetRatio = bannerCropSize.width / bannerCropSize.height;
    let cropWidth = srcWidth;
    let cropHeight = srcWidth / targetRatio;

    if (cropHeight > srcHeight) {
      cropHeight = srcHeight;
      cropWidth = srcHeight * targetRatio;
    }

    const startX = (srcWidth - cropWidth) / 2;
    const startY = (srcHeight - cropHeight) / 2;

    bannerCtx.drawImage(selectedBannerImage, startX, startY, cropWidth, cropHeight, 0, 0, bannerCropSize.width, bannerCropSize.height);
  }

  saveBannerBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("Not logged in");
    if (!selectedBannerImage.src) return alert("No image selected");

    const base64 = bannerCanvas.toDataURL("image/jpeg", resolution);
    try {
      await updateDoc(doc(db, "users", user.uid), { bannerBase64: base64 });
      bannerImg.src = base64;
      bannerModal.classList.remove("visible");
      showNotif("Banner image updated!");
    } catch (err) {
      showError("Update failed: " + err.message);
    }
  });

  let scanningLock = false; // prevent double redemption

  async function handleQrScan(itemId, userId) {
      if (scanningLock) return; // already processing
      scanningLock = true;

      try {
          // 1. Fetch the item
          const itemRef = doc(db, "items", itemId);
          const itemSnap = await getDoc(itemRef);
          if (!itemSnap.exists()) {
              showError("Item not found.");
              scanningLock = false;
              return;
          }

          const itemData = itemSnap.data();
          let newQuantity = (itemData.quantity || 0) - 1;

          // 2. Update or delete item
          if (newQuantity <= 0) {
              await deleteDoc(itemRef);
              showNotif(`"${itemData.name}" deleted (0 stock).`);
              playSound(pay);
          } else {
              await updateDoc(itemRef, { quantity: newQuantity });
              playSound(pay);
              showNotif(`Item "${itemData.name}" redeemed!`);
          }

          // 3. Update user's redeemed count
          const userRedeemRef = doc(db, "users", userId, "redeemedItems", itemId);
          const userRedeemSnap = await getDoc(userRedeemRef);

          if (userRedeemSnap.exists()) {
              const oldCount = userRedeemSnap.data().count || 0;
              await updateDoc(userRedeemRef, {
                  count: oldCount + 1,
                  lastRedeemed: Date.now(),
              });
          } else {
              await setDoc(userRedeemRef, {
                  count: 1,
                  lastRedeemed: Date.now(),
              });
          }

          closeQrScanner();;

      } catch (err) {
          console.error(err);
          showError("Error processing QR scan.");
      } finally {
          scanningLock = false;
      }
  }

  let qrScanner = null;
  let scanningActive = false;
  const qrModal = document.getElementById("qrSlideModal");
  const qrBackdrop = document.getElementById("qrBackdrop");
  const scannerBtn = document.getElementById("scannerBtn");

  function startQrScan() {
      if (scanningActive) return;

      scanningActive = true;
      const qrReaderElem = document.getElementById("qr-reader");
      qrReaderElem.innerHTML = "";

      qrScanner = new Html5Qrcode("qr-reader");

      Html5Qrcode.getCameras().then(cameras => {
          if (cameras && cameras.length) {
              const camId = cameras[1].id; // back camera on mobile

              qrScanner.start(
                  camId,
                  {
                      fps: 30,
                      qrbox: 300
                  },
                  (qrMessage) => {
                      try {
                          const data = JSON.parse(qrMessage);
                          handleQrScan(data.itemId, data.userId);
                      } catch (e) {
                          showError("Invalid QR code.");
                      }
                  },
              ).catch(err => {
                  showError("QR Start Error:", err);
              });
          }
      }).catch(err => {
          showError("Camera Error:", err);
      });
  }

  function stopQrScan() {
      if (!qrScanner) return;
      qrScanner.stop()
          .then(() => {
              qrScanner.clear();
              qrScanner = null;
              scanningActive = false;
          })
          .catch(err => console.error("QR Stop Error:", err));
  }

  function openQrScanner() {
      qrModal.classList.add("visible");
      qrBackdrop.classList.add("visible");

      modalManager.open([qrModal, qrBackdrop]);

      setTimeout(startQrScan, 300);
  }

  function closeQrScanner() {
      stopQrScan();
      qrModal.classList.remove("visible");
      qrBackdrop.classList.remove("visible");

      modalManager.close([qrModal, qrBackdrop]);
  }
  // Buttons
  scannerBtn.addEventListener("click", openQrScanner);
  qrBackdrop.addEventListener("click", closeQrScanner);

});
