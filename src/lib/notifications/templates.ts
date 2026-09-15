import { AppEvent, BaseEventPayload, NotificationPriority } from './vocabulary';

export interface RenderedTemplate {
  title: string;
  bodyText: string;
  html: string;
  priority: NotificationPriority;
  isTransactional: boolean;
}

export function renderTemplate(eventType: AppEvent, payload: BaseEventPayload): RenderedTemplate {
  switch (eventType) {
    case 'ERRAND_ACCEPTED':
      return {
        title: 'Runner accepted your errand',
        bodyText: `Your request "${payload.title || 'Errand'}" has been accepted.`,
        html: `<p>Good news! Your request <strong>${payload.title || 'Errand'}</strong> has been accepted by a runner.</p>`,
        priority: 'IMPORTANT',
        isTransactional: true,
      };
      
    case 'ERRAND_COMPLETED':
      return {
        title: 'Errand Completed',
        bodyText: `Your errand "${payload.title || ''}" was successfully completed.`,
        html: `<p>Your errand <strong>${payload.title || ''}</strong> has been marked as complete.</p>`,
        priority: 'IMPORTANT',
        isTransactional: true,
      };

    case 'GUEST_TRACKING_CREATED':
      return {
        title: 'Delivery Update for Guest',
        bodyText: `Hello ${payload.guest_name}, someone initiated an ERRANDRUN delivery for you.`,
        html: `<p>Hello ${payload.guest_name},</p><p>An ERRANDRUN delivery has been initiated. You will receive tracking updates here.</p>`,
        priority: 'INFORMATIONAL',
        isTransactional: true,
      };

    case 'ACCOUNT_SUSPENDED':
      return {
        title: 'Account Suspended',
        bodyText: `Your ERRANDRUN account has been suspended by administration. Contact support.`,
        html: `<p>Your ERRANDRUN account has been suspended. Please contact support.</p>`,
        priority: 'CRITICAL',
        isTransactional: true,
      };

    default:
      return {
        title: 'Platform Update',
        bodyText: `You have a new update regarding your account.`,
        html: `<p>You have a new update regarding your ERRANDRUN account.</p>`,
        priority: 'INFORMATIONAL',
        isTransactional: false, // Optional by default if unknown
      };
  }
}
