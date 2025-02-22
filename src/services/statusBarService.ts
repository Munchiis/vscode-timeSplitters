import * as vscode from 'vscode';

export class StatusBarService {
    private statusBarItem: vscode.StatusBarItem;
    private isTracking: boolean = false;
    private currentBranch: string = '';
    private trackingType: 'active' | 'inactive' = 'active';
    private timer: NodeJS.Timeout | null = null;
    private startTime: number = 0;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this.statusBarItem.command = 'timesplitter.openDashboard';
        this.update();
        this.statusBarItem.show();
    }

    public startTracking(branch: string, type: 'active' | 'inactive'): void {
        this.isTracking = true;
        this.currentBranch = branch;
        this.trackingType = type;
        this.startTime = Date.now();

        // Start the timer for updating elapsed time
        this.startTimer();
        this.update();
    }

    public stopTracking(): void {
        this.isTracking = false;

        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        this.update();
    }

    public updateTrackingType(type: 'active' | 'inactive'): void {
        this.trackingType = type;
        this.update();
    }

    private startTimer(): void {
        if (this.timer) {
            clearInterval(this.timer);
        }

        this.timer = setInterval(() => {
            this.update();
        }, 1000); // Update every second
    }

    private update(): void {
        if (this.isTracking) {
            const elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsedSeconds / 60);
            const seconds = elapsedSeconds % 60;
            const timeString = `${minutes}m ${seconds}s`;

            const icon = this.trackingType === 'active' ? '$(clock)' : '$(clock-warning)';
            this.statusBarItem.text = `${icon} ${this.currentBranch} (${timeString})`;
            this.statusBarItem.tooltip =
                `${this.trackingType === 'active' ? 'Actively' : 'Inactively'} tracking time on branch "${this.currentBranch}"\n` +
                `Click to open dashboard`;

            // Use different colors for active vs inactive
            this.statusBarItem.color = this.trackingType === 'active'
                ? new vscode.ThemeColor('statusBarItem.prominentForeground')
                : new vscode.ThemeColor('editorWarning.foreground');
        } else {
            this.statusBarItem.text = `$(clock) Not tracking`;
            this.statusBarItem.tooltip = 'TimeSplitter is not currently tracking time\nClick to open dashboard';
            this.statusBarItem.color = undefined;
        }
    }

    public dispose(): void {
        if (this.timer) {
            clearInterval(this.timer);
        }
        this.statusBarItem.dispose();
    }
}
