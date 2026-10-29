# Reidentify Backend


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
