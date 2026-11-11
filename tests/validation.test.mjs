// Run with: npm test   (Node 22.18+ runs the .ts imports natively)
import test from "node:test";
import assert from "node:assert/strict";
import * as client from "../lib/validation.ts";
import * as server from "../supabase/functions/_shared/signup-validation.ts";

const emails = [
  ["you@example.com", true], ["  you@example.com  ", true], ["a.b+c@sub.example.co.in", true],
  ["", false], ["   ", false], ["plain", false], ["a@b", false], ["a@b.c", false], ["a b@example.com", false],
  ["@example.com", false], ["you@", false], [`${"a".repeat(250)}@x.com`, false],
];
const usernames = [
  ["ab", true], ["  Dr Shah  ", true], ["a", false], ["", false], ["   ", false],
  ["a".repeat(100), true], ["a".repeat(101), false], ["bad\nname", false], ["bad\u0000name", false],
];
const passwords = [
  ["12345678", true], ["a".repeat(72), true], ["a".repeat(73), false], ["1234567", false], ["", false],
  ["é".repeat(36), true], ["é".repeat(37), false], // 2 bytes each: 72 ok, 74 too long
];

for (const [value, ok] of emails) {
  test(`email ${JSON.stringify(value.slice(0, 20))} -> ${ok}`, () => {
    assert.equal(client.validateEmail(value) === "", ok);
    assert.equal(server.isValidEmail(value), ok);
  });
}
for (const [value, ok] of usernames) {
  test(`username ${JSON.stringify(value.slice(0, 20))} -> ${ok}`, () => {
    assert.equal(client.validateUsername(value) === "", ok);
    assert.equal(server.isValidUsername(value), ok);
  });
}
for (const [value, ok] of passwords) {
  test(`password len ${value.length} -> ${ok}`, () => {
    assert.equal(client.validateNewPassword(value) === "", ok);
    assert.equal(server.isValidNewPassword(value), ok);
  });
}
test("password confirmation", () => {
  assert.equal(client.validatePasswordConfirmation("abcdefgh", "abcdefgh"), "");
  assert.notEqual(client.validatePasswordConfirmation("abcdefgh", "abcdefgX"), "");
  assert.notEqual(client.validatePasswordConfirmation("abcdefgh", ""), "");
});
test("both copies share the same limits", () => {
  for (const k of ["EMAIL_MAX", "USERNAME_MIN", "USERNAME_MAX", "PASSWORD_MIN", "PASSWORD_MAX"]) assert.equal(client[k], server[k], k);
});
