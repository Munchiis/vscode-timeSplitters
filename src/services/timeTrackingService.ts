import * as vscode from 'vscode';

export interface TimeEntry {
    branch: string;
    startTime: number;
    endTime: number | null;
    isActive: boolean;
    type: 'active' | 'passive';
}

export class TimeTrackingService {

    private timeEntries: TimeEntry[] = [];
    private currentEntry: TimeEntry | null = null;
    private lastActivity: number = Date.now();
    private activityTimer: NodeJS.Timeout | null = null;
    private readonly INACTIVITY_THRESHOLD = 60000; // ~1min

    constructor() {
        this.setupActivityDetection();
    }

    private setupActivityDetection(): void {
        vscode.workspace.onDidChangeTextDocument(() => {
            this.registerActivity();
        });

        vscode.window.onDidChangeTextEditorSelection(() => {
            this.registerActivity();
        });

        this.activityTimer = setInterval(() => this.checkActivity(), 30000);
    }

    private registerActivity(): void {
        this.lastActivity = Date.now();
        if (this.currentEntry && this.currentEntry.type === 'passive') {
            this.stopTracking();
            this.startTracking(this.currentEntry.branch, 'active');
        }
    }

    private checkActivity(): void {
        const now = Date.now();
        const timeSinceLastActivity = now - this.lastActivity;

        if (timeSinceLastActivity > this.INACTIVITY_THRESHOLD &&
            this.currentEntry &&
            this.currentEntry.type === 'active') {
            this.stopTracking();
            this.startTracking(this.currentEntry.branch, 'passive');
        }
    }

    public startTracking(branch: string, type: 'active' | 'passive' = 'active'): void {
        if (this.currentEntry) {
            this.stopTracking();
        }

        this.currentEntry = {
            branch,
            startTime: Date.now(),
            endTime: null,
            isActive: true,
            type
        };
    }

    public stopTracking(): void {
        if (this.currentEntry) {
            this.currentEntry.endTime = Date.now();
            this.currentEntry.isActive = false;
            this.timeEntries.push(this.currentEntry);
            this.currentEntry = null;
        }
    }

    public getCurrentEntry(): TimeEntry | null {
        return this.currentEntry;
    }

    public getTimeEntries(): TimeEntry[] {
        return [...this.timeEntries];
    }

    public dispose(): void {
        if (this.activityTimer) {
            clearInterval(this.activityTimer);
            this.activityTimer = null;
        }
    }
}
