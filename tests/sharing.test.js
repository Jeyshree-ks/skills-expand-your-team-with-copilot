const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const vm = require("node:vm");

const source = readFileSync("src/static/sharing.js", "utf8");

function setup(navigator = {}) {
  const elements = new Map();
  const listeners = {};
  const document = {
    getElementById: (id) => elements.get(id),
    createElement(tag) {
      const classes = new Set();
      return {
        tag,
        children: [],
        attributes: {},
        listeners: {},
        classList: {
          add: (value) => classes.add(value),
          remove: (value) => classes.delete(value),
          contains: (value) => classes.has(value),
        },
        setAttribute(name, value) { this.attributes[name] = value; },
        appendChild(child) { this.children.push(child); },
        append(...children) { this.children.push(...children); },
        addEventListener(name, handler) { this.listeners[name] = handler; },
        focus() { this.focused = true; },
        select() { this.selected = true; },
        scrollIntoView() { this.scrolled = true; },
      };
    },
  };
  const window = {
    location: {
      href: "https://school.example/static/index.html?unused=1#old",
      hash: "",
    },
    addEventListener: (name, handler) => { listeners[name] = handler; },
  };
  const errors = [];
  vm.runInNewContext(source, {
    window, document, navigator, URL, URLSearchParams,
    console: { error: (...args) => errors.push(args) },
  });
  return { sharing: window.activitySharing, window, document, elements, listeners, errors };
}

const name = "Art & Chess / #1 + Friends";
const description = "Create & learn!";
const schedule = "Monday, 3:00 PM";

test("social links preserve special characters and exclude unrelated page data", () => {
  const { sharing } = setup();
  const controls = sharing.createControls(name, description, schedule);
  assert.equal(controls.attributes["aria-label"], `Share ${name}`);
  const links = controls.children.filter((child) => child.tag === "a");
  assert.equal(links.length, 2);
  const whatsapp = new URL(links[0].href);
  const facebook = new URL(links[1].href);
  const sharedUrl = new URL(facebook.searchParams.get("u"));
  assert.equal(sharedUrl.search, "");
  assert.equal(new URLSearchParams(sharedUrl.hash.slice(1)).get("activity"), name);
  assert.equal(
    whatsapp.searchParams.get("text"),
    `${name}: ${description}\nSchedule: ${schedule}\n${sharedUrl.href}`
  );
  for (const link of links) {
    assert.equal(link.target, "_blank");
    assert.equal(link.rel, "noopener noreferrer");
  }
});

test("copy link confirms successful copying", async () => {
  let copied;
  const { sharing } = setup({ clipboard: { writeText: async (text) => { copied = text; } } });
  const controls = sharing.createControls(name, description, schedule);
  await controls.children.find((child) => child.textContent === "Copy link").listeners.click();
  assert.equal(new URLSearchParams(new URL(copied).hash.slice(1)).get("activity"), name);
  assert.equal(controls.children.find((child) => child.tag === "p").textContent, "Link copied!");
});

test("missing or denied clipboard access offers manual copying", async () => {
  for (const navigator of [
    {},
    { clipboard: { writeText: async () => { throw new Error("Permission denied"); } } },
  ]) {
    const { sharing } = setup(navigator);
    const controls = sharing.createControls(name, description, schedule);
    await controls.children.find((child) => child.textContent === "Copy link").listeners.click();
    const input = controls.children.find((child) => child.tag === "input");
    assert.equal(input.focused, true);
    assert.equal(input.selected, true);
    assert.equal(input.classList.contains("hidden"), false);
    assert.match(controls.children.find((child) => child.tag === "p").textContent, /copy the link below/);
  }
});

test("native sharing sends only public activity information", async () => {
  let payload;
  const { sharing } = setup({ share: async (data) => { payload = data; } });
  const controls = sharing.createControls(name, description, schedule);
  await controls.children.find((child) => child.textContent === "Share...").listeners.click();
  assert.deepEqual(Object.keys(payload).sort(), ["text", "title", "url"]);
  assert.equal(payload.text, `${name}: ${description}\nSchedule: ${schedule}`);
  assert.equal(payload.title, `${name} - Mergington High School`);
});

test("canceling native sharing is quiet; other failures show a useful message", async () => {
  for (const errorName of ["AbortError", "NotAllowedError"]) {
    const { sharing, errors } = setup({
      share: async () => { throw Object.assign(new Error("Share failed"), { name: errorName }); },
    });
    const controls = sharing.createControls(name, description, schedule);
    await controls.children.find((child) => child.textContent === "Share...").listeners.click();
    const status = controls.children.find((child) => child.tag === "p").textContent;
    assert.equal(Boolean(status), errorName !== "AbortError");
    assert.equal(errors.length, errorName === "AbortError" ? 0 : 1);
  }
});

test("shared links focus the correct activity once without stealing focus on refresh", () => {
  const { sharing, window, document, elements, listeners } = setup();
  const card = document.createElement("div");
  elements.set(sharing.activityId(name), card);
  window.location.hash = `#${new URLSearchParams({ activity: name })}`;
  sharing.focusSharedActivity();
  assert.equal(card.focused, true);
  assert.equal(card.scrolled, true);
  card.focused = false;
  sharing.focusSharedActivity();
  assert.equal(card.focused, false);
  listeners.hashchange();
  assert.equal(card.focused, true);
  window.location.hash = "#activity=Unknown";
  assert.doesNotThrow(() => sharing.focusSharedActivity());
});
