import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('card_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE').unique();
    table.text('background_image');
    table.string('title', 200).defaultTo('Cantina Escolar');
    table.string('subtitle', 200).defaultTo('Cartão do Aluno');
    table.string('primary_color', 20).defaultTo('#059669');
    table.string('secondary_color', 20).defaultTo('#10b981');
    table.boolean('show_name').defaultTo(true);
    table.boolean('show_enrollment').defaultTo(true);
    table.boolean('show_grade').defaultTo(false);
    table.integer('qr_size').defaultTo(160);
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('card_templates');
}
