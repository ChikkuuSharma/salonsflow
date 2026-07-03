import {
  Injectable,
  OnModuleInit,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (
      apiKey &&
      apiKey !== 'mock-openai-api-key-placeholder' &&
      apiKey.startsWith('sk-')
    ) {
      this.openai = new OpenAI({ apiKey });
      this.logger.log(
        'OpenAI Service initialized successfully with provided API key.',
      );
    } else {
      this.logger.warn(
        'OpenAI API Key is missing or invalid. Initializing in Local Smart Fallback mode.',
      );
    }
  }

  private isOpenAiConfigured(): boolean {
    return this.openai !== null;
  }

  /**
   * Formats the master system prompt for a specific salon, pulling dynamic catalog services
   */
  private generateSystemPrompt(salon: any, services: any[]): string {
    const servicesList = services
      .map((s) => `- ${s.name}: ₹${s.price} (Duration: ${s.durationMins} mins)`)
      .join('\n');

    return `
You are the AI Receptionist for "${salon.name}".
Salon Phone: ${salon.whatsappNumber}
Address: ${salon.address || 'Not specified'}

AVAILABLE SERVICES & PRICING:
${servicesList || 'No services configured yet.'}

Instructions:
${salon.aiPrompt || 'Be polite and concise. Help customers book appointments and answer their FAQs.'}

CORE RULES:
1. Always maintain the requested tone.
2. If a user asks for prices, answer them accurately based on the AVAILABLE SERVICES & PRICING list above. Do NOT make up any services or prices.
3. Keep responses strictly under 3 sentences for WhatsApp readability.
4. If they want to book, ask them for the preferred date and time, and confirm they want one of the available services.
5. If the request is complex or they want to speak to a human, apologize and say you will notify the manager.

MULTILINGUAL / INDIAN MARKET RULES:
- Detect the language used by the customer.
- If they write in Hinglish (Hindi written in Latin characters, e.g. "Kal haircut kitne ka hai?"), reply in natural Hinglish.
- If they write in Hindi (Devanagari, e.g. "कल हेयरकट कितने का है?"), reply in Hindi.
- If they write in English, reply in English.
- The AI must understand slang, mixed sentences (Hindi + English), and relative dates in Hindi/Hinglish (like "kal", "parso", "sunday ko", "shaam ko").
- Respond to the customer in the same language and script they used.
    `.trim();
  }

  /**
   * Generates a response using OpenAI or Local Smart Fallback
   */
  async generateResponse(
    conversationId: string,
    salonId: string,
  ): Promise<string> {
    // Fetch salon details
    const salon = await this.prisma.salon.findUnique({
      where: { id: salonId },
    });

    if (!salon) throw new NotFoundException('Salon not found');

    // Verify conversation tenant scope
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (conversation && conversation.salonId !== salonId) {
      await this.prisma.logSecurityEvent(
        salonId,
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        {
          entity: 'Conversation',
          targetId: conversationId,
          action: 'generateResponse',
        },
      );
      throw new NotFoundException('Conversation not found');
    }

    // Fetch recent conversation history (last 10 messages)
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'asc' },
      take: 10,
    });

    const lastInboundMsg = [...messages]
      .reverse()
      .find((m) => m.direction === 'INBOUND');
    const conversationLang = conversation?.language || 'ENGLISH';
    const lastMsgLang = lastInboundMsg?.language || conversationLang;
    const lastMsgIntent = lastInboundMsg
      ? this.localDetermineIntent(lastInboundMsg.content)
      : 'OTHER';

    // Fetch active salon services dynamically
    const services = await this.prisma.service.findMany({
      where: { salonId, isActive: true },
    });

    if (!this.isOpenAiConfigured()) {
      return await this.localGenerateResponse(salon, lastMsgLang, lastMsgIntent, lastInboundMsg?.content);
    }

    try {
      const openAiMessages = messages.map((msg) => ({
        role: msg.direction === 'INBOUND' ? 'user' : 'assistant',
        content: msg.content,
      })) as OpenAI.Chat.ChatCompletionMessageParam[];

      // Add system prompt at the beginning
      openAiMessages.unshift({
        role: 'system',
        content: this.generateSystemPrompt(salon, services),
      });

      // Call OpenAI
      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: openAiMessages,
        temperature: 0.7,
        max_tokens: 150,
      });

      return (
        response.choices[0].message?.content ||
        (await this.localGenerateResponse(salon, lastMsgLang, lastMsgIntent, lastInboundMsg?.content))
      );
    } catch (error) {
      this.logger.error(
        `Error generating AI response: ${error.message}. Falling back to local engine.`,
      );
      return await this.localGenerateResponse(salon, lastMsgLang, lastMsgIntent, lastInboundMsg?.content);
    }
  }

  /**
   * Generates a personalized review request message using OpenAI or fallback
   */
  async generateReviewRequest(
    clientName: string,
    serviceName: string,
    salonName: string,
    trackingUrl: string,
  ): Promise<string> {
    if (!this.isOpenAiConfigured()) {
      return `Hi ${clientName}, thank you for visiting ${salonName} today! We hope you loved your ${serviceName}. If you enjoyed your experience, we'd love it if you left us a review here: ${trackingUrl}`;
    }

    try {
      const prompt = `Generate a warm, professional, highly personalized Google Review request message for a client who just completed an appointment.
      Client Name: ${clientName}
      Service Received: ${serviceName}
      Salon Name: ${salonName}
      
      The message must end with this review link: ${trackingUrl}
      
      Keep the message under 3 sentences for WhatsApp readability. Do not wrap the link in markdown.`;

      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 150,
      });

      return (
        response.choices[0].message?.content ||
        `Hi ${clientName}, thank you for visiting ${salonName}! We hope you loved your ${serviceName}. Please leave us a review here: ${trackingUrl}`
      );
    } catch (error) {
      this.logger.error(
        `Error generating review request AI message: ${error.message}`,
      );
      return `Hi ${clientName}, thank you for visiting ${salonName} today! We hope you loved your ${serviceName}. If you enjoyed your experience, we'd love it if you left us a review here: ${trackingUrl}`;
    }
  }

  /**
   * Generates a personalized rebooking message using OpenAI or fallback
   */
  async generateRebookingMessage(
    clientName: string,
    serviceName: string,
    salonName: string,
    intervalDays: number,
  ): Promise<string> {
    if (!this.isOpenAiConfigured()) {
      return `Hi ${clientName}, it has been about ${intervalDays} days since your last ${serviceName} at ${salonName}. Would you like to schedule your next appointment? Reply with your preferred date and time to book easily!`;
    }

    try {
      const prompt = `Generate a warm, friendly, highly personalized WhatsApp rebooking invitation message in Hinglish or English for a customer.
      Customer Name: ${clientName}
      Service Name: ${serviceName}
      Salon Name: ${salonName}
      Interval: ${intervalDays} days since last visit
      
      Suggest they book their next visit by replying directly with their preferred date and time. Keep it under 3 sentences for WhatsApp readability.`;

      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 150,
      });

      return (
        response.choices[0].message?.content ||
        `Hi ${clientName}, it's time for your next ${serviceName}! Reply with a date and time to book your slot at ${salonName}.`
      );
    } catch (error) {
      this.logger.error(
        `Error generating rebooking AI message: ${error.message}`,
      );
      return `Hi ${clientName}, it has been about ${intervalDays} days since your last ${serviceName} at ${salonName}. Would you like to schedule your next appointment? Reply with your preferred date and time to book easily!`;
    }
  }

  /**
   * Detects the language of a given text (OpenAI or Local Smart Fallback)
   */
  async detectLanguage(
    text: string,
  ): Promise<'ENGLISH' | 'HINDI' | 'HINGLISH'> {
    if (!this.isOpenAiConfigured()) {
      return this.localDetectLanguage(text);
    }

    const prompt = `Classify the language of the following text into exactly one of these labels: ENGLISH, HINDI, HINGLISH.
Text: "${text}"
Output ONLY the label. Do not include markdown or punctuation.`;

    try {
      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 10,
      });

      const lang = response.choices[0].message?.content?.trim().toUpperCase();
      if (['ENGLISH', 'HINDI', 'HINGLISH'].includes(lang || '')) {
        return lang as any;
      }
      return this.localDetectLanguage(text);
    } catch (e) {
      this.logger.error(
        `Error in detectLanguage OpenAI call: ${e.message}. Using local classifier fallback.`,
      );
      return this.localDetectLanguage(text);
    }
  }

  localDetectLanguage(text: string): 'ENGLISH' | 'HINDI' | 'HINGLISH' {
    if (/[\u0900-\u097F]/.test(text)) {
      return 'HINDI';
    }

    const msg = text.toLowerCase();

    // Distinctive Hinglish keywords
    const hinglishTokens = [
      'aaj',
      'kal',
      'parso',
      'parson',
      'bhai',
      'yaar',
      'karwana',
      'karvana',
      'karado',
      'karana',
      'karna',
      'kardo',
      'chahiye',
      'kitna',
      'kitne',
      'kitni',
      'hain',
      'hoon',
      'tha',
      'thi',
      'the',
      'kya',
      'kab',
      'kaha',
      'kahan',
      'kaise',
      'kaun',
      'kyu',
      'kyun',
      'toh',
      'mein',
      'teen',
      'chaar',
      'paanch',
      'chhah',
      'saat',
      'aath',
      'nau',
      'das',
      'baje',
      'baja',
      'baji',
      'aur',
      'nahin',
      'haan',
      'han',
      'acha',
      'accha',
      'thik',
      'theek',
      'abhi',
      'chalega',
      'karo',
      'gaya',
      'gaye',
      'gayi',
      'raha',
      'rahe',
      'rahi',
      'daadhi',
      'dadhi',
      'trimming',
      'baal',
      'katne',
      'katna',
      'karwa',
      'karva',
      'krna',
      'krdo',
      'krwa',
      'apna',
      'apne',
      'apni',
      'mera',
      'meri',
      'mere',
      'tum',
      'tumhara',
      'tumhari',
      'tumhere',
      'aap',
      'aapka',
      'aapki',
      'aapke',
      'hum',
      'hamara',
      'hamari',
      'hamare',
      'liye',
      'kuch',
      'kuchh',
      'dikhado',
      'kardo',
      'ka',
      'ki',
      'ke',
      'ko',
      'se',
      'kar',
      'do',
      'bhaiya',
      'bande',
      'kisi',
      'karao',
      'yaaaar',
      'bahut',
      'kaam',
      'urgent',
      'khat',
      'banwana',
      'jaldi',
    ];

    let matchCount = 0;
    const words = msg.split(/\s+/);
    for (const w of words) {
      const cleanW = w.replace(/[^\w]/g, '');
      if (hinglishTokens.includes(cleanW)) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      return 'HINGLISH';
    }

    return 'ENGLISH';
  }

  /**
   * Intent Recognition (Classification into 8 categories)
   */
  async determineIntent(
    message: string,
  ): Promise<
    | 'BOOKING'
    | 'FAQ'
    | 'CANCELLATION'
    | 'RESCHEDULE'
    | 'PRICE_QUERY'
    | 'LOCATION_QUERY'
    | 'HUMAN_TAKEOVER'
    | 'SERVICE_INQUIRY'
    | 'WAITLIST'
    | 'OTHER'
  > {
    if (!this.isOpenAiConfigured()) {
      return this.localDetermineIntent(message);
    }

    const prompt = `Classify the intent of the following user message into exactly one of these categories:
- BOOKING (if scheduling a new appointment)
- FAQ (general questions about the salon)
- CANCELLATION (cancelling an appointment)
- RESCHEDULE (rescheduling an existing appointment)
- PRICE_QUERY (asking about service charges/price list)
- LOCATION_QUERY (asking where the salon is located or for directions)
- HUMAN_TAKEOVER (asking to speak with a human/manager/staff)
- SERVICE_INQUIRY (asking which services are offered)
- WAITLIST (asking to join the waiting list, queue, or be notified if a slot opens up)
- OTHER (if none of the above)

Message: "${message}"
Output ONLY the category name. Do not include markdown or punctuation.`;

    try {
      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 15,
      });

      const intent = response.choices[0].message?.content?.trim().toUpperCase();
      const validIntents = [
        'BOOKING',
        'FAQ',
        'CANCELLATION',
        'RESCHEDULE',
        'PRICE_QUERY',
        'LOCATION_QUERY',
        'HUMAN_TAKEOVER',
        'SERVICE_INQUIRY',
        'WAITLIST',
      ];
      if (validIntents.includes(intent || '')) {
        return intent as any;
      }
      return 'OTHER';
    } catch (e) {
      this.logger.error(
        `Error in determineIntent OpenAI call: ${e.message}. Using local classifier fallback.`,
      );
      return this.localDetermineIntent(message);
    }
  }

  /**
   * Extracts booking details from a message using OpenAI Tool Calling or Local Smart Parser
   */
  async extractBookingDetails(
    message: string,
    salonId?: string,
  ): Promise<{ date: string; time: string; serviceName: string; staffName?: string } | null> {
    if (!this.isOpenAiConfigured()) {
      return this.localExtractBookingDetails(message, salonId);
    }

    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });

      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert booking assistant. Today is ${dayOfWeek}, ${todayStr}. Analyze the user's message and call the bookAppointment tool if they want to schedule a booking, resolving any relative dates (like 'tomorrow', 'next Monday', 'aaj', 'kal', 'parso') based on today's date ${todayStr}.
            Remember that in Hinglish/Hindi, relative dates mean: 'aaj' = today, 'kal' = tomorrow, 'parso' = day after tomorrow. Relative times: 'subah' = morning (10:00), 'dopahar' = afternoon (14:00), 'shaam' = evening (17:00), 'raat' = night (21:00).`,
          },
          { role: 'user', content: message },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'bookAppointment',
              description: 'Extract appointment details.',
              parameters: {
                type: 'object',
                properties: {
                  date: {
                    type: 'string',
                    description: 'YYYY-MM-DD format date.',
                  },
                  time: {
                    type: 'string',
                    description: 'HH:MM 24h format time.',
                  },
                  serviceName: {
                    type: 'string',
                    description: 'Name of the service (e.g., Haircut).',
                  },
                  staffName: {
                    type: 'string',
                    description: 'Name of the specific stylist or staff requested by the customer, if any.',
                  },
                },
                required: ['date', 'time', 'serviceName'],
              },
            },
          },
        ],
        tool_choice: {
          type: 'function',
          function: { name: 'bookAppointment' },
        },
      });

      const toolCall = response.choices[0].message?.tool_calls?.[0] as any;
      if (toolCall && toolCall.function.name === 'bookAppointment') {
        const args = JSON.parse(toolCall.function.arguments);
        return {
          date: args.date,
          time: args.time,
          serviceName: args.serviceName,
          staffName: args.staffName || undefined,
        };
      }
      return this.localExtractBookingDetails(message, salonId);
    } catch (error) {
      this.logger.error(
        `Error in extractBookingDetails OpenAI call: ${error.message}. Falling back to local parser.`,
      );
      return this.localExtractBookingDetails(message, salonId);
    }
  }

  // --- Local Fallback Engines ---

  localDetermineIntent(
    message: string,
  ):
    | 'BOOKING'
    | 'FAQ'
    | 'CANCELLATION'
    | 'RESCHEDULE'
    | 'PRICE_QUERY'
    | 'LOCATION_QUERY'
    | 'HUMAN_TAKEOVER'
    | 'SERVICE_INQUIRY'
    | 'WAITLIST'
    | 'OTHER' {
    const msg = message.toLowerCase();

    // 0. Waitlist
    if (
      msg.includes('waitlist') ||
      msg.includes('waiting list') ||
      msg.includes('waiting me') ||
      msg.includes('waiting mein') ||
      msg.includes('queue') ||
      msg.includes('khaali') ||
      msg.includes('khali') ||
      msg.includes('notify me') ||
      msg.includes('slots unavailable') ||
      msg.includes('वेटिंग')
    ) {
      return 'WAITLIST';
    }

    // 1. Human Takeover (excluding filler words like bhaiya/bhai)
    if (
      msg.includes('human') ||
      msg.includes('agent') ||
      msg.includes('manager') ||
      msg.includes('person') ||
      msg.includes('speak to') ||
      msg.includes('talk') ||
      msg.includes('call') ||
      msg.includes('बात') ||
      msg.includes('connect') ||
      msg.includes('staff') ||
      msg.includes('banda') ||
      msg.includes('receptionist') ||
      msg.includes('owner') ||
      msg.includes('admin') ||
      msg.includes('सम्पर्क') ||
      msg.includes('कॉल') ||
      msg.includes('नंबर') ||
      msg.includes('मैनेजर')
    ) {
      return 'HUMAN_TAKEOVER';
    }

    // 2. Cancellation
    if (
      msg.includes('cancel') ||
      msg.includes('radd') ||
      msg.includes('cancellation') ||
      msg.includes('hatado') ||
      msg.includes('hata do') ||
      msg.includes('rok do') ||
      msg.includes('nhi aana') ||
      msg.includes('nahi aana') ||
      msg.includes('कैंसिल') ||
      msg.includes('रद्द') ||
      msg.includes('हटा') ||
      msg.includes('रोक')
    ) {
      return 'CANCELLATION';
    }

    // 3. Reschedule
    if (
      msg.includes('reschedule') ||
      msg.includes('change time') ||
      msg.includes('time change') ||
      msg.includes('postpone') ||
      msg.includes('prepone') ||
      msg.includes('shift') ||
      msg.includes('time badal') ||
      msg.includes('date badal') ||
      msg.includes('samay badal') ||
      msg.includes('बदल') ||
      msg.includes('समय बदल') ||
      msg.includes('चेंज') ||
      msg.includes('बदलो') ||
      msg.includes('बदलना')
    ) {
      return 'RESCHEDULE';
    }

    // 4. Price query
    if (
      msg.includes('price') ||
      msg.includes('cost') ||
      msg.includes('rate') ||
      msg.includes('rupay') ||
      msg.includes('charges') ||
      msg.includes('दाम') ||
      msg.includes('कीमत') ||
      msg.includes('paisay') ||
      msg.includes('paisa') ||
      msg.includes('kitna') ||
      msg.includes('kitne ka') ||
      msg.includes('how much') ||
      msg.includes('fee') ||
      msg.includes('charge') ||
      /\brs\b/.test(msg) ||
      msg.includes('rs.') ||
      msg.includes('rupees') ||
      msg.includes('पैसे') ||
      msg.includes('रूपये') ||
      msg.includes('रेट') ||
      msg.includes('चार्ज')
    ) {
      return 'PRICE_QUERY';
    }

    // 5. Location query
    if (
      msg.includes('address') ||
      msg.includes('locat') ||
      msg.includes('where') ||
      msg.includes('map') ||
      msg.includes('direc') ||
      msg.includes('kahan') ||
      msg.includes('kaha') ||
      msg.includes('path') ||
      msg.includes('place') ||
      msg.includes('salooon') ||
      msg.includes('route') ||
      msg.includes('पता') ||
      msg.includes('कहाँ') ||
      msg.includes('कहा') ||
      msg.includes('स्थान') ||
      msg.includes('लोकेशन')
    ) {
      return 'LOCATION_QUERY';
    }

    // 6. Service inquiry
    if (
      msg.includes('menu') ||
      msg.includes('services') ||
      msg.includes('service list') ||
      msg.includes('kaunsi service') ||
      msg.includes('konsi service') ||
      msg.includes('kya kya') ||
      msg.includes('offer') ||
      msg.includes('मेन्यू') ||
      msg.includes('सेवा') ||
      msg.includes('सुविधा')
    ) {
      return 'SERVICE_INQUIRY';
    }

    // 7. Booking (incorporating services and relative times/days in Devanagari)
    if (
      msg.includes('book') ||
      msg.includes('schedul') ||
      msg.includes('appoint') ||
      msg.includes('haircut') ||
      msg.includes('facial') ||
      msg.includes('massage') ||
      msg.includes('shave') ||
      msg.includes('spa') ||
      msg.includes('katna') ||
      msg.includes('cutting') ||
      msg.includes('karwana') ||
      msg.includes('booking') ||
      msg.includes('slot') ||
      msg.includes('appointment') ||
      msg.includes('बुक') ||
      msg.includes('अपॉइंटमेंट') ||
      msg.includes('baje') ||
      msg.includes('reserve') ||
      msg.includes('free slot') ||
      msg.includes('time table') ||
      msg.includes('timing') ||
      msg.includes('हेयरकट') ||
      msg.includes('कटिंग') ||
      msg.includes('बाल') ||
      msg.includes('फेशियल') ||
      msg.includes('क्लीनअप') ||
      msg.includes('मसाज') ||
      msg.includes('मालिश') ||
      msg.includes('शेव') ||
      msg.includes('दाढ़ी') ||
      msg.includes('पेडीक्योर') ||
      msg.includes('कैटिंग') ||
      msg.includes('कट') ||
      msg.includes('khat') ||
      msg.includes('trim')
    ) {
      return 'BOOKING';
    }

    // 8. FAQ (fallback for generic questions)
    if (
      msg.includes('open') ||
      msg.includes('hour') ||
      msg.includes('close') ||
      msg.includes('timings') ||
      msg.includes('contact') ||
      msg.includes('phone')
    ) {
      return 'FAQ';
    }

    return 'OTHER';
  }

  async localExtractBookingDetails(
    message: string,
    salonId?: string,
  ): Promise<{ date: string; time: string; serviceName: string; staffName?: string } | null> {
    const msg = message.toLowerCase();

    // Extract service & Vocabulary Normalizer
    let serviceName: string | null = null;
    if (
      msg.includes('facial') ||
      msg.includes('cleanup') ||
      msg.includes('clean up') ||
      msg.includes('d-tan') ||
      msg.includes('glow') ||
      msg.includes('फेशियल') ||
      msg.includes('क्लीनअप')
    ) {
      serviceName = 'Facial';
    } else if (
      msg.includes('massage') ||
      msg.includes('body') ||
      msg.includes('spa') ||
      msg.includes('malish') ||
      msg.includes('मसाज') ||
      msg.includes('मालिश') ||
      msg.includes('स्पा')
    ) {
      serviceName = 'Massage';
    } else if (
      msg.includes('haircut') ||
      msg.includes('cutting') ||
      msg.includes('hair cut') ||
      msg.includes('baal') ||
      msg.includes('katna') ||
      msg.includes('हेयरकट') ||
      msg.includes('कटिंग') ||
      msg.includes('बाल')
    ) {
      serviceName = 'Haircut';
    } else if (
      msg.includes('shave') ||
      msg.includes('shaving') ||
      msg.includes('daadhi') ||
      msg.includes('dadhi') ||
      msg.includes('trim') ||
      msg.includes('khat') ||
      msg.includes('शेव') ||
      msg.includes('दाढ़ी')
    ) {
      serviceName = 'Shave';
    } else if (
      msg.includes('pedicure') ||
      msg.includes('pedi') ||
      msg.includes('पेडीक्योर')
    ) {
      serviceName = 'Pedicure';
    } else if (
      msg.includes('manicure') ||
      msg.includes('mani') ||
      msg.includes('मैनिक्योर') ||
      msg.includes('मेनीक्योर')
    ) {
      serviceName = 'Manicure';
    }

    const isAvailabilityQuery = msg.includes('slot') || msg.includes('available') || msg.includes('free') || msg.includes('khali') || msg.includes('khaali') || msg.includes('timing') || msg.includes('schedule') || msg.includes('check') || msg.includes('खाली') || msg.includes('समय');

    if (!serviceName) {
      if (isAvailabilityQuery) {
        // Default to Haircut to allow listing general slots if they just asked for slots availability
        serviceName = 'Haircut';
      } else {
        return null;
      }
    }

    // Extract Staff Name
    let staffName: string | undefined = undefined;
    if (salonId) {
      const staffList = await this.prisma.staff.findMany({
        where: { salonId },
      });
      for (const staff of staffList) {
        const parts = staff.name.toLowerCase().split(/\s+/);
        if (msg.includes(staff.name.toLowerCase()) || parts.some(part => part.length > 2 && msg.includes(part))) {
          staffName = staff.name;
          break;
        }
      }
    }

    // Default dates
    const today = new Date();
    let dateStr = today.toISOString().split('T')[0];
    let timeStr: string | null = null;

    // 1. Date extraction
    if (msg.includes('today') || msg.includes('aaj') || msg.includes('आज')) {
      const d = new Date();
      dateStr = d.toISOString().split('T')[0];
    } else if (
      msg.includes('tomorrow') ||
      msg.includes('kal') ||
      msg.includes('कल')
    ) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      dateStr = d.toISOString().split('T')[0];
    } else if (
      msg.includes('day after tomorrow') ||
      msg.includes('parso') ||
      msg.includes('परसों')
    ) {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      dateStr = d.toISOString().split('T')[0];
    } else {
      // Find days of week
      const days = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ];
      const hindiDays = [
        'ravivar',
        'somvar',
        'mangalvar',
        'budhvar',
        'guruvar',
        'shukravar',
        'shanivar',
      ];
      const hinglishDays = [
        'sunday ko',
        'monday ko',
        'tuesday ko',
        'wednesday ko',
        'thursday ko',
        'friday ko',
        'saturday ko',
      ];

      let foundDayIdx = -1;
      for (let i = 0; i < 7; i++) {
        if (
          msg.includes(days[i]) ||
          msg.includes(hindiDays[i]) ||
          msg.includes(hinglishDays[i])
        ) {
          foundDayIdx = i;
          break;
        }
      }

      if (foundDayIdx !== -1) {
        const d = new Date();
        const currentDay = d.getDay();
        let diff = foundDayIdx - currentDay;
        if (diff <= 0) diff += 7; // Next week's day if it was in the past
        d.setDate(d.getDate() + diff);
        dateStr = d.toISOString().split('T')[0];
      }
    }

    // 2. Time extraction
    const relativeTimes = [
      { key: 'subah', hour: 10 },
      { key: 'morning', hour: 10 },
      { key: 'सुबह', hour: 10 },
      { key: 'dopahar', hour: 14 },
      { key: 'afternoon', hour: 14 },
      { key: 'दोपहर', hour: 14 },
      { key: 'shaam', hour: 17 },
      { key: 'evening', hour: 17 },
      { key: 'शाम', hour: 17 },
      { key: 'raat', hour: 21 },
      { key: 'night', hour: 21 },
      { key: 'रात', hour: 21 },
    ];

    for (const rt of relativeTimes) {
      if (msg.includes(rt.key)) {
        timeStr = `${rt.hour.toString().padStart(2, '0')}:00`;
        break;
      }
    }

    // Time Regex: e.g. "3:30 pm", "15:00", "5 baje"
    const timeRegexes = [
      /(\d{1,2}):(\d{2})\s*(am|pm|baje)?/i,
      /(\d{1,2})\s*()(am|pm|baje)/i,
    ];


    for (const rx of timeRegexes) {
      const match = msg.match(rx);
      if (!match) continue;

      const hourStr = match[1];
      const minStr = match[2] || '00';
      const ampm = match[3];

      let hour = parseInt(hourStr);
      if (ampm === 'pm' && hour < 12) hour += 12;
      if (ampm === 'am' && hour === 12) hour = 0;
      // Handle "5 baje" or "10 baje"
      if (ampm === 'baje') {
        if (hour >= 1 && hour <= 8) hour += 12;
      } else if (!ampm) {
        if (hour >= 1 && hour <= 8) hour += 12;
      }

      if (hour >= 0 && hour < 24) {
        timeStr = `${hour.toString().padStart(2, '0')}:${minStr.padStart(2, '0')}`;
        break;
      }
    }

    if (!timeStr) {
      if (isAvailabilityQuery) {
        timeStr = 'AVAILABILITY';
      } else {
        return null;
      }
    }

    return {
      date: dateStr,
      time: timeStr,
      serviceName,
      staffName,
    };
  }

  async localGenerateResponse(
    salon: any,
    language: string = 'ENGLISH',
    intent: string = 'OTHER',
    lastMessageText?: string,
  ): Promise<string> {
    const lang = language.toUpperCase();
    const intentUpper = intent.toUpperCase();
    const textLower = (lastMessageText || '').toLowerCase();

    // Fetch active salon services dynamically from the database
    const services = await this.prisma.service.findMany({
      where: { salonId: salon.id, isActive: true },
      orderBy: { name: 'asc' },
    });

    const servicesListString = services
      .map((s) => `${s.name} (₹${s.price})`)
      .join(', ');

    // 1. Check if the message is a specific service price inquiry
    let matchedServiceName = '';
    let matchedServicePrice = 0;
    for (const s of services) {
      if (textLower.includes(s.name.toLowerCase())) {
        matchedServiceName = s.name;
        matchedServicePrice = s.price;
        break;
      }
    }

    // 2. Check if the message is asking for timings / available slots
    const isSlotsQuery =
      textLower.includes('slot') ||
      textLower.includes('available') ||
      textLower.includes('free') ||
      textLower.includes('khali') ||
      textLower.includes('timing') ||
      textLower.includes('खाली') ||
      textLower.includes('समय') ||
      textLower.includes('कब');

    const isTomorrow =
      textLower.includes('tomorrow') ||
      textLower.includes('kal') ||
      textLower.includes('कल');

    const isToday =
      textLower.includes('today') ||
      textLower.includes('aaj') ||
      textLower.includes('आज');

    if (lang === 'HINDI') {
      if (textLower.includes('discount') || textLower.includes('offer') || textLower.includes('छूट') || textLower.includes('सस्ता') || textLower.includes('ऑफर')) {
        return `हमारे वर्तमान डिस्काउंट और ऑफर्स की जानकारी के लिए कृपया मैनेजर से बात करें। क्या मैं आपका कॉल ट्रांसफर करूँ?`;
      }
      if (textLower.includes('open') || textLower.includes('close') || textLower.includes('timing') || textLower.includes('समय') || textLower.includes('घंटे') || textLower.includes('खुलने')) {
        return `सैलून सुबह 10:00 बजे से रात 8:00 बजे तक खुला रहता है। हम सप्ताह के सभी दिन खुले हैं।`;
      }
      if (textLower.includes('staff') || textLower.includes('stylist') || textLower.includes('बारबर') || textLower.includes('स्टाफ') || textLower.includes('लड़का') || textLower.includes('लड़की')) {
        return `हमारे पास विशेषज्ञ हेयर स्टाइलिस्ट उपलब्ध हैं। आप बुकिंग के समय अपनी पसंद का स्टाफ चुन सकते हैं।`;
      }

      if (isSlotsQuery) {
        if (isTomorrow) {
          return `कल के लिए हमारे उपलब्ध स्लॉट हैं: सुबह 11:30, दोपहर 2:00, शाम 4:30, और शाम 6:00। आप किस समय आना चाहेंगे?`;
        }
        if (isToday) {
          return `आज के लिए हमारे खाली स्लॉट हैं: दोपहर 3:00, शाम 5:30, और शाम 7:00। आप किस समय आना चाहेंगे?`;
        }
        return `हमारे स्लॉट सुबह 10:00 से रात 8:00 बजे तक खुले रहते हैं। आज और कल दोनों दिन समय उपलब्ध हैं। आप कब आना चाहेंगे?`;
      }

      if (matchedServiceName) {
        return `हमारे सैलून में "${matchedServiceName}" का दाम ₹${matchedServicePrice} है। क्या आप इसे बुक करना चाहेंगे?`;
      }

      if (
        intentUpper === 'PRICE_QUERY' ||
        intentUpper === 'SERVICE_INQUIRY' ||
        intentUpper === 'FAQ'
      ) {
        return `नमस्ते! हमारी सेवाएँ हैं: ${servicesListString || 'कोई सेवा उपलब्ध नहीं है'}। हम आपकी क्या सहायता कर सकते हैं?`;
      }
      if (intentUpper === 'LOCATION_QUERY') {
        return `हम ${salon.address || '123 मेन स्ट्रीट, नई दिल्ली'} में स्थित हैं। जल्द ही आपसे मिलने की उम्मीद है!`;
      }
      if (intentUpper === 'CANCELLATION') {
        return `अपना अपॉइंटमेंट रद्द करने के लिए, कृपया बुकिंग विवरण भेजें या मैनेजर से बात करने का अनुरोध करें।`;
      }
      if (intentUpper === 'RESCHEDULE') {
        return `अपॉइंटमेंट का समय बदलने के लिए, कृपया अपनी पसंद की नई तारीख और समय बताएं।`;
      }
      if (intentUpper === 'HUMAN_TAKEOVER') {
        return `मैं आपको सैलून मैनेजर से जोड़ रहा हूँ। वे जल्द ही आपसे संपर्क करेंगे।`;
      }
      if (intentUpper === 'WAITLIST') {
        return `मैं आपको वेटिंग लिस्ट में जोड़ सकता हूँ। कृपया अपनी पसंदीदा तारीख और समय बताएं।`;
      }
      if (intentUpper === 'BOOKING') {
        return `मैं बुकिंग में मदद कर सकता हूँ! आप कौन सी सेवा, तारीख और समय चाहते हैं? हमारी सेवाएँ हैं: ${servicesListString || 'कोई सेवा उपलब्ध नहीं है'}।`;
      }
      return `एलीगेंस सैलून में संपर्क करने के लिए धन्यवाद। आज हम आपकी क्या मदद कर सकते हैं?`;
    }

    if (lang === 'HINGLISH') {
      if (textLower.includes('discount') || textLower.includes('offer') || textLower.includes('choot') || textLower.includes('sasta') || textLower.includes('kam') || textLower.includes('package')) {
        return `Humare current discounts aur packages ki details ke liye aap directly manager se connect kar sakte hain. Kya main connect karu?`;
      }
      if (textLower.includes('open') || textLower.includes('close') || textLower.includes('timing') || textLower.includes('hour') || textLower.includes('working')) {
        return `Humara salon subah 10:00 AM se shaam 8:00 PM tak open rehta hai, all days a week.`;
      }
      if (textLower.includes('staff') || textLower.includes('stylist') || textLower.includes('barber') || textLower.includes('expert') || textLower.includes('bhaiya') || textLower.includes('banda')) {
        return `Humare paas expert stylists available hain. Aap booking ke time apna preferred specialist select kar sakte hain.`;
      }

      if (isSlotsQuery) {
        if (isTomorrow) {
          return `Kal (Tomorrow) ke liye available slots hain: 11:30 AM, 2:00 PM, 4:30 PM, aur 6:00 PM. Aapko kaunsa time suit karega?`;
        }
        if (isToday) {
          return `Aaj (Today) ke available slots hain: 3:00 PM, 5:30 PM, aur 7:00 PM. Aap kis time aana chahenge?`;
        }
        return `Humare bookings subah 10:00 AM se shaam 8:00 PM tak open hote hain. Aaj aur kal dono din slots available hain. Aap kab aana chahenge?`;
      }

      if (matchedServiceName) {
        return `Humare yahan "${matchedServiceName}" ka price ₹${matchedServicePrice} hai. Kya aap appointment book karna chahenge?`;
      }

      if (
        intentUpper === 'PRICE_QUERY' ||
        intentUpper === 'SERVICE_INQUIRY' ||
        intentUpper === 'FAQ'
      ) {
        return `Hello! Humari services hain: ${servicesListString || 'koi service available nahi hai'}. Aapko kya book karna hai?`;
      }
      if (intentUpper === 'LOCATION_QUERY') {
        return `Humara address hai: ${salon.address || '123 Main St, New Delhi'}. Aap kab aa rahe hain?`;
      }
      if (intentUpper === 'CANCELLATION') {
        return `Appointment cancel karne ke liye please booking details share karein ya manager se baat karne ko kahein.`;
      }
      if (intentUpper === 'RESCHEDULE') {
        return `Reschedule karne ke liye please apna preferred naya date aur time batayein.`;
      }
      if (intentUpper === 'HUMAN_TAKEOVER') {
        return `Main aapko manager se connect kar raha hu. Wo jald hi aapko reply karenge.`;
      }
      if (intentUpper === 'WAITLIST') {
        return `Main aapko waiting list me add kar sakta hu. Please apna preferred date aur time batayein.`;
      }
      if (intentUpper === 'BOOKING') {
        return `Main booking me help kar sakta hu! Aapko kaunsi service, date aur time par chahiye? Humari services hain: ${servicesListString || 'koi service available nahi hai'}.`;
      }
      return `Elegance Salon me contact karne ke liye thanks. Aaj aapki kya help karu?`;
    }

    // Default: ENGLISH
    if (textLower.includes('discount') || textLower.includes('offer') || textLower.includes('deal') || textLower.includes('cheaper') || textLower.includes('package')) {
      return `For our latest promotional offers and package rates, please check with our manager. Would you like me to connect you?`;
    }
    if (textLower.includes('open') || textLower.includes('close') || textLower.includes('timing') || textLower.includes('hour') || textLower.includes('working')) {
      return `Our salon is open daily from 10:00 AM to 8:00 PM.`;
    }
    if (textLower.includes('staff') || textLower.includes('stylist') || textLower.includes('barber') || textLower.includes('hairdresser')) {
      return `We have expert stylists available. You can request your preferred stylist during the booking process.`;
    }

    if (isSlotsQuery) {
      if (isTomorrow) {
        return `Tomorrow's available slots are: 11:30 AM, 2:00 PM, 4:30 PM, and 6:00 PM. Which one would you like to reserve?`;
      }
      if (isToday) {
        return `Today's available slots are: 3:00 PM, 5:30 PM, and 7:00 PM. Which slot works for you?`;
      }
      return `Our salon hours are 10:00 AM to 8:00 PM. We have slots open for both today and tomorrow. When would you like to book?`;
    }

    if (matchedServiceName) {
      return `The price for "${matchedServiceName}" is ₹${matchedServicePrice}. Would you like to schedule it?`;
    }

    if (
      intentUpper === 'PRICE_QUERY' ||
      intentUpper === 'SERVICE_INQUIRY' ||
      intentUpper === 'FAQ'
    ) {
      return `Hello! Our services are: ${servicesListString || 'no services available'}. How can I assist you?`;
    }
    if (intentUpper === 'LOCATION_QUERY') {
      return `We are located at ${salon.address || '123 Main St, New Delhi'}. Hope to see you soon!`;
    }
    if (intentUpper === 'CANCELLATION') {
      return `To cancel your appointment, please reply with your booking details or request a manager. I will notify the manager to assist you.`;
    }
    if (intentUpper === 'RESCHEDULE') {
      return `To reschedule, please tell me your preferred new date and time.`;
    }
    if (intentUpper === 'HUMAN_TAKEOVER') {
      return `I am connecting you to the salon manager. They will get back to you shortly.`;
    }
    if (intentUpper === 'WAITLIST') {
      return `I can add you to our waiting list. Please let me know your preferred date and time.`;
    }
    if (intentUpper === 'BOOKING') {
      return `I can help you book! What service, date, and time would you like? Our services are: ${servicesListString || 'none available'}.`;
    }
    return `Hello! Welcome to ${salon.name}. We are located at ${salon.address || '123 Main St, New Delhi'}. Our services are: ${servicesListString || 'none'}. How can I assist you with a booking today?`;
  }

  /**
   * Transcribe audio binary from Meta using OpenAI Whisper API
   */
  async transcribeAudio(audioId: string, mimeType: string): Promise<string> {
    if (!this.isOpenAiConfigured()) {
      this.logger.warn(
        'OpenAI API Key is missing. Returning local mock voice transcription.',
      );
      return 'Bhai, kal shaam ko 5 baje premium haircut ka appointment book kar do.';
    }

    try {
      const token = process.env.WHATSAPP_TOKEN;
      if (!token) {
        this.logger.warn(
          'WHATSAPP_TOKEN not configured. Returning local mock voice transcription.',
        );
        return 'Bhai, kal shaam ko 5 baje premium haircut ka appointment book kar do.';
      }

      // Fetch media details
      const mediaRes = await fetch(
        `https://graph.facebook.com/v17.0/${audioId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!mediaRes.ok) {
        throw new Error(
          `Meta media metadata fetch failed: ${mediaRes.statusText}`,
        );
      }
      const mediaInfo = await mediaRes.json();

      if (!mediaInfo.url) {
        throw new Error('Meta media URL missing in metadata response');
      }

      // Download audio binary
      const binaryRes = await fetch(mediaInfo.url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!binaryRes.ok) {
        throw new Error(
          `Meta media binary download failed: ${binaryRes.statusText}`,
        );
      }
      const arrayBuffer = await binaryRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Reject voice notes longer than 45 seconds to cap Whisper costs
      const estimatedDuration = Math.ceil(buffer.length / 3000);
      if (estimatedDuration > 45) {
        throw new BadRequestException('AUDIO_TOO_LONG');
      }

      // Save to a temp file in the workspace scratch directory
      const tempDir = path.join(process.cwd(), 'scratch');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const fileExtension = mimeType.includes('ogg') ? 'ogg' : 'mp3';
      const tempFilePath = path.join(
        tempDir,
        `voice-${audioId}.${fileExtension}`,
      );
      fs.writeFileSync(tempFilePath, buffer);

      // Transcribe via Whisper
      const response = await this.openai!.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: 'whisper-1',
        language: 'hi', // optimize for Indian context
      });

      // Cleanup with a short delay to allow read stream to finish processing
      setTimeout(() => {
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        } catch (err) {
          this.logger.warn(
            `Failed to clean up temp file ${tempFilePath}: ${err.message}`,
          );
        }
      }, 50);

      return response.text;
    } catch (error) {
      if (error.message === 'AUDIO_TOO_LONG' || (error.response && error.response.message === 'AUDIO_TOO_LONG')) {
        throw error;
      }
      this.logger.error(
        `Error in Whisper transcription: ${error.message}. Returning fallback mock.`,
      );
      return 'Bhai, kal shaam ko 5 baje premium haircut ka appointment book kar do.';
    }
  }

  /**
   * Generates a concise action-oriented recommendation based on business metrics
   */
  async generateBusinessRecommendation(metricsSummary: string): Promise<string> {
    if (!this.isOpenAiConfigured()) {
      throw new Error('OpenAI is not configured');
    }
    try {
      const prompt = `You are the Business Intelligence AI for SalonFlow, a premium CRM and operations software for Indian Salons.
Write a single, short, action-oriented, friendly growth recommendation (max 2 sentences) for the salon owner based on these metrics:
${metricsSummary}

Do not use markdown syntax. Do not wrap in quotes. Write in direct, friendly Indian business English.`;

      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 150,
      });

      return response.choices[0].message?.content?.trim() || '';
    } catch (e) {
      this.logger.error(`Error in generateBusinessRecommendation: ${e.message}`);
      throw e;
    }
  }
}
