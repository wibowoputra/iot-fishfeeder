CREATE TABLE "feed_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"triggered_at" timestamp DEFAULT now() NOT NULL,
	"status" text NOT NULL,
	"type" text NOT NULL,
	"message" text
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"time" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"days" text[]
);
