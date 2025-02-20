import * as vscode from 'vscode';
import { API, GitExtension } from './git';

export class GitService {
    private currentBranch: string | undefined;
    private gitApi: API | undefined;
    private _onBranchChanged = new vscode.EventEmitter<string>();
    public readonly onBranchChanged = this._onBranchChanged.event;

    public async init() {
        // Get Git API and start branch detection
        const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
        if (gitExtension?.enabled) {
            this.gitApi = gitExtension.getAPI(1);
            await this.detectCurrentBranch();

            // Setup interval to check for branch changes (every 5 seconds)
            setInterval(() => this.detectCurrentBranch(), 5000);
        }
    }

    public async detectCurrentBranch(): Promise<void> {
        if (!this.gitApi || !this.gitApi.repositories.length) {
            return;
        }

        const branch = this.gitApi.repositories[0]?.state?.HEAD?.name;

        if (branch && branch !== this.currentBranch) {
            const oldBranch = this.currentBranch;
            this.currentBranch = branch;

            if (oldBranch !== undefined) {
                this._onBranchChanged.fire(branch);
            }
        }
    }

    get currentBranchName(): string | undefined {
        return this.currentBranch;
    }

    public dispose(): void {
        // Cleanup
    }
}
