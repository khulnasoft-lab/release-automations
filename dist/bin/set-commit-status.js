#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const arg_1 = __importDefault(require("arg"));
const __1 = require("../");
const args = arg_1.default({
    // repo info
    '--owner': String,
    '--repo': String,
    '--sha': String,
    // status info
    '--state': String,
    '--description': String,
    '--url': String,
    '--context': String,
});
if (!args['--owner']) {
    console.error('Missing --owner name');
    process.exit(1);
}
if (!args['--repo']) {
    console.error('Missing --repo name');
    process.exit(1);
}
if (!args['--sha']) {
    console.error('Missing --sha');
    process.exit(1);
}
function setCommitStatus() {
    return __awaiter(this, void 0, void 0, function* () {
        const params = __1.GitHub.getFromEnvironment();
        const gh = __1.GitHub.createGithubAppClient(params);
        const state = args['--state'] || __1.GitHub.StatusState.pending;
        yield __1.GitHub.setCommitStatus({
            owner: args['--owner'],
            repo: args['--repo'],
            sha: args['--sha'],
            context: args['--context'],
            description: args['--description'],
            targetUrl: args['--url'],
            state,
        }, gh);
    });
}
setCommitStatus().catch((e) => {
    console.error(e.message);
    process.exit(2);
});