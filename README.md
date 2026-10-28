# Reidentify Backend

## News API

Set `NEWS_API_KEY` in `.env` to your FreeNewsApi.io API key. The key is sent to
FreeNewsApi.io by the backend and is never returned to API clients.

### List articles by topic

```http
GET /api/articles?topic=technology
```

Returns the FreeNewsApi.io news-list JSON, including the UUID for each article.

### Get a full article

```http
GET /api/articles/{uuid}
```

Use an article UUID from the listing response. This returns the full article
details from FreeNewsApi.io.

Both endpoints return JSON. Missing topics and malformed UUIDs return `400`;
provider errors return an appropriate `5xx` response.
