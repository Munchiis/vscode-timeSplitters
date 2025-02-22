import * as vscode from 'vscode';
import { GitService } from './services/gitService';
import { TimeTrackingService } from './services/timeTrackingService';
import { StorageService } from './services/storageService';
import { WebviewProvider } from './webview/webviewProvider';
import { StatusBarService } from './services/statusBarService';

export async function activate(context: vscode.ExtensionContext) {
	console.log('TimeSplitter is now active!');

	const gitService = new GitService();
	const storageService = new StorageService(context);
	const timeTrackingService = new TimeTrackingService();
	const webviewProvider = new WebviewProvider(context.extensionPath);
	const statusBarService = new StatusBarService();

	let webviewRefreshTimer: NodeJS.Timeout | undefined;

	await gitService.init();

	// Auto-start tracking on the current branch
	setTimeout(() => autoStartTracking(), 5000);

	// Auto-handle branch changes
	gitService.onBranchChanged(branch => {
		// Stop tracking on previous branch and save
		if (timeTrackingService.getCurrentEntry()) {
			timeTrackingService.stopTracking();

			// Save the entries
			const currentEntries = timeTrackingService.getTimeEntries();
			currentEntries.forEach(entry => {
				if (!entry.endTime) {
					entry.endTime = Date.now();
					entry.isActive = false;
				}
				storageService.addTimeEntry(entry);
			});
		}

		// Start tracking on new branch
		timeTrackingService.startTracking(branch);
		statusBarService.startTracking(branch, 'active');

		// Update webview if open
		updateWebviewIfOpen();
	});

	// Watch for focus changes in the editor
	vscode.window.onDidChangeWindowState(e => {
		const currentEntry = timeTrackingService.getCurrentEntry();
		if (currentEntry) {
			statusBarService.updateTrackingType(e.focused ? 'active' : 'inactive');
		}
	});

	// Register dashboard command
	context.subscriptions.push(
		vscode.commands.registerCommand('timesplitter.openDashboard', () => {
			// Combine stored entries with current tracking session
			showDashboard();

			// Setup regular webview updates
			setupWebviewRefresh();
		})
	);

	// Register stop tracking command
	context.subscriptions.push(
		vscode.commands.registerCommand('timesplitter.stopTracking', () => {
			if (timeTrackingService.getCurrentEntry()) {
				timeTrackingService.stopTracking();
				statusBarService.stopTracking();

				// Save entries
				const entries = timeTrackingService.getTimeEntries();
				entries.forEach(entry => storageService.addTimeEntry(entry));

				vscode.window.showInformationMessage('Time tracking stopped');
			} else {
				vscode.window.showInformationMessage('No active tracking session to stop');
			}
		})
	);

	// Register start tracking command
	context.subscriptions.push(
		vscode.commands.registerCommand('timesplitter.startTracking', () => {
			const currentBranch = gitService.currentBranchName;
			if (currentBranch) {
				timeTrackingService.startTracking(currentBranch);
				statusBarService.startTracking(currentBranch, 'active');
				vscode.window.showInformationMessage(`Started tracking time on branch: ${currentBranch}`);
			} else {
				vscode.window.showWarningMessage('No Git branch detected. Please open a Git repository.');
			}
		})
	);

	// Setup webview refresh timer
	function setupWebviewRefresh() {
		// Clear any existing timer
		if (webviewRefreshTimer) {
			clearInterval(webviewRefreshTimer);
		}

		// Setup fresh timer - update every 5 seconds
		webviewRefreshTimer = setInterval(() => {
			updateWebviewIfOpen();
		}, 5000);
	}

	// Update webview data if it's open
	function updateWebviewIfOpen() {
		// Get all entries including the active one
		const allEntries = getAllEntries();
		webviewProvider.updateEntries(allEntries);
	}

	// Get all time entries from both storage and current tracking session
	function getAllEntries() {
		const storedEntries = storageService.getTimeEntries();
		const serviceEntries = timeTrackingService.getTimeEntries();
		const currentEntry = timeTrackingService.getCurrentEntry();

		const allEntries = [
			...storedEntries,
			...serviceEntries
		];

		// Add the current entry if active
		if (currentEntry) {
			allEntries.push(currentEntry);
		}

		return allEntries;
	}

	// Show the dashboard webview
	function showDashboard() {
		const allEntries = getAllEntries();
		webviewProvider.showWebview(allEntries);
	}

	// Auto-start tracking when extension activates
	function autoStartTracking() {
		const currentBranch = gitService.currentBranchName;
		if (currentBranch) {
			timeTrackingService.startTracking(currentBranch);
			statusBarService.startTracking(currentBranch, 'active');
			console.log(`Auto-started tracking on branch: ${currentBranch}`);
		} else {
			console.log('No branch detected for auto-start tracking');
		}
	}

	// Add all services to be disposed when extension deactivates
	context.subscriptions.push(
		vscode.Disposable.from(gitService),
		vscode.Disposable.from(timeTrackingService),
		vscode.Disposable.from(statusBarService),
		{
			dispose: () => {
				// Stop any active tracking
				if (timeTrackingService.getCurrentEntry()) {
					timeTrackingService.stopTracking();
				}

				// Save all unsaved entries to storage
				const entries = timeTrackingService.getTimeEntries();
				entries.forEach(entry => storageService.addTimeEntry(entry));

				// Clear refresh timer
				if (webviewRefreshTimer) {
					clearInterval(webviewRefreshTimer);
				}
			}
		}
	);
}

export function deactivate() {
	console.log('TimeSplitter is now deactivated');
}
