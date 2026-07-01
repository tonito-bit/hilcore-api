import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { PrismaService } from "../../common/prisma/prisma.service";

const PLANS = {
  starter:    { priceId: "price_starter",    name: "Starter",    projects: 3,  users: 2  },
  pro:        { priceId: "price_pro",        name: "Pro",        projects: 25, users: 10 },
  enterprise: { priceId: "price_enterprise", name: "Enterprise", projects: -1, users: -1 },
};

@Injectable()
export class BillingService {
  private stripe: Stripe;

  constructor(private config: ConfigService, private prisma: PrismaService) {
    this.stripe = new Stripe(config.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
  }

  async createCheckoutSession(companyId: string, plan: keyof typeof PLANS, returnUrl: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException("Company not found");

    const planData = PLANS[plan];
    if (!planData) throw new BadRequestException("Invalid plan");

    let customerId = (company as any).stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        name:     company.name,
        metadata: { companyId },
      });
      customerId = customer.id;
      await this.prisma.company.update({ where: { id: companyId }, data: { stripeCustomerId: customerId } as any });
    }

    const session = await this.stripe.checkout.sessions.create({
      customer:   customerId,
      mode:       "subscription",
      line_items: [{ price: planData.priceId, quantity: 1 }],
      success_url: `${returnUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${returnUrl}/billing`,
      metadata:    { companyId, plan },
      subscription_data: { metadata: { companyId, plan } },
    });

    return { url: session.url, sessionId: session.id };
  }

  async createPortalSession(companyId: string, returnUrl: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const customerId = (company as any)?.stripeCustomerId;
    if (!customerId) throw new NotFoundException("No billing account found");

    const session = await this.stripe.billingPortal.sessions.create({
      customer:   customerId,
      return_url: `${returnUrl}/billing`,
    });

    return { url: session.url };
  }

  async handleWebhook(signature: string, payload: Buffer) {
    const webhookSecret = this.config.get("STRIPE_WEBHOOK_SECRET")!;
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch {
      throw new BadRequestException("Invalid webhook signature");
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { companyId, plan } = session.metadata!;
        await this.prisma.company.update({
          where: { id: companyId },
          data: { plan, stripeSubscriptionId: session.subscription as string } as any,
        });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const companyId = sub.metadata.companyId;
        if (companyId) await this.prisma.company.update({ where: { id: companyId }, data: { plan: "starter" } });
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.error("Payment failed for customer:", invoice.customer);
        // TODO: send email notification
        break;
      }
    }

    return { received: true };
  }

  async getCurrentPlan(companyId: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const plan = (company as any)?.plan || "starter";
    return { plan, limits: PLANS[plan as keyof typeof PLANS] || PLANS.starter };
  }
}