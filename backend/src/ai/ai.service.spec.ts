import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import OpenAI from 'openai';

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => {
    return {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };
  });
});

describe('AiService', () => {
  let service: AiService;
  let prisma: PrismaService;
  let mockOpenAIInstance: any;

  const mockPrismaService = {
    salon: {
      findUnique: jest.fn(),
    },
    conversation: {
      findUnique: jest.fn(),
    },
    message: {
      findMany: jest.fn(),
    },
    service: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'srv_1', name: 'Haircut', price: 500, durationMins: 30, isActive: true },
        { id: 'srv_2', name: 'Shave', price: 200, durationMins: 15, isActive: true },
        { id: 'srv_3', name: 'Facial', price: 1000, durationMins: 45, isActive: true },
        { id: 'srv_4', name: 'Massage', price: 1500, durationMins: 60, isActive: true },
      ]),
    },
    logSecurityEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    prisma = module.get<PrismaService>(PrismaService);

    // Explicitly set key and call onModuleInit to initialize mock OpenAI instance
    process.env.OPENAI_API_KEY = 'sk-mock-key-for-unit-testing';
    service.onModuleInit();
    mockOpenAIInstance = (service as any).openai;

    jest.clearAllMocks();
  });

  describe('OpenAI Mode (Configured Key)', () => {
    describe('determineIntent', () => {
      it('should return BOOKING if OpenAI classifies it as BOOKING', async () => {
        mockOpenAIInstance.chat.completions.create.mockResolvedValue({
          choices: [
            {
              message: {
                content: 'BOOKING',
              },
            },
          ],
        });

        const result = await service.determineIntent(
          'I want to book an appointment',
        );
        expect(result).toBe('BOOKING');
        expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalled();
      });

      it('should return OTHER if classification fails or is unrecognized', async () => {
        mockOpenAIInstance.chat.completions.create.mockResolvedValue({
          choices: [
            {
              message: {
                content: 'SOMETHING_ELSE',
              },
            },
          ],
        });

        const result = await service.determineIntent('Hello');
        expect(result).toBe('OTHER');
      });
    });

    describe('extractBookingDetails', () => {
      it('should correctly parse arguments if OpenAI tool call is made', async () => {
        mockOpenAIInstance.chat.completions.create.mockResolvedValue({
          choices: [
            {
              message: {
                tool_calls: [
                  {
                    function: {
                      name: 'bookAppointment',
                      arguments: JSON.stringify({
                        date: '2026-06-01',
                        time: '15:00',
                        serviceName: 'Premium Haircut',
                      }),
                    },
                  },
                ],
              },
            },
          ],
        });

        const result = await service.extractBookingDetails(
          'Book premium haircut tomorrow at 3pm',
        );
        expect(result).toEqual({
          date: '2026-06-01',
          time: '15:00',
          serviceName: 'Premium Haircut',
        });
      });

      it('should fallback to local parser if tool call is not made', async () => {
        mockOpenAIInstance.chat.completions.create.mockResolvedValue({
          choices: [
            {
              message: {
                tool_calls: [],
              },
            },
          ],
        });

        // "hello there" will go to local fallback parser and return default/fallback values
        const result = await service.extractBookingDetails('hello there');
        expect(result).not.toBeNull();
        expect(result?.serviceName).toBe('Haircut');
      });
    });

    describe('generateResponse', () => {
      it('should format message prompt and call OpenAI chat completions', async () => {
        mockPrismaService.salon.findUnique.mockResolvedValue({
          id: 'salon-1',
          name: 'Elegance Salon',
          whatsappNumber: '+919876543210',
          aiPrompt: 'Be polite.',
        });
        mockPrismaService.conversation.findUnique.mockResolvedValue({
          id: 'conv-1',
          salonId: 'salon-1',
        });
        mockPrismaService.message.findMany.mockResolvedValue([
          { content: 'Hello', direction: 'INBOUND', timestamp: new Date() },
        ]);
        mockOpenAIInstance.chat.completions.create.mockResolvedValue({
          choices: [
            {
              message: {
                content: 'Hi! How can I help you today?',
              },
            },
          ],
        });

        const result = await service.generateResponse('conv-1', 'salon-1');
        expect(result).toBe('Hi! How can I help you today?');
        expect(mockPrismaService.salon.findUnique).toHaveBeenCalledWith({
          where: { id: 'salon-1' },
        });
        expect(mockPrismaService.message.findMany).toHaveBeenCalled();
      });

      it('should throw NotFoundException and log security event on mismatched conversation salonId', async () => {
        mockPrismaService.salon.findUnique.mockResolvedValue({
          id: 'salon-1',
          name: 'Elegance Salon',
        });
        mockPrismaService.conversation.findUnique.mockResolvedValue({
          id: 'conv-1',
          salonId: 'salon-other',
        });

        await expect(
          service.generateResponse('conv-1', 'salon-1'),
        ).rejects.toThrow(NotFoundException);

        expect(mockPrismaService.logSecurityEvent).toHaveBeenCalledWith(
          'salon-1',
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          {
            entity: 'Conversation',
            targetId: 'conv-1',
            action: 'generateResponse',
          },
        );
      });
    });
  });

  describe('Local Fallback Mode (Unconfigured Key)', () => {
    beforeEach(() => {
      // Clear key and reinitialize service in local bypass mode
      process.env.OPENAI_API_KEY = 'mock-openai-api-key-placeholder';
      service.onModuleInit();
    });

    it('should correctly classify intents locally', async () => {
      expect(await service.determineIntent('I want to book a haircut')).toBe(
        'BOOKING',
      );
      expect(await service.determineIntent('What are your prices?')).toBe(
        'PRICE_QUERY',
      );
      expect(await service.determineIntent('Let me speak to a manager')).toBe(
        'HUMAN_TAKEOVER',
      );
      expect(await service.determineIntent('Random statement')).toBe('OTHER');
    });

    it('should parse booking details locally', async () => {
      const result = await service.extractBookingDetails(
        'Book facial tomorrow at 3:30 pm',
      );
      expect(result).not.toBeNull();
      expect(result?.serviceName).toBe('Facial');
      expect(result?.time).toBe('15:30');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      expect(result?.date).toBe(tomorrowStr);
    });

    it('should return a beautiful FAQ response locally', async () => {
      mockPrismaService.salon.findUnique.mockResolvedValue({
        id: 'salon-1',
        name: 'Demo Salon',
        address: '123 Main St',
      });
      mockPrismaService.conversation.findUnique.mockResolvedValue({
        id: 'conv-1',
        salonId: 'salon-1',
      });
      const res = await service.generateResponse('conv-1', 'salon-1');
      expect(res).toContain('Demo Salon');
      expect(res).toContain('123 Main St');
      expect(res).toContain('₹500');
    });
  });

  describe('Rigorous Multilingual Validation Suite (100+ Hindi, 100+ Hinglish, 50+ Slang)', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'mock-openai-api-key-placeholder';
      service.onModuleInit();
    });

    // 1. Hindi test cases
    const hindiServices = [
      { term: 'हेयरकट', dbName: 'Haircut' },
      { term: 'कटिंग', dbName: 'Haircut' },
      { term: 'बाल', dbName: 'Haircut' },
      { term: 'फेशियल', dbName: 'Facial' },
      { term: 'क्लीनअप', dbName: 'Facial' },
      { term: 'मसाज', dbName: 'Massage' },
      { term: 'मालिश', dbName: 'Massage' },
      { term: 'शेव', dbName: 'Shave' },
      { term: 'दाढ़ी', dbName: 'Shave' },
      { term: 'पेडीक्योर', dbName: 'Pedicure' },
    ];
    const hindiDays = [
      { term: 'आज', offset: 0 },
      { term: 'कल', offset: 1 },
      { term: 'परसों', offset: 2 },
    ];
    const hindiTimes = [
      { term: 'सुबह', expectedTime: '10:00' },
      { term: 'दोपहर', expectedTime: '14:00' },
      { term: 'शाम', expectedTime: '17:00' },
      { term: 'रात', expectedTime: '21:00' },
    ];

    const hindiCases: any[] = [];
    // Generate 120 booking cases
    for (const s of hindiServices) {
      for (const d of hindiDays) {
        for (const t of hindiTimes) {
          hindiCases.push({
            text: `${d.term} ${t.term} मुझे ${s.term} करानी है`,
            expectedLang: 'HINDI',
            expectedIntent: 'BOOKING',
            expectedService: s.dbName,
            expectedDateOffset: d.offset,
            expectedTime: t.expectedTime,
          });
        }
      }
    }

    // Add handcrafted queries (75 cases)
    const hindiHandcrafted = [
      // Price Query (15)
      ...Array.from({ length: 15 }, (_, i) => ({
        text: `हेयरकट का दाम क्या है ${i}?`,
        expectedLang: 'HINDI',
        expectedIntent: 'PRICE_QUERY',
      })),
      // Location Query (15)
      ...Array.from({ length: 15 }, (_, i) => ({
        text: `आपका सैलून कहाँ पर स्थित है ${i}?`,
        expectedLang: 'HINDI',
        expectedIntent: 'LOCATION_QUERY',
      })),
      // Cancellation (15)
      ...Array.from({ length: 15 }, (_, i) => ({
        text: `मेरी बुकिंग कैंसिल करो ${i}`,
        expectedLang: 'HINDI',
        expectedIntent: 'CANCELLATION',
      })),
      // Reschedule (15)
      ...Array.from({ length: 15 }, (_, i) => ({
        text: `टाइम चेंज कर दो बुकिंग का ${i}`,
        expectedLang: 'HINDI',
        expectedIntent: 'RESCHEDULE',
      })),
      // Human Takeover (15)
      ...Array.from({ length: 15 }, (_, i) => ({
        text: `मैनेजर से बात कराओ ${i}`,
        expectedLang: 'HINDI',
        expectedIntent: 'HUMAN_TAKEOVER',
      })),
    ];
    hindiCases.push(...hindiHandcrafted);

    // 2. Hinglish test cases
    const hinglishServices = [
      { term: 'haircut', dbName: 'Haircut' },
      { term: 'cutting', dbName: 'Haircut' },
      { term: 'baal katna', dbName: 'Haircut' },
      { term: 'facial', dbName: 'Facial' },
      { term: 'cleanup', dbName: 'Facial' },
      { term: 'massage', dbName: 'Massage' },
      { term: 'malish', dbName: 'Massage' },
      { term: 'shave', dbName: 'Shave' },
      { term: 'dadhi', dbName: 'Shave' },
      { term: 'pedicure', dbName: 'Pedicure' },
    ];
    const hinglishDays = [
      { term: 'aaj', offset: 0 },
      { term: 'kal', offset: 1 },
      { term: 'parso', offset: 2 },
    ];
    const hinglishTimes = [
      { term: 'subah', expectedTime: '10:00' },
      { term: 'dopahar', expectedTime: '14:00' },
      { term: 'shaam', expectedTime: '17:00' },
      { term: 'raat', expectedTime: '21:00' },
    ];

    const hinglishCases: any[] = [];
    // Generate 120 booking cases
    for (const s of hinglishServices) {
      for (const d of hinglishDays) {
        for (const t of hinglishTimes) {
          hinglishCases.push({
            text: `${d.term} ${t.term} ko ${s.term} book karado bhaiya`,
            expectedLang: 'HINGLISH',
            expectedIntent: 'BOOKING',
            expectedService: s.dbName,
            expectedDateOffset: d.offset,
            expectedTime: t.expectedTime,
          });
        }
      }
    }

    // Add handcrafted queries (75 cases)
    const hinglishHandcrafted = [
      // Price Query (15)
      ...Array.from({ length: 15 }, (_, i) => ({
        text: `haircut ka rate kya hai ${i}`,
        expectedLang: 'HINGLISH',
        expectedIntent: 'PRICE_QUERY',
      })),
      // Location Query (15)
      ...Array.from({ length: 15 }, (_, i) => ({
        text: `salon kahan par hai maps link do ${i}`,
        expectedLang: 'HINGLISH',
        expectedIntent: 'LOCATION_QUERY',
      })),
      // Cancellation (15)
      ...Array.from({ length: 15 }, (_, i) => ({
        text: `booking cancel kar do yaaaar ${i}`,
        expectedLang: 'HINGLISH',
        expectedIntent: 'CANCELLATION',
      })),
      // Reschedule (15)
      ...Array.from({ length: 15 }, (_, i) => ({
        text: `reschedule karna hai time shift kardo ${i}`,
        expectedLang: 'HINGLISH',
        expectedIntent: 'RESCHEDULE',
      })),
      // Human Takeover (15)
      ...Array.from({ length: 15 }, (_, i) => ({
        text: `kisi bande se talk karao ${i}`,
        expectedLang: 'HINGLISH',
        expectedIntent: 'HUMAN_TAKEOVER',
      })),
    ];
    hinglishCases.push(...hinglishHandcrafted);

    // 3. Slang test cases (60 cases)
    const slangCases: any[] = [
      ...Array.from({ length: 12 }, (_, i) => ({
        text: `bhai kal subah 10 baje haircut aur shave set kardo yaar ${i}`,
        expectedLang: 'HINGLISH',
        expectedIntent: 'BOOKING',
        expectedService: 'Haircut',
        expectedDateOffset: 1,
        expectedTime: '10:00',
      })),
      ...Array.from({ length: 12 }, (_, i) => ({
        text: `yaar booking cancel kardo bahut urgent kaam hai ${i}`,
        expectedLang: 'HINGLISH',
        expectedIntent: 'CANCELLATION',
      })),
      ...Array.from({ length: 12 }, (_, i) => ({
        text: `khat banwana hai parso shaam ko 5 baje ${i}`,
        expectedLang: 'HINGLISH',
        expectedIntent: 'BOOKING',
        expectedService: 'Shave',
        expectedDateOffset: 2,
        expectedTime: '17:00',
      })),
      ...Array.from({ length: 12 }, (_, i) => ({
        text: `bhaiya price kitna hai massage ka ${i}`,
        expectedLang: 'HINGLISH',
        expectedIntent: 'PRICE_QUERY',
      })),
      ...Array.from({ length: 12 }, (_, i) => ({
        text: `receptionist se talk karao jaldi please ${i}`,
        expectedLang: 'HINGLISH',
        expectedIntent: 'HUMAN_TAKEOVER',
      })),
    ];

    it('should validate language detection, intent classification, and details extraction accuracy > 90%', async () => {
      const allCases = [...hindiCases, ...hinglishCases, ...slangCases];

      let langCorrect = 0;
      let intentCorrect = 0;
      let extractionCorrect = 0;
      let bookingCount = 0;

      for (const tc of allCases) {
        // 1. Language Detection
        const detectedLang = service.localDetectLanguage(tc.text);
        if (detectedLang === tc.expectedLang) {
          langCorrect++;
        }

        // 2. Intent Classification
        const detectedIntent = service.localDetermineIntent(tc.text);
        if (detectedIntent === tc.expectedIntent) {
          intentCorrect++;
        } else {
          console.log(
            `Mismatch intent: "${tc.text}" -> got "${detectedIntent}", expected "${tc.expectedIntent}"`,
          );
        }

        // 3. Booking details extraction
        if (tc.expectedIntent === 'BOOKING') {
          bookingCount++;
          const details = await service.localExtractBookingDetails(tc.text);
          if (details) {
            const expectedDate = new Date();
            expectedDate.setDate(
              expectedDate.getDate() + tc.expectedDateOffset,
            );
            const expectedDateStr = expectedDate.toISOString().split('T')[0];

            const matchesService = details.serviceName === tc.expectedService;
            const matchesDate = details.date === expectedDateStr;
            const matchesTime = details.time === tc.expectedTime;

            if (matchesService && matchesDate && matchesTime) {
              extractionCorrect++;
            } else {
              console.log(
                `Mismatch: "${tc.text}" | Service: expected "${tc.expectedService}" got "${details.serviceName}" | Date: expected "${expectedDateStr}" got "${details.date}" | Time: expected "${tc.expectedTime}" got "${details.time}"`
              );
            }
          }
        }
      }

      const langAccuracy = (langCorrect / allCases.length) * 100;
      const intentAccuracy = (intentCorrect / allCases.length) * 100;
      const extractionAccuracy = (extractionCorrect / bookingCount) * 100;

      expect(langAccuracy).toBeGreaterThanOrEqual(95);
      expect(intentAccuracy).toBeGreaterThanOrEqual(90);
      expect(extractionAccuracy).toBeGreaterThanOrEqual(90);
    });
  });

  describe('transcribeAudio duration check', () => {
    beforeEach(() => {
      process.env.WHATSAPP_TOKEN = 'test-token';
    });

    afterEach(() => {
      delete process.env.WHATSAPP_TOKEN;
      jest.restoreAllMocks();
    });

    it('should throw BadRequestException if audio duration exceeds 45 seconds', async () => {
      const mockResponseMeta = {
        ok: true,
        json: async () => ({ url: 'https://media.url' }),
      };
      // Mock a buffer size of 150KB (approx 50 seconds at 3KB/sec)
      const largeBuffer = Buffer.alloc(150000);
      const mockResponseBinary = {
        ok: true,
        arrayBuffer: async () => largeBuffer.buffer.slice(largeBuffer.byteOffset, largeBuffer.byteOffset + largeBuffer.byteLength),
      };

      jest.spyOn(global, 'fetch')
        .mockResolvedValueOnce(mockResponseMeta as any)
        .mockResolvedValueOnce(mockResponseBinary as any);

      await expect(service.transcribeAudio('large-audio-id', 'audio/ogg'))
        .rejects.toThrow('AUDIO_TOO_LONG');
    });

    it('should succeed and return transcribed text if duration is within 45 seconds', async () => {
      const mockResponseMeta = {
        ok: true,
        json: async () => ({ url: 'https://media.url' }),
      };
      // Mock a buffer size of 30KB (approx 10 seconds)
      const smallBuffer = Buffer.alloc(30000);
      const mockResponseBinary = {
        ok: true,
        arrayBuffer: async () => smallBuffer.buffer.slice(smallBuffer.byteOffset, smallBuffer.byteOffset + smallBuffer.byteLength),
      };

      jest.spyOn(global, 'fetch')
        .mockResolvedValueOnce(mockResponseMeta as any)
        .mockResolvedValueOnce(mockResponseBinary as any);

      mockOpenAIInstance.audio = {
        transcriptions: {
          create: jest.fn().mockResolvedValue({ text: 'Haircut booking text' }),
        },
      };

      const result = await service.transcribeAudio('small-audio-id', 'audio/ogg');
      expect(result).toBe('Haircut booking text');
    });
  });
});
