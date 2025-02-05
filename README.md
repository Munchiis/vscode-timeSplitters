# TimeSplitter - Git Branch Time Tracker for VS Code

TimeSplitter is a VS Code extension that helps developers track and visualize time spent on different Git branches, providing insights into work patterns and improving time management.

## Features

- **Time Tracking**: Automatically tracks time spent on different Git branches

  - **Active Time**: Records when you're actively coding (typing, navigating)
  - **Passive Time**: Records when VS Code is open but you're not actively working

- **Visualization**: Intuitive dashboard showing time distribution across branches

  - Charts and graphs for easy data interpretation
  - Sortable and filterable branch list

- **Time Management**:

  - Manually adjust recorded time entries
  - Highlight focus periods with highest activity
  - Link branches to issue trackers (Jira, GitHub Issues)

- **Data Persistence**:

  - Local storage of tracking data
  - Backup and restore functionality
  - Session persistence

- **Reporting**:

  - Export time logs to CSV/JSON
  - Compare time between branches

- **Smart Features**:
  - Context switching detection
  - Active vs. non-active window tracking
  - Optional Pomodoro-style session tracking

## Requirements

- VS Code 1.60.0 or higher
- Git installed and configured in workspace

## Extension Settings

This extension contributes the following settings:

- `timeSplitter.enableTracking`: Enable/disable time tracking
- `timeSplitter.inactivityThreshold`: Time in minutes before considering user inactive
- `timeSplitter.showStatusBarItem`: Show status bar item with current tracking info

## Documentation

- [Architecture Overview](docs/architecture.md) - Detailed explanation of the extension's structure
- [Development Guide](docs/development.md) - Guide for developers including todos and roadmap

## Development

### Prerequisites

- Node.js
- pnpm
- VS Code

### Setup

1. Clone this repository
2. Run `pnpm install`
3. Open in VS Code
4. Press F5 to start debugging

## Release Notes

### 1.0.0

Initial release of TimeSplitter

## Privacy

TimeSplitter stores all data locally on your machine. No data is sent to external servers.
