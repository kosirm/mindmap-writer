// mindscribble/quasar/src/core/services/viewAvailabilityManager.ts
import { subscriptionService } from './subscriptionService';
import type { ViewType } from '../types';

/**
 * Subscription plans and their enabled views
 */
const SUBSCRIPTION_PLANS = {
  free: {
    planLevel: 0,
    enabledViews: ['mindmap', 'writer', 'outline']
  },
  basic: {
    planLevel: 1,
    enabledViews: ['mindmap', 'writer', 'outline', 'kanban']
  },
  pro: {
    planLevel: 2,
    enabledViews: ['mindmap', 'writer', 'outline', 'kanban', 'timeline', 'circle-pack', 'sunburst']
  },
  enterprise: {
    planLevel: 3,
    enabledViews: ['mindmap', 'writer', 'outline', 'kanban', 'timeline', 'circle-pack', 'sunburst', 'treemap', 'd3-mindmap', 'd3-concept-map']
  }
};

/**
 * Manages view availability based on subscription
 */
export class ViewAvailabilityManager {
  /**
   * Check if a view is available for current subscription
   */
  async isViewAvailable(viewType: ViewType): Promise<boolean> {
    const subscription = await subscriptionService.getCurrentSubscription();
    const plan = SUBSCRIPTION_PLANS[subscription.currentPlan];

    return plan?.enabledViews.includes(viewType) || false;
  }

  /**
   * Get all available views for current subscription
   */
  async getAvailableViews(): Promise<ViewType[]> {
    const subscription = await subscriptionService.getCurrentSubscription();
    const plan = SUBSCRIPTION_PLANS[subscription.currentPlan];

    return (plan?.enabledViews || ['mindmap', 'writer', 'outline']) as ViewType[];
  }

  /**
   * Get unavailable views (for upsell prompts)
   */
  async getUnavailableViews(): Promise<ViewType[]> {
    const available = await this.getAvailableViews();
    const allViews: ViewType[] = ['mindmap', 'writer', 'outline', 'kanban', 'timeline', 'circle-pack', 'sunburst', 'treemap', 'd3-mindmap', 'd3-concept-map'];

    return allViews.filter(view => !available.includes(view));
  }

  /**
   * Get current subscription plan level
   */
  async getCurrentPlanLevel(): Promise<number> {
    const subscription = await subscriptionService.getCurrentSubscription();
    return subscription.planLevel;
  }

  /**
   * Check if user has access to enterprise features
   */
  async isEnterpriseUser(): Promise<boolean> {
    const planLevel = await this.getCurrentPlanLevel();
    return planLevel >= 3;
  }
}

// Singleton instance
export const viewAvailabilityManager = new ViewAvailabilityManager();
