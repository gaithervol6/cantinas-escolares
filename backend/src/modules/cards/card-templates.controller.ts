import { Request, Response, NextFunction } from 'express';
import { cardTemplatesService } from './card-templates.service';

export class CardTemplatesController {
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const template = await cardTemplatesService.get(req.user!.schoolId);
      res.json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }

  async upsert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const template = await cardTemplatesService.upsert(req.user!.schoolId, req.body);
      res.json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }

  async uploadBackground(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: { message: 'Nenhuma imagem enviada' } });
        return;
      }

      const mime = req.file.mimetype;
      const base64 = req.file.buffer.toString('base64');
      const backgroundImage = `data:${mime};base64,${base64}`;

      const template = await cardTemplatesService.upsert(req.user!.schoolId, { backgroundImage });
      res.json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await cardTemplatesService.delete(req.user!.schoolId);
      res.json({ success: true, data: { message: 'Modelo removido com sucesso' } });
    } catch (error) {
      next(error);
    }
  }
}

export const cardTemplatesController = new CardTemplatesController();
