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
            }
        } catch (error) {
            console.error('Failed to load time entries:', error);
            this.timeEntries = [];
        }
    }

    private saveTimeEntries(): void {
        try {
            fs.writeFileSync(this.storagePath, JSON.stringify(this.timeEntries));
        } catch (error) {
            console.error('Failed to save time entries:', error);
            vscode.window.showErrorMessage('Could not save time tracking data');
        }
    }

    public getTimeEntries(): TimeEntry[] {
        return [...this.timeEntries];
    }

    public addTimeEntry(entry: TimeEntry): void {
        this.timeEntries.push(entry);
        this.saveTimeEntries();
    }
}
