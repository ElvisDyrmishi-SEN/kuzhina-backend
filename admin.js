"use strict";

// API (backend në Render)
const API_URL = "https://kuzhina-backend-1.onrender.com";

//SELECTIMI
const loginForm = document.querySelector("#loginForm");
const passwordInput = document.querySelector("#password");
const loginError = document.querySelector("#loginError");
const logoutBtn = document.querySelector("#logoutBtn");
const dashboard = document.querySelector("#dashboard");
const tabs = document.querySelectorAll(".admin-tab");
const list = document.querySelector("#list");
const reviewsCount = document.querySelector("#reviewsCount");
const bookingsCount = document.querySelector("#bookingsCount");
const recipesCount = document.querySelector("#recipesCount");
const recipeForm = document.querySelector("#recipeForm");
const photoInput = document.querySelector("#recipePhoto");
const photoPreview = document.querySelector("#photoPreview");
const photoHint = document.querySelector("#photoHint");
const toastEl = document.querySelector("#toast");

let password = sessionStorage.getItem("adminPassword") || "";
let view = "reviews";
let data = { reviews: [], bookings: [], recipes: [] };
let photoData = "";

//HELPERS
const escapeHTML = (str) =>
  String(str ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

let toastTimer;
const showToast = function (message, isError = false) {
  toastEl.textContent = message;
  toastEl.classList.toggle("is-error", isError);
  toastEl.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 3500);
};

const formatDate = (value) =>
  new Date(value).toLocaleString("sq-AL", { dateStyle: "medium", timeStyle: "short" });

const countStars = (stars) => [...String(stars)].filter((c) => c === "⭐").length;

const api = async function (path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${password}`, ...options.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || "Request failed");
    error.status = response.status;
    throw error;
  }
  return body;
};

//RENDER
const renderReview = (r) => {
  const n = countStars(r.stars);
  return `
    <article class="admin-item">
      <div class="admin-item-body">
        <div class="stars">${"★".repeat(n)}<span class="star-off">${"★".repeat(5 - n)}</span></div>
        <p class="admin-item-text">“${escapeHTML(r.text)}”</p>
        <p class="admin-item-meta"><strong>${escapeHTML(r.name)}</strong> · ${escapeHTML(r.event)} · ${formatDate(r.created_at)}</p>
      </div>
      <button class="btn-delete" data-type="reviews" data-id="${r.id}">Fshi</button>
    </article>
  `;
};

const renderBooking = (b) => `
  <article class="admin-item">
    <div class="admin-item-body">
      <p class="admin-item-text"><strong>${escapeHTML(b.name)}</strong></p>
      <p class="admin-item-meta">
        Data e eventit: <strong>${escapeHTML(b.date)}</strong><br />
        Email: <a href="mailto:${escapeHTML(b.email)}"><strong>${escapeHTML(b.email)}</strong></a><br />
        Dërguar më: ${formatDate(b.created_at)}
      </p>
    </div>
    <button class="btn-delete" data-type="bookings" data-id="${b.id}">Fshi</button>
  </article>
`;

const recipeImageSrc = (r) =>
  r.image_url ? `/${escapeHTML(r.image_url)}` : `${API_URL}/api/recipes/${r.id}/image`;

const renderRecipe = (r) => `
  <article class="admin-item admin-item--recipe">
    <img class="admin-item-thumb" src="${recipeImageSrc(r)}" alt="" loading="lazy" />
    <div class="admin-item-body">
      <p class="admin-item-text"><strong>${escapeHTML(r.title)}</strong></p>
      <p class="admin-item-meta">${[r.category, r.prep_time, r.difficulty]
        .filter(Boolean)
        .map(escapeHTML)
        .join(" · ")}</p>
    </div>
    <button class="btn-delete" data-type="recipes" data-id="${r.id}">Fshi</button>
  </article>
`;

const RENDERERS = { reviews: renderReview, bookings: renderBooking, recipes: renderRecipe };
const EMPTY_TEXT = {
  reviews: "Nuk ka reviews.",
  bookings: "Nuk ka rezervime.",
  recipes: "Nuk ka receta. Shtoni të parën me formularin më lart.",
};

const render = function () {
  reviewsCount.textContent = data.reviews.length;
  bookingsCount.textContent = data.bookings.length;
  recipesCount.textContent = data.recipes.length;
  tabs.forEach((t) => t.classList.toggle("admin-tab--active", t.dataset.view === view));
  recipeForm.hidden = view !== "recipes";

  const items = data[view];
  if (items.length === 0) {
    list.innerHTML = `<p class="admin-empty">${EMPTY_TEXT[view]}</p>`;
    return;
  }
  list.innerHTML = items.map(RENDERERS[view]).join("");
};

//LOAD DATA
const loadAll = async function () {
  list.innerHTML = `<p class="admin-empty">Duke ngarkuar… (mund të zgjasë deri në 1 minutë)</p>`;
  const [reviews, bookings, recipes] = await Promise.all([
    api("/api/admin/reviews"),
    api("/api/admin/bookings"),
    api("/api/recipes"),
  ]);
  data = { reviews, bookings, recipes };
  render();
};

//ADD RECIPE
// Shrink the photo in the browser so uploads stay small and the site stays fast
const resizePhoto = (file, maxSize = 1400) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff"; // transparent PNGs get a white background
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => reject(new Error("Unsupported image"));
    img.src = URL.createObjectURL(file);
  });

const resetPhoto = function () {
  photoData = "";
  photoInput.value = "";
  photoPreview.hidden = true;
  photoHint.hidden = false;
};

photoInput.addEventListener("change", async function () {
  const file = photoInput.files[0];
  if (!file) return resetPhoto();

  try {
    photoData = await resizePhoto(file);
    photoPreview.src = photoData;
    photoPreview.hidden = false;
    photoHint.hidden = true;
  } catch {
    resetPhoto();
    showToast("Kjo foto nuk mund të hapet. Provoni një JPG ose PNG.", true);
  }
});

recipeForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  if (!photoData) return showToast("Zgjidhni një foto për recetën.", true);

  const submitBtn = recipeForm.querySelector("button[type='submit']");
  const value = (id) => document.querySelector(id).value.trim();

  submitBtn.disabled = true;
  submitBtn.textContent = "Duke ruajtur…";

  try {
    await api("/api/admin/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: value("#recipeTitle"),
        short_title: value("#recipeShort"),
        category: value("#recipeCategory"),
        prep_time: value("#recipeTime"),
        difficulty: value("#recipeDifficulty"),
        description: value("#recipeDescription"),
        image: photoData,
      }),
    });

    recipeForm.reset();
    resetPhoto();
    data.recipes = await api("/api/recipes");
    render();
    showToast("Receta u shtua! Tani duket edhe në faqen kryesore.");
  } catch (error) {
    if (error.status === 401) return showLogin("Sesioni skadoi. Hyni përsëri.");
    showToast("Receta nuk u ruajt. Provoni përsëri.", true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Shto recetën";
  }
});

const showDashboard = function () {
  loginForm.hidden = true;
  dashboard.hidden = false;
  logoutBtn.classList.remove("hidden");
};

const showLogin = function (message = "") {
  loginForm.hidden = false;
  dashboard.hidden = true;
  logoutBtn.classList.add("hidden");
  loginError.textContent = message;
};

//LOGIN
loginForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  const submitBtn = loginForm.querySelector("button[type='submit']");
  password = passwordInput.value;
  loginError.textContent = "";
  submitBtn.disabled = true;
  submitBtn.textContent = "Duke hyrë…";

  try {
    await api("/api/admin/check");
    sessionStorage.setItem("adminPassword", password);
    passwordInput.value = "";
    showDashboard();
    await loadAll();
  } catch (error) {
    password = "";
    showLogin(
      error.status === 401
        ? "Fjalëkalim i gabuar."
        : error.status === 429
          ? "Shumë tentativa të gabuara. Provoni pas 15 minutash."
          : "Serveri nuk po përgjigjet. Provoni përsëri pas pak.",
    );
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Hyr";
  }
});

logoutBtn.addEventListener("click", function () {
  sessionStorage.removeItem("adminPassword");
  password = "";
  showLogin();
});

//TABS
tabs.forEach((tab) =>
  tab.addEventListener("click", function () {
    view = tab.dataset.view;
    render();
  }),
);

//DELETE
list.addEventListener("click", async function (e) {
  const btn = e.target.closest(".btn-delete");
  if (!btn) return;

  const { type, id } = btn.dataset;
  const what = { reviews: "këtë review", bookings: "këtë rezervim", recipes: "këtë recetë" }[type];
  if (!confirm(`Jeni i sigurt që doni të fshini ${what}? Nuk mund të kthehet mbrapsht.`)) return;

  btn.disabled = true;
  try {
    await api(`/api/admin/${type}/${id}`, { method: "DELETE" });
    data[type] = data[type].filter((item) => String(item.id) !== id);
    render();
    showToast("U fshi me sukses.");
  } catch (error) {
    btn.disabled = false;
    if (error.status === 401) return showLogin("Sesioni skadoi. Hyni përsëri.");
    showToast("Fshirja dështoi. Provoni përsëri.", true);
  }
});

//AUTO LOGIN (same browser tab)
if (password) {
  showDashboard();
  loadAll().catch(() => {
    password = "";
    sessionStorage.removeItem("adminPassword");
    showLogin("Hyni përsëri.");
  });
}
