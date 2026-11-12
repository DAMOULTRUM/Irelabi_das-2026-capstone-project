import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { Queue } from "../src/domain/waitlistQueue.js";

describe("Queue", () => {
  test("returns items first in, first out", () => {
    const queue = new Queue();
    queue.enqueue("a");
    queue.enqueue("b");
    queue.enqueue("c");

    assert.equal(queue.dequeue(), "a");
    assert.equal(queue.dequeue(), "b");
    assert.equal(queue.dequeue(), "c");
  });

  test("tracks size and peeks without removing", () => {
    const queue = new Queue();
    assert.equal(queue.size, 0);
    assert.equal(queue.peek(), undefined);

    queue.enqueue(1);
    queue.enqueue(2);
    assert.equal(queue.size, 2);
    assert.equal(queue.peek(), 1);
    assert.equal(queue.size, 2);
  });

  test("returns undefined when empty and works again after emptying", () => {
    const queue = new Queue();
    assert.equal(queue.dequeue(), undefined);

    queue.enqueue("x");
    assert.equal(queue.dequeue(), "x");
    assert.equal(queue.dequeue(), undefined);

    queue.enqueue("y");
    assert.equal(queue.peek(), "y");
    assert.equal(queue.size, 1);
  });
});
