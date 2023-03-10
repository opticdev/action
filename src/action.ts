import * as core from "@actions/core";
import * as exec from "@actions/exec";

async function execCommand(
  command: string,
  args: string[],
  options: exec.ExecOptions = {},
  logError = true
): Promise<boolean> {
  try {
    await exec.exec(command, args, options);
    return true;
  } catch (e) {
    if (e instanceof Error && logError) {
      core.error(e);
    }

    return false;
  }
}

export async function runAction(
  opticToken: string,
  githubToken: string,
  additionalArgs: string | undefined,
  standardsFail: string,
  eventName: string | undefined,
  headRef: string | undefined,
  baseRef: string | undefined,
  owner: string | undefined,
  repo: string | undefined,
  sha: string | undefined,
  refName: string | undefined
): Promise<number> {
  const failOnCheckError = standardsFail === "true";

  const valid = verifyInput(opticToken, eventName, owner, repo);
  if (!valid) {
    return 1;
  }

  let pr = "";
  if (eventName === "pull_request") {
    const prFromRef = headRef?.split("/")[2];
    if (!prFromRef) {
      core.error("Could not read PR number from ref");
      return 1;
    }

    pr = prFromRef;
  }

  const installed = await install();
  if (!installed) {
    return 1;
  }

  let from = "";
  if (eventName === "pull_request") {
    const fromBranch = baseRef || "";
    from = `origin/${fromBranch}`;

    if (!(await ensureRef(fromBranch))) {
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

  const headTag: string | undefined = refName
    ? `gitbranch:${refName}`
    : undefined;

  const comparisonRun = await diffAll(
    opticToken,
    from,
    additionalArgs,
    headTag
  );

  if (eventName === "pull_request") {
    const commentResult = await prComment(
      githubToken,
      owner || "",
      repo || "",
      pr || "",
      sha || ""
    );
    if (!commentResult) {
      return 1;
    }
  }

  if (!comparisonRun) {
    return failOnCheckError ? 1 : 0;
  }

  return 0;
}

function verifyInput(
  token: string,
  eventName: string | undefined,
  owner: string | undefined,
  repo: string | undefined
): boolean {
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

  if (!owner) {
    core.error(
      "Repository owner is required but was not retreived from the environment"
    );
    return false;
  }

  if (!repo) {
    core.error("Repo is required but was not retreived from the environment");
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

async function diffAll(
  token: string,
  from: string,
  additionalArgs: string | undefined,
  headTag: string | undefined
): Promise<boolean> {
  core.info("Running Optic diff-all");

  return execCommand(
    "optic",
    [
      "diff-all",
      "--compare-from",
      from,
      "--check",
      "--upload",
      ...(headTag ? ["--head-tag", headTag] : []),
      ...(additionalArgs ? [additionalArgs] : []),
    ],
    {
      env: {
        ...process.env,
        OPTIC_TOKEN: token,
      },
    },
    false
  );
}

async function prComment(
  githubToken: string,
  owner: string,
  repo: string,
  pr: string,
  sha: string
): Promise<boolean> {
  core.info("Commenting on PR");

  return execCommand(
    "optic",
    [
      "ci",
      "comment",
      "--provider",
      "github",
      "--owner",
      owner,
      "--repo",
      repo,
      "--pull-request",
      pr,
      "--sha",
      sha,
    ],
    {
      env: {
        ...process.env,
        GITHUB_TOKEN: githubToken,
      },
    }
  );
}
