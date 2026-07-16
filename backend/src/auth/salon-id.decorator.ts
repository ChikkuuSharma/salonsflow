import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export const SalonId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const salonId = request.user?.salonId;
    if (!salonId) {
      throw new UnauthorizedException('Active salon session not established.');
    }
    return salonId;
  },
);
