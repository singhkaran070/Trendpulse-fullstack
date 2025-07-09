// script.js - TrendPulse Frontend Integration

// Use a relative path for the API base. This allows Vercel to correctly
// route requests to the backend serverless function.
const API_BASE = "/api";
let currentPage = 1;
let currentCategory = "all";
let isLoading = false;
let trendingData = [];
let currentSlide = 0;

// DOM Elements
const elements = {
  loadingSpinner: document.getElementById("loading-spinner"),
  trendingContainer: document.getElementById("trendingContainer"),
  gridContainer: document.getElementById("gridContainer"),
  loadMoreBtn: document.getElementById("loadMoreBtn"),
  refreshBtn: document.getElementById("refreshArticles"),
  darkModeToggle: document.getElementById("darkModeToggle"),
  mobileMenuToggle: document.querySelector(".mobile-menu-toggle"),
  mobileNav: document.querySelector(".mobile-nav"),
  newsletterModal: document.getElementById("newsletterModal"),
  bookmarkModal: document.getElementById("bookmarkModal"),
  errorModal: document.getElementById("errorModal"),
  toast: document.getElementById("toast"),
  updateAlert: document.getElementById("updateAlert"),
  sortBy: document.getElementById("sortBy"),
};

// Utility Functions
function showLoading() {
  if (elements.loadingSpinner) {
    elements.loadingSpinner.style.display = "flex";
  }
}

function hideLoading() {
  if (elements.loadingSpinner) {
    elements.loadingSpinner.style.display = "none";
  }
}

function showToast(message, type = "success") {
  if (elements.toast) {
    const toastMessage = elements.toast.querySelector(".toast-message");
    toastMessage.textContent = message;
    elements.toast.className = `toast ${type} show`;

    setTimeout(() => {
      elements.toast.classList.remove("show");
    }, 3000);
  }
}

function showError(message) {
  if (elements.errorModal) {
    document.getElementById("errorMessage").textContent = message;
    elements.errorModal.style.display = "flex";
    elements.errorModal.setAttribute("aria-hidden", "false");
  }
}

// API Functions
async function fetchWithErrorHandling(url) {
  try {
    showLoading();
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("API Error:", error);
    showError(`Failed to load content: ${error.message}`);
    return null;
  } finally {
    hideLoading();
  }
}

// 🔥 Trending Articles
async function fetchTrending() {
  const data = await fetchWithErrorHandling(`${API_BASE}/trending`);
  if (data) {
    // Handle both old format (array) and new format (object with data property)
    trendingData = data.data || data;
    renderTrendingSlides();
    initCarousel();
  }
}

function renderTrendingSlides() {
  if (!elements.trendingContainer || !trendingData.length) return;

  elements.trendingContainer.innerHTML = "";

  trendingData.forEach((item, index) => {
    const slide = document.createElement("div");
    slide.className = `trending-slide ${index === 0 ? "active" : ""}`;
    slide.innerHTML = `
      <div class="trending-card">
        <img src="${item.image}" alt="${item.title}" loading="lazy">
        <div class="trending-content">
          <span class="trending-category">${item.category}</span>
          <h3>${item.title}</h3>
          <p>${item.summary}</p>
          <div class="trending-meta">
            <span class="author">${item.author}</span>
            <span class="date">${formatDate(item.publishedAt)}</span>
          </div>
          <a href="${
            item.url
          }" target="_blank" rel="noopener" class="read-more">Read More</a>
        </div>
      </div>
    `;
    elements.trendingContainer.appendChild(slide);
  });

  updateCarouselDots();
}

function initCarousel() {
  // Carousel navigation
  document.getElementById("prevSlide")?.addEventListener("click", () => {
    changeSlide(-1);
  });

  document.getElementById("nextSlide")?.addEventListener("click", () => {
    changeSlide(1);
  });

  // Auto-rotate carousel
  setInterval(() => {
    if (trendingData.length > 1) {
      changeSlide(1);
    }
  }, 5000);
}

function changeSlide(direction) {
  if (!trendingData.length) return;

  const slides = document.querySelectorAll(".trending-slide");
  if (slides.length === 0) return;

  slides[currentSlide].classList.remove("active");
  currentSlide = (currentSlide + direction + slides.length) % slides.length;
  slides[currentSlide].classList.add("active");

  updateCarouselDots();
}

function updateCarouselDots() {
  const dotsContainer = document.getElementById("carouselDots");
  if (!dotsContainer) return;

  dotsContainer.innerHTML = "";
  trendingData.forEach((_, index) => {
    const dot = document.createElement("button");
    dot.className = `carousel-dot ${index === currentSlide ? "active" : ""}`;
    dot.setAttribute("aria-label", `Go to slide ${index + 1}`);
    dot.addEventListener("click", () => {
      const slides = document.querySelectorAll(".trending-slide");
      slides[currentSlide].classList.remove("active");
      currentSlide = index;
      slides[currentSlide].classList.add("active");
      updateCarouselDots();
    });
    dotsContainer.appendChild(dot);
  });
}

// 📰 Articles Functions
async function fetchArticles(category = "all", page = 1, append = false) {
  if (isLoading) return;
  isLoading = true;

  let url = `${API_BASE}/articles?page=${page}&limit=20`;
  if (category !== "all") {
    url += `&category=${category}`;
  }

  const data = await fetchWithErrorHandling(url);
  if (data) {
    // Handle both old format (array) and new format (object with data property)
    const articles = data.data || data;
    renderArticles(articles, append);

    // Update load more button
    if (elements.loadMoreBtn) {
      elements.loadMoreBtn.style.display =
        articles.length < 20 ? "none" : "block";
    }
  }

  isLoading = false;
}

function renderArticles(articles, append = false) {
  if (!elements.gridContainer) return;

  if (!append) {
    elements.gridContainer.innerHTML = "";
  }

  if (articles.length === 0) {
    elements.gridContainer.innerHTML = `
      <div class="empty-state">
        <h3>No articles found</h3>
        <p>Try a different category or refresh the page</p>
      </div>
    `;
    return;
  }

  articles.forEach((article) => {
    const card = document.createElement("div");
    card.className = "article-card fade-in";
    card.innerHTML = `
      <div class="article-image">
        <img src="${article.image}" alt="${article.title}" loading="lazy">
        <button class="bookmark-btn ${
          isBookmarked(article.id) ? "bookmarked" : ""
        }" 
                data-id="${article.id}" 
                aria-label="Bookmark article">
          <span class="bookmark-icon">🔖</span>
        </button>
      </div>
      <div class="article-content">
        <span class="article-category">${article.category}</span>
        <h3 class="article-title">${article.title}</h3>
        <p class="article-summary">${article.summary}</p>
        <div class="article-meta">
          <span class="author">${article.author}</span>
          <span class="date">${formatDate(article.publishedAt)}</span>
          <span class="source">${article.source}</span>
        </div>
        <div class="article-actions">
          <a href="${
            article.url
          }" target="_blank" rel="noopener" class="read-more-btn">
            Read Full Article
          </a>
          <button class="share-btn" data-url="${article.url}" data-title="${
      article.title
    }">
            Share
          </button>
        </div>
      </div>
    `;
    elements.gridContainer.appendChild(card);
  });
}

// 🎯 Category Filtering
function initCategoryFilters() {
  // Desktop filters
  const desktopFilters = document.querySelectorAll(".categories .filter-btn");
  desktopFilters.forEach((btn) => {
    btn.addEventListener("click", () => handleCategoryChange(btn));
  });

  // Mobile filters
  const mobileFilters = document.querySelectorAll(".mobile-nav .filter-btn");
  mobileFilters.forEach((btn) => {
    btn.addEventListener("click", () => handleCategoryChange(btn));
  });
}

function handleCategoryChange(btn) {
  const category = btn.dataset.category;

  // Update active states
  document.querySelectorAll(".filter-btn").forEach((b) => {
    b.classList.remove("active");
    b.setAttribute("aria-pressed", "false");
  });

  // Set active for both desktop and mobile
  document.querySelectorAll(`[data-category="${category}"]`).forEach((b) => {
    b.classList.add("active");
    b.setAttribute("aria-pressed", "true");
  });

  // Fetch articles for new category
  currentCategory = category;
  currentPage = 1;
  fetchArticles(category, 1, false);

  // Close mobile menu
  if (elements.mobileNav) {
    elements.mobileNav.classList.remove("show");
  }
}

// 🔖 Bookmark System
function initBookmarkSystem() {
  // Handle bookmark clicks
  document.addEventListener("click", (e) => {
    if (e.target.closest(".bookmark-btn")) {
      const btn = e.target.closest(".bookmark-btn");
      const articleId = btn.dataset.id;
      toggleBookmark(articleId, btn);
    }
  });

  // Bookmark modal
  document.getElementById("viewBookmarks")?.addEventListener("click", () => {
    showBookmarks();
  });

  document.getElementById("closeBookmark")?.addEventListener("click", () => {
    elements.bookmarkModal.style.display = "none";
  });

  document.getElementById("clearBookmarks")?.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all bookmarks?")) {
      localStorage.removeItem("trendpulse-bookmarks");
      showToast("All bookmarks cleared");
      showBookmarks();
    }
  });
}

function toggleBookmark(articleId, btn) {
  const bookmarks = getBookmarks();
  const articleData = getArticleData(articleId);

  if (bookmarks.find((b) => b.id === articleId)) {
    // Remove bookmark
    const newBookmarks = bookmarks.filter((b) => b.id !== articleId);
    localStorage.setItem("trendpulse-bookmarks", JSON.stringify(newBookmarks));
    btn.classList.remove("bookmarked");
    showToast("Bookmark removed");
  } else {
    // Add bookmark
    if (articleData) {
      bookmarks.push(articleData);
      localStorage.setItem("trendpulse-bookmarks", JSON.stringify(bookmarks));
      btn.classList.add("bookmarked");
      showToast("Article bookmarked");
    }
  }
}

function getBookmarks() {
  return JSON.parse(localStorage.getItem("trendpulse-bookmarks") || "[]");
}

function isBookmarked(articleId) {
  return getBookmarks().some((b) => b.id === articleId);
}

function getArticleData(articleId) {
  // This is a simplified version - in a real app, you'd store the full article data
  return {
    id: articleId,
    title: "Bookmarked Article",
    url: "#",
    timestamp: new Date().toISOString(),
  };
}

function showBookmarks() {
  if (!elements.bookmarkModal) return;

  const bookmarks = getBookmarks();
  const savedList = document.getElementById("savedList");

  if (bookmarks.length === 0) {
    savedList.innerHTML = `
      <p class="empty-state">No saved articles yet. Start bookmarking articles to see them here!</p>
    `;
  } else {
    savedList.innerHTML = bookmarks
      .map(
        (bookmark) => `
      <div class="saved-article">
        <h4>${bookmark.title}</h4>
        <a href="${bookmark.url}" target="_blank">Read Article</a>
        <small>Saved on ${formatDate(bookmark.timestamp)}</small>
      </div>
    `
      )
      .join("");
  }

  elements.bookmarkModal.style.display = "flex";
}

// 💌 Newsletter System
function initNewsletter() {
  document.getElementById("testTrigger")?.addEventListener("click", () => {
    elements.newsletterModal.style.display = "flex";
  });

  document.getElementById("closeModal")?.addEventListener("click", () => {
    elements.newsletterModal.style.display = "none";
  });

  document.getElementById("newsletterForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("emailInput").value;

    // Simulate newsletter signup
    showToast("Thank you for subscribing!");
    elements.newsletterModal.style.display = "none";
    document.getElementById("emailInput").value = "";
  });
}

// 🌙 Dark Mode
function initDarkMode() {
  // Check saved preference
  const savedMode = localStorage.getItem("trendpulse-darkmode");
  if (savedMode === "true") {
    document.body.classList.add("dark-mode");
    elements.darkModeToggle.checked = true;
  }

  elements.darkModeToggle?.addEventListener("change", () => {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem(
      "trendpulse-darkmode",
      document.body.classList.contains("dark-mode")
    );
  });
}

// 📱 Mobile Menu
function initMobileMenu() {
  elements.mobileMenuToggle?.addEventListener("click", () => {
    elements.mobileNav.classList.toggle("show");
    const isExpanded = elements.mobileNav.classList.contains("show");
    elements.mobileMenuToggle.setAttribute("aria-expanded", isExpanded);
  });
}

// 🔄 Refresh & Load More
function initLoadMore() {
  elements.loadMoreBtn?.addEventListener("click", () => {
    currentPage++;
    fetchArticles(currentCategory, currentPage, true);
  });

  elements.refreshBtn?.addEventListener("click", () => {
    currentPage = 1;
    fetchArticles(currentCategory, 1, false);
    fetchTrending();
    showToast("Content refreshed");
  });
}

// 🛠️ Utility Functions
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 🚀 Initialize App
document.addEventListener("DOMContentLoaded", () => {
  // Initialize all systems
  initCategoryFilters();
  initBookmarkSystem();
  initNewsletter();
  initDarkMode();
  initMobileMenu();
  initLoadMore();

  // Error modal close
  document.getElementById("closeError")?.addEventListener("click", () => {
    elements.errorModal.style.display = "none";
  });

  // Toast close
  document.querySelector(".toast-close")?.addEventListener("click", () => {
    elements.toast.classList.remove("show");
  });

  // Load initial content
  fetchTrending();
  fetchArticles("all", 1, false);

  console.log("🚀 TrendPulse initialized successfully!");
});

// Handle network status
window.addEventListener("online", () => {
  showToast("Connection restored", "success");
});

window.addEventListener("offline", () => {
  showToast("You're offline", "warning");
});
