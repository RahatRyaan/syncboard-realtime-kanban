import { ValidationPipe, ValidationPipeOptions } from '@nestjs/common';

export const globalValidationOptions: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
};

export const createGlobalValidationPipe = () =>
  new ValidationPipe(globalValidationOptions);
