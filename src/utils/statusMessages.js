const statusText = {
  bug_reports: {
    open: 'pending',
    in_progress: 'in progress',
    resolved: 'resolved',
  },
  feature_requests: {
    pending: 'pending',
    in_development: 'in development',
    implemented: 'implemented',
  },
};

export function statusCourtesyMessage(kind, status) {
  const itemType = kind === 'bug_reports' ? 'bug report' : 'feature request';
  const readableStatus = statusText[kind]?.[status] || status?.replace(/_/g, ' ') || 'updated';

  return `Just to let you know: your ${itemType} is ${readableStatus}.\n\nThanks for "keeping us on-course" with the SailAway App for CGSC!`;
}

export function shouldSendCourtesyStatus(kind, status) {
  if (kind === 'bug_reports') return status === 'resolved';
  if (kind === 'feature_requests') return ['pending', 'in_development', 'implemented'].includes(status);
  return false;
}
