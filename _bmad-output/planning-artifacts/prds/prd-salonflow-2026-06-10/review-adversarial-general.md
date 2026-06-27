# Adversarial Quality Review — SalonFlow

## Overall verdict
The updated PRD introduces critical functional capabilities and cost controls, but leaves several operational edge cases unaddressed. Specifically, failure recovery for dynamic Stripe link generation, fallback behaviors when the daily conversation cap is reached during an active booking transaction, and client alerts for rejected long audio voice notes must be detailed to prevent a degraded customer experience.

## Findings

### High — Stripe Link API Failures (§ Requirement 7.1)
* **Risk**: If the Stripe API experiences latency or outage, the chatbot may fail to generate the checkout link. If unhandled, this could block the booking or cause the webhook to crash.
* *Fix*: Define a fallback mechanism where the booking is confirmed as "pay-at-salon" if the Stripe checkout link generation fails, and alert the staff dashboard of the payment generation failure.

### High — WhatsApp Conversation Cap Interruption (§ Section 3: Conversation Fee Guard)
* **Risk**: If a customer reaches the daily limit of 5 non-booking messages while they are in the middle of a live booking transaction, the chatbot may shut down before they can confirm.
* *Fix*: Exempt messages that contain active booking/FAQ intents from counting toward the 5-message non-booking daily cap, or gracefully transition to a human takeover request before silencing the bot.

### Medium — Whisper Length Rejection UX (§ Section 3: Whisper Audio Cost Cap)
* **Risk**: If a customer sends a 50-second voice note, it is rejected by the cost cap. If the chatbot simply ignores the message, the customer will assume the salon received the booking, leading to lost business and frustration.
* *Fix*: Send an automated WhatsApp notification back to the customer: *"We couldn't process your voice message because it is too long. Please type your request or send a shorter voice note (under 45 seconds)."*

### Medium — Multi-Staff Priority Conflicts (§ Requirement 7.2)
* **Risk**: Load-balancing stylists evenly might conflict with customer preferences (e.g., a customer requesting a specific stylist) or stylist schedule blocks.
* *Fix*: Clarify that explicit customer preferences for a specific stylist bypass the automatic load-balancer completely, and that load balancing only applies to unspecified assignments.
