import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getHealth(): { status: 'ok'; project: string; version: string; time: string } {
    return {
      status: 'ok',
      project: 'noa-guardian-dock',
      version: '1.0.0',
      time: new Date().toISOString(),
    };
  }
}
