import { app, auth, db } from "/Scripts/site/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

  let selectedProfileImage = new Image();
  let selectedBannerImage = new Image();

  const profileCropSize = 200;
  const bannerCropSize = { width: 400, height: 225 }; // 16:9 ratio
  const resolution = 0.9; // Compression resolution

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
      profileImg.src = data.profileBase64 || "assets/default-profile.png";
      bannerImg.src = data.bannerBase64 || "assets/default-banner.jpg";

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

});
