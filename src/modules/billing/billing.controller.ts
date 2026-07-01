import { Controller, Post, Get, Body, Headers, Req, RawBodyRequest, UseGuards, Request } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { BillingService } from "./billing.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Billing")
@Controller("billing")
export class BillingController {
  constructor(private billing: BillingService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("plan")
  getPlan(@CurrentUser() user: any) {
    return this.billing.getCurrentPlan(user.companyId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("checkout")
  createCheckout(@Body() dto: { plan: string; returnUrl: string }, @CurrentUser() user: any) {
    return this.billing.createCheckoutSession(user.companyId, dto.plan as any, dto.returnUrl);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("portal")
  createPortal(@Body("returnUrl") returnUrl: string, @CurrentUser() user: any) {
    return this.billing.createPortalSession(user.companyId, returnUrl);
  }

  @Public()
  @Post("webhook")
  handleWebhook(@Headers("stripe-signature") sig: string, @Req() req: RawBodyRequest<Request>) {
    return this.billing.handleWebhook(sig, req.rawBody as Buffer);
  }
}