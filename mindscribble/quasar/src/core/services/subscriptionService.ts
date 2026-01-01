// mindpad/quasar/src/core/services/subscriptionService.ts
import type { SubscriptionPlan, SubscriptionStatus } from '../types';
import { useAppStore } from '../stores/appStore';

/**
 * Development user (hardcoded for now)
 */
export const DEV_USER = {
  userId: 'dev-milan-kosir',
  email: 'kosir.milan@gmail.com',
  currentPlan: 'enterprise' as SubscriptionPlan,
  planLevel: 3,
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
    const appStore = useAppStore();
    return Promise.resolve({
      ...DEV_USER,
      currentPlan: appStore.currentSubscriptionPlan,
      planLevel: this.getPlanLevel(appStore.currentSubscriptionPlan)
    });
  }

  /**
   * Set dev plan override for testing different subscription levels
   */
  setDevPlanOverride(plan: SubscriptionPlan | null) {
    const appStore = useAppStore();
    if (plan) {
      appStore.setSubscriptionPlan(plan);
    }
  }

  /**
   * Get plan level for a given plan name
   */
  private getPlanLevel(plan: SubscriptionPlan): number {
    const planLevels: Record<SubscriptionPlan, number> = {
      'free': 0,
      'basic': 1,
      'pro': 2,
      'enterprise': 3
    };
    return planLevels[plan];
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
