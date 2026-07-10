// Local Mock Database for Offline Demo Mode

export interface SalonInfo {
  id: string;
  name: string;
  whatsappNumber: string;
  address: string;
  ownerName: string;
  isProfileComplete: boolean;
  aiPrompt: string;
  googleReviewLink: string;
  reviewDelayMins: number;
  rebookingAutoSend: boolean;
  whatsappPhoneNumberId?: string;
  whatsappAccessToken?: string;
  whatsappBusinessAccountId?: string;
  subscription: {
    plan: string;
    status: string;
    openaiUsageCost: number;
    whatsappUsageCost: number;
  };
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const getInitialMockDb = () => {
  return {
    salon: {
      id: "demo-salon-id",
      name: "Demo Salon Flow",
      whatsappNumber: "+918169775932",
      address: "123 Main St, Connaught Place, New Delhi",
      ownerName: "Demo Owner",
      isProfileComplete: true,
      aiPrompt: "You are a professional salon receptionist named Priya. Reply in friendly English or Hinglish to queries.",
      googleReviewLink: "https://g.page/r/demo-review-link",
      reviewDelayMins: 30,
      rebookingAutoSend: true,
      whatsappPhoneNumberId: "10928374829384",
      whatsappAccessToken: "eaagxx-demo-token-12345",
      whatsappBusinessAccountId: "2039482938482",
      subscription: {
        plan: "PRO",
        status: "ACTIVE",
        openaiUsageCost: 42.50,
        whatsappUsageCost: 30.00
      }
    } as SalonInfo,

    user: {
      id: "demo-user-id",
      name: "Demo Owner",
      email: "demo@salonflow.com",
      role: "OWNER"
    } as UserInfo,

    services: [
      { id: "s1", name: "Premium Haircut", durationMins: 45, price: 500 },
      { id: "s2", name: "Deep Tissue Massage", durationMins: 60, price: 1500 },
      { id: "s3", name: "Hair Spa & Treatment", durationMins: 60, price: 1200 },
      { id: "s4", name: "Beard Grooming & Styling", durationMins: 30, price: 350 },
      { id: "s5", name: "Hair Coloring (L'Oreal)", durationMins: 120, price: 2200 },
      { id: "s6", name: "Bridal Facials", durationMins: 90, price: 3500 }
    ],

    staff: [
      { id: "st1", name: "Amit Verma", role: "Senior Stylist", active: true },
      { id: "st2", name: "Neha Singh", role: "Therapist", active: true },
      { id: "st3", name: "Rohit Kumar", role: "Junior Stylist", active: true },
      { id: "st4", name: "Sneha Patel", role: "Esthetician", active: true }
    ],

    appointments: [
      { id: "a1", customerName: "Amit Verma", serviceName: "Premium Haircut", price: 500, time: "17:00", status: "Confirmed", staffName: "Amit Verma", date: new Date().toISOString().split('T')[0] },
      { id: "a2", customerName: "Neha Singh", serviceName: "Deep Tissue Massage", price: 1500, time: "18:30", status: "Confirmed", staffName: "Neha Singh", date: new Date().toISOString().split('T')[0] },
      { id: "a3", customerName: "Rohit Kumar", serviceName: "Beard Grooming & Styling", price: 350, time: "19:15", status: "Pending", staffName: "Rohit Kumar", date: new Date().toISOString().split('T')[0] },
      { id: "a4", customerName: "Sneha Patel", serviceName: "Hair Coloring Treatment", price: 2200, time: "20:00", status: "Confirmed", staffName: "Sneha Patel", date: new Date().toISOString().split('T')[0] }
    ],

    customers: [
      { id: "c1", name: "Amit Verma", phone: "+919876543210", visits: 12, totalSpend: 6200, lastVisit: "2026-06-30" },
      { id: "c2", name: "Neha Singh", phone: "+919812345678", visits: 5, totalSpend: 7500, lastVisit: "2026-07-02" },
      { id: "c3", name: "Rohit Kumar", phone: "+919911223344", visits: 2, totalSpend: 700, lastVisit: "2026-07-05" },
      { id: "c4", name: "Sneha Patel", phone: "+919898989898", visits: 8, totalSpend: 15400, lastVisit: "2026-06-25" },
      { id: "c5", name: "Rajesh Malhotra", phone: "+919717273747", visits: 15, totalSpend: 18500, lastVisit: "2026-07-01" }
    ],

    waitingList: [
      { 
        id: "w1", 
        priority: 1, 
        requestedStartTime: new Date().toISOString(), 
        notes: "Prefers Neha Singh if possible",
        status: "WAITING",
        customer: {
          name: "Vikram Sethi",
          phone: "+919654321098"
        },
        service: {
          name: "Hair Spa & Treatment"
        }
      },
      { 
        id: "w2", 
        priority: 2, 
        requestedStartTime: new Date().toISOString(), 
        notes: "Urgent",
        status: "WAITING",
        customer: {
          name: "Pooja Hegde",
          phone: "+919560123456"
        },
        service: {
          name: "Premium Haircut"
        }
      }
    ],

    voiceNotes: [
      { id: "vn1", customerName: "Karan Johar", durationSec: 15, text: "Hey Priya, can you book me a haircut for tonight around 8 PM with Amit?", status: "Processed", timestamp: "2026-07-06T11:05:00Z" },
      { id: "vn2", customerName: "Alia Bhatt", durationSec: 8, text: "Need to reschedule my hair coloring to Wednesday at 4 PM.", status: "Needs Review", timestamp: "2026-07-06T11:15:00Z" }
    ],

    reviews: [
      { id: "r1", customerName: "Rajesh Malhotra", rating: 5, comment: "Priya AI answered my Whatsapp in 5 seconds and booked my slot. Amazing experience!", channel: "WhatsApp", date: "2026-07-05" },
      { id: "r2", customerName: "Sneha Patel", rating: 4, comment: "Service was great, salon was clean. Rebooking prompt was helpful.", channel: "Google", date: "2026-06-25" }
    ],

    rebookingRules: [
      { id: "rr1", serviceName: "Premium Haircut", intervalWeeks: 4, messageTemplate: "Hi {{name}}! It has been 4 weeks since your last Premium Haircut. Would you like to book a slot for this week?" },
      { id: "rr2", serviceName: "Hair Coloring (L'Oreal)", intervalWeeks: 6, messageTemplate: "Hi {{name}}! Time to touch up your colors. Priya here, let me know if we should reserve your usual spot?" }
    ],

    rebookingRecommendations: [
      { id: "rc1", customerName: "Rajesh Malhotra", serviceName: "Premium Haircut", recommendedDate: "2026-07-10", lastServiceDate: "2026-06-12", status: "PENDING" },
      { id: "rc2", customerName: "Sneha Patel", serviceName: "Hair Coloring (L'Oreal)", recommendedDate: "2026-07-15", lastServiceDate: "2026-06-03", status: "PENDING" }
    ],

    conversations: [
      { id: "cv1", customerName: "Rajesh Malhotra", channel: "WhatsApp", lastMsg: "Thanks, see you then!", timestamp: "11:06 AM" },
      { id: "cv2", customerName: "Karan Johar", channel: "Instagram", lastMsg: "Can you check if Amit is free?", timestamp: "10:15 AM" }
    ],

    commissions: [
      { id: "cm1", staffName: "Amit Verma", totalSales: 8500, commissionEarned: 1700, rate: 20 },
      { id: "cm2", staffName: "Neha Singh", totalSales: 12000, commissionEarned: 1800, rate: 15 }
    ],

    drawerLogs: [
      { id: "dl1", type: "OPEN", amount: 2000, description: "Opening Cash", timestamp: "2026-07-06T09:00:00Z" }
    ],

    reports: [
      { id: "rep1", name: "Daily Operations Summary", type: "OPERATIONS", status: "COMPLETED", date: "2026-07-06" },
      { id: "rep2", name: "Monthly Financial Audit", type: "FINANCIAL", status: "COMPLETED", date: "2026-07-01" }
    ],

    metrics: {
      appointmentsCount: 184,
      totalRevenue: 148500,
      averageTicketValue: 807,
      aiConversionRate: 83.2,
      activeChannels: 2,
      missedCallsCount: 18,
      missedCallsRecovered: 14,
      commissionTotal: 3500,
      waitlistCount: 2
    },

    ucis: {
      totalUnifiedProfiles: 184,
      loyaltyScoreAverage: 88.5,
      predictedNoShowRate: 3.4,
      preferredChannelRatio: { whatsapp: 85, instagram: 15 }
    },

    staffUtilization: [
      { name: "Amit Verma", utilization: 82 },
      { name: "Neha Singh", utilization: 75 },
      { name: "Rohit Kumar", utilization: 50 },
      { name: "Sneha Patel", utilization: 68 }
    ],

    recoveryMetrics: {
      totalMissedCalls: 18,
      recoveredCount: 14,
      conversionRate: 77.7,
      estimatedRecoveredRevenue: 12400
    }
  };
};
