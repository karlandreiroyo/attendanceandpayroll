export const getSessionUserProfile = () => {
  const firstName = sessionStorage.getItem('firstName') || '';
  const lastName = sessionStorage.getItem('lastName') || '';
  const username = sessionStorage.getItem('username') || '';
  const profilePicture = sessionStorage.getItem('profilePicture') || '';

  const displayName = firstName && lastName
    ? `${firstName} ${lastName}`
    : username || 'Admin User';

  const initials = (() => {
    if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
    if (firstName) return firstName[0].toUpperCase();
    if (lastName) return lastName[0].toUpperCase();
    if (username) return username[0].toUpperCase();
    return 'AU';
  })();

  return {
    firstName,
    lastName,
    username,
    profilePicture,
    displayName,
    initials,
  };
};

export const subscribeToProfileUpdates = (callback) => {
  const handler = () => callback(getSessionUserProfile());
  window.addEventListener('profile-updated', handler);
  return () => window.removeEventListener('profile-updated', handler);
};

export const notifyProfileUpdated = () => {
  window.dispatchEvent(new Event('profile-updated'));
};

