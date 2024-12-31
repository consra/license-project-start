import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("redirects", (table) => {
    table.increments("id").primary();
    table.string("shop_domain").notNullable();
    table.string("from_path").notNullable();
    table.string("to_path").notNullable();
    table.boolean("is_active").defaultTo(true);
    table.timestamps(true, true);
    
    // Add index for faster lookups
    table.index(["shop_domain", "from_path"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("redirects");
} 