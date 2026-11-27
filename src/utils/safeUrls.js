// Allowlists for third-party images. Anything that does not match is never
// requested, so no unknown host learns the viewer's IP address.

const parseHttpsUrl = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  try {
    const url = new URL(trimmedValue);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
};

const PRODUCT_IMAGE_HOSTS = new Set([
  'images.openfoodfacts.org',
  'static.openfoodfacts.org',
]);

const PRODUCT_IMAGE_HOST_SUFFIXES = ['.openfoodfacts.org', '.openfoodfacts.net'];

const AVATAR_HOST_SUFFIXES = ['.googleusercontent.com'];

export const isAllowedProductImageUrl = (value) => {
  const url = parseHttpsUrl(value);

  if (!url) {
    return false;
  }

  const hostname = url.hostname.toLowerCase();

  return PRODUCT_IMAGE_HOSTS.has(hostname)
    || PRODUCT_IMAGE_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
};

export const isAllowedAvatarUrl = (value) => {
  const url = parseHttpsUrl(value);

  if (!url) {
    return false;
  }

  const hostname = url.hostname.toLowerCase();

  return AVATAR_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
};
