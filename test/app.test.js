const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const app = require("../src/app");

const nativeFetch = global.fetch;
let server;
let baseUrl;

before(async () => {
    process.env.NEWS_API_KEY = "test-api-key";
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    global.fetch = nativeFetch;
    delete process.env.NEWS_API_KEY;
    await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
    });
});

test("GET /api/articles requires a topic", async () => {
    let providerCalled = false;
    global.fetch = async () => {
        providerCalled = true;
        return new Response("{}");
    };

    const response = await nativeFetch(`${baseUrl}/api/articles`);

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
        error: "The topic query parameter is required"
    });
    assert.equal(providerCalled, false);
});

test("GET /api/articles?topic= returns the provider article list", async () => {
    const providerResponse = {
        data: [{ uuid: "0ca0bf58-c0f1-4ad1-bd5a-5e522f61caad", title: "Test article" }]
    };
    let providerUrl;
    let providerHeaders;

    global.fetch = async (url, options) => {
        providerUrl = new URL(url);
        providerHeaders = options.headers;
        return new Response(JSON.stringify(providerResponse), {
            headers: { "content-type": "application/json" }
        });
    };

    const response = await nativeFetch(`${baseUrl}/api/articles?topic=climate%20change`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), providerResponse);
    assert.equal(providerUrl.pathname, "/v1/news");
    assert.equal(providerUrl.searchParams.get("topic"), "climate change");
    assert.equal(providerHeaders["x-api-key"], "test-api-key");
});

test("GET /api/articles/:uuid returns the complete provider article", async () => {
    const uuid = "0ca0bf58-c0f1-4ad1-bd5a-5e522f61caad";
    const providerResponse = {
        data: { uuid, title: "Test article", body: "Full article text" }
    };
    let providerUrl;

    global.fetch = async (url) => {
        providerUrl = new URL(url);
        return new Response(JSON.stringify(providerResponse), {
            headers: { "content-type": "application/json" }
        });
    };

    const response = await nativeFetch(`${baseUrl}/api/articles/${uuid}`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), providerResponse);
    assert.equal(providerUrl.pathname, "/v1/details");
    assert.equal(providerUrl.searchParams.get("uuid"), uuid);
});

test("GET /api/articles/:uuid rejects malformed UUIDs", async () => {
    const response = await nativeFetch(`${baseUrl}/api/articles/not-a-uuid`);

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
        error: "A valid article UUID is required"
    });
});
