export function getFriendlyDate(dateCreated: string, lastEdited?: string): string {
  const targetStr = lastEdited || dateCreated;
  if (!targetStr) return '';
  
  const targetDate = new Date(targetStr);
  if (isNaN(targetDate.getTime())) {
    return dateCreated || '';
  }

  const now = new Date();
  const diffMs = now.getTime() - targetDate.getTime();
  
  if (diffMs < 5000) {
    return 'Just now';
  }

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) {
    return 'Just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return minutes === 1 ? '1 min ago' : `${minutes} mins ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? '1 hr ago' : `${hours} hrs ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return days === 1 ? 'Yesterday' : `${days} days ago`;
  }

  // Fallback to formatted absolute date
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return targetDate.toLocaleDateString(undefined, options);
}
