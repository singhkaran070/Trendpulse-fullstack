// index.js

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const compression = require("compression");
const NodeCache = require("node-cache");

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize cache (5 minutes TTL)
const cache = new NodeCache({ stdTTL: 300 });

// Environment validation
if (!process.env.NEWS_API_KEY) {
  console.error("❌ NEWS_API_KEY environment variable is required");
  process.exit(1);
}

// NewsAPI configuration
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NEWS_API_BASE = "https://newsapi.org/v2";

// Allowed categories for validation (matching your frontend)
const ALLOWED_CATEGORIES = [
  "Tech",
  "Politics",
  "Finance",
  "Health",
  "Sports",
  "Entertainment",
];

// Category mapping from your frontend to NewsAPI
const CATEGORY_MAP = {
  Tech: "technology",
  Politics: "general", // NewsAPI doesn't have politics, using general
  Finance: "business",
  Health: "health",
  Sports: "sports",
  Entertainment: "entertainment",
};

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Gzip compression
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later",
  },
});
app.use(limiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`
  );
  next();
});

// Input validation middleware
const validateCategory = (req, res, next) => {
  const { category } = req.query;
  if (category && !ALLOWED_CATEGORIES.includes(category)) {
    return res.status(400).json({
      error: "Invalid category",
      allowedCategories: ALLOWED_CATEGORIES,
    });
  }
  next();
};

const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  if (page < 1) {
    return res.status(400).json({ error: "Page must be greater than 0" });
  }

  req.pagination = { page, limit };
  next();
};

// Helper function to transform NewsAPI data to our format
function transformNewsData(articles) {
  return articles
    .filter((article) => article.title && article.title !== "[Removed]")
    .map((article) => ({
      id: generateArticleId(article),
      title: article.title,
      summary:
        article.description ||
        article.content?.substring(0, 150) + "..." ||
        "No summary available",
      image:
        article.urlToImage ||
        "https://via.placeholder.com/400x200?text=No+Image",
      category: article.source?.name || "General",
      url: article.url,
      publishedAt: article.publishedAt,
      author: article.author || "Unknown",
      source: article.source?.name || "Unknown Source",
    }));
}

// Generate unique article ID
function generateArticleId(article) {
  return Buffer.from(article.url + article.publishedAt)
    .toString("base64")
    .substring(0, 16);
}

// Error handling helper
function handleAPIError(error, res, fallbackData) {
  console.error("API Error:", error.response?.status, error.message);

  if (error.response?.status === 429) {
    return res.status(429).json({
      error: "Rate limit exceeded, please try again later",
      retryAfter: error.response.headers["retry-after"] || "60",
    });
  }

  if (error.response?.status === 401) {
    return res.status(500).json({ error: "API authentication failed" });
  }

  // Return fallback data for other errors
  res.json({
    data: fallbackData,
    isFallback: true,
    message: "Using cached data due to API unavailability",
  });
}

// Fallback data
const getFallbackData = () => [
  {
    id: "fallback-1",
    title: "Breaking: Technology News Update",
    summary:
      "Latest developments in the tech world continue to shape our digital future.",
    image: "https://via.placeholder.com/400x200?text=Tech+News",
    category: "Technology",
    url: "#",
    publishedAt: new Date().toISOString(),
    author: "Tech Reporter",
    source: "TrendPulse",
  },
  {
    id: "fallback-2",
    title: "Business Market Analysis",
    summary: "Current market trends and business insights for today's economy.",
    image: "https://via.placeholder.com/400x200?text=Business+News",
    category: "Business",
    url: "#",
    publishedAt: new Date().toISOString(),
    author: "Business Analyst",
    source: "TrendPulse",
  },
  {
    id: "fallback-3",
    title: "Sports Highlights Today",
    summary:
      "Catch up on the latest sports news and highlights from around the world.",
    image: "https://via.placeholder.com/400x200?text=Sports+News",
    category: "Sports",
    url: "#",
    publishedAt: new Date().toISOString(),
    author: "Sports Reporter",
    source: "TrendPulse",
  },
];

// 📰 Get all articles
app.get("/articles", validateCategory, validatePagination, async (req, res) => {
  try {
    const { category } = req.query;
    const { page, limit } = req.pagination;

    // Create cache key
    const cacheKey = `articles_${category || "all"}_${page}_${limit}`;

    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json({
        data: cachedData,
        cached: true,
        page,
        limit,
      });
    }

    let url = `${NEWS_API_BASE}/top-headlines?country=us&pageSize=${limit}&page=${page}&apiKey=${NEWS_API_KEY}`;

    if (category) {
      const mappedCategory = CATEGORY_MAP[category] || "general";
      url += `&category=${mappedCategory}`;
    }

    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent": "TrendPulse-API/1.0",
      },
    });

    const transformedData = transformNewsData(response.data.articles);

    // Cache the result
    cache.set(cacheKey, transformedData);

    res.json({
      data: transformedData,
      totalResults: response.data.totalResults,
      page,
      limit,
      cached: false,
    });
  } catch (error) {
    handleAPIError(error, res, getFallbackData());
  }
});

// 🔥 Trending route
app.get("/trending", async (req, res) => {
  try {
    const cacheKey = "trending_articles";

    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json({
        data: cachedData,
        cached: true,
      });
    }

    const response = await axios.get(
      `${NEWS_API_BASE}/top-headlines?country=us&pageSize=5&apiKey=${NEWS_API_KEY}`,
      {
        timeout: 10000,
        headers: {
          "User-Agent": "TrendPulse-API/1.0",
        },
      }
    );

    const transformedData = transformNewsData(response.data.articles);
    const trendingData = transformedData.slice(0, 3);

    // Cache the result
    cache.set(cacheKey, trendingData);

    res.json({
      data: trendingData,
      cached: false,
    });
  } catch (error) {
    const fallbackTrending = [
      {
        id: "trending-1",
        title: "🔥 Trending: AI Revolution Continues",
        summary:
          "Artificial Intelligence is reshaping industries at an unprecedented pace.",
        image: "https://via.placeholder.com/400x200?text=AI+News",
        category: "Technology",
        url: "#",
        publishedAt: new Date().toISOString(),
        author: "AI Reporter",
        source: "TrendPulse",
      },
      {
        id: "trending-2",
        title: "🚀 Space Exploration Milestone",
        summary:
          "New discoveries in space exploration capture global attention.",
        image: "https://via.placeholder.com/400x200?text=Space+News",
        category: "Science",
        url: "#",
        publishedAt: new Date().toISOString(),
        author: "Science Reporter",
        source: "TrendPulse",
      },
      {
        id: "trending-3",
        title: "💼 Global Economy Update",
        summary:
          "Market fluctuations and economic indicators show interesting patterns.",
        image: "https://via.placeholder.com/400x200?text=Economy+News",
        category: "Business",
        url: "#",
        publishedAt: new Date().toISOString(),
        author: "Business Reporter",
        source: "TrendPulse",
      },
    ];

    handleAPIError(error, res, fallbackTrending);
  }
});

// 🔍 Search articles
app.get("/search", validatePagination, async (req, res) => {
  try {
    const { q, sortBy = "publishedAt", from, to } = req.query;
    const { page, limit } = req.pagination;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        error: "Search query must be at least 2 characters long",
      });
    }

    const cacheKey = `search_${q}_${sortBy}_${page}_${limit}`;

    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json({
        data: cachedData,
        cached: true,
        query: q,
        page,
        limit,
      });
    }

    let url = `${NEWS_API_BASE}/everything?q=${encodeURIComponent(
      q
    )}&pageSize=${limit}&page=${page}&sortBy=${sortBy}&apiKey=${NEWS_API_KEY}`;

    if (from) url += `&from=${from}`;
    if (to) url += `&to=${to}`;

    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent": "TrendPulse-API/1.0",
      },
    });

    const transformedData = transformNewsData(response.data.articles);

    // Cache the result
    cache.set(cacheKey, transformedData);

    res.json({
      data: transformedData,
      totalResults: response.data.totalResults,
      query: q,
      page,
      limit,
      cached: false,
    });
  } catch (error) {
    handleAPIError(error, res, []);
  }
});

// 📊 Health check endpoint
app.get("/health", async (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: "🚀 TrendPulse API is healthy",
    timestamp: new Date().toISOString(),
    status: "active",
    cache: {
      keys: cache.keys().length,
      stats: cache.getStats(),
    },
  };

  // Test API connectivity
  try {
    await axios.get(
      `${NEWS_API_BASE}/top-headlines?country=us&pageSize=1&apiKey=${NEWS_API_KEY}`,
      {
        timeout: 5000,
      }
    );
    healthCheck.newsAPI = "connected";
  } catch (error) {
    healthCheck.newsAPI = "disconnected";
    healthCheck.status = "degraded";
  }

  res.json(healthCheck);
});

// 🏠 Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "🚀 Welcome to TrendPulse API",
    version: "1.0.0",
    status: "active",
    endpoints: {
      health: "/health",
      trending: "/trending",
      articles: "/articles",
      search: "/search?q=QUERY",
      filterByCategory: "/articles?category=CATEGORY_NAME",
      pagination: "/articles?page=1&limit=20",
    },
    availableCategories: ALLOWED_CATEGORIES,
  });
});

// Clear cache endpoint (for admin use)
app.post("/cache/clear", (req, res) => {
  const clearedKeys = cache.keys().length;
  cache.flushAll();
  res.json({
    message: "Cache cleared successfully",
    clearedKeys,
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    availableEndpoints: ["/", "/health", "/trending", "/articles", "/search"],
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🔄 SIGTERM received, shutting down gracefully...");
  cache.close();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`✅ TrendPulse API running at http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔑 API Key configured: ${NEWS_API_KEY ? "Yes" : "No"}`);
});
