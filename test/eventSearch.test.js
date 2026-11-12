import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { DomainError } from "../src/domain/errors.js";
import { addTier, createEvent, createStore, listEventSummaries, publishEvent } from "../src/domain/inventory.js";
import { filterEvents, searchEvents, sortEvents } from "../src/domain/eventSearch.js";

const events = [
  {
    id: "lagos-tech",
    title: "Lagos Tech Meetup",
    city: "Lagos",
    venue: "Civic Center",
    date: "2026-12-05T17:00:00",
    tiers: [{ priceCents: 5000, available: 0 }],
  },
  {
    id: "abuja-jazz",
    title: "Abuja Jazz Night",
    city: "Abuja",
    venue: "Jazz Hall",
    date: "2026-12-05T12:00:00",
    tiers: [{ priceCents: 3000, available: 4 }],
  },
  {
    id: "lagos-art",
    title: "Lagos Art Fair",
    city: "Lagos",
    venue: "Gallery",
    date: "2026-12-06",
    tiers: [{ priceCents: 7000, available: 2 }],
  },
  {
    id: "free-event",
    title: "Open Community Day",
    city: "Lagos",
    venue: "Town Square",
    date: "2026-12-07",
    tiers: [],
  },
];

function assertValidation(action) {
  assert.throws(action, (error) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.code, "VALIDATION");
    return true;
  });
}

describe("event search", () => {
  test("hides drafts from the public list", () => {
    const store = createStore();
    const draft = createEvent(store, {
      title: "Draft Event",
      city: "Lagos",
      venue: "Hidden Hall",
      date: "2026-12-05T18:00:00",
    });
    const published = createEvent(store, {
      title: "Published Event",
      city: "Abuja",
      venue: "Open Hall",
      date: "2026-12-06T18:00:00",
    });
    addTier(store, published.id, { name: "General", priceCents: 2500, capacity: 10 });
    publishEvent(store, published.id);

    assert.deepEqual(
      listEventSummaries(store).map((summary) => summary.id),
      [published.id],
    );
    assert.equal(draft.status, "draft");
  });

  test("summarises price and seats across tiers", () => {
    const store = createStore();
    const event = createEvent(store, {
      title: "Multi Tier Event",
      city: "Kano",
      venue: "Main Arena",
      date: "2026-12-08T19:00:00",
    });
    const standard = addTier(store, event.id, { name: "Standard", priceCents: 5000, capacity: 4 });
    const vip = addTier(store, event.id, { name: "VIP", priceCents: 15000, capacity: 2 });
    publishEvent(store, event.id);

    const [summary] = listEventSummaries(store);
    assert.equal(summary.id, event.id);
    assert.equal(summary.status, "published");
    assert.deepEqual(
      summary.tiers.map((tier) => ({ name: tier.name, priceCents: tier.priceCents, available: tier.available, sold: tier.sold })),
      [
        { name: standard.name, priceCents: standard.priceCents, available: standard.available, sold: standard.sold },
        { name: vip.name, priceCents: vip.priceCents, available: vip.available, sold: vip.sold },
      ],
    );
  });

  describe("filtering", () => {
    test("S05 searches title or venue without case sensitivity", () => {
      assert.deepEqual(
        filterEvents(events, { q: "JAZZ" }).map((event) => event.id),
        ["abuja-jazz"],
      );
      assert.deepEqual(
        filterEvents(events, { q: "CIVIC" }).map((event) => event.id),
        ["lagos-tech"],
      );
    });

    test("S05 filters by exact city ignoring letter case", () => {
      assert.deepEqual(
        filterEvents(events, { city: "lagos" }).map((event) => event.id),
        ["lagos-tech", "lagos-art", "free-event"],
      );
    });

    test("S05 filters by cheapest tier price and sorts cheapest first", () => {
      const matching = filterEvents(events, { maxPriceCents: 5000 });
      assert.deepEqual(
        sortEvents(matching, "price").map((event) => event.id),
        ["abuja-jazz", "lagos-tech"],
      );
      assert.ok(!matching.some((event) => event.id === "free-event"));
    });

    test("S05 includes an event late on the date-only upper bound", () => {
      assert.deepEqual(
        filterEvents(events, { to: "2026-12-05" }).map((event) => event.id),
        ["lagos-tech", "abuja-jazz"],
      );
    });

    test("S05 rejects invalid dates, fractional prices and unknown sort options", () => {
      assertValidation(() => filterEvents(events, { from: "2026-02-30" }));
      assertValidation(() => filterEvents(events, { to: "not-a-date" }));
      assertValidation(() => filterEvents(events, { maxPriceCents: 500.5 }));
      assertValidation(() => sortEvents(events, "rating"));
    });

    test("S05 filters available events and sorts with the most seats left first", () => {
      assert.deepEqual(
        filterEvents(events, { onlyAvailable: true }).map((event) => event.id),
        ["abuja-jazz", "lagos-art"],
      );
      assert.deepEqual(
        sortEvents(events, "availability").map((event) => event.id),
        ["abuja-jazz", "lagos-art", "lagos-tech", "free-event"],
      );
    });

    test("search, filtering and sorting return new lists without changing the source", () => {
      const original = structuredClone(events);
      const filtered = filterEvents(events, { city: "lagos" });
      const sorted = sortEvents(events, "price");
      const searched = searchEvents(events, { q: "lagos" }, "date");

      assert.notStrictEqual(filtered, events);
      assert.notStrictEqual(sorted, events);
      assert.notStrictEqual(searched, events);
      assert.deepEqual(events, original);
    });

    test("filtering and sorting empty lists return new empty lists", () => {
      const empty = [];
      const filtered = filterEvents(empty);
      const sorted = sortEvents(empty, "date");
      const searched = searchEvents(empty, {}, "price");

      assert.deepEqual(filtered, []);
      assert.deepEqual(sorted, []);
      assert.deepEqual(searched, []);
      assert.notStrictEqual(filtered, empty);
      assert.notStrictEqual(sorted, empty);
    });
  });

  describe("sorting", () => {
    test("by date (default), earliest first", () => {
      const sameDate = [
        { id: "z", title: "Bravo", date: "2026-12-05", tiers: [] },
        { id: "b", title: "Alpha", date: "2026-12-05", tiers: [] },
        { id: "a", title: "Alpha", date: "2026-12-05", tiers: [] },
      ];

      assert.deepEqual(
        sortEvents(sameDate, "date").map((event) => event.id),
        ["a", "b", "z"],
      );
    });

    test("by price, cheapest first", () => {
      assert.deepEqual(
        sortEvents(events, "price").map((event) => event.id),
        ["abuja-jazz", "lagos-tech", "lagos-art", "free-event"],
      );
    });

    test("by availability, most seats first", () => {
      assert.deepEqual(
        sortEvents(events, "availability").map((event) => event.id),
        ["abuja-jazz", "lagos-art", "lagos-tech", "free-event"],
      );
    });

    test("does not change the input and rejects unknown sort keys", () => {
      const original = structuredClone(events);
      const sorted = sortEvents(events, "price");

      assert.notStrictEqual(sorted, events);
      assert.deepEqual(events, original);
      assertValidation(() => sortEvents(events, "rating"));
    });
  });

  test("searchEvents filters then sorts", () => {
    assert.deepEqual(
      searchEvents(events, { q: "lagos" }, "date").map((event) => event.id),
      ["lagos-tech", "lagos-art"],
    );
  });
});
