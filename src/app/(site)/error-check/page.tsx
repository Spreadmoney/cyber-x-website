import { notFound } from "next/navigation";
import { connection } from "next/server";

/**
 * Lets the phone tests see "Something went wrong" for real: with
 * ENABLE_ERROR_PAGE_CHECK=1 (test machines only) this page fails on purpose.
 * Everywhere else it doesn't exist.
 */
export default async function ErrorCheckPage() {
  await connection();
  if (process.env.ENABLE_ERROR_PAGE_CHECK !== "1") notFound();
  throw new Error("A planned failure, to check the error page.");
}
