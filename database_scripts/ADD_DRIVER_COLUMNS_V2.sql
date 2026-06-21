ALTER TABLE "driverProfiles"
ADD COLUMN "status" text DEFAULT 'pending',
ADD COLUMN "maxWeightCapacity" numeric,
ADD COLUMN "equipment" jsonb DEFAULT '[]'::jsonb,
ADD COLUMN "documents" jsonb DEFAULT '{}'::jsonb,
ADD COLUMN "bankDetails" jsonb DEFAULT '{}'::jsonb,
ADD COLUMN "rating" numeric DEFAULT 5.0,
ADD COLUMN "totalTrips" integer DEFAULT 0;
