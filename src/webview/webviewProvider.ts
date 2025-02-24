import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TimeEntry } from '../services/timeTrackingService';

export class WebviewProvider {
  private panel: vscode.WebviewPanel | undefined;
  private refreshInterval: NodeJS.Timeout | undefined;
  private currentEntries: TimeEntry[] = [];
  private readonly UPDATE_INTERVAL = 5000; // Update every 5 seconds
  private readonly extensionPath: string;

  constructor(extensionPath: string) {
    this.extensionPath = extensionPath;
  }

  public showWebview(timeEntries: TimeEntry[]) {
    // Always update our entries first
    this.currentEntries = timeEntries;

    // Reuse panel if exists
    if (this.panel) {
      this.panel.reveal();
      this.updateContent();
      return;
    }

    // Create a dashboard panel
    this.panel = vscode.window.createWebviewPanel(
      'timeSplitterDashboard',
      'TimeSplitter Dashboard',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(this.extensionPath, 'src', 'webview', 'resources'))
        ]
      }
    );

    this.updateContent();

    // Setup automatic refresh
    this.setupAutoRefresh();

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(message => {
      if (message.type === 'refresh') {
        this.updateContent();
      }
    });

    this.panel.onDidDispose(() => {
      this.stopAutoRefresh();
      this.panel = undefined;
    });
  }

  // Update entries data - called from extension to refresh data
  public updateEntries(timeEntries: TimeEntry[]) {
    this.currentEntries = timeEntries;
    if (this.panel) {
      this.updateContent();
    }
  }

  private setupAutoRefresh() {
    // Clear any existing interval
    this.stopAutoRefresh();

    // Setup new interval
    this.refreshInterval = setInterval(() => {
      this.updateContent();
    }, this.UPDATE_INTERVAL);
  }

  private stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }
  }

  private updateContent() {
    if (!this.panel) { return; }

    // Generate metrics for each branch
    const branchMetrics = this.calculateBranchMetrics();

    // Convert to array for easier sorting in the webview
    const metricsArray = Object.entries(branchMetrics).map(([branch, metrics]) => ({
      branch,
      ...metrics
    }));

    // Calculate totals for summary cards
    const totalActiveTime = metricsArray.reduce((sum, m) => sum + m.active, 0);
    const totalInactiveTime = metricsArray.reduce((sum, m) => sum + m.inactive, 0);
    const totalTime = totalActiveTime + totalInactiveTime;
    const branchCount = metricsArray.length;

    // Find most used branch
    let mostUsedBranch = { branch: 'None', total: 0 };
    if (metricsArray.length > 0) {
      mostUsedBranch = metricsArray.reduce((prev, current) =>
        (current.total > prev.total) ? current : prev,
        { branch: 'None', total: 0 }
      );
    }

    const now = new Date();

    // Get the HTML template
    const htmlTemplate = this.getHtmlTemplate();

    // Generate the content components
    const summaryCards = this.generateSummaryCards(totalTime, totalActiveTime, totalInactiveTime, branchCount, mostUsedBranch);
    const barChart = this.generateBarChart(metricsArray);
    const tableRows = this.generateTableRows(metricsArray);

    // Get webview URIs for resources
    const cssUri = this.panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(this.extensionPath, 'src', 'webview', 'resources', 'dashboard.css'))
    );

    const jsUri = this.panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(this.extensionPath, 'src', 'webview', 'resources', 'dashboard.js'))
    );

    // Replace placeholders in the HTML template
    let html = htmlTemplate
      .replace('{{cssUri}}', cssUri.toString())
      .replace('{{jsUri}}', jsUri.toString())
      .replace('{{lastUpdated}}', now.toLocaleTimeString())
      .replace('{{summaryCards}}', summaryCards)
      .replace('{{barChart}}', barChart)
      .replace('{{tableRows}}', tableRows);

    // Set the webview HTML
    this.panel.webview.html = html;
  }

  // Read the HTML template file
  private getHtmlTemplate(): string {
    try {
      const templatePath = path.join(this.extensionPath, 'src', 'webview', 'resources', 'dashboard.html');
      return fs.readFileSync(templatePath, 'utf8');
    } catch (error) {
      console.error('Failed to load HTML template:', error);
      return this.getFallbackHtmlTemplate();
    }
  }

  // Fallback HTML in case the template file can't be loaded
  private getFallbackHtmlTemplate(): string {
    return `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>TimeSplitter Dashboard</title>
        <style>
            body { font-family: sans-serif; padding: 20px; }
            h1 { color: red; }
        </style>
    </head>
    <body>
        <h1>Error: Failed to load dashboard template</h1>
        <p>Please check the extension logs for more details.</p>
    </body>
    </html>`;
  }

  // Generate the summary cards HTML
  private generateSummaryCards(
    totalTime: number,
    totalActiveTime: number,
    totalInactiveTime: number,
    branchCount: number,
    mostUsedBranch: any
  ): string {
    return `
        <div class="card">
            <h3 class="card-title">Total Tracking Time</h3>
            <p class="card-value">${this.formatTimeDetailed(totalTime)}</p>
            <p class="card-subvalue">Active: ${this.formatTimeDetailed(totalActiveTime)} | Inactive: ${this.formatTimeDetailed(totalInactiveTime)}</p>
        </div>

        <div class="card">
            <h3 class="card-title">Branches Tracked</h3>
            <p class="card-value">${branchCount}</p>
            <p class="card-subvalue">Most used: ${mostUsedBranch.branch}</p>
        </div>

        <div class="card">
            <h3 class="card-title">Most Used Branch</h3>
            <p class="card-value">${mostUsedBranch.branch}</p>
            <p class="card-subvalue">${this.formatTimeDetailed(mostUsedBranch.total)}</p>
        </div>
    `;
  }

  // Generate HTML for the bar chart
  private generateBarChart(metrics: any[]): string {
    // Sort by total time descending
    const sortedMetrics = [...metrics].sort((a, b) => b.total - a.total);

    // Take top 8 branches for visibility
    const topBranches = sortedMetrics.slice(0, 8);

    return topBranches.map(metric => {
      // For each branch, we'll make the bar take full width (100%)
      // and divide that width based on the active/inactive ratio

      // Calculate the ratio of active vs inactive time
      const total = metric.active + metric.inactive;

      // Calculate percentages for active and inactive
      // These will always add up to 100% for each bar
      const activePercent = total > 0 ? (metric.active / total) * 100 : 0;
      const inactivePercent = 100 - activePercent; // Ensure they sum to 100%

      return `
            <div class="bar-group">
                <div class="bar-label" title="${metric.branch}">${metric.branch}</div>
                <div class="bar-container">
                    <div class="bar bar-active" style="width: ${activePercent}%">
                        ${activePercent > 10 ? `<span class="bar-text">${this.formatTimeSimple(metric.active)}</span>` : ''}
                    </div>
                    <div class="bar bar-inactive" style="width: ${inactivePercent}%; left: ${activePercent}%">
                        ${inactivePercent > 10 ? `<span class="bar-text">${this.formatTimeSimple(metric.inactive)}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
  }

  // Generate table rows HTML
  private generateTableRows(metrics: any[]): string {
    return metrics.map(metric => `
        <tr data-branch="${metric.branch}">
            <td>${metric.branch}</td>
            <td class="active" data-value="${metric.active}">${this.formatTimeDetailed(metric.active)}</td>
            <td class="inactive" data-value="${metric.inactive}">${this.formatTimeDetailed(metric.inactive)}</td>
            <td class="total" data-value="${metric.total}">${this.formatTimeDetailed(metric.total)}</td>
            <td class="timestamp" data-value="${metric.firstSeen}">${new Date(metric.firstSeen).toLocaleString()}</td>
            <td class="timestamp" data-value="${metric.lastSeen}">${new Date(metric.lastSeen).toLocaleString()}</td>
        </tr>
    `).join('');
  }

  // Calculate metrics for each branch
  private calculateBranchMetrics() {
    const branchMetrics: Record<string, {
      active: number,
      inactive: number,
      total: number,
      firstSeen: number,
      lastSeen: number
    }> = {};

    // Current time - used for active entries
    const now = Date.now();

    // Process all entries
    this.currentEntries.forEach(entry => {
      const branch = entry.branch;

      // Skip invalid entries
      if (!entry.startTime || entry.startTime <= 0) {
        console.warn('Invalid entry detected:', entry);
        return;
      }

      // Initialize metrics object for this branch if needed
      if (!branchMetrics[branch]) {
        branchMetrics[branch] = {
          active: 0,
          inactive: 0,
          total: 0,
          firstSeen: entry.startTime,
          lastSeen: entry.endTime || now
        };
      }

      // Calculate duration correctly for this entry
      const start = entry.startTime;
      const end = entry.isActive ? now : (entry.endTime || now);
      const duration = end - start; // milliseconds

      if (duration <= 0) {
        console.warn('Invalid duration detected:', duration, entry);
        return;
      }

      // Update first/last seen timestamps
      branchMetrics[branch].firstSeen = Math.min(branchMetrics[branch].firstSeen, start);
      branchMetrics[branch].lastSeen = Math.max(branchMetrics[branch].lastSeen, end);

      // Accumulate time based on entry type
      if (entry.type === 'active') {
        branchMetrics[branch].active += duration;
      } else {
        branchMetrics[branch].inactive += duration;
      }

      // Update total time
      branchMetrics[branch].total += duration;
    });

    return branchMetrics;
  }

  // Format time for simple display (used in chart)
  private formatTimeSimple(milliseconds: number): string {
    // Ensure we have a positive number
    milliseconds = Math.max(0, milliseconds);

    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // Format time in weeks:days:hours:minutes:seconds
  private formatTimeDetailed(milliseconds: number): string {
    // Ensure we have a positive number
    milliseconds = Math.max(0, milliseconds);

    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);

    const remainingDays = days % 7;
    const remainingHours = hours % 24;
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;

    let result = '';

    if (weeks > 0) {
      result += `${weeks}w:`;
    }

    if (weeks > 0 || remainingDays > 0) {
      result += `${remainingDays}d:`;
    }

    return result +
      `${String(remainingHours).padStart(2, '0')}h:` +
      `${String(remainingMinutes).padStart(2, '0')}m:` +
      `${String(remainingSeconds).padStart(2, '0')}s`;
  }

  public dispose() {
    this.stopAutoRefresh();
    if (this.panel) {
      this.panel.dispose();
    }
  }
}
