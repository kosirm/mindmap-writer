// mindscribble/quasar/src/core/services/subscriptionService.ts
import type { SubscriptionPlan, SubscriptionStatus } from '../types';

/**
 * Development user (hardcoded for now)
 */
export const DEV_USER = {
  userId: 'dev-milan-kosir',
  email: 'kosir.milan@gmail.com',
  currentPlan: 'pro' as SubscriptionPlan,
  planLevel: 2,
  status: 'active' as SubscriptionStatus,
  expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year from now
  previousPlans: []
};

/**
 * Mock subscription service for development
 *
 * TODO: Replace with real Supabase integration later
 */
export class SubscriptionService {
  /**
   * Get current subscription (mock)
   */
  async getCurrentSubscription() {
    // Simulate async operation with Promise.resolve
    return Promise.resolve(DEV_USER);
  }

  /**
   * Check if user has access to a specific plan level
   */
  async hasPlanLevel(requiredLevel: number): Promise<boolean> {
    const subscription = await this.getCurrentSubscription();
    return subscription.planLevel >= requiredLevel;
  }

  /**
   * Check if subscription is active
   */
  async isActive(): Promise<boolean> {
    const subscription = await this.getCurrentSubscription();
    return subscription.status === 'active' && subscription.expires > Date.now();
  }
}

// Singleton instance
export const subscriptionService = new SubscriptionService();
