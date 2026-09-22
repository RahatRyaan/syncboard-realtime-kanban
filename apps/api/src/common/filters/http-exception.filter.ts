import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse, ApiErrorCodes } from '@syncboard/shared-types';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = ApiErrorCodes.INTERNAL_ERROR;
    let message = 'Internal server error';
    let details: Record<string, unknown> | Array<unknown> | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = (resObj.message as string) || exception.message;
        code = this.mapStatusToErrorCode(status);
        if (Array.isArray(resObj.message)) {
          details = resObj.message;
          message = 'Validation failed';
          code = ApiErrorCodes.VALIDATION_ERROR;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const payload: ApiResponse<null> = {
      success: false,
      data: null,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
      meta: null,
    };

    response.status(status).json(payload);
  }

  private mapStatusToErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return ApiErrorCodes.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ApiErrorCodes.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ApiErrorCodes.NOT_FOUND;
      case HttpStatus.BAD_REQUEST:
        return ApiErrorCodes.BAD_REQUEST;
      case HttpStatus.CONFLICT:
        return ApiErrorCodes.VERSION_CONFLICT;
      default:
        return ApiErrorCodes.INTERNAL_ERROR;
    }
  }
}
