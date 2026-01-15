import { app, auth, db } from "https://cadlaxa.github.io/SaveEats/Scripts/site/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  addDoc,
  collection,
  serverTimestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("notif-modal2");
  const yesBtn = document.getElementById("yesBtn");
  const noBtn = document.getElementById("noBtn");
  const closeBtn = modal.querySelector(".close-btn");
  const message = modal.querySelector(".notif-message");

  // Customize message
  message.textContent = "Enable notifications to receive updates from SaveEats 🥕";

  if (
    'Notification' in window &&
    Notification.permission === 'default' &&
    !localStorage.getItem('notifChoice')
  ) {
    //modalManager.open([modal]);
    modal.classList.add("visible");
  }

  // YES → Ask permission
  yesBtn.addEventListener("click", async () => {
    //modalManager.close([modal]);
    modal.classList.remove("visible");

    const granted = await window.requestNotificationPermission();

    localStorage.setItem('notifChoice', 'asked');

    if (granted) {
      window.sendNotification(
        'Welcome to SaveEats! 🥕',
        {
          body: 'You will now receive notifications from SaveEats.',
          icon: 'Resources/assets/icon1.png',
          data: { url: 'home-user.html' }
        }
      );
    }
  });

  // NO → Remember choice, don’t ask again
  noBtn.addEventListener("click", () => {
    localStorage.setItem('notifChoice', 'declined');
    //modalManager.close([modal]);
    modal.classList.remove("visible");
  });

  // Close (same as No)
  closeBtn.addEventListener("click", () => {
    localStorage.setItem('notifChoice', 'dismissed');
    //modalManager.close([modal]);
    modal.classList.remove("visible");
  });
});

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

  const triggerBtn = document.getElementById("profileSelectBtn");

  triggerBtn.addEventListener("click", () => {
    profileFileInput.click();
  });

  const triggerBannerBtn = document.getElementById("bannerSelectBtn");

  triggerBannerBtn.addEventListener("click", () => {
    bannerFileInput.click();
  });

  let selectedProfileImage = new Image();
  let selectedBannerImage = new Image();

  const profileCropSize = 200;
  const bannerCropSize = { width: 400, height: 225 }; // 16:9 ratio
  const resolution = 0.9; // Compression resolution

  // OPEN PROFILE MODAL
  const editProfileBtn = document.getElementById("editProfileBtn");
  const editBannerBtn = document.getElementById("editBannerBtn");
  editProfileBtn.addEventListener("click", () => {
      safeVibrate([50, 150, 50])
      loadCurrentProfile();
      //modalManager.open([profileModal]);
      profileModal.classList.add("visible");
  });

  // OPEN BANNER MODAL
  editBannerBtn.addEventListener("click", () => {
      safeVibrate([50, 150, 50])
      loadCurrentBanner();
      //modalManager.open([bannerModal]);
      bannerModal.classList.add("visible");
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
    safeVibrate([50, 150, 50]);
    
    const isVisible = addItemModal.classList.contains("visible");
    if (isVisible) {
      // Close modal
      //modalManager.close([addItemModal]);
      addItemModal.classList.remove("visible");
      animateToggleIcon();
    } else {
      // Open modal
      //modalManager.open([addItemModal]);
      addItemModal.classList.add("visible");
      animateToggleIcon();
    }
  });
  
  const itemImageInput = document.getElementById("itemImageInput");
  const itemPreviewImage = document.getElementById("itemPreviewImage");

  const triggerBtn1 = document.getElementById("itemImgSelectBtn");
  
  triggerBtn1.addEventListener("click", () => {
    itemImageInput.click();
  });

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

    const size = 500;
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
      //modalManager.close([addItemModal]);
      addItemModal.classList.remove("visible");
      showNotif("Item added successfully!");

    } catch (err) {
      showError("Failed to add item: " + err.message);
    }
  });

  // -------------------------------
  // LOAD RESTO DATA
  // -------------------------------
  onAuthStateChanged(auth, (user) => {
    if (!user) return window.location.href = "index.html";
    if (localStorage.getItem("loggedInUserType") !== "restaurant") return window.location.href = "home-user.html";

    const docRef = doc(db, "users", user.uid);
    const avgRestoLabel = document.getElementById("averageRestoRating");

    // Listen for real-time updates
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (!docSnap.exists()) return window.location.href = "index.html";

      const data = docSnap.data();
      restoName.textContent = data.restaurantName || data.username || "My Restaurant";
      restoEmail.textContent = user.email;

      profileImg.src = data.profileBase64 || "Resources/assets/profile.jpg";
      bannerImg.src = data.bannerBase64 || "Resources/assets/banner.webp";

      const ratings = data.ratings || { total: 0, count: 0 };
      const total = ratings.total || 0;
      const count = ratings.count || 0;
      const average = count > 0 ? (total / count).toFixed(1) : "0.0";

      if (avgRestoLabel) {
        avgRestoLabel.textContent = average;
      }
    });
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

  let imageSource = "none"; // "none" | "provider" | "local"
  
  async function loadCurrentProfile() {
    const user = auth.currentUser;
    if (!user) return;
  
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) return;
  
    const data = snap.data();
    document.getElementById("usernameInput").value = data.username || "";
  
    if (!data.profileBase64) return;
  
    const img = new Image();
  
    // 🔑 THIS IS THE FIX
    if (data.profileBase64.startsWith("http")) {
      imageSource = "provider";
      img.crossOrigin = "anonymous"; // allows drawing (not exporting)
    } else {
      imageSource = "local";
    }
  
    img.onload = () => {
      profileCtx.clearRect(0, 0, profileCanvas.width, profileCanvas.height);
      profileCtx.drawImage(img, 0, 0, profileCanvas.width, profileCanvas.height);
    };
  
    img.onerror = () => {
      console.warn("Profile image preview failed");
    };
  
    img.src = data.profileBase64;
  }

  async function loadCurrentBanner() {
    const user = auth.currentUser;
    if (!user) return;
  
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) return;
  
    const data = snap.data();
    document.getElementById("usernameInput").value = data.username || "";
  
    if (!data.bannerBase64) return;
  
    const img = new Image();
  
    // 🔑 THIS IS THE FIX
    if (data.bannerBase64.startsWith("http")) {
      imageSource = "provider";
      img.crossOrigin = "anonymous"; // allows drawing (not exporting)
    } else {
      imageSource = "local";
    }
  
    img.onload = () => {
      bannerCtx.clearRect(0, 0, bannerCanvas.width, bannerCanvas.height);
      bannerCtx.drawImage(img, 0, 0, bannerCanvas.width, bannerCanvas.height);
    };
  
    img.onerror = () => {
      console.warn("Profile image preview failed");
    };
  
    img.src = data.bannerBase64;
  }

  window.saveProfileProcess = async function() {
    const user = auth.currentUser;
    if (!user) return showError("Not logged in");

    const username = document.getElementById("usernameInput").value.trim();
    if (!username) return showError("Username cannot be empty");

    const updateData = { username };

    // Only update profile image if there’s a selected image
    if (selectedProfileImage.src) {
      const base64 = profileCanvas.toDataURL("image/jpeg", resolution);
      updateData.profileBase64 = base64;
    }

    try {
      await updateDoc(doc(db, "users", user.uid), updateData);

      // Update main profile icon
      if (updateData.profileBase64) profileImg.src = updateData.profileBase64;

      //modalManager.close([profileModal]);
      profileModal.classList.remove("visible");
      setTimeout(() => {
        showNotif("Profile updated successfully!");
      }, 300);
    } catch (err) {
      console.error(err);
      showError("Failed to save profile: " + err.message);
    }
  };

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

  window.saveBannerProcess = async function() {
    const user = auth.currentUser;
    if (!user) return alert("Not logged in");
    if (!selectedBannerImage.src) return showError("No image selected");

    const base64 = bannerCanvas.toDataURL("image/jpeg", resolution);
    try {
      await updateDoc(doc(db, "users", user.uid), { bannerBase64: base64 });
      bannerImg.src = base64;
      //modalManager.close([bannerModal]);
      bannerModal.classList.remove("visible");
      setTimeout(() => {
        showNotif("Banner image updated!");
      }, 300);
    } catch (err) {
      showError("Update failed: " + err.message);
    }
  };

  async function handleQrScan(data) {
    try {
      const {
        itemId,
        reservationId,
        userId
      } = data;

      if (!itemId) {
        showError("Invalid QR: missing itemId.");
        return;
      }

      const itemRef = doc(db, "items", itemId);
      const itemSnap = await getDoc(itemRef);

      if (!itemSnap.exists()) {
        showError("Item not found.");
        return;
      }

      const itemData = itemSnap.data();
      let newQuantity = (itemData.quantity || 0) - 1;

      // ---------------------------------------
      // CASE 1: QR HAS reservationId → use reservation logic
      // ---------------------------------------
      if (reservationId) {
        const reservationRef = doc(db, "reservations", reservationId);
        const resSnap = await getDoc(reservationRef);

        if (!resSnap.exists()) {
          showError("Reservation not found.");
          return;
        }

        const resData = resSnap.data();

        // Prevent double scanning
        if (resData.redeemed) {
          showError("Already redeemed.");
          return;
        }

        let username = "User";
        if (resData.userId) {
            const userRef = doc(db, "users", resData.userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                username = userSnap.data().username || "User";
            }
        }

        // STEP 1 — mark as redeemed (user is allowed)
        await updateDoc(reservationRef, {
          redeemed: true
        });

        // STEP 2 — reduce stock (restaurant is allowed)
        if (newQuantity <= 0) {
          await deleteDoc(itemRef);
          showNotif(`Item "${itemData.name}" deleted — stock is now 0.`);
          playSound(pay);
        } else {
          await updateDoc(itemRef, {
            quantity: newQuantity
          });
          showNotif(`Redeemed reserved item: "${itemData.name}" by "${username}"`);
        }

        // STEP 3 — delete reservation (restaurant allowed ONLY after redeemed)
        await deleteDoc(reservationRef);

        playSound(pay);
        return;
      }

      // ---------------------------------------
      // CASE 2: QR DOES NOT HAVE reservationId → reduces stock normally
      // ---------------------------------------
      if (newQuantity <= 0) {
        await deleteDoc(itemRef);
        showNotif(`Item "${itemData.name}" deleted — stock is now 0.`);
        playSound(pay);
      } else {
        await updateDoc(itemRef, {
          quantity: newQuantity
        });
        showNotif(`Redeemed: "${itemData.name}"`);
      }

      playSound(pay);

    } catch (err) {
      console.error(err);
      showError("QR processing error: " + err.message);
    }
  }

  let qrScanner = null;
  let camerasList = [];
  let currentCameraIndex = 0;
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

    Html5Qrcode.getCameras()
      .then(cameras => {
        if (!cameras || cameras.length === 0) {
          showError("No cameras found.");
          return;
        }

        camerasList = cameras;

        // Default to back camera if possible
        currentCameraIndex = cameras.length > 1 ? 1 : 0;

        startCamera(camerasList[currentCameraIndex].id);
      })
      .catch(err => {
        showError("Camera Error:", err);
      });
  }

  function startCamera(cameraId) {
    qrScanner
      .start(
        cameraId,
        {
          fps: 30,
          qrbox: 210
        },
        (qrCodeMessage) => {
          try {
            const data = JSON.parse(qrCodeMessage);
            handleQrScan(data);
            closeQrScanner();
          } catch (e) {
            closeQrScanner();
            showError("Invalid QR code format.");
          }
        }
      )
      .catch(err => {
        showError("QR Start Error:", err);
      });
  }

  document.getElementById("switchCamera").addEventListener("click", () => {
    if (!qrScanner || camerasList.length < 2) return;

    qrScanner.stop().then(() => {
      currentCameraIndex =
        (currentCameraIndex + 1) % camerasList.length;

      startCamera(camerasList[currentCameraIndex].id);
    });
  });


  /*function startQrScan() {
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
                  (qrCodeMessage) => {
                    try {
                        const data = JSON.parse(qrCodeMessage);
                        handleQrScan(data);
                        closeQrScanner();
                    } catch (e) {
                        closeQrScanner();
                        showError("Invalid QR code format.");
                    }
                  },
              ).catch(err => {
                  showError("QR Start Error:", err);
              });
          }
      }).catch(err => {
          showError("Camera Error:", err);
      });
  }*/

  window.stopQrScan = function() {
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
      //modalManager.open([qrModal, qrBackdrop]);
      qrModal.classList.add("visible");
      qrBackdrop.classList.add("visible");
      setTimeout(startQrScan, 300);
  }

  function closeQrScanner() {
      stopQrScan()

      //modalManager.close([qrModal, qrBackdrop]);
      qrModal.classList.remove("visible");
      qrBackdrop.classList.remove("visible");
  }
  // Buttons
  scannerBtn.addEventListener("click", openQrScanner);
});