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
  opticToken: string | undefined,
  githubToken: string,
  {
    additionalArgs,
    standardsFail,
    eventName,
    headRef,
    baseRef,
    owner,
    repo,
    sha,
    refName,
    compareFromPush,
    compareFromPr,
  }: {
    additionalArgs: string | undefined;
    standardsFail: string;
    eventName: string | undefined;
    headRef: string | undefined;
    baseRef: string | undefined;
    owner: string | undefined;
    repo: string | undefined;
    sha: string | undefined;
    refName: string | undefined;
    compareFromPush: string | undefined;
    compareFromPr: string | undefined;
  }
): Promise<number> {
  const failOnCheckError = standardsFail === "true";

  const valid = verifyInput(eventName, owner, repo);
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
    const fromBranch = compareFromPr || baseRef || "";
    const ref = await parseAndEnsureRef(fromBranch);

    if (!ref) {
      core.error(`Unable to fetch ${from}`);
      return 1;
    }
    from = ref;
  } else if (eventName === "push") {
    const fromBranch = compareFromPush || "HEAD~1";
    const ref = await parseAndEnsureRef(fromBranch);

    if (!ref) {
      core.error(`Unable to fetch ${from}`);
      return 1;
    }
    from = ref;
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
  eventName: string | undefined,
  owner: string | undefined,
  repo: string | undefined
): boolean {
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

async function parseAndEnsureRef(ref: string): Promise<string | false> {
  if (/^cloud:/i.test(ref)) {
    return ref;
  } else if (/^HEAD~/.test(ref)) {
    const headCountRaw = ref.replace(/^HEAD~/, "");
    if (!(await execCommand("git", ["fetch", `--deepen=${headCountRaw}`]))) {
      return false;
    }
    return ref;
  } else {
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
    return `origin/${ref}`;
  }
}

async function diffAll(
  token: string | undefined,
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
      ...(token ? ["--upload"] : []),
      ...(headTag ? ["--head-tag", headTag] : []),
      ...(additionalArgs ? [...additionalArgs.split(" ")] : []),
    ],
    {
      env: {
        ...process.env,
        ...(token ? { OPTIC_TOKEN: token }: {}),
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
