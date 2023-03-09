import * as core from "@actions/core";
import { runAction } from "./action";

const opticToken = core.getInput("optic_token");
const githubToken = core.getInput("github_token");
const standardsFail = core.getInput("standards_fail");
const additionalArgs = core.getInput("additional_args");

const eventName = process.env.GITHUB_EVENT_NAME;
const headRef = process.env.GITHUB_REF;
const baseRef = process.env.GITHUB_BASE_REF;
const refName = process.env.GITHUB_REF_NAME;
const owner = process.env.GITHUB_REPOSITORY_OWNER;
const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
const sha = process.env.GITHUB_SHA;

runAction(
  opticToken,
  githubToken,
  additionalArgs,
  standardsFail,
  eventName,
  headRef,
  baseRef,
  owner,
  repo,
  sha,
  refName
)
  .then((exitCode) => {
    return process.exit(exitCode);
  })
  .catch(() => {
    return process.exit(1);
  });
