import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '@syncboard/shared-types';

@Injectable()
export class EnvelopeInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((res) => {
        // If the handler already returned an envelope structure, preserve meta or data
        if (res && typeof res === 'object' && 'success' in res && 'data' in res) {
          return res;
        }

        if (res && typeof res === 'object' && 'data' in res && 'meta' in res) {
          return {
            success: true,
            data: res.data,
            error: null,
            meta: res.meta || null,
          };
        }

        return {
          success: true,
          data: res ?? null,
          error: null,
          meta: null,
        };
      }),
    );
  }
}
