# TrendPulse News

TrendPulse is a modern, full-stack news aggregator that provides the latest articles from around the world, powered by the NewsAPI. It features a clean, responsive interface, category filtering, dark mode, and a robust backend to deliver trending and relevant news seamlessly.

![TrendPulse Screenshot](https://via.placeholder.com/800x400.png?text=TrendPulse+Website+Screenshot)

## ✨ Features

- **Dynamic Content**: Fetches and displays the latest news from a live API.
- **Trending News Carousel**: Highlights the top trending articles in an auto-playing carousel.
- **Category Filtering**: Browse articles by categories like Technology, Politics, Finance, and more.
- **Dark Mode**: A sleek, eye-friendly dark mode for comfortable reading, with preferences saved locally.
- **Bookmark System**: Save your favorite articles in the browser's local storage to read later.
- **Fully Responsive**: A seamless experience on desktops, tablets, and mobile devices.
- **Robust Backend**: Built with Node.js and Express, featuring caching, rate limiting, and security headers.
- **Loading & Error States**: User-friendly spinners, toasts, and error modals for a smooth UX.

## 🛠️ Tech Stack

### Frontend

- HTML5
- CSS3 (with CSS Variables for theming)
- Vanilla JavaScript (ES6+)

### Backend

- **Runtime**: Node.js
- **Framework**: Express
- **Middleware**:
  - `cors` for cross-origin requests.
  - `helmet` for security headers.
  - `compression` for Gzip compression.
  - `express-rate-limit` to prevent abuse.
- **Caching**: `node-cache` for in-memory caching to reduce API calls.
- **API Communication**: `axios`

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js (v18 or higher is recommended)
- npm (usually comes with Node.js)
- A **News API key**. You can get a free one from [newsapi.org](https://newsapi.org).

### Installation & Setup

1.  **Clone the repository:**

    ```bash
    git clone [https://github.com/YOUR_USERNAME/trendpulse-news.git](https://github.com/YOUR_USERNAME/trendpulse-news.git)
    cd trendpulse-news
    ```

2.  **Install dependencies:**
    This command installs all the necessary packages for the backend server.

    ```bash
    npm install
    ```

3.  **Create an environment file:**
    Create a file named `.env` in the root of your project directory and add your News API key.

    ```
    NEWS_API_KEY=your_news_api_key_here
    ```

4.  **Start the development server:**
    This will start the server with `nodemon`, which automatically restarts on file changes.
    ```bash
    npm run dev
    ```

The application's frontend will be available at `http://localhost:3000`.

## 🚢 Deployment

This project is configured for easy, zero-configuration deployment on **Vercel**.

1.  **Push to GitHub**: Make sure your code, including the `vercel.json` file, is pushed to a GitHub repository.
2.  **Import Project on Vercel**: Log in to Vercel, click "Add New... > Project", and import your GitHub repository.
3.  **Configure Environment Variables**: In the project settings on Vercel, navigate to "Settings > Environment Variables". Add your `NEWS_API_KEY` with its value.
4.  **Deploy**: Click the "Deploy" button. Vercel will use the `vercel.json` file to build and route your project correctly.

## 🔗 API Endpoints

All backend endpoints are available under the `/api` route.

- `GET /api/trending`: Fetches the top 5 trending articles.
- `GET /api/articles`: Fetches articles with optional category and pagination (`?category=Tech&page=1&limit=12`).
- `GET /api/search`: Searches for articles based on a query (`?q=AI`).
- `GET /api/health`: Checks the API's health and cache status.

---

_This project was created by Karan Singh._
