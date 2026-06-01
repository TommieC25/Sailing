export const ANNOUNCEMENT_AUDIENCES = [
  { value: 'all', label: 'All Users' },
  { value: 'owners', label: 'Skippers Only' },
  { value: 'crew', label: 'Crew Only' },
];

export function announcementAudienceLabel(audience) {
  return ANNOUNCEMENT_AUDIENCES.find((option) => option.value === audience)?.label || 'All Users';
}

export function canViewAnnouncement(announcement, profile) {
  if (profile?.role === 'admin') return true;

  const audience = announcement?.audience || 'all';
  if (audience === 'all') return true;
  if (audience === 'owners') return profile?.user_type === 'owner';
  if (audience === 'crew') return profile?.user_type === 'crew';
  return true;
}
