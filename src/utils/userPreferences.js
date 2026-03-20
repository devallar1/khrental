const PREFERRED_LANGUAGE_KEY_PREFIX = 'kh_preferred_language_';

export const getPreferredLanguageStorageKey = (userId) => `${PREFERRED_LANGUAGE_KEY_PREFIX}${userId || 'anonymous'}`;

export const getStoredPreferredLanguage = (userId, fallback = 'en') => {
  if (typeof localStorage === 'undefined' || !userId) {
    return fallback;
  }

  const storedValue = localStorage.getItem(getPreferredLanguageStorageKey(userId));
  return storedValue || fallback;
};

export const setStoredPreferredLanguage = (userId, language) => {
  if (typeof localStorage === 'undefined' || !userId || !language) {
    return;
  }

  localStorage.setItem(getPreferredLanguageStorageKey(userId), language);
};
