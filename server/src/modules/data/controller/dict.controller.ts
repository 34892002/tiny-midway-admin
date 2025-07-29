import { Inject } from '@midwayjs/core';
import { BaseController } from '../../../core/crud_controller';
import { Crud } from '../../../core/crud_decorator';
import { DictService } from '../service/dict.service';
import { CasbinGuard } from '../../../guard/casbin';
import { JwtPassportMiddleware } from '../../../middleware/jwt.middleware';

@Crud(
  '/data/dict',
  { middleware: [JwtPassportMiddleware], description: 'CRUD例子' },
  {
    apis: ['list', 'page', 'info', 'create', 'update', 'delete'],
    access: ['DataDict', 'DataDict', 'DataDict', 'DataDict', 'DataDict', 'DataDict'],
    guard: CasbinGuard
  }
)
export class DemoController extends BaseController {
  @Inject()
  protected service: DictService;
}
