import { DomainError } from "./errors.js";
import { newId, newReference } from "./ids.js";
import { Queue } from "./waitlistQueue.js";

const fail = (message, code = "VALIDATION") => {
  throw new DomainError(message, code);
};

function requireRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object.`);
  }
}

function requireText(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${label} must be a non-empty string.`);
  }
  return value.trim();
}

function requireInteger(value, label, minimum) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    fail(`${label} must be a whole number of at least ${minimum}.`);
  }
}

function getEvent(store, eventId) {
  const event = store.events.get(eventId);
  if (!event) fail(`Event "${eventId}" was not found.`, "NOT_FOUND");
  return event;
}

function getTier(event, tierId) {
  const tier = event.tiers.get(tierId);
  if (!tier) fail(`Ticket tier "${tierId}" was not found.`, "NOT_FOUND");
  return tier;
}

export function createStore() {
  return {
    events: new Map(),
    bookings: new Map(),
    bookingsByReference: new Map(),
    waitlists: new Map(),
  };
}

export function createEvent(store, details) {
  requireRecord(store, "Store");
  requireRecord(details, "Event details");
  if (!(store.events instanceof Map)) fail("Store is invalid.");

  const name = requireText(details.name, "Event name");
  const event = {
    id: newId(),
    name,
    tiers: new Map(),
  };

  store.events.set(event.id, event);
  return event;
}

export function addTier(store, eventId, details) {
  requireRecord(store, "Store");
  requireRecord(details, "Ticket tier details");
  if (!(store.events instanceof Map)) fail("Store is invalid.");

  const event = getEvent(store, eventId);
  const name = requireText(details.name, "Ticket tier name");
  requireInteger(details.priceCents, "Ticket price in cents", 0);
  requireInteger(details.capacity, "Ticket capacity", 1);

  const tier = {
    id: newId(),
    eventId: event.id,
    name,
    priceCents: details.priceCents,
    capacity: details.capacity,
    available: details.capacity,
  };

  event.tiers.set(tier.id, tier);
  return tier;
}

export function bookTickets(store, details) {
  requireRecord(store, "Store");
  requireRecord(details, "Booking details");
  if (
    !(store.events instanceof Map) ||
    !(store.bookings instanceof Map) ||
    !(store.bookingsByReference instanceof Map)
  ) {
    fail("Store is invalid.");
  }

  const attendeeName = requireText(details.attendeeName, "Attendee name");
  requireInteger(details.quantity, "Ticket quantity", 1);
  if (details.quantity > 10) fail("A booking cannot contain more than 10 tickets.");

  const event = getEvent(store, details.eventId);
  const tier = getTier(event, details.tierId);
  if (tier.available < details.quantity) {
    fail("There are not enough tickets available.", "SOLD_OUT");
  }

  let reference = newReference();
  while (store.bookingsByReference.has(reference)) {
    reference = newReference();
  }

  const booking = {
    id: newId(),
    reference,
    eventId: event.id,
    tierId: tier.id,
    attendeeName,
    quantity: details.quantity,
    totalCents: tier.priceCents * details.quantity,
    status: "confirmed",
  };

  if (!Number.isSafeInteger(booking.totalCents)) {
    fail("Booking total exceeds the supported whole-cent range.");
  }

  tier.available -= details.quantity;
  store.bookings.set(booking.id, booking);
  store.bookingsByReference.set(booking.reference, booking);
  return booking;
}

export function cancelBooking(store, bookingId) {
  requireRecord(store, "Store");
  if (
    !(store.events instanceof Map) ||
    !(store.bookings instanceof Map) ||
    !(store.bookingsByReference instanceof Map)
  ) {
    fail("Store is invalid.");
  }
  requireText(bookingId, "Booking id");

  const booking = store.bookings.get(bookingId);
  if (!booking) fail(`Booking "${bookingId}" was not found.`, "NOT_FOUND");
  if (booking.status !== "confirmed") {
    fail("This booking has already been cancelled.", "ALREADY_CANCELLED");
  }

  const event = getEvent(store, booking.eventId);
  const tier = getTier(event, booking.tierId);
  booking.status = "cancelled";
  tier.available += booking.quantity;
  return booking;
}

export function findBookingByReference(store, reference) {
  requireRecord(store, "Store");
  if (!(store.bookingsByReference instanceof Map)) fail("Store is invalid.");
  requireText(reference, "Booking reference");
  return store.bookingsByReference.get(reference) ?? null;
}

export function joinWaitlist(store, details) {
  requireRecord(store, "Store");
  requireRecord(details, "Waitlist details");
  if (!(store.events instanceof Map) || !(store.waitlists instanceof Map)) {
    fail("Store is invalid.");
  }

  const event = getEvent(store, details.eventId);
  const attendeeName = requireText(details.attendeeName, "Attendee name");
  let queue = store.waitlists.get(event.id);
  if (!queue) {
    queue = new Queue();
    store.waitlists.set(event.id, queue);
  }

  const entry = { eventId: event.id, attendeeName };
  queue.enqueue(entry);
  return entry;
}
