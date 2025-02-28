# TimeSplitter Development Guide

## Development Plan

### Phase 1: Core Infrastructure

- [x] Set up project structure
- [x] Implement Git branch detection
- [x] Create basic time tracking logic (active/passive)
- [x] Implement local storage system

### Phase 2: UI & Visualization

- [x] Create webview panel
- [x] Design dashboard layout
- [x] Implement charts and graphs
- [x] Add status bar indicator

### Phase 3: User Interaction

- [ ] Add manual time entry adjustment
- [x] Implement branch filtering and sorting
- [ ] Create export functionality <---Maybe--->
- [ ] Add settings and configuration

### Phase 4: Advanced Features

- [x] Implement focus period detection
- [ ] Add ticket/task linking <---Maybe--->
- [ ] Create Pomodoro-style tracking <---Maybe--->
- [ ] Add context switching detection <---Maybe--->

### Phase 5: Polish & Refinement

- [ ] Improve error handling
- [ ] Add user documentation
- [ ] Optimize performance
- [ ] Prepare for marketplace publishing

## Development Workflow

1. Select a task from the development plan
2. Create a branch for the feature/fix
3. Implement the changes
4. Test the extension by launching the Extension Development Host
5. Submit a pull request for review

## Extension Structure

See the [Architecture Overview](architecture.md) for details on the extension's structure.

## Testing

To test the extension:

1. Press F5 in VS Code to launch the Extension Development Host
2. Use the commands and features to verify functionality
3. Check the Debug Console for any errors or logs
