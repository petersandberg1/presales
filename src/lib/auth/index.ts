import type { AuthProvider } from "./types";
import { SimpleUserPassProvider } from "./simpleProvider";

// Sen: byt implementation här till M365/SSO utan att röra UI/tester lika mycket.
export function getAuthProvider(): AuthProvider {
  return new SimpleUserPassProvider();
}