import { headers } from "next/headers";

import { platformFrom } from "./platform";

/** "Approve with Face ID" on iPhone, "Approve with fingerprint" on Android. */
export async function approveLabel(): Promise<string> {
  const platform = platformFrom((await headers()).get("user-agent"));
  return platform === "android" ? "Approve with fingerprint" : "Approve with Face ID";
}
