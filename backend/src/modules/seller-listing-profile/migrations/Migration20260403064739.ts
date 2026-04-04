import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260403064739 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "seller_listing_profile" drop constraint if exists "seller_listing_profile_seller_id_unique";`);
    this.addSql(`create table if not exists "seller_listing_profile" ("id" text not null, "seller_id" text not null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "seller_listing_profile_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_seller_listing_profile_seller_id_unique" ON "seller_listing_profile" ("seller_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_listing_profile_deleted_at" ON "seller_listing_profile" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "seller_listing_profile" cascade;`);
  }

}
