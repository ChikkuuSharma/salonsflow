import { Test, TestingModule } from '@nestjs/testing';
import { ClerkWebhookController } from './clerk-webhook.controller';
import { ClerkWebhookService } from './clerk-webhook.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as express from 'express';

describe('ClerkWebhookController & Service', () => {
  let controller: ClerkWebhookController;
  let service: ClerkWebhookService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    salon: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(async (cb) => cb(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClerkWebhookController],
      providers: [
        ClerkWebhookService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<ClerkWebhookController>(ClerkWebhookController);
    service = module.get<ClerkWebhookService>(ClerkWebhookService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('Webhook Controller Secret Verification', () => {
    it('should throw UnauthorizedException if headers do not contain matching webhook secret', async () => {
      const mockReq = { ip: '127.0.0.1' } as express.Request;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await expect(
        controller.handleWebhook(
          { type: 'user.created' },
          'wrong_secret',
          mockReq,
          mockRes,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if payload does not contain type', async () => {
      const mockReq = { ip: '127.0.0.1' } as express.Request;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await expect(
        controller.handleWebhook(
          {},
          'salonflow_clerk_secret',
          mockReq,
          mockRes,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('ClerkWebhookService.handleUserCreated Logic', () => {
    it('should throw an error if user creation payload lacks required details', async () => {
      await expect(service.handleUserCreated({})).rejects.toThrow();
      await expect(service.handleUserCreated({ data: {} })).rejects.toThrow();
    });

    it('should return existing user and salon details if they already exist (idempotency check)', async () => {
      const mockExistingUser = {
        id: 'u-1',
        clerkId: 'user_123',
        email: 'owner@test.com',
        name: 'Jane Doe',
        salonId: 'salon-1',
        salon: {
          id: 'salon-1',
          name: "Jane Doe's Salon",
          whatsappNumber: '+919876543210',
        },
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockExistingUser);

      const payload = {
        type: 'user.created',
        data: {
          id: 'user_123',
          email_addresses: [{ email_address: 'owner@test.com' }],
          first_name: 'Jane',
          last_name: 'Doe',
        },
      };

      const result = await service.handleUserCreated(payload);
      expect(result.alreadyExisted).toBe(true);
      expect(result.user).toEqual(mockExistingUser);
      expect(mockPrismaService.user.findFirst).toHaveBeenCalled();
      expect(mockPrismaService.salon.create).not.toHaveBeenCalled();
    });

    it('should atomically seed a new Salon and User in a transaction on a fresh signup', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.salon.findUnique.mockResolvedValue(null); // uniqueness check passes

      const createdSalon = {
        id: 'new-salon-id',
        name: "Jane Doe's Salon",
        whatsappNumber: '+919999999999',
      };
      const createdUser = {
        id: 'new-user-id',
        clerkId: 'user_123',
        email: 'owner@test.com',
        name: 'Jane Doe',
        role: 'OWNER',
        salonId: 'new-salon-id',
      };

      mockPrismaService.salon.create.mockResolvedValue(createdSalon);
      mockPrismaService.user.create.mockResolvedValue(createdUser);

      const payload = {
        type: 'user.created',
        data: {
          id: 'user_123',
          email_addresses: [{ email_address: 'owner@test.com' }],
          first_name: 'Jane',
          last_name: 'Doe',
          phone_numbers: [{ phone_number: '+919999999999' }],
        },
      };

      const result = await service.handleUserCreated(payload);
      expect(result.alreadyExisted).toBe(false);
      expect(result.salon).toEqual(createdSalon);
      expect(result.user).toEqual(createdUser);
      expect(mockPrismaService.salon.create).toHaveBeenCalledWith({
        data: {
          name: "Jane Doe's Salon",
          whatsappNumber: '+919999999999',
          aiPrompt: expect.stringContaining("Jane Doe's Salon"),
        },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          clerkId: 'user_123',
          email: 'owner@test.com',
          name: 'Jane Doe',
          salonId: 'new-salon-id',
          role: 'OWNER',
        },
      });
    });
  });

  describe('Full Webhook Controller Integration Actions', () => {
    it('should respond with 201 Created and return new mappings when a fresh user signs up', async () => {
      const payload = {
        type: 'user.created',
        data: {
          id: 'user_123',
          email_addresses: [{ email_address: 'owner@test.com' }],
          first_name: 'Jane',
          last_name: 'Doe',
        },
      };

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.salon.findUnique.mockResolvedValue(null);
      mockPrismaService.salon.create.mockResolvedValue({ id: 'salon-1' });
      mockPrismaService.user.create.mockResolvedValue({ id: 'user-1' });

      const mockReq = { ip: '127.0.0.1' } as express.Request;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await controller.handleWebhook(
        payload,
        'salonflow_clerk_secret',
        mockReq,
        mockRes,
      );

      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Successfully provisioned new Salon and OWNER User.',
        user: expect.any(Object),
        salon: expect.any(Object),
      });
    });

    it('should acknowledge other event types (e.g. user.updated) with 200 OK', async () => {
      const payload = {
        type: 'user.updated',
        data: { id: 'user_123' },
      };

      const mockReq = { ip: '127.0.0.1' } as express.Request;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await controller.handleWebhook(
        payload,
        'salonflow_clerk_secret',
        mockReq,
        mockRes,
      );

      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Event type "user.updated" acknowledged but not processed.',
      });
    });
  });
});
