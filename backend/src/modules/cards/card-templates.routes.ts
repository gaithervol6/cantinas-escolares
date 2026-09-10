import { Router, type IRouter } from 'express';
import { cardTemplatesController } from './card-templates.controller';
import { authGuard } from '../../shared/middlewares/auth.guard';
import { roleGuard } from '../../shared/middlewares/role.guard';
import { validate } from '../../shared/middlewares/validate';
import { upsertCardTemplateSchema } from './card-templates.schema';
import { memoryUpload } from '../../shared/middlewares/upload';

const router: IRouter = Router();

router.use(authGuard);

router.get(
  '/',
  roleGuard('admin'),
  cardTemplatesController.get.bind(cardTemplatesController)
);

router.put(
  '/',
  roleGuard('admin'),
  validate(upsertCardTemplateSchema),
  cardTemplatesController.upsert.bind(cardTemplatesController)
);

router.post(
  '/background',
  roleGuard('admin'),
  memoryUpload.single('image'),
  cardTemplatesController.uploadBackground.bind(cardTemplatesController)
);

router.delete(
  '/',
  roleGuard('admin'),
  cardTemplatesController.delete.bind(cardTemplatesController)
);

export { router as cardTemplatesRoutes };
