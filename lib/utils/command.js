"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const github_action_helper_1 = require("@technote-space/github-action-helper");
const core_1 = require("@actions/core");
const misc_1 = require("./misc");
const { getWorkspace, getArrayInput, useNpm } = github_action_helper_1.Utils;
const helper = new github_action_helper_1.GitHelper(new github_action_helper_1.Logger(misc_1.replaceDirectory), { filter: (line) => misc_1.filterGitStatus(line) && misc_1.filterExtension(line) });
exports.clone = (logger, context) => __awaiter(void 0, void 0, void 0, function* () {
    logger.startProcess('Cloning from the remote repo...');
    yield helper.cloneBranch(getWorkspace(), misc_1.getPrHeadRef(context), context);
    yield helper.runCommand(getWorkspace(), ['ls -la']);
});
exports.checkBranch = (logger, context) => __awaiter(void 0, void 0, void 0, function* () {
    const branchName = misc_1.getPrHeadRef(context);
    const clonedBranch = yield helper.getCurrentBranchName(getWorkspace());
    if (branchName !== clonedBranch) {
        logger.info('remote branch [%s] not found.', branchName);
        logger.info('now branch: %s', clonedBranch);
        logger.startProcess('Initializing local git repo [%s]', branchName);
        yield helper.createBranch(getWorkspace(), branchName);
    }
});
const getClearPackageCommands = () => {
    if (misc_1.isDisabledDeletePackage()) {
        return [];
    }
    return [
        'rm -f package.json',
        'rm -f package-lock.json',
        'rm -f yarn.lock',
    ];
};
const getGlobalInstallPackagesCommands = (workDir) => {
    const packages = getArrayInput('GLOBAL_INSTALL_PACKAGES');
    if (packages.length) {
        if (useNpm(workDir, core_1.getInput('PACKAGE_MANAGER'))) {
            return [
                'sudo npm install -g ' + packages.join(' '),
            ];
        }
        else {
            return [
                'sudo yarn global add ' + packages.join(' '),
            ];
        }
    }
    return [];
};
const getInstallPackagesCommands = (workDir) => {
    const packages = getArrayInput('INSTALL_PACKAGES');
    if (packages.length) {
        if (useNpm(workDir, core_1.getInput('PACKAGE_MANAGER'))) {
            return [
                'npm install --save ' + packages.join(' '),
            ];
        }
        else {
            return [
                'yarn add ' + packages.join(' '),
            ];
        }
    }
    return [];
};
const normalizeCommand = (command) => command.trim().replace(/\s{2,}/g, ' ');
const getExecuteCommands = () => getArrayInput('EXECUTE_COMMANDS', true, '&&').map(normalizeCommand);
exports.getDiff = (logger) => __awaiter(void 0, void 0, void 0, function* () {
    logger.startProcess('Checking diff...');
    yield helper.runCommand(getWorkspace(), ['git add --all']);
    return yield helper.getDiff(getWorkspace());
});
const initDirectory = () => __awaiter(void 0, void 0, void 0, function* () {
    yield helper.runCommand(getWorkspace(), ['rm -rdf ./*']);
    fs_1.default.mkdirSync(getWorkspace(), { recursive: true });
});
exports.getChangedFiles = (logger, context) => __awaiter(void 0, void 0, void 0, function* () {
    logger.startProcess('Running commands and getting changed files...');
    yield initDirectory();
    yield exports.clone(logger, context);
    yield exports.checkBranch(logger, context);
    const commands = new Array().concat.apply([], [
        getClearPackageCommands(),
        getGlobalInstallPackagesCommands(getWorkspace()),
        getInstallPackagesCommands(getWorkspace()),
        getExecuteCommands(),
    ]);
    logger.startProcess('Running commands...');
    const output = yield helper.runCommand(getWorkspace(), commands);
    const files = yield exports.getDiff(logger);
    return {
        files,
        output,
    };
});