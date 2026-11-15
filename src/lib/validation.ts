// Validación cliente — espejo de las reglas del backend (src/validation/auth.ts)

import type { RegisterInput } from '@/types/auth'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/

export function isValidPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  )
}

export function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(username)
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

export type RegisterFormErrors = Partial<Record<keyof RegisterInput | 'confirmar', string>>

export function validateRegisterForm(
  data: RegisterInput & { confirmar: string },
): RegisterFormErrors {
  const errors: RegisterFormErrors = {}

  if (!data.nombre.trim() || data.nombre.trim().length < 2) {
    errors.nombre = 'El nombre es requerido (mínimo 2 caracteres)'
  }

  if (!isValidUsername(data.username.trim())) {
    errors.username = 'El username debe tener 3-20 caracteres (letras, números, guiones bajos)'
  }

  if (!isValidEmail(data.email.trim())) {
    errors.email = 'El email no es válido'
  }

  if (!isValidPassword(data.password)) {
    errors.password = 'Mínimo 8 caracteres, 1 mayúscula, 1 minúscula y 1 número'
  }

  if (data.confirmar !== data.password) {
    errors.confirmar = 'Las contraseñas no coinciden'
  }

  return errors
}
