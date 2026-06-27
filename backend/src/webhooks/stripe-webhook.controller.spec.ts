import { Test, TestingModule } from '@nestjs/testing';
import { StripeWebhookController } from './stripe-webhook.controller';
import { StripeWebhookService } from './stripe-webhook.service';
import { BadRequestException, HttpStatus } from '@nestjs/common';

describe('StripeWebhookController', () => {
  let controller: StripeWebhookController;
  let service: StripeWebhookService;
  let mockStripe: any;

  const mockStripeWebhookService = {
    handleSubscriptionCreatedOrUpdated: jest.fn(),
    handleSubscriptionDeleted: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StripeWebhookController],
      providers: [
        {
          provide: StripeWebhookService,
          useValue: mockStripeWebhookService,
        },
      ],
    }).compile();

    controller = module.get<StripeWebhookController>(StripeWebhookController);
    service = module.get<StripeWebhookService>(StripeWebhookService);

    // Mock the Stripe instance directly on the controller
    mockStripe = {
      webhooks: {
        constructEvent: jest.fn(),
      },
    };
    controller['stripe'] = mockStripe;

    jest.clearAllMocks();
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  describe('Mock/Bypass Mode (STRIPE_WEBHOOK_SECRET not set)', () => {
    it('should bypass signature verification and process body directly when no secret is configured', async () => {
      const mockReq = {
        body: {
          type: 'customer.subscription.created',
          data: {
            object: { id: 'sub_123', customer: 'cus_123' },
          },
        },
      } as any;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await controller.handleWebhook(mockReq, mockRes, undefined);

      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({ received: true });
      expect(service.handleSubscriptionCreatedOrUpdated).toHaveBeenCalledWith({
        id: 'sub_123',
        customer: 'cus_123',
      });
      expect(mockStripe.webhooks.constructEvent).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if body is missing event type in bypass mode', async () => {
      const mockReq = {
        body: {},
      } as any;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await expect(
        controller.handleWebhook(mockReq, mockRes, undefined),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Signature Verification Mode (STRIPE_WEBHOOK_SECRET is set)', () => {
    beforeEach(() => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_testsecret';
    });

    it('should throw BadRequestException if stripe-signature header is missing', async () => {
      const mockReq = {
        rawBody: Buffer.from('payload'),
      } as any;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await expect(
        controller.handleWebhook(mockReq, mockRes, undefined),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if rawBody is missing', async () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await expect(
        controller.handleWebhook({} as any, mockRes, 'sig_abc'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid signatures with 400 Bad Request', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const mockReq = {
        rawBody: Buffer.from('payload'),
      } as any;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await expect(
        controller.handleWebhook(mockReq, mockRes, 'invalid_sig'),
      ).rejects.toThrow(BadRequestException);
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        mockReq.rawBody,
        'invalid_sig',
        'whsec_testsecret',
      );
    });

    it('should verify signature and process customer.subscription.created event', async () => {
      const mockEvent = {
        type: 'customer.subscription.created',
        data: {
          object: { id: 'sub_123', customer: 'cus_123' },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const mockReq = {
        rawBody: Buffer.from(JSON.stringify(mockEvent)),
      } as any;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await controller.handleWebhook(mockReq, mockRes, 'valid_sig');

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        mockReq.rawBody,
        'valid_sig',
        'whsec_testsecret',
      );
      expect(service.handleSubscriptionCreatedOrUpdated).toHaveBeenCalledWith({
        id: 'sub_123',
        customer: 'cus_123',
      });
      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({ received: true });
    });

    it('should verify signature and process customer.subscription.updated event', async () => {
      const mockEvent = {
        type: 'customer.subscription.updated',
        data: {
          object: { id: 'sub_123', customer: 'cus_123' },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const mockReq = {
        rawBody: Buffer.from(JSON.stringify(mockEvent)),
      } as any;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await controller.handleWebhook(mockReq, mockRes, 'valid_sig');

      expect(service.handleSubscriptionCreatedOrUpdated).toHaveBeenCalledWith({
        id: 'sub_123',
        customer: 'cus_123',
      });
      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('should verify signature and process customer.subscription.deleted event', async () => {
      const mockEvent = {
        type: 'customer.subscription.deleted',
        data: {
          object: { id: 'sub_123', customer: 'cus_123' },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const mockReq = {
        rawBody: Buffer.from(JSON.stringify(mockEvent)),
      } as any;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await controller.handleWebhook(mockReq, mockRes, 'valid_sig');

      expect(service.handleSubscriptionDeleted).toHaveBeenCalledWith({
        id: 'sub_123',
        customer: 'cus_123',
      });
      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('should acknowledge but ignore unhandled stripe event types', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: { id: 'pi_123' },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const mockReq = {
        rawBody: Buffer.from(JSON.stringify(mockEvent)),
      } as any;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await controller.handleWebhook(mockReq, mockRes, 'valid_sig');

      expect(service.handleSubscriptionCreatedOrUpdated).not.toHaveBeenCalled();
      expect(service.handleSubscriptionDeleted).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('should return 400 Bad Request if service execution throws an error', async () => {
      const mockEvent = {
        type: 'customer.subscription.created',
        data: {
          object: { id: 'sub_123' },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockStripeWebhookService.handleSubscriptionCreatedOrUpdated.mockRejectedValueOnce(
        new Error('Database mismatch'),
      );

      const mockReq = {
        rawBody: Buffer.from(JSON.stringify(mockEvent)),
      } as any;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await controller.handleWebhook(mockReq, mockRes, 'valid_sig');

      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to process event',
        details: 'Database mismatch',
      });
    });
  });
});
