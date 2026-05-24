export const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

export const formatLocalDate = (dateString, options) => {
  const date = parseLocalDate(dateString);
  if (!date) return '';
  return date.toLocaleDateString('en-US', options);
};

export const compactLocalDate = (dateString) => {
  const date = parseLocalDate(dateString);
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};
