import { performance } from "node:perf_hooks";

const BOOKING_COUNT = 100_000;
const LOOKUP_COUNT = 500;
const bookings = Array.from({ length: BOOKING_COUNT }, (_, index) => ({
  reference: `BOOKING-${index}`,
}));
const bookingsByReference = new Map(
  bookings.map((booking) => [booking.reference, booking]),
);
const references = Array.from(
  { length: LOOKUP_COUNT },
  (_, index) => bookings[Math.floor((index * BOOKING_COUNT) / LOOKUP_COUNT)].reference,
);

let result;
const arrayStart = performance.now();
for (const reference of references) {
  result = bookings.find((booking) => booking.reference === reference);
}
const arrayMilliseconds = performance.now() - arrayStart;

const mapStart = performance.now();
for (const reference of references) {
  result = bookingsByReference.get(reference);
}
const mapMilliseconds = performance.now() - mapStart;

if (!result) throw new Error("Benchmark lookup did not find a booking.");

console.log(`Array.find: ${arrayMilliseconds.toFixed(3)} ms`);
console.log(`Map.get:    ${mapMilliseconds.toFixed(3)} ms`);
