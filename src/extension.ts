import * as vscode from 'vscode';
import { GitService } from './services/gitService';
import { TimeTrackingService } from './services/timeTrackingService';
import { StorageService } from './services/storageService';
import { WebviewProvider } from './webview/webviewProvider';

export async function activate(context: vscode.ExtensionContext) {
	console.log('TimeSplitter is now active!');

	const gitService = new GitService();
	const storageService = new StorageService(context);
	const timeTrackingService = new TimeTrackingService();
	const webviewProvider = new WebviewProvider();
	await gitService.initialize();

	gitService.onBranchChanged(branch => {
		const currentEntry = timeTrackingService.getCurrentEntry();
		if (currentEntry) {
			timeTrackingService.stopTracking();
			storageService.addTimeEntry(currentEntry);
		}

		timeTrackingService.startTracking(branch);
		vscode.window.showInformationMessage(`Switched to branch: ${branch}`);
	});

	context.subscriptions.push(
		vscode.commands.registerCommand('timesplitter.checkBranch', () => {
			const currentBranch = gitService.getCurrentBranch();
			vscode.window.showInformationMessage(`Current branch: ${currentBranch || 'unknown'}`);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('timesplitter.startTracking', () => {
			const currentBranch = gitService.getCurrentBranch();
			if (currentBranch) {
				timeTrackingService.startTracking(currentBranch);
				vscode.window.showInformationMessage(`Started tracking time on branch: ${currentBranch}`);
			} else {
				vscode.window.showWarningMessage('No Git branch detected. Please open a Git repository.');
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('timesplitter.stopTracking', () => {
			const currentEntry = timeTrackingService.getCurrentEntry();
			if (currentEntry) {
				timeTrackingService.stopTracking();
				storageService.addTimeEntry(currentEntry);
				vscode.window.showInformationMessage('Stopped time tracking.');
			} else {
				vscode.window.showInformationMessage('No active tracking session to stop.');
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('timesplitter.openDashboard', () => {
			const allEntries = [
				...storageService.getTimeEntries(),
				...(timeTrackingService.getCurrentEntry() ? [timeTrackingService.getCurrentEntry()] : [])
			];

			webviewProvider.showWebview(allEntries as any);
		})
	);

	const currentBranch = gitService.getCurrentBranch();
	if (currentBranch) {
		timeTrackingService.startTracking(currentBranch);
		console.log(`Started tracking time on branch: ${currentBranch}`);
	}

	context.subscriptions.push(
		vscode.Disposable.from(gitService),
		vscode.Disposable.from(timeTrackingService)
	);
}

export function deactivate() {
	console.log('TimeSplitter is now deactivated');
}
