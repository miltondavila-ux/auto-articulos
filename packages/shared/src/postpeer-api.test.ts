import assert from "node:assert/strict";
import test from "node:test";
import { createPostPeerPost, getPostPeerOAuthUrl, listPostPeerIntegrations } from "./postpeer-api";

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("PostPeer OAuth URL includes the user profile and redirect", async () => {
  globalThis.fetch = async (input, init) => {
    assert.match(String(input), /\/connect\/googlebusiness\?/);
    assert.match(String(input), /profileId=p1/);
    assert.match(String(input), /redirectUri=https%3A%2F%2Fapp.example%2Fcallback/);
    assert.equal((init?.headers as Record<string, string>)["x-access-key"], "key");
    return new Response(JSON.stringify({ url: "https://accounts.google.com/oauth" }), { status: 200 });
  };
  assert.equal(await getPostPeerOAuthUrl("key", "googlebusiness", { profileId: "p1", redirectUri: "https://app.example/callback" }), "https://accounts.google.com/oauth");
});

test("PostPeer integration listing filters the requested platform", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ integrations: [
    { id: "g1", platform: "googlebusiness" },
    { id: "x1", platform: "twitter" },
  ] }), { status: 200 });
  assert.deepEqual(await listPostPeerIntegrations("key", { platform: "googlebusiness", profileId: "p1" }), [{ id: "g1", platform: "googlebusiness" }]);
});

test("PostPeer publication sends idempotency and Google Business target", async () => {
  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.platforms[0].platform, "googlebusiness");
    assert.equal(body.platforms[0].accountId, "g1");
    assert.deepEqual(body.mediaItems, [{ type: "image", url: "https://img" }]);
    assert.equal(body.idempotencyKey, "title-1");
    return new Response(JSON.stringify({ success: true, status: "published" }), { status: 202 });
  };
  const result = await createPostPeerPost("key", { accountId: "g1", content: "Texto", imageUrl: "https://img", idempotencyKey: "title-1" });
  assert.equal(result.status, "published");
});
