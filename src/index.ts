import * as core from "@actions/core";
import { runAction } from "./action";

const opticToken = core.getInput("optic_token");
const githubToken = core.getInput("github_token");
const eventName = process.env.GITHUB_EVENT_NAME;
const headRef = process.env.GITHUB_REF;
const baseRef = process.env.GITHUB_BASE_REF;
const owner = process.env.GITHUB_REPOSITORY_OWNER;
const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
const sha = process.env.GITHUB_SHA;

runAction(
  opticToken,
  githubToken,
  eventName,
  headRef,
  baseRef,
  owner,
  repo,
  sha
)
  .then((exitCode) => {
    return process.exit(exitCode);
  })
  .catch(() => {
    return process.exit(1);
  });
