import { convexTest } from "convex-test";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.*s");

export function getTestContext() {
  return convexTest(schema, modules);
}
