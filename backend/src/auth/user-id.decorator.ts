import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const userId = request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User database record not resolved in request context.');
    }
    return userId;
  },
);
