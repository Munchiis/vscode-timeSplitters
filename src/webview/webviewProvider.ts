import * as vscode from 'vscode';
import { TimeEntry } from '../services/timeTrackingService';

export class WebviewProvider {
  private panel: vscode.WebviewPanel | undefined;
  private refreshInterval: NodeJS.Timeout | undefined;
  private currentEntries: TimeEntry[] = [];
  private readonly UPDATE_INTERVAL = 5000; // Update every 5 seconds

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
      { enableScripts: true }
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

    const now = new Date();

    this.panel.webview.html = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8">
                    <title>TimeSplitter Dashboard</title>
                    <style>
                        body {
                            font-family: var(--vscode-font-family);
                            color: var(--vscode-foreground);
                            background-color: var(--vscode-editor-background);
                            padding: 20px;
                        }
                        h1 {
                            font-size: 18px;
                            color: var(--vscode-editor-foreground);
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 20px;
                        }
                        th, td {
                            text-align: left;
                            padding: 8px;
                            border-bottom: 1px solid var(--vscode-panel-border);
                        }
                        th {
                            background-color: var(--vscode-editor-lineHighlightBackground);
                            cursor: pointer;
                            position: relative;
                        }
                        th:hover {
                            background-color: var(--vscode-list-hoverBackground);
                        }
                        th::after {
                            content: "";
                            position: absolute;
                            right: 8px;
                            top: 50%;
                            transform: translateY(-50%);
                        }
                        th.sort-asc::after {
                            content: "↑";
                        }
                        th.sort-desc::after {
                            content: "↓";
                        }
                        .active { color: var(--vscode-terminal-ansiGreen); }
                        .inactive { color: var(--vscode-terminal-ansiYellow); }
                        .total { font-weight: bold; }
                        .timestamp { font-size: 0.9em; color: var(--vscode-descriptionForeground); }
                        .refresh-time {
                            font-size: 0.8em;
                            color: var(--vscode-descriptionForeground);
                            text-align: right;
                            margin-top: 5px;
                        }
                        .auto-update {
                            font-size: 0.8em;
                            color: var(--vscode-descriptionForeground);
                            margin-top: 5px;
                        }
                    </style>
                </head>
                <body>
                    <h1>TimeSplitter Dashboard</h1>
                    <div class="refresh-time">Last updated: ${now.toLocaleTimeString()}</div>
                    <div class="auto-update">Auto-updating every 5 seconds</div>

                    <table id="branchTable">
                        <thead>
                            <tr>
                                <th data-sort="branch">Branch</th>
                                <th data-sort="active" data-type="number">Active Time</th>
                                <th data-sort="inactive" data-type="number">Inactive Time</th>
                                <th data-sort="total" data-type="number">Total Time</th>
                                <th data-sort="firstSeen" data-type="date">First Seen</th>
                                <th data-sort="lastSeen" data-type="date" class="sort-desc">Last Accessed</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${metricsArray.map(metric => `
                                <tr data-branch="${metric.branch}">
                                    <td>${metric.branch}</td>
                                    <td class="active" data-value="${metric.active}">${this.formatTimeDetailed(metric.active)}</td>
                                    <td class="inactive" data-value="${metric.inactive}">${this.formatTimeDetailed(metric.inactive)}</td>
                                    <td class="total" data-value="${metric.total}">${this.formatTimeDetailed(metric.total)}</td>
                                    <td class="timestamp" data-value="${metric.firstSeen}">${new Date(metric.firstSeen).toLocaleString()}</td>
                                    <td class="timestamp" data-value="${metric.lastSeen}">${new Date(metric.lastSeen).toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <script>
                        (function() {
                            // Initialize with default sort (most recently accessed)
                            let currentSort = 'lastSeen';
                            let currentSortDir = 'desc';

                            // Initial sort
                            sortTable(currentSort, currentSortDir);

                            // Setup sort handlers
                            document.querySelectorAll('th[data-sort]').forEach(th => {
                                th.addEventListener('click', () => {
                                    const sortKey = th.dataset.sort;

                                    // Toggle direction if same column
                                    if (sortKey === currentSort) {
                                        currentSortDir = currentSortDir === 'asc' ? 'desc' : 'asc';
                                    } else {
                                        currentSort = sortKey;
                                        currentSortDir = 'asc';
                                    }

                                    // Update UI
                                    document.querySelectorAll('th').forEach(el => {
                                        el.classList.remove('sort-asc', 'sort-desc');
                                    });

                                    th.classList.add(currentSortDir === 'asc' ? 'sort-asc' : 'sort-desc');

                                    // Sort the table
                                    sortTable(currentSort, currentSortDir);
                                });
                            });

                            function sortTable(sortKey, direction) {
                                const table = document.getElementById('branchTable');
                                const tbody = table.querySelector('tbody');
                                const rows = Array.from(tbody.querySelectorAll('tr'));

                                // Get data type
                                const dataType = document.querySelector(\`th[data-sort="\${sortKey}"]\`).dataset.type || 'string';

                                // Sort rows
                                rows.sort((a, b) => {
                                    let aValue, bValue;

                                    if (sortKey === 'branch') {
                                        aValue = a.dataset.branch;
                                        bValue = b.dataset.branch;
                                    } else {
                                        const aCell = a.querySelector(\`td[data-value]:nth-child(\${getColumnIndex(sortKey) + 1})\`);
                                        const bCell = b.querySelector(\`td[data-value]:nth-child(\${getColumnIndex(sortKey) + 1})\`);

                                        aValue = aCell ? aCell.dataset.value : null;
                                        bValue = bCell ? bCell.dataset.value : null;

                                        if (dataType === 'number') {
                                            aValue = parseFloat(aValue);
                                            bValue = parseFloat(bValue);
                                        } else if (dataType === 'date') {
                                            aValue = new Date(parseFloat(aValue)).getTime();
                                            bValue = new Date(parseFloat(bValue)).getTime();
                                        }
                                    }

                                    // Compare values based on direction
                                    const result = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
                                    return direction === 'asc' ? result : -result;
                                });

                                // Reorder the rows
                                rows.forEach(row => tbody.appendChild(row));
                            }

                            function getColumnIndex(columnName) {
                                const headers = Array.from(document.querySelectorAll('th[data-sort]'));
                                return headers.findIndex(th => th.dataset.sort === columnName);
                            }

                            // Auto-refresh via client-side timer backup
                            setInterval(() => {
                                const vscodeApi = acquireVsCodeApi();
                                vscodeApi.postMessage({
                                    type: 'refresh'
                                });
                            }, 5000);
                        })();
                    </script>
                </body>
            </html>
        `;
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
