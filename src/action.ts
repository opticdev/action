import * as core from "@actions/core";
import * as exec from "@actions/exec";

async function execCommand(
  ...args: Parameters<typeof exec.exec>
): Promise<boolean> {
  try {
    await exec.exec(...args);
    return true;
  } catch (e) {
    if (e instanceof Error) {
      core.error(e);
    }

    return false;
  }
}

export async function runAction(
  token: string,
  eventName: string | undefined,
  headRef: string | undefined
): Promise<number> {
  const valid = await verifyInput(token, eventName);
  if (!valid) {
    return 1;
  }

  const installed = await install();
  if (!installed) {
    return 1;
  }

  let from = "";
  if (eventName === "pull_request") {
    from = headRef || "";

    if (!(await ensureRef(from))) {
      core.error(`Unable to fetch ${from}`);
      return 1;
    }
  } else if (eventName === "push") {
    from = "HEAD~1";
    if (!(await deepen())) {
      core.error("Unable to fetch HEAD~1");
      return 1;
    }
  }

  if (from === "") {
    core.error("Unable to determine base for comparison.");
    return 1;
  }

  const comparisonRun = await diffAll(token, from);
  if (!comparisonRun) {
    return 1;
  }

  return 0;
}

async function verifyInput(
  token: string,
  eventName: string | undefined
): Promise<boolean> {
  if (!token) {
    core.error(
      "No token was provided. You can generate a token through our app at https://app.useoptic.com"
    );
    return false;
  }

  if (eventName !== "push" && eventName !== "pull_request") {
    core.error("Only 'push' and 'pull_request' events are supported.");
    return false;
  }

  return true;
}

async function install() {
  core.info("Installing optic");
  return execCommand("npm", [
    "install",
    "--location=global",
    "@useoptic/optic",
  ]);
}

async function ensureRef(ref: string): Promise<boolean> {
  if (
    !(await execCommand("git", [
      "fetch",
      "--no-tags",
      "--depth=1",
      "origin",
      ref,
    ]))
  ) {
    return false;
  }

  return true;
}

async function deepen(): Promise<boolean> {
  if (!(await execCommand("git", ["fetch", "--deepen=1"]))) {
    return false;
  }

  return true;
}

async function diffAll(token: string, from: string): Promise<boolean> {
  core.info("Running Optic diff-all");

  return execCommand("optic", ["diff-all", "--compare-from", from, "--check"], {
    env: {
      ...process.env,
      OPTIC_TOKEN: token,
    },
  });
}
