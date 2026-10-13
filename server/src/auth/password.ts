import { hash, verify } from '@node-rs/argon2'

// Argon2id with the library's recommended defaults.
export function hashPassword(password: string) {
  return hash(password)
}

// False for accounts without a usable password (e.g. host accounts before the admin sets one).
export async function verifyPassword(passwordHash: string, password: string) {
  try {
    return await verify(passwordHash, password)
  } catch {
    return false
  }
}

// Used when the email is unknown, so a failed sign-in takes the same time either way
// and response times don't reveal which emails have accounts.
const DUMMY_HASH = hash('not-a-real-password')

export async function verifyDummy(password: string) {
  await verify(await DUMMY_HASH, password)
  return false
}
