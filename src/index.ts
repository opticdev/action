import * as core from "@actions/core";
import { runAction } from "./action";

const token = core.getInput("token");
const eventName = process.env.GITHUB_EVENT_NAME;
const headRef = process.env.GITHUB_REF;

runAction(token, eventName, headRef)
  .then((exitCode) => {
    return process.exit(exitCode);
  })
  .catch(() => {
    return process.exit(1);
  });
