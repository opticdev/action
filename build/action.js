"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAction = void 0;
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
async function execCommand(...args) {
    try {
        await exec.exec(...args);
        return true;
    }
    catch (e) {
        if (e instanceof Error) {
            core.error(e);
        }
        return false;
    }
}
async function runAction(opticToken, githubToken, eventName, headRef, owner, repo, sha) {
    const valid = verifyInput(opticToken, eventName, owner, repo);
    if (!valid) {
        return 1;
    }
    let pr = "";
    if (eventName === "pull_request") {
        const prFromRef = headRef === null || headRef === void 0 ? void 0 : headRef.split("/")[2];
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
        from = headRef || "";
        if (!(await ensureRef(from))) {
            core.error(`Unable to fetch ${from}`);
            return 1;
        }
    }
    else if (eventName === "push") {
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
    const comparisonRun = await diffAll(opticToken, from);
    if (!comparisonRun) {
        return 1;
    }
    if (eventName === "pull_request") {
        const commentResult = await prComment(githubToken, owner || "", repo || "", pr || "", sha || "");
        if (!commentResult) {
            return 1;
        }
    }
    return 0;
}
exports.runAction = runAction;
function verifyInput(token, eventName, owner, repo) {
    if (!token) {
        core.error("No token was provided. You can generate a token through our app at https://app.useoptic.com");
        return false;
    }
    if (eventName !== "push" && eventName !== "pull_request") {
        core.error("Only 'push' and 'pull_request' events are supported.");
        return false;
    }
    if (!owner) {
        core.error("Repository owner is required but was not retreived from the environment");
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
async function ensureRef(ref) {
    if (!(await execCommand("git", [
        "fetch",
        "--no-tags",
        "--depth=1",
        "origin",
        ref,
    ]))) {
        return false;
    }
    return true;
}
async function deepen() {
    if (!(await execCommand("git", ["fetch", "--deepen=1"]))) {
        return false;
    }
    return true;
}
async function diffAll(token, from) {
    core.info("Running Optic diff-all");
    return execCommand("optic", ["diff-all", "--compare-from", from, "--check"], {
        env: Object.assign(Object.assign({}, process.env), { OPTIC_TOKEN: token }),
    });
}
async function prComment(githubToken, owner, repo, pr, sha) {
    core.info("Commenting on PR");
    return execCommand("optic", [
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
    ], {
        env: Object.assign(Object.assign({}, process.env), { GITHUB_TOKEN: githubToken }),
    });
}
//# sourceMappingURL=action.js.map