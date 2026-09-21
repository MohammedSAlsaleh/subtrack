/**
 * trialNotifications.ts
 *
 * Schedules and cancels local notifications for free-trial end dates.
 * The notification fires 3 days before the trial ends so the user has
 * time to cancel before they're charged.
 *
 * Notification identifier format: `trial-<subscriptionId>`
 * This makes it easy to cancel a specific subscription's notification
 * without storing an opaque identifier elsewhere.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications are presented while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const DAYS_BEFORE = 3;

/**
 * Asks for notification permission.
 * Returns true if permission is granted (or was already granted).
 * On web this is always a no-op / returns true so callers stay simple.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedules a local notification for 3 days before the trial end date.
 * If a notification already exists for this subscription it is replaced.
 *
 * @param subscriptionId  The subscription's unique ID
 * @param subscriptionName  Display name shown in the notification body
 * @param trialEndsAt  ISO date string (YYYY-MM-DD) when the trial ends
 */
export async function scheduleTrialNotification(
  subscriptionId: string,
  subscriptionName: string,
  trialEndsAt: string,
): Promise<void> {
  if (Platform.OS === 'web') return;

  // Cancel any existing notification for this subscription first.
  await cancelTrialNotification(subscriptionId);

  const trialEnd = new Date(trialEndsAt);
  if (isNaN(trialEnd.getTime())) return;

  // Schedule notification for midnight (start of day) 3 days before trial end.
  const notifyAt = new Date(trialEnd);
  notifyAt.setDate(notifyAt.getDate() - DAYS_BEFORE);
  notifyAt.setHours(9, 0, 0, 0); // 9 AM on that day

  // Don't schedule if the notification date is already in the past.
  if (notifyAt <= new Date()) return;

  await Notifications.scheduleNotificationAsync({
    identifier: `trial-${subscriptionId}`,
    content: {
      title: 'Trial ending soon',
      body: `Your ${subscriptionName} trial ends in ${DAYS_BEFORE} days — cancel if you don't want to be charged`,
      sound: true,
      data: { subscriptionId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: notifyAt,
    },
  });
}

/**
 * Cancels the pending trial notification for a subscription, if any.
 */
export async function cancelTrialNotification(subscriptionId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(`trial-${subscriptionId}`);
  } catch {
    // Notification may not exist — that's fine.
  }
}
