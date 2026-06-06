export const CURRENT_WAIVER_VERSION = '2026-06-05';

export const WAIVER_TEXT = `I acknowledge and confirm that I realize that sailing involves some level of risk. I assume full responsibility for any injury, loss, or damage that may come to myself or any other person, boat, equipment, dock or other property as the result of my use, negligence, violation of the rules or other actions which I may take or fail to take in conjunction with this activity / event. I further agree to hold Coconut Grove Sailing Club, its instructors and other personnel, US Sailing, their representatives, and the creators of this platform harmless for injuries to persons or damage to property.`;

export const hasAcceptedCurrentWaiver = (profile) =>
  Boolean(
    profile?.waiver_accepted_at &&
    profile?.waiver_version === CURRENT_WAIVER_VERSION
  );
