import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    if (!req || req.url === '/api/v1/metrics' || req.url === '/api/v1/health') {
      return next.handle();
    }

    const startTime = process.hrtime();
    const method = req.method;
    const route = req.route?.path || req.baseUrl || req.url.split('?')[0];

    return next.handle().pipe(
      tap({
        next: () => {
          const diff = process.hrtime(startTime);
          const durationSeconds = diff[0] + diff[1] / 1e9;
          const statusCode = res.statusCode ? res.statusCode.toString() : '200';

          this.metricsService.httpRequestDuration
            .labels(method, route, statusCode)
            .observe(durationSeconds);
        },
        error: (err) => {
          const diff = process.hrtime(startTime);
          const durationSeconds = diff[0] + diff[1] / 1e9;
          const statusCode = err.status ? err.status.toString() : '500';

          this.metricsService.httpRequestDuration
            .labels(method, route, statusCode)
            .observe(durationSeconds);

          this.metricsService.httpErrorsTotal
            .labels(method, route, statusCode)
            .inc();
        },
      }),
    );
  }
}
