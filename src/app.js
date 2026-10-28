const express = require("express");

const app = express();
const apiBaseUrl = "https://api.freenewsapi.io/v1";

app.use(express.json());

class ApiError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}

async function requestFreeNewsApi(endpoint, params) {
    const apiKey = process.env.NEWS_API_KEY;

    if (!apiKey) {
        throw new ApiError(503, "News API is not configured");
    }

    const url = new URL(`${apiBaseUrl}/${endpoint}`);
    url.search = new URLSearchParams(params).toString();

    let response;
    try {
        response = await fetch(url, {
            headers: {
                Accept: "application/json",
                "x-api-key": apiKey
            },
            signal: AbortSignal.timeout(10000)
        });
    } catch (error) {
        console.error("FreeNewsApi request failed:", error.message);
        throw new ApiError(
            error.name === "TimeoutError" ? 504 : 502,
            error.name === "TimeoutError"
                ? "News provider request timed out"
                : "News provider is unavailable"
        );
    }

    let data;
    try {
        data = await response.json();
    } catch (error) {
        console.error("FreeNewsApi returned invalid JSON:", error.message);
        throw new ApiError(502, "News provider returned an invalid response");
    }

    if (!response.ok) {
        console.error(`FreeNewsApi responded with HTTP ${response.status}`);
        throw new ApiError(
            response.status === 429 ? 503 : 502,
            response.status === 429
                ? "News provider rate limit exceeded"
                : "News provider request failed"
        );
    }

    return data;
}

app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        message: "API is running"
    });
});

const nm = "Bobin";
app.get('/api/home', (req, res) => {
    res.json({ date: new Date().toISOString() });
});

app.get("/api/articles", async (req, res, next) => {
    const topic = typeof req.query.topic === "string" ? req.query.topic.trim() : "";

    if (!topic) {
        return res.status(400).json({ error: "The topic query parameter is required" });
    }

    try {
        const articles = await requestFreeNewsApi("news", { topic });
        res.json(articles);
    } catch (error) {
        next(error);
    }
});

app.get("/api/articles/:uuid", async (req, res, next) => {
    const { uuid } = req.params;

    if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(uuid)) {
        return res.status(400).json({ error: "A valid article UUID is required" });
    }

    try {
        const article = await requestFreeNewsApi("details", { uuid });
        res.json(article);
    } catch (error) {
        next(error);
    }
});

app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    const statusCode = error instanceof ApiError ? error.statusCode : 500;
    if (statusCode === 500) {
        console.error("Unhandled API error:", error);
    }

    res.status(statusCode).json({
        error: statusCode === 500 ? "Internal server error" : error.message
    });
});

module.exports = app;