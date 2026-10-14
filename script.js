"use strict";

// API (backend në Render)
const API_URL = "https://kuzhina-backend-1.onrender.com";

//SELECTIMI
const header = document.querySelector("#header");
const navToggle = document.querySelector("#navToggle");
const mainNav = document.querySelector("#mainNav");
const navLinks = document.querySelectorAll(".nav-link");
const openModalBtns = document.querySelectorAll(".btn-open-modal");
const closeModalBtn = document.querySelector(".btn-close-modal");
const overlay = document.querySelector("#modalOverlay");
const modal = document.querySelector("#bookModal");
const tabsContainer = document.querySelector(".tab-buttons");
const tabs = document.querySelectorAll(".tab-btn");
const tabsContent = document.querySelectorAll(".tab-content");
const recipeContainer = document.querySelector(".recipe-thumbnails");
const recipes = document.querySelectorAll(".recipe-thumb-item");
const recipeContent = document.querySelectorAll(".recipe-details");
const reviewForm = document.querySelector("#reviewForm");
const reviewContainer = document.querySelector("#reviewsContainer");
const sliderControls = document.querySelector("#sliderControls");
const leftBtn = document.querySelector(".slider-btn--left");
const rightBtn = document.querySelector(".slider-btn--right");
const dotsContainer = document.querySelector(".dots-container");
const bookingForm = document.querySelector(".modal-form");
const dateInput = document.querySelector("#date");
const toastEl = document.querySelector("#toast");
const scrollTopBtn = document.querySelector("#scrollTop");

document.querySelector("#year").textContent = new Date().getFullYear();

//HELPERS
// Escape user text before putting it in HTML (prevents script injection)
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
  toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 4000);
};

const setLoading = function (button, loading, text) {
  if (loading) button.dataset.label = button.textContent;
  button.disabled = loading;
  button.textContent = loading ? text : button.dataset.label;
};

//STICKY HEADER & SCROLL-TOP
const onScroll = function () {
  const scrolled = window.scrollY > 40;
  header.classList.toggle("is-scrolled", scrolled);
  scrollTopBtn.classList.toggle("is-visible", window.scrollY > 600);
};
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

scrollTopBtn.addEventListener("click", () =>
  window.scrollTo({ top: 0, behavior: "smooth" }),
);

//MOBILE NAV
const closeNav = function () {
  document.body.classList.remove("nav-open", "no-scroll");
  navToggle.setAttribute("aria-expanded", "false");
};

navToggle.addEventListener("click", function () {
  const open = document.body.classList.toggle("nav-open");
  document.body.classList.toggle("no-scroll", open);
  navToggle.setAttribute("aria-expanded", String(open));
});

mainNav.addEventListener("click", function (e) {
  if (e.target.closest("a, button")) closeNav();
});

//ACTIVE NAV LINK ON SCROLL
const navObserver = new IntersectionObserver(
  function (entries) {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) =>
        link.classList.toggle(
          "is-active",
          link.getAttribute("href") === `#${entry.target.id}`,
        ),
      );
    });
  },
  { rootMargin: "-45% 0px -50% 0px" },
);
document.querySelectorAll("main section[id]").forEach((s) => navObserver.observe(s));

//MODAL WINDOW
const openModal = function (e) {
  e.preventDefault();
  modal.classList.remove("hidden");
  overlay.classList.remove("hidden");
  document.body.classList.add("no-scroll");
  setTimeout(() => modal.querySelector("input")?.focus(), 150);
};

const closeModal = function () {
  modal.classList.add("hidden");
  overlay.classList.add("hidden");
  if (!document.body.classList.contains("nav-open")) {
    document.body.classList.remove("no-scroll");
  }
};

openModalBtns.forEach((btn) => btn.addEventListener("click", openModal));
closeModalBtn.addEventListener("click", closeModal);
overlay.addEventListener("click", closeModal);

document.addEventListener("keydown", function (e) {
  if (e.key !== "Escape") return;
  if (!modal.classList.contains("hidden")) closeModal();
  else if (document.body.classList.contains("nav-open")) closeNav();
});

// Booking date cannot be in the past
dateInput.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
  .toISOString()
  .split("T")[0];

//TABBED COMPONENT
tabsContainer.addEventListener("click", function (e) {
  const clicked = e.target.closest(".tab-btn");
  //Guard clause
  if (!clicked) return;

  tabs.forEach((tab) => {
    tab.classList.remove("tab-btn--active");
    tab.setAttribute("aria-selected", "false");
  });
  tabsContent.forEach((tab) => tab.classList.remove("tab-content--active"));

  clicked.classList.add("tab-btn--active");
  clicked.setAttribute("aria-selected", "true");

  document
    .querySelector(`.tab-content--${clicked.dataset.tab}`)
    ?.classList.add("tab-content--active");
});

//RECIPE COMPONENT
recipeContainer.addEventListener("click", function (e) {
  const clicked = e.target.closest(".recipe-thumb-item");
  //Guard clause
  if (!clicked) return;

  recipes.forEach((r) => r.classList.remove("recipe-thumb--active"));
  recipeContent.forEach((r) => r.classList.remove("recipe-details--active"));

  clicked.classList.add("recipe-thumb--active");

  document
    .querySelector(`.recipe-details--${clicked.dataset.recipe}`)
    ?.classList.add("recipe-details--active");
});

//REVEAL SECTIONS ON SCROLL
const revealSection = function (entries, observer) {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.remove("reveal--hidden");
    observer.unobserve(entry.target);
  });
};

const sectionObserver = new IntersectionObserver(revealSection, {
  root: null,
  threshold: 0.12,
});

document.querySelectorAll(".reveal").forEach((section) => {
  // Only hide sections that are still below the viewport
  if (section.getBoundingClientRect().top < window.innerHeight) return;
  section.classList.add("reveal--hidden");
  sectionObserver.observe(section);
});

//REVIEWS SLIDER
let curSlide = 0;
let autoplay;

// Old reviews store stars as "⭐⭐⭐⭐⭐", new ones as a number
const countStars = function (stars) {
  const n = Number(stars);
  if (Number.isInteger(n)) return Math.min(Math.max(n, 0), 5);
  return [...String(stars)].filter((c) => c === "⭐").length;
};

const renderStars = function (stars) {
  const n = countStars(stars);
  return "★".repeat(n) + `<span class="star-off">${"★".repeat(5 - n)}</span>`;
};

// Generate review card
const createReviewCard = function ({ name, event, stars, text }) {
  const n = countStars(stars);
  return `
    <div class="slide">
      <article class="testimonial-card">
        <div class="stars" aria-label="${n} nga 5 yje">${renderStars(stars)}</div>
        <p class="review-text">“${escapeHTML(text)}”</p>
        <div class="client-info">
          <span class="client-avatar" aria-hidden="true">${escapeHTML(String(name).trim().charAt(0))}</span>
          <div>
            <h4 class="client-name">${escapeHTML(name)}</h4>
            <span class="client-event">${escapeHTML(event)}</span>
          </div>
        </div>
      </article>
    </div>
  `;
};

const getSlides = () => reviewContainer.querySelectorAll(".slide");

const goToSlide = function (slide) {
  getSlides().forEach((s, i) => s.classList.toggle("slide--active", i === slide));
  dotsContainer
    .querySelectorAll(".dot")
    .forEach((dot, i) => dot.classList.toggle("dot--active", i === slide));
};

const createDots = function () {
  dotsContainer.innerHTML = "";
  getSlides().forEach((_, i) => {
    dotsContainer.insertAdjacentHTML(
      "beforeend",
      `<button class="dot" data-slide="${i}" aria-label="Review ${i + 1}"></button>`,
    );
  });
};

const nextSlide = function () {
  const total = getSlides().length;
  if (total === 0) return;
  curSlide = curSlide === total - 1 ? 0 : curSlide + 1;
  goToSlide(curSlide);
};

const prevSlide = function () {
  const total = getSlides().length;
  if (total === 0) return;
  curSlide = curSlide === 0 ? total - 1 : curSlide - 1;
  goToSlide(curSlide);
};

const startAutoplay = function () {
  clearInterval(autoplay);
  if (getSlides().length > 1) autoplay = setInterval(nextSlide, 7000);
};

leftBtn.addEventListener("click", () => {
  prevSlide();
  startAutoplay();
});
rightBtn.addEventListener("click", () => {
  nextSlide();
  startAutoplay();
});

dotsContainer.addEventListener("click", function (e) {
  if (!e.target.classList.contains("dot")) return;
  curSlide = Number(e.target.dataset.slide);
  goToSlide(curSlide);
  startAutoplay();
});

document.addEventListener("keydown", function (e) {
  if (!modal.classList.contains("hidden")) return;
  if (e.target.closest("input, textarea")) return;
  if (e.key === "ArrowLeft") prevSlide();
  if (e.key === "ArrowRight") nextSlide();
});

const setReviewsStatus = function (message) {
  reviewContainer.innerHTML = `<p class="reviews-status">${message}</p>`;
  sliderControls.classList.add("hidden");
};

// LOAD REVIEWS FROM DATABASE
const loadReviews = async function () {
  try {
    const response = await fetch(`${API_URL}/api/reviews`);
    if (!response.ok) throw new Error("Failed to load reviews");

    const reviews = await response.json();

    if (reviews.length === 0) {
      setReviewsStatus("Ende nuk ka reviews. Bëhuni i pari që ndani përshtypjen tuaj!");
      return;
    }

    reviewContainer.innerHTML = reviews.map(createReviewCard).join("");
    sliderControls.classList.toggle("hidden", reviews.length < 2);

    createDots();
    curSlide = 0;
    goToSlide(curSlide);
    startAutoplay();
  } catch (error) {
    console.error("Error loading reviews:", error);
    setReviewsStatus("Reviews nuk mund të ngarkohen tani. Provoni më vonë.");
  }
};

// SUBMIT REVIEW TO DATABASE
reviewForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  const submitBtn = reviewForm.querySelector("button[type='submit']");

  const name = document.querySelector("#reviewerName").value.trim();
  const event = document.querySelector("#reviewerEvent").value.trim();
  const stars = reviewForm.querySelector("input[name='stars']:checked").value;
  const text = document.querySelector("#reviewerText").value.trim();

  setLoading(submitBtn, true, "Duke dërguar…");

  try {
    const response = await fetch(`${API_URL}/api/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, event, stars, text }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Failed to submit review");
    }

    reviewForm.reset();
    await loadReviews();
    showToast("Faleminderit! Review u dërgua me sukses.");
  } catch (error) {
    console.error("Error submitting review:", error);
    showToast("Ndodhi një problem gjatë dërgimit. Provoni përsëri.", true);
  } finally {
    setLoading(submitBtn, false);
  }
});

// BOOKING FORM
bookingForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  const submitBtn = bookingForm.querySelector("button[type='submit']");

  const name = document.querySelector("#name").value.trim();
  const email = document.querySelector("#email").value.trim();
  const date = dateInput.value;

  setLoading(submitBtn, true, "Duke dërguar…");

  try {
    const response = await fetch(`${API_URL}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, date }),
    });

    if (!response.ok) throw new Error("Failed to submit booking");

    bookingForm.reset();
    closeModal();
    showToast("Kërkesa u dërgua! Do t'ju kontaktojmë së shpejti.");
  } catch (error) {
    console.error("Error submitting booking:", error);
    showToast("Ndodhi një problem gjatë rezervimit. Provoni përsëri.", true);
  } finally {
    setLoading(submitBtn, false);
  }
});

// Load database reviews when page opens
loadReviews();
