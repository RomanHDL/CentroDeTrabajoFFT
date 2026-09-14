CREATE TABLE "OrgChartPhoto" (
	"id" text PRIMARY KEY NOT NULL,
	"personId" text NOT NULL,
	"mimeType" text NOT NULL,
	"data" text NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedByUserId" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "OrgChartPhoto_personId_key" ON "OrgChartPhoto" USING btree ("personId" text_ops);
--> statement-breakpoint
ALTER TABLE "OrgChartPhoto" ADD CONSTRAINT "OrgChartPhoto_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."User"("id") ON DELETE restrict ON UPDATE cascade;
