import {
  addTier,
  bookTickets,
  cancelBooking,
  createEvent,
  createStore,
  findBookingByReference,
  joinWaitlist,
} from "../src/domain/inventory.js";
import { DomainError } from "../src/domain/errors.js";

const store = createStore();
const event = createEvent(store, { name: "Community Music Night" });
const tier = addTier(store, event.id, {
  name: "General admission",
  priceCents: 2500,
  capacity: 3,
});

const adaBooking = bookTickets(store, {
  eventId: event.id,
  tierId: tier.id,
  attendeeName: "Ada",
  quantity: 2,
});
console.log(`Ada booked ${adaBooking.quantity} of ${tier.capacity} seats.`);

try {
  bookTickets(store, {
    eventId: event.id,
    tierId: tier.id,
    attendeeName: "Bayo",
    quantity: 2,
  });
} catch (error) {
  if (!(error instanceof DomainError) || error.code !== "SOLD_OUT") throw error;
  console.log(`Bayo's request for 2 was refused: ${error.code} (1 seat left).`);
}

const chidiBooking = bookTickets(store, {
  eventId: event.id,
  tierId: tier.id,
  attendeeName: "Chidi",
  quantity: 1,
});
console.log("The event is now sold out.");

const firstInLine = joinWaitlist(store, {
  eventId: event.id,
  attendeeName: "Dara",
});
joinWaitlist(store, { eventId: event.id, attendeeName: "Efe" });
console.log("Dara and Efe joined the waitlist.");

const foundBooking = findBookingByReference(store, adaBooking.reference);
console.log(`Found Ada's booking by reference: ${foundBooking.reference}.`);

cancelBooking(store, adaBooking.id);
console.log("Ada cancelled and 2 seats were released.");
console.log(`Next in line: ${store.waitlists.get(event.id).dequeue().attendeeName}.`);
