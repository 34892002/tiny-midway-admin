import { Inject } from '@midwayjs/core';
import { BaseController } from '../../../core/crud_controller';
import { Crud } from '../../../core/crud_decorator';
import { GropuService } from '../service/group.service';
import { JwtPassportMiddleware } from '../../../middleware/jwt.middleware';

@Crud(
  '/wechat/group',
  { middleware: [JwtPassportMiddleware], description: '模型管理' },
  {
    apis: ['list', 'page', 'info', 'create', 'update', 'delete'],
  }
)
export class ContactsController extends BaseController {
  @Inject()
  protected service: GropuService;
}