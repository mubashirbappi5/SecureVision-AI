import { DetectionEvent } from "@securevision/shared-types";

// In a real production system, this would use AWS SES, SendGrid, Twilio, etc.
// For Phase 3, we build the interface and mock the transport layer.

export interface NotificationProvider {
  name: string;
  sendAlert(event: DetectionEvent): Promise<boolean>;
}

class EmailNotificationProvider implements NotificationProvider {
  name = "MockEmailProvider";

  async sendAlert(event: DetectionEvent): Promise<boolean> {
    console.log(`\n=================================================`);
    console.log(`[ALERT] 🚨 CRITICAL THREAT DETECTED 🚨`);
    console.log(`=================================================`);
    console.log(`Sending Email Notification to Administrators...`);
    console.log(`Camera ID: ${event.camera_id}`);
    console.log(`Time: ${new Date(event.timestamp).toLocaleString()}`);
    console.log(`Threat Type: ${event.event_type.toUpperCase()}`);
    console.log(`Confidence: ${Math.round(event.confidence * 100)}%`);
    console.log(`=================================================\n`);
    
    // Simulate network delay for email sending
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
  }
}

export class NotificationEngine {
  private providers: NotificationProvider[] = [];

  constructor() {
    // Register active providers
    this.providers.push(new EmailNotificationProvider());
  }

  async processEvent(event: DetectionEvent) {
    // Determine if the event warrants an alert
    // For example, confidence > 85% and severity is high/critical
    
    // We'll alert on any high confidence detection for Phase 3 testing
    if (event.confidence > 0.85) {
      console.log(`[NotificationEngine] High confidence threat evaluated. Dispatching alerts...`);
      
      const promises = this.providers.map(provider => 
        provider.sendAlert(event).catch(err => {
          console.error(`[NotificationEngine] Provider ${provider.name} failed:`, err);
        })
      );

      // We do not await promises directly in the main thread request cycle 
      // if we want to fire-and-forget, but for logging clarity here we can await.
      await Promise.all(promises);
    }
  }
}

// Export singleton instance
export const notificationEngine = new NotificationEngine();
