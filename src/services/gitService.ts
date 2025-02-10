import * as vscode from 'vscode';
import { getCurrentBranch } from './gitCommands';

export class GitService {
    private currentBranch: string | null = null;
    private checkInterval: NodeJS.Timeout | null = null;

    private _onBranchChanged = new vscode.EventEmitter<string>();
    public readonly onBranchChanged = this._onBranchChanged.event;

    constructor() {
        // When the service starts, check which branch we're on
        this.detectCurrentBranch();
        this.checkInterval = setInterval(() => this.detectCurrentBranch(), 30000);
    }

    // This method finds out which Git branch we're currently on
    public async detectCurrentBranch(): Promise<void> {
        try {
            // Get the root folder of the workspace
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                // If there's no workspace open, we can't check the branch
                return;
            }

            const rootPath = workspaceFolders[0].uri.fsPath;

            // Run the Git command to get the current branch name
            const branch = await getCurrentBranch(rootPath);

            if (branch !== this.currentBranch) {
                const oldBranch = this.currentBranch;
                this.currentBranch = branch;

                // only triggers after init run
                if (oldBranch !== null) {
                    this._onBranchChanged.fire(branch);
                }
            }
        } catch (error) {
            // the folder isn't a Git repo
            console.error('Error detecting git branch:', error);
        }
    }

    public getCurrentBranch(): string | null {
        return this.currentBranch;
    }

    public dispose(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}
