import { hash, verify } from '@node-rs/argon2'

// Argon2id with the library's recommended defaults.
export function hashPassword(password: string) {
  return hash(password)
}

export function verifyPassword(passwordHash: string, password: string) {
  return verify(passwordHash, password)
}

// Used when the email is unknown, so a failed sign-in takes the same time either way
// and response times don't reveal which emails have accounts.
const DUMMY_HASH = hash('not-a-real-password')

export async function verifyDummy(password: string) {
  await verify(await DUMMY_HASH, password)
  return false
}
