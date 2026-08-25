CREATE TABLE "voice_usage_events" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "characters" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_usage_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "voice_usage_events_session_id_created_at_idx"
ON "voice_usage_events"("session_id", "created_at");

ALTER TABLE "voice_usage_events"
ADD CONSTRAINT "voice_usage_events_session_id_fkey"
FOREIGN KEY ("session_id") REFERENCES "sessions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
