import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface DemoAccountInfo {
  enabled: boolean;
  email?: string;
  password?: string;
  workspaceName?: string;
}

/**
 * Public, unauthenticated. Publishes the demo credential only when the server
 * was started with SEED_DEMO_DATA=true. On any other deployment this returns
 * { enabled: false } and leaks nothing.
 */
@Controller('demo')
export class DemoController {
  constructor(private readonly configService: ConfigService) {}

  @Get('account')
  getAccount(): DemoAccountInfo {
    const enabled = this.configService.get<boolean>('demo.seedEnabled', false);
    const password = this.configService.get<string | undefined>(
      'demo.accountPassword',
    );

    if (!enabled || !password) {
      return { enabled: false };
    }

    return {
      enabled: true,
      email: this.configService.get<string>('demo.accountEmail'),
      password,
      workspaceName: 'Acme Product Team',
    };
  }
}
