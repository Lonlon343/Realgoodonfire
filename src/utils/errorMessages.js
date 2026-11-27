// Turns a thrown error into text that is safe to show to the user.
// Only messages of our own validation errors (a plain `Error` without a
// `code`) are shown verbatim; Firebase and runtime errors get a German fallback.

export const LOGIN_REQUIRED_MESSAGE = 'Bitte melde dich an, um fortzufahren.';

export const isOwnValidationError = (error) => Boolean(
  error
  && Object.getPrototypeOf(error) === Error.prototype
  && !('code' in error)
  && typeof error.message === 'string'
  && error.message.trim()
);

export const getUserFacingErrorMessage = (error, fallback, loginMessage = LOGIN_REQUIRED_MESSAGE) => {
  if (error?.code === 'permission-denied') {
    return loginMessage;
  }

  if (isOwnValidationError(error)) {
    return error.message;
  }

  return fallback;
};
