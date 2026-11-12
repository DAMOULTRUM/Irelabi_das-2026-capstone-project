import { DomainError } from "./errors.js";
import { mergeSort } from "./sorting.js";

const fail = (message) => {
  throw new DomainError(message, "VALIDATION");
};

const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

function parseIsoDate(value, label) {
  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) {
    fail(`${label} must be a valid ISO date.`);
  }

  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  const timestamp = Date.parse(value);
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day ||
    !Number.isFinite(timestamp)
  ) {
    fail(`${label} must be a valid ISO date.`);
  }
  return timestamp;
}

function getCheapestPrice(event) {
  if (!Array.isArray(event.tiers) || event.tiers.length === 0) return null;

  let cheapest = Infinity;
  for (const tier of event.tiers) {
    if (!Number.isSafeInteger(tier.priceCents) || tier.priceCents < 0) {
      fail("Ticket prices must be whole cents.");
    }
    cheapest = Math.min(cheapest, tier.priceCents);
  }
  return cheapest;
}

function seatsAvailable(event) {
  if (!Array.isArray(event.tiers)) return 0;
  return event.tiers.reduce((total, tier) => total + (tier.available ?? 0), 0);
}

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function compareTitleAndId(left, right) {
  return (
    compareText(left.title ?? "", right.title ?? "") ||
    compareText(left.id ?? "", right.id ?? "")
  );
}

export function filterEvents(summaries, criteria = {}) {
  if (!Array.isArray(summaries)) fail("Event summaries must be an array.");
  if (!criteria || typeof criteria !== "object" || Array.isArray(criteria)) {
    fail("Search criteria must be an object.");
  }

  const { q, city, from, to, maxPriceCents, onlyAvailable } = criteria;
  const fromTime = from === undefined ? null : parseIsoDate(from, "from");
  let toTime = to === undefined ? null : parseIsoDate(to, "to");
  if (toTime !== null && to.length === 10) toTime += 86400000 - 1;

  if (
    maxPriceCents !== undefined &&
    (!Number.isSafeInteger(maxPriceCents) || maxPriceCents < 0)
  ) {
    fail("Maximum price must be a non-negative whole number of cents.");
  }

  const query = q === undefined ? null : String(q).toLowerCase();
  const cityQuery = city === undefined ? null : String(city).toLowerCase();

  return summaries.filter((event) => {
    if (
      query !== null &&
      !`${event.title ?? ""} ${event.venue ?? ""}`.toLowerCase().includes(query)
    ) {
      return false;
    }
    if (cityQuery !== null && String(event.city ?? "").toLowerCase() !== cityQuery) {
      return false;
    }

    if (fromTime !== null || toTime !== null) {
      const eventTime = parseIsoDate(event.date, "Event date");
      if (fromTime !== null && eventTime < fromTime) return false;
      if (toTime !== null && eventTime > toTime) return false;
    }

    if (maxPriceCents !== undefined) {
      const cheapest = getCheapestPrice(event);
      if (cheapest === null || cheapest > maxPriceCents) return false;
    }
    if (onlyAvailable && seatsAvailable(event) <= 0) return false;
    return true;
  });
}

export function sortEvents(summaries, sortBy) {
  if (!Array.isArray(summaries)) fail("Event summaries must be an array.");
  if (!["date", "price", "availability"].includes(sortBy)) {
    fail(`Unknown event sort option "${sortBy}".`);
  }

  const compare = (left, right) => {
    let order = 0;
    if (sortBy === "date") {
      order = parseIsoDate(left.date, "Event date") - parseIsoDate(right.date, "Event date");
    } else if (sortBy === "price") {
      const leftPrice = getCheapestPrice(left);
      const rightPrice = getCheapestPrice(right);
      if (leftPrice === null || rightPrice === null) {
        order = leftPrice === rightPrice ? 0 : leftPrice === null ? 1 : -1;
      } else {
        order = leftPrice - rightPrice;
      }
    } else {
      order = seatsAvailable(right) - seatsAvailable(left);
    }
    return order || compareTitleAndId(left, right);
  };

  return mergeSort(summaries, compare);
}

export function searchEvents(summaries, criteria, sortBy) {
  return sortEvents(filterEvents(summaries, criteria), sortBy);
}
