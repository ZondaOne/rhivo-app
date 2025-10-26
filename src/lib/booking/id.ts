import { customAlphabet } from 'nanoid';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const nanoid = customAlphabet(alphabet, 9);

/**
 * Generates a unique, human-readable booking ID.
 * @returns A booking ID in the format RHIVO-XXX-XXX.
 */
export function generateBookingId(): string {
  const id = nanoid();
  return `RHIVO-${id.substring(0, 3)}-${id.substring(3, 6)}-${id.substring(6, 9)}`;
}
