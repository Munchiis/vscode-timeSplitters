import * as vscode from 'vscode';
import { GitService } from './services/gitService';
import { TimeTrackingService, TimeEntry } from './services/timeTrackingService';
import { StorageService } from './services/storageService';
import { WebviewProvider } from './webview/webviewProvider';

export async function activate(context: vscode.ExtensionContext) {
	console.log('TimeSplitter is now active!');

	const gitService = new GitService();
	const storageService = new StorageService(context);
	const timeTrackingService = new TimeTrackingService();
	const webviewProvider = new WebviewProvider();

	let webviewRefreshTimer: NodeJS.Timeout | undefined;

	await gitService.init();

	// Auto-start tracking on the current branch
	autoStartTracking();

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
				vscode.window.showInformationMessage(`Started tracking time on branch: ${currentBranch}`);
			} else {
				vscode.window.showWarningMessage('No Git branch detected. Please open a Git repository.');
			}
		})
	);

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

	function updateWebviewIfOpen() {
		// Get all entries including the active one
		const allEntries = getAllEntries();
		webviewProvider.updateEntries(allEntries);
	}

	function getAllEntries(): TimeEntry[] {
		const storedEntries = storageService.getTimeEntries();
		const serviceEntries = timeTrackingService.getTimeEntries();
		const currentEntry = timeTrackingService.getCurrentEntry();

		const allEntries = [
			...storedEntries,
			...serviceEntries
		];

		// Add the current entry if active
		if (currentEntry) {
			// Create a copy with current time for accurate duration
			const updatedCurrentEntry = {
				...currentEntry,
				// We'll let the webview calculate end time
			};

			allEntries.push(updatedCurrentEntry);
		}

		return allEntries;
	}

	function showDashboard() {
		const allEntries = getAllEntries();
		webviewProvider.showWebview(allEntries);
	}

	// Save data on extension deactivation
	context.subscriptions.push({
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
	});

	function autoStartTracking() {
		const currentBranch = gitService.currentBranchName;
		if (currentBranch) {
			// Start with the appropriate type based on window focus state
			timeTrackingService.startTracking(currentBranch);
			console.log(`Auto-started tracking on branch: ${currentBranch}`);
		}
	}
}

export function deactivate() {
	console.log('TimeSplitter is now deactivated');
}
