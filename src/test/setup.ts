import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Deterministic offline mode: unless a test explicitly stubs fetch, every
// network call rejects — so the store reliably settles into mock mode and
// no test ever touches a live backend.
vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline in tests"))));

afterEach(() => {
  cleanup();
});
