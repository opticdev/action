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
const action_1 = require("../action");
const exec = __importStar(require("@actions/exec"));
jest.mock("@actions/exec");
test("invalid input", async () => {
    const exitCode = await (0, action_1.runAction)("token", "", "");
    expect(exitCode).toBe(1);
});
test("failed install", async () => {
    const assertInstall = mockFailedInstall();
    const exitCode = await (0, action_1.runAction)("token", "push", "refs/heads/main");
    expect(exitCode).toBe(1);
    assertInstall;
});
test("pull_request event", async () => {
    const ref = "refs/pulls/1/merge";
    const assertInstall = mockInstall();
    const assertEnsureRef = mockEnsureRef(ref);
    const assertDiffAll = mockDiffAll("token", ref);
    const exitCode = await (0, action_1.runAction)("token", "pull_request", ref);
    expect(exitCode).toBe(0);
    assertInstall();
    assertEnsureRef();
    assertDiffAll();
});
test("push event", async () => {
    const assertInstall = mockInstall();
    const assertDeepen = mockDeepen();
    const assertDiffAll = mockDiffAll("token", "HEAD~1");
    const exitCode = await (0, action_1.runAction)("token", "push", "refs/heads/main");
    expect(exitCode).toBe(0);
    assertInstall();
    assertDeepen();
    assertDiffAll();
});
function mockInstall() {
    jest.mocked(exec.exec).mockResolvedValueOnce(0);
    return () => expect(jest.mocked(exec.exec)).toHaveBeenCalledWith("npm", [
        "install",
        "--location=global",
        "@useoptic/optic",
    ]);
}
function mockFailedInstall() {
    jest.mocked(exec.exec).mockRejectedValue(new Error("Something broke"));
    return () => expect(jest.mocked(exec.exec)).toHaveBeenCalledWith("npm", [
        "install",
        "--location=global",
        "@useoptic/optic",
    ]);
}
function mockEnsureRef(ref) {
    jest.mocked(exec.exec).mockResolvedValueOnce(0);
    return () => expect(jest.mocked(exec.exec)).toHaveBeenCalledWith("git", [
        "fetch",
        "--no-tags",
        "--depth=1",
        "origin",
        ref,
    ]);
}
function mockDeepen() {
    jest.mocked(exec.exec).mockResolvedValueOnce(0);
    return () => expect(jest.mocked(exec.exec)).toHaveBeenCalledWith("git", [
        "fetch",
        "--deepen=1",
    ]);
}
function mockDiffAll(token, from) {
    jest.mocked(exec.exec).mockResolvedValueOnce(0);
    return () => expect(jest.mocked(exec.exec)).toHaveBeenCalledWith("optic", ["diff-all", "--compare-from", from, "--check"], expect.objectContaining({ env: expect.anything() }));
}
//# sourceMappingURL=action.test.js.map