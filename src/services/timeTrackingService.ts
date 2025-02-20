import * as vscode from 'vscode';

export interface TimeEntry {
    branch: string;
    startTime: number;
    endTime: number | null;
    isActive: boolean;
    type: 'active' | 'inactive';
}

export class TimeTrackingService {
    private timeEntries: TimeEntry[] = [];
    private currentEntry: TimeEntry | null = null;
    private isEditorFocused: boolean = true; // Assume focused on start

    constructor() {
        // Track window focus state
        vscode.window.onDidChangeWindowState(e => {
            console.log(`Window focus changed: ${e.focused}`);
            if (e.focused !== this.isEditorFocused) {
                this.isEditorFocused = e.focused;
                this.handleFocusChange();
            }
        });
    }

    private handleFocusChange(): void {
        if (!this.currentEntry) { return; }

        const currentBranch = this.currentEntry.branch;

        console.log(`Focus change to ${this.isEditorFocused ? 'focused' : 'unfocused'} on branch ${currentBranch}`);

        // Stop the current entry
        this.stopTracking();

        // Start a new entry with the appropriate type
        this.startTracking(currentBranch, this.isEditorFocused ? 'active' : 'inactive');
    }

    public startTracking(branch: string, type: 'active' | 'inactive' = 'active'): void {
        console.log(`Starting tracking on branch ${branch} (${type})`);

        // Stop any current tracking before starting new
        if (this.currentEntry) {
            this.stopTracking();
        }

        // Determine type based on window focus state
        const actualType = this.isEditorFocused ? 'active' : 'inactive';

        this.currentEntry = {
            branch,
            startTime: Date.now(),
            endTime: null,
            isActive: true,
            type: actualType // Use actual focus state
        };

        console.log(`Started tracking at ${new Date(this.currentEntry.startTime).toISOString()}`);
    }

    public stopTracking(): void {
        if (this.currentEntry) {
            const now = Date.now();
            this.currentEntry.endTime = now;
            this.currentEntry.isActive = false;

            const duration = (now - this.currentEntry.startTime) / 1000;
            console.log(`Stopped tracking, duration: ${duration.toFixed(2)}s (${this.currentEntry.type})`);

            // Only add if duration is meaningful
            if (duration > 0) {
                this.timeEntries.push({ ...this.currentEntry }); // Store a copy
            } else {
                console.warn('Skipping entry with zero duration');
            }

            this.currentEntry = null;
        }
    }

    public getCurrentEntry(): TimeEntry | null {
        if (!this.currentEntry) { return null; }

        // Return a copy with updated endTime for accurate duration calculation
        return {
            ...this.currentEntry,
            endTime: null, // Keep as null to indicate it's still active
            startTime: this.currentEntry.startTime,
            isActive: true
        };
    }

    public getTimeEntries(): TimeEntry[] {
        return JSON.parse(JSON.stringify(this.timeEntries)); // Deep copy
    }

    public dispose(): void {
        // Auto-stop on dispose
        if (this.currentEntry) {
            this.stopTracking();
        }
    }
}
