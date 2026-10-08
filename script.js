"use strict";

//SELECTIMI
const openModalBtn = document.querySelector(".btn-open-modal");
const closeModalBtn = document.querySelector(".btn-close-modal");
const overlay = document.querySelector("#modalOverlay");
const modal = document.querySelector("#bookModal");
const tabsContainer = document.querySelector(".tab-buttons");
const tabs = document.querySelectorAll(".tab-btn");
const tabsContent = document.querySelectorAll(".tab-content");
const recipeContainer = document.querySelector(".recipe-thumbnails");
const recipe = document.querySelectorAll(".recipe-thumb-item");
const recipeContent = document.querySelectorAll(".recipe-details");
const leftBtn = document.querySelector(".slider-btn--left");
const rightBtn = document.querySelector(".slider-btn--right");
const dotsContainer = document.querySelector(".dots-container");
const mainNav = document.querySelector(".main-nav");
const chefIcon = document.querySelector(".chef-profile");

//MODAL WINDOW
const openModal = function (e) {
  e.preventDefault();
  modal.classList.remove("hidden");
  overlay.classList.remove("hidden");
};

const closeModal = function () {
  modal.classList.add("hidden");
  overlay.classList.add("hidden");
};

openModalBtn.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", closeModal);
overlay.addEventListener("click", closeModal);

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && !modal.classList.contains("hidden")) {
    closeModal();
  }
});

//TABBED COMPONENT
if (tabsContainer) {
  tabsContainer.addEventListener("click", function (e) {
    const clicked = e.target.closest(".tab-btn");
    //Guard close
    if (!clicked) return;

    tabs.forEach((tab) => tab.classList.remove("tab-btn--active"));
    tabsContent.forEach((tab) => tab.classList.remove("tab-content--active"));

    clicked.classList.add("tab-btn--active");

    document
      .querySelector(`.tab-content--${clicked.dataset.tab}`)
      ?.classList.add("tab-content--active");
  });
}

//RECIPE COMPONENT
if (recipeContainer) {
  recipeContainer.addEventListener("click", function (e) {
    const clicked = e.target.closest(".recipe-thumb-item");
    //Guard close
    if (!clicked) return;

    recipe.forEach((r) => r.classList.remove("recipe-thumb--active"));
    recipeContent.forEach((r) => r.classList.remove("recipe-details--active"));

    clicked.classList.add("recipe-thumb--active");

    document
      .querySelector(`.recipe-details--${clicked.dataset.recipe}`)
      ?.classList.add("recipe-details--active");
  });
}

//REVIEWS SLIDER
/*let curSlide = 0;
const maxSlide = slides.length;

const goToSlide = function (slide) {
  slides.forEach((s) => s.classList.remove("slide--active"));
  slides[slide].classList.add("slide--active");
};

const nextSlide = function () {
  if (curSlide === maxSlide - 1) {
    curSlide = 0;
  } else {
    curSlide++;
  }
  goToSlide(curSlide);
  activeDots(curSlide);
};

const prevSlide = function () {
  if (curSlide === 0) {
    curSlide = maxSlide - 1;
  } else {
    curSlide--;
  }
  goToSlide(curSlide);
  activeDots(curSlide);
};

leftBtn.addEventListener("click", prevSlide);
rightBtn.addEventListener("click", nextSlide);

const createDots = function () {
  slides.forEach((_, i) => {
    const html = `<button class="dot" data-slide="${i}"></button>`;
    dotsContainer.insertAdjacentHTML("beforeend", html);
  });
};

const activeDots = function (slide) {
  const dots = document.querySelectorAll(".dot");
  dots.forEach((dot) => dot.classList.remove("dot--active"));
  document
    .querySelector(`.dot[data-slide="${slide}"]`)
    ?.classList.add("dot--active");
};

//Event Delegation
dotsContainer.addEventListener("click", function (e) {
  //Check if clicked element is dot(contains dot)
  if (e.target.classList.contains("dot")) {
    //Read the slide index from data-slide attribute
    const slide = Number(e.target.dataset.slide);

    curSlide = slide;
    goToSlide(curSlide);
    activeDots(curSlide);
  }
});

goToSlide(0);
createDots();
activeDots(0);*/

//HEADER VISIBILITY

const handleHover = function (e, opacity) {
  if (e.target.closest("a")) {
    const link = e.target;
    const siblings = link.closest(".main-nav").querySelectorAll("a");

    siblings.forEach((el) => {
      if (el != link) {
        el.style.opacity = opacity;
      }
      chefIcon.style.opacity = opacity;
    });
  }
};
//Event Listener with parameters
mainNav.addEventListener("mouseover", function (e) {
  handleHover(e, 0.5);
});
mainNav.addEventListener("mouseout", function (e) {
  handleHover(e, 1);
});

// 1. Select all sections to observe
const allSections = document.querySelectorAll("section");

// 2. Callback function executed when section intersects
const revealSection = function (entries, observer) {
  entries.forEach((entry) => {
    // Guard clause: stop execution if section is not intersecting
    if (!entry.isIntersecting) return;

    // Reveal section by removing hidden class
    entry.target.classList.remove("section--hidden");

    // Unobserve section to prevent re-triggering animation
    observer.unobserve(entry.target);
  });
};

// 3. Create the Intersection Observer instance
const sectionObserver = new IntersectionObserver(revealSection, {
  root: null, // Uses the browser viewport
  threshold: 0.2, // Triggers when 20% of section is visible
});

// 4. Attach observer and initial hidden class to each section
allSections.forEach((section) => {
  sectionObserver.observe(section);
  section.classList.add("section--hidden");
});

//REVIEW SUBMIT AND CONTAINER FEATURE
const reviewForm = document.querySelector("#reviewForm");
const reviewContainer = document.querySelector("#reviewsContainer");

let curSlide = 0;

//1. HELPER: Generate Slide HTML
const createReviewCard = function (name, event, stars, text) {
  return `
  <div class="slide">
      <div class="testimonial-card">
        <div class="stars">${stars}</div>
        <p class="review-text">"${text}"</p>
        <div class="client-info">
          <div>
            <h4 class="client-name">${name}</h4>
            <span class="client-event">${event}</span>
          </div>
        </div>
      </div>
    </div>
  `;
};

//2. SLIDER Navigation Functions
const goToSlide = function (slide) {
  const slides = document.querySelectorAll(".slide");
  if (slides.length === 0) return;

  slides.forEach((slide) => slide.classList.remove("slide--active"));
  slides[slide]?.classList.add("slide--active");
};

const activeDots = function (slide) {
  const dots = document.querySelectorAll(".dot");
  dots.forEach((dot) => dot.classList.remove("dot--active"));
  document
    .querySelector(`.dot[data-slide="${slide}"]`)
    ?.classList.add("dot--active");
};

const createDots = function () {
  const slides = document.querySelectorAll(".slide");
  dotsContainer.innerHTML = "";
  slides.forEach((_, i) => {
    const html = `<button class="dot" data-slide="${i}"></button>`;
    dotsContainer.insertAdjacentHTML("beforeend", html);
  });
};

const nextSlide = function () {
  const slides = document.querySelectorAll(".slide");
  if (slides.length === 0) return;

  curSlide = curSlide === slides.length - 1 ? 0 : curSlide + 1;
  goToSlide(curSlide);
  activeDots(curSlide);
};

const prevSlide = function () {
  const slides = document.querySelectorAll(".slide");
  if (slides.length === 0) return;

  curSlide = curSlide === 0 ? slides.length - 1 : curSlide - 1;
  goToSlide(curSlide);
  activeDots(curSlide);
};

//3. Event Listeners
leftBtn.addEventListener("click", prevSlide);
rightBtn.addEventListener("click", nextSlide);

dotsContainer.addEventListener("click", function (e) {
  if (e.target.classList.contains("dot")) {
    curSlide = Number(e.target.dataset.slide);
    goToSlide(curSlide);
    activeDots(curSlide);
  }
});

rightBtn.classList.add("hidden");
leftBtn.classList.add("hidden");

//4. FORM Submission Event
reviewForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const name = document.querySelector("#reviewerName").value;
  const event = document.querySelector("#reviewerEvent").value;
  const stars = document.querySelector("#reviewerStars").value;
  const text = document.querySelector("#reviewerText").value;

  rightBtn.classList.remove("hidden");
  leftBtn.classList.remove("hidden");

  const slideHTML = createReviewCard(name, event, stars, text);
  reviewContainer.insertAdjacentHTML("beforeend", slideHTML);

  //Re-build dots & jump to newly added slide
  createDots();
  const slides = document.querySelectorAll(".slide");
  curSlide = slides.length - 1;
  goToSlide(curSlide);
  activeDots(curSlide);

  //Clear inputs
  reviewForm.reset();
});
