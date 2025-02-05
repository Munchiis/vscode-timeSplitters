# TimeSplitter Architecture

## Core Components

1. **Extension Controller** (`extension.ts`)

   - Entry point that activates the extension
   - Registers commands, event listeners, and initializes services

2. **Git Service** (`services/gitService.ts`)

   - Detects current Git branch
   - Monitors branch switching
   - Extracts Git metadata

3. **Time Tracking Service** (`services/timeTrackingService.ts`)

   - Tracks active and passive time
   - Manages timing logic
   - Handles activity detection

4. **Storage Service** (`services/storageService.ts`)

   - Persists tracking data
   - Handles data loading/saving
   - Implements backup/restore

5. **Webview Provider** (`webview/webviewProvider.ts`)

   - Creates and manages the webview panel
   - Handles messaging between extension and webview

6. **Webview UI** (`webview-ui/`)

   - Dashboard for visualizing time data
   - User interface for editing and managing time entries

7. **Status Bar Manager** (`ui/statusBarManager.ts`)
   - Shows current tracking status in VS Code status bar

## Data Flow

1. Extension activates when VS Code starts
2. Git service determines current branch
3. Time tracking service starts monitoring time
4. When user interacts:
   - Activity is detected and categorized
   - Time is recorded for the current branch
5. When branch changes:
   - Time tracking is paused for previous branch
   - Started for new branch
6. When user opens webview:
   - Data is passed from storage to webview
   - Visualizations are rendered
7. When user modifies data in webview:
   - Changes are sent to extension
   - Storage is updated

## State Management

The extension will track:

- Current Git branch
- Active/inactive status
- Time entries per branch
- User preferences

```

```
