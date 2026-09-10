import { db } from '../../shared/database/knex';
import { logger } from '../../shared/utils/logger';
import type { UpsertCardTemplateInput } from './card-templates.schema';

export class CardTemplatesService {
  async get(schoolId: string): Promise<Record<string, any> | null> {
    const template = await db('card_templates')
      .where({ school_id: schoolId })
      .first();
    return template || null;
  }

  async upsert(schoolId: string, input: UpsertCardTemplateInput): Promise<Record<string, any>> {
    const existing = await db('card_templates')
      .where({ school_id: schoolId })
      .first();

    if (existing) {
      const [updated] = await db('card_templates')
        .where({ school_id: schoolId })
        .update({ ...input, updated_at: new Date() })
        .returning('*');
      logger.info({ schoolId }, 'Card template updated');
      return updated;
    }

    const [created] = await db('card_templates')
      .insert({ school_id: schoolId, ...input })
      .returning('*');
    logger.info({ schoolId }, 'Card template created');
    return created;
  }

  async delete(schoolId: string): Promise<void> {
    await db('card_templates').where({ school_id: schoolId }).del();
    logger.info({ schoolId }, 'Card template deleted');
  }
}

export const cardTemplatesService = new CardTemplatesService();
