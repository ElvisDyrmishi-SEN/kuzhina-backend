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
const toastEl = document.querySelector("#toast");

let password = sessionStorage.getItem("adminPassword") || "";
let view = "reviews";
let data = { reviews: [], bookings: [] };

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
    headers: { Authorization: `Bearer ${password}` },
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

const render = function () {
  reviewsCount.textContent = data.reviews.length;
  bookingsCount.textContent = data.bookings.length;
  tabs.forEach((t) => t.classList.toggle("admin-tab--active", t.dataset.view === view));

  const items = data[view];
  if (items.length === 0) {
    list.innerHTML = `<p class="admin-empty">${
      view === "reviews" ? "Nuk ka reviews." : "Nuk ka rezervime."
    }</p>`;
    return;
  }
  list.innerHTML = items.map(view === "reviews" ? renderReview : renderBooking).join("");
};

//LOAD DATA
const loadAll = async function () {
  list.innerHTML = `<p class="admin-empty">Duke ngarkuar… (mund të zgjasë deri në 1 minutë)</p>`;
  const [reviews, bookings] = await Promise.all([
    api("/api/admin/reviews"),
    api("/api/admin/bookings"),
  ]);
  data = { reviews, bookings };
  render();
};

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
  const what = type === "reviews" ? "këtë review" : "këtë rezervim";
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
