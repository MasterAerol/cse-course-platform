export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 128

export const PASSWORD_REQUIREMENTS = [
  {
    id: 'password-length',
    label: `${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters`,
    test: (password: string) =>
      password.length >= PASSWORD_MIN_LENGTH &&
      password.length <= PASSWORD_MAX_LENGTH,
  },
  {
    id: 'password-uppercase',
    label: 'At least one uppercase letter',
    test: (password: string) => /[A-Z]/u.test(password),
  },
  {
    id: 'password-lowercase',
    label: 'At least one lowercase letter',
    test: (password: string) => /[a-z]/u.test(password),
  },
  {
    id: 'password-number',
    label: 'At least one number',
    test: (password: string) => /[0-9]/u.test(password),
  },
] as const
