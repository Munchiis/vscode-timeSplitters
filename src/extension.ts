import * as vscode from 'vscode';
import { GitService } from './services/gitService';
import { TimeTrackingService } from './services/timeTrackingService';

export function activate(context: vscode.ExtensionContext) {
	console.log('TimeSplitter is now active!');

	const gitService = new GitService();
	const timeTrackingService = new TimeTrackingService();

	// When the branch changes, update our time tracking
	gitService.onBranchChanged(branch => {
		// Stop tracking time on the previous branch
		timeTrackingService.stopTracking();

		// Start tracking time on the new branch
		timeTrackingService.startTracking(branch);

		vscode.window.showInformationMessage(`Switched to branch: ${branch}`);
	});

	// Start tracking on the current branch when the extension activates
	const currentBranch = gitService.getCurrentBranch();
	if (currentBranch) {
		timeTrackingService.startTracking(currentBranch);
	}

	context.subscriptions.push(
		vscode.Disposable.from(
			gitService,
			timeTrackingService
		)
	);
}

export function deactivate() { }
