export type AppEvent =
  | 'ERRAND_CREATED'
  | 'ERRAND_ACCEPTED'
  | 'RUNNER_ARRIVED_PICKUP'
  | 'TASK_STARTED'
  | 'RUNNER_EN_ROUTE_DESTINATION'
  | 'RUNNER_ARRIVED_DESTINATION'
  | 'ERRAND_COMPLETED'
  | 'ERRAND_CANCELLED'
  | 'DISPUTE_CREATED'
  | 'PAYMENT_SUCCESSFUL'
  | 'PAYMENT_FAILED'
  | 'REFUND_COMPLETED'
  | 'PAYOUT_COMPLETED'
  | 'WITHDRAWAL_FAILED'
  | 'ACCOUNT_VERIFIED'
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_REACTIVATED'
  | 'GUEST_TRACKING_CREATED';

export type NotificationPriority = 'INFORMATIONAL' | 'IMPORTANT' | 'URGENT' | 'CRITICAL';

export interface BaseEventPayload {
  errand_id?: string;
  runner_id?: string;
  student_id?: string;
  transaction_id?: string;
  title?: string;
  guest_name?: string;
  [key: string]: any;
}
