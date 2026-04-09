import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Mercur/Medusa: in alcuni ambienti `seller.description` è stato creato come varchar(2000).
 * Forza tipo `text` per consentire descrizioni complete (nessun limite arbitrario in Postgres).
 */
export class Migration20260409120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `ALTER TABLE IF EXISTS "seller" ALTER COLUMN "description" DROP DEFAULT;`
    )
    this.addSql(
      `ALTER TABLE IF EXISTS "seller" ALTER COLUMN "description" TYPE text USING "description"::text;`
    )
  }

  override async down(): Promise<void> {
    // non ripristiniamo varchar(2000): troncherebbe i dati già lunghi
  }
}
