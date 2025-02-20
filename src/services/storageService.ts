import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TimeEntry } from './timeTrackingService';

export class StorageService {
    private storagePath: string;
    private timeEntries: TimeEntry[] = [];

    constructor(context: vscode.ExtensionContext) {
        this.storagePath = path.join(context.globalStorageUri.fsPath, 'timesplitter-data.json');
        this.ensureStorageDirectoryExists();
        this.loadTimeEntries();
    }

    private ensureStorageDirectoryExists(): void {
        const dir = path.dirname(this.storagePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    private loadTimeEntries(): void {
        try {
            // only try to load if the file exists
            if (fs.existsSync(this.storagePath)) {
                const fileContent = fs.readFileSync(this.storagePath, 'utf8');
                this.timeEntries = JSON.parse(fileContent);
                console.log(`Loaded ${this.timeEntries.length} time entries from storage`);
            }
        } catch (error) {
            console.error('Failed to load time entries:', error);
            this.timeEntries = [];
        }
    }

    private saveTimeEntries(): void {
        try {
            fs.writeFileSync(this.storagePath, JSON.stringify(this.timeEntries, null, 2));
            console.log(`Saved ${this.timeEntries.length} time entries to storage`);
        } catch (error) {
            console.error('Failed to save time entries:', error);
            vscode.window.showErrorMessage('Could not save time tracking data');
        }
    }

    public getTimeEntries(): TimeEntry[] {
        // Important: return a deep copy to prevent accidental modifications
        return JSON.parse(JSON.stringify(this.timeEntries));
    }

    public addTimeEntry(entry: TimeEntry): void {
        // Make sure entry is complete before storing
        if (entry.endTime === null) {
            entry.endTime = Date.now();
        }

        // Validate the entry has proper time values
        if (entry.startTime > 0 && entry.endTime > entry.startTime) {
            this.timeEntries.push({ ...entry }); // Store a copy
            this.saveTimeEntries();
        } else {
            console.warn('Invalid time entry not saved:', entry);
        }
    }

    // Add debug method to clear data if needed
    public clearAllEntries(): void {
        this.timeEntries = [];
        this.saveTimeEntries();
        console.log('Cleared all time entries from storage');
    }
}
