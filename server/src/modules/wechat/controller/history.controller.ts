import { Inject } from '@midwayjs/core';
import { BaseController } from '../../../core/crud_controller';
import { Crud } from '../../../core/crud_decorator';
import { HistoryService } from '../service/history.service';
import { JwtPassportMiddleware } from '../../../middleware/jwt.middleware';

@Crud(
  '/wechat/history',
  { middleware: [JwtPassportMiddleware], description: '模型管理' },
  {
    apis: ['list', 'page', 'info', 'create', 'update', 'delete'],
  }
)
export class HistoryController extends BaseController {
  @Inject()
  protected service: HistoryService;
}