-- Cada plataforma social/blog empieza con una publicación exitosa por día.
ALTER TABLE "User" ADD COLUMN "socialDailyLimits" JSONB NOT NULL DEFAULT '{}';
UPDATE "User" SET "socialDailyLimits" = '{"threads":1,"x":1,"linkedin":1,"pinterest":1,"tumblr":1,"bluesky":1,"devto":1,"blogger":1,"facebook-page":1,"facebook-story":1,"instagram-carousel":1,"instagram-reel-image":1,"instagram-story":1,"instagram-post":1,"google-business":1}'::jsonb WHERE "socialDailyLimits" = '{}'::jsonb;
