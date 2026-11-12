# AI log

Every time you give an AI tool a significant prompt, add an entry. Three lines each.
"Nothing was wrong" is allowed, but it is rarely true. Your instructor will read this.

## Build 1

### Prompt 1: Build 1 prompt (docs/build-1.md)
- **What I asked: ** I asked AI chatbot to create events, ticket tiers, bookings with a capacity rule, a first-in-first-out waitlist, and fast lookup of a booking by its reference code. It runs in the terminal. No server, no database. By copying the AI instruction in docs/build-1.md
- **What came back:* It created scripts: benchmark-lookup.js, demo.js and src/domain: errors.js, ids.js, inventory.js, waitlistQueue.js (2)*
- **What was wrong (or "nothing"):* Nothing went wrong code ran successfully*

## Build 2

### Prompt 1: Build 2 prompt (docs/build-2.md)
- **What I asked:** search and filter events by text, city, date range and price; sort by date, price or availability using a merge sort; the backlog written as user stories; your first automated tests.
- **What came back:** A file called sorting.js, eventSearch.js was added to src\domain, a test file housing eventSearch.test.js, inventory.test.js and sorting.test.js was created to help test our code as we carry on
- **What was wrong (or "nothing"):** One of my code caught an error in line 103 "eventSearch.test.js" which was meant to help test "S05 filters available events and sorts with the most seats left first" which failed because the code in eventSearch.test was filtered wrongly.

### Prompt 2:
- **What I asked:** I will like my "npm test" output to come in the manner below for easy readablity of the result. The below reference has a better readability copy it structuring only "I asked it to structure my "npm test" output to match the prototype provided for benchmarking and easy readability
- **What came back:**  The missing event-search tests in test/eventSearch.test.js was added to match test prototype.
- **What was wrong (or "nothing"):** All went well

## Build 3

### Prompt 1: Build 3 prompt (docs/build-3.md)
- **What I asked:** Add the architecture diagrams, booking state machine, HTTP router and server, configuration, start script and tests.
- **What came back:** Added the requested docs, modules, script and tests.
- **What was wrong (or "nothing"):** 
