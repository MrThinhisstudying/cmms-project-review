import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resContent: any = exception.getResponse();
      
      let originalMessage = '';
      if (typeof resContent === 'string') {
        originalMessage = resContent;
      } else if (resContent && typeof resContent === 'object') {
        originalMessage = Array.isArray(resContent.message)
          ? resContent.message.join(', ')
          : resContent.message || '';
      }

      // Translate standard NestJS messages
      if (originalMessage === 'Internal server error') {
        message = 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.';
      } else if (originalMessage === 'Forbidden resource' || originalMessage === 'Forbidden') {
        message = 'Bạn không có quyền thực hiện hành động này.';
      } else if (originalMessage === 'Unauthorized') {
        message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      } else {
        message = originalMessage;
      }
    } else {
      console.error('Unhandled Exception:', exception);
      
      const errString = String(exception);
      if (errString.includes('duplicate key value violates unique constraint')) {
        message = 'Dữ liệu bị trùng lặp. Vui lòng kiểm tra lại.';
      }
    }

    response.status(status).json({
      statusCode: status,
      message: message,
      error: exception instanceof HttpException ? exception.name : 'InternalServerError',
    });
  }
}
