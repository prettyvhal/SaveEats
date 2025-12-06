import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

document.addEventListener("DOMContentLoaded", () => {
  const bannerImg = document.getElementById("bannerImage");
  const profileImg = document.getElementById("profileImage");
  const restoName = document.getElementById("restoName");
  const restoEmail = document.getElementById("restoEmail");

  const bannerInput = document.getElementById("bannerInput");
  const profileInput = document.getElementById("profileInput");

  const editBannerBtn = document.getElementById("editBannerBtn");
  const editProfileBtn = document.getElementById("editProfileBtn");

  const firebaseConfig = {
    apiKey: "AIzaSyAZKYQvVJihtvRz7QHrXHNullNNadyQVMc",
    authDomain: "saveeats-395fd.firebaseapp.com",
    projectId: "saveeats-395fd",
    storageBucket: "saveeats-395fd.appspot.com",
    messagingSenderId: "1070958395954",
    appId: "1:1070958395954:web:41c17d243770545c58f22b"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const storage = getStorage(app);

  // LOAD USER DATA
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    const savedType = localStorage.getItem("loggedInUserType");
    if (savedType !== "restaurant") {
      window.location.href = "home-user.html";
      return;
    }

    restoName.textContent = user.displayName || "My Restaurant";
    restoEmail.textContent = user.email;

    // Load profile + banner if exists
    loadImage(user.uid, "profile", profileImg, "assets/default-profile.png");
    loadImage(user.uid, "banner", bannerImg, "assets/default-banner.jpg");
  });

  // LOAD IMAGE FROM STORAGE OR DEFAULT
  async function loadImage(uid, type, imgElement, fallback) {
    try {
      const fileRef = ref(storage, `restaurants/${uid}/${type}.jpg`);
      const url = await getDownloadURL(fileRef);
      imgElement.src = url;
    } catch {
      imgElement.src = fallback;
    }
  }

  // CLICK TO EDIT
  editBannerBtn?.addEventListener("click", () => bannerInput.click());
  editProfileBtn?.addEventListener("click", () => profileInput.click());

  // UPLOAD HANDLERS
  bannerInput?.addEventListener("change", (e) => {
    uploadImage(e.target.files[0], "banner", bannerImg);
  });

  profileInput?.addEventListener("change", (e) => {
    uploadImage(e.target.files[0], "profile", profileImg);
  });

  // UPLOAD TO STORAGE + AUTO UPDATE UI
  async function uploadImage(file, type, imgElement) {
    if (!file) return;

    const user = auth.currentUser;
    if (!user) return;

    const fileRef = ref(storage, `restaurants/${user.uid}/${type}.jpg`);

    try {
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      imgElement.src = url;
      alert(`${type.toUpperCase()} updated successfully!`);
    } catch (err) {
      alert("Upload failed: " + err.message);
    }
  }
});
