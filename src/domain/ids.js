import { randomBytes, randomUUID } from "node:crypto";

const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const REFERENCE_LENGTH = 8;
const MAX_ACCEPTED_BYTE = Math.floor(256 / REFERENCE_ALPHABET.length) * REFERENCE_ALPHABET.length;

export function newId() {
  return randomUUID();
}

export function newReference() {
  let reference = "";

  while (reference.length < REFERENCE_LENGTH) {
    for (const byte of randomBytes(REFERENCE_LENGTH)) {
      if (byte < MAX_ACCEPTED_BYTE) {
        reference += REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length];
        if (reference.length === REFERENCE_LENGTH) break;
      }
    }
  }

  return reference;
}
