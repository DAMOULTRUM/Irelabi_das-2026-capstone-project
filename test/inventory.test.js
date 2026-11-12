import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { DomainError } from "../src/domain/errors.js";
import {
  addTier,
  bookTickets,
  cancelBooking,
  createEvent,
  createStore,
  joinWaitlist,
  listEventSummaries,
  publishEvent,
  unpublishEvent,
} from "../src/domain/inventory.js";

function eventDetails(overrides = {}) {
  return {
    title: "Lagos Tech Meetup",
    city: "Lagos",
    venue: "Civic Center",
    date: "2026-12-05T17:00:00",
    ...overrides,
  };
}

function createEventWithTier(store, details = eventDetails(), tierDetails = {}) {
  const event = createEvent(store, details);
  const tier = addTier(store, event.id, {
    name: "General",
    priceCents: 5000,
    capacity: 3,
    ...tierDetails,
  });
  return { event, tier };
}

function assertDomainCode(action, code) {
  assert.throws(action, (error) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.code, code);
    return true;
  });
}

describe("inventory", () => {
  describe("creating events and tiers", () => {
    test("S02 creates a valid event as a draft with an id, hidden from the public list", () => {
      const store = createStore();
      const event = createEvent(store, eventDetails());

      assert.ok(event.id);
      assert.equal(event.title, "Lagos Tech Meetup");
      assert.equal(event.city, "Lagos");
      assert.equal(event.venue, "Civic Center");
      assert.equal(event.date, "2026-12-05T17:00:00");
      assert.equal(event.status, "draft");
      assert.deepEqual(listEventSummaries(store), []);
    });

    test("S02 rejects missing required information and invalid dates without saving", () => {
      const store = createStore();
      for (const details of [
        eventDetails({ title: "" }),
        eventDetails({ city: "" }),
        eventDetails({ venue: "" }),
        eventDetails({ date: "2026-02-30" }),
      ]) {
        assertDomainCode(() => createEvent(store, details), "VALIDATION");
        assert.equal(store.events.size, 0);
      }
    });

    test("S03 adds a tier with zero sold and full capacity available", () => {
      const store = createStore();
      const event = createEvent(store, eventDetails());
      const tier = addTier(store, event.id, {
        name: "General",
        priceCents: 500000,
        capacity: 100,
      });

      assert.equal(tier.name, "General");
      assert.equal(tier.priceCents, 500000);
      assert.equal(tier.capacity, 100);
      assert.equal(tier.sold, 0);
      assert.equal(tier.available, 100);
    });

    test("S03 rejects fractional prices and capacities below one", () => {
      const store = createStore();
      const event = createEvent(store, eventDetails());

      assertDomainCode(
        () => addTier(store, event.id, { name: "Fractional", priceCents: 1.5, capacity: 1 }),
        "VALIDATION",
      );
      assertDomainCode(
        () => addTier(store, event.id, { name: "No seats", priceCents: 500, capacity: 0 }),
        "VALIDATION",
      );
      assert.equal(event.tiers.size, 0);
    });

    test("S03 rejects an unknown event when adding a tier", () => {
      assertDomainCode(
        () =>
          addTier(createStore(), "missing-event", {
            name: "General",
            priceCents: 500,
            capacity: 1,
          }),
        "NOT_FOUND",
      );
    });

    test("S04 publishes an event and adds it to the public list", () => {
      const store = createStore();
      const { event } = createEventWithTier(store);

      const published = publishEvent(store, event.id);
      assert.equal(published.status, "published");
      assert.deepEqual(
        listEventSummaries(store).map((summary) => summary.id),
        [event.id],
      );
    });

    test("S04 unpublishing changes status and removes the event from the public list", () => {
      const store = createStore();
      const { event } = createEventWithTier(store);
      publishEvent(store, event.id);

      const unpublished = unpublishEvent(store, event.id);
      assert.equal(unpublished.status, "unpublished");
      assert.deepEqual(listEventSummaries(store), []);
      assert.equal(listEventSummaries(store, { publishedOnly: false }).length, 1);
    });

    test("S04 publishing rejects an event with missing required information", () => {
      const store = createStore();
      const { event } = createEventWithTier(store);
      event.city = "";

      assertDomainCode(() => publishEvent(store, event.id), "VALIDATION");
      assert.equal(event.status, "draft");
    });

    test("S04 publishing returns the published event for a caller to confirm", () => {
      const store = createStore();
      const { event } = createEventWithTier(store);

      assert.equal(publishEvent(store, event.id), event);
      assert.equal(event.status, "published");
    });

    test("publishing without ticket tiers fails with INVALID_STATE", () => {
      const store = createStore();
      const event = createEvent(store, eventDetails());

      assertDomainCode(() => publishEvent(store, event.id), "INVALID_STATE");
      assert.equal(event.status, "draft");
    });
  });

  describe("booking", () => {
    test("S06 creates a pending whole-cent booking and releases the correct inventory", () => {
      const store = createStore();
      const { event, tier } = createEventWithTier(store);
      publishEvent(store, event.id);

      const booking = bookTickets(store, {
        eventId: event.id,
        tierId: tier.id,
        attendeeName: "Ada",
        quantity: 2,
      });
      assert.equal(booking.status, "pending");
      assert.equal(booking.quantity, 2);
      assert.equal(booking.totalCents, 10000);
      assert.equal(tier.available, 1);
      assert.equal(tier.sold, 2);

      cancelBooking(store, booking.id);
      assert.equal(tier.available, 3);
      assert.equal(tier.sold, 0);
    });

    test("S06 rejects an oversold booking without changing inventory or bookings", () => {
      const store = createStore();
      const { event, tier } = createEventWithTier(store, eventDetails(), { capacity: 1 });
      const originalTier = { ...tier };

      assertDomainCode(
        () =>
          bookTickets(store, {
            eventId: event.id,
            tierId: tier.id,
            attendeeName: "Ada",
            quantity: 2,
          }),
        "SOLD_OUT",
      );
      assert.deepEqual(tier, originalTier);
      assert.equal(store.bookings.size, 0);
    });

    test("S06 rejects zero, negative, fractional and over-limit quantities", () => {
      const store = createStore();
      const { event, tier } = createEventWithTier(store);

      for (const quantity of [0, -1, 1.5, 11]) {
        assertDomainCode(
          () =>
            bookTickets(store, {
              eventId: event.id,
              tierId: tier.id,
              attendeeName: "Ada",
              quantity,
            }),
          "VALIDATION",
        );
      }
      assert.equal(tier.available, tier.capacity);
      assert.equal(store.bookings.size, 0);
    });
  });

  describe("cancelling", () => {
    test("S06 does not allow an already cancelled booking to release seats twice", () => {
      const store = createStore();
      const { event, tier } = createEventWithTier(store);
      publishEvent(store, event.id);
      const booking = bookTickets(store, {
        eventId: event.id,
        tierId: tier.id,
        attendeeName: "Ada",
        quantity: 1,
      });

      cancelBooking(store, booking.id);
      assertDomainCode(() => cancelBooking(store, booking.id), "ALREADY_CANCELLED");
      assert.equal(tier.available, tier.capacity);
    });

    test("a second cancellation reports ALREADY_CANCELLED", () => {
      const store = createStore();
      const { event, tier } = createEventWithTier(store);
      const booking = bookTickets(store, {
        eventId: event.id,
        tierId: tier.id,
        attendeeName: "Ada",
        quantity: 1,
      });

      cancelBooking(store, booking.id);
      assertDomainCode(() => cancelBooking(store, booking.id), "ALREADY_CANCELLED");
    });
  });

  describe("waitlist", () => {
    test("adds attendees to the event waitlist", () => {
      const store = createStore();
      const event = createEvent(store, eventDetails());

      const ada = joinWaitlist(store, { eventId: event.id, attendeeName: "Ada" });
      const queue = store.waitlists.get(event.id);

      assert.deepEqual(ada, { eventId: event.id, attendeeName: "Ada" });
      assert.equal(queue.size, 1);
    });

    test("keeps waitlist entries in first-come, first-served order", () => {
      const store = createStore();
      const event = createEvent(store, eventDetails());

      joinWaitlist(store, { eventId: event.id, attendeeName: "Chidi" });
      joinWaitlist(store, { eventId: event.id, attendeeName: "Dayo" });

      const queue = store.waitlists.get(event.id);
      assert.equal(queue.dequeue().attendeeName, "Chidi");
      assert.equal(queue.dequeue().attendeeName, "Dayo");
      assert.equal(queue.size, 0);
    });
  });
});
