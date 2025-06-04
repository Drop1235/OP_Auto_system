# Tennis Tournament Match Board App

A simple application that mimics a paper-based tennis match board. This app runs fully offline and allows tournament organizers to drag-and-drop match cards between court slots. Available in both web and desktop (Electron) versions.

## Features

- **Court Grid Display**: Shows courts 1-12 with current, next, and next2 match slots
- **Drag-and-Drop Interface**: Easily move matches between courts and positions
- **Automatic Timestamps**: Records start and end times when matches move to/from current position
- **Match History**: View completed matches with timestamps
- **Filtering and Sorting**: Sort and filter history by court number and date
- **Fully Offline**: All data stored locally, no internet connection required

## Installation

### Desktop Version
1. Download the latest release from the releases section
2. Run the installer or extract the zip file to your preferred location
3. Launch the application by running `Tennis Tournament Board.exe`

### Web Version
1. Clone or download the repository
2. Navigate to the project directory
3. Start the web server:
   ```
   node server.js
   ```
4. Open your browser and navigate to `http://localhost:3000`

## Usage

### Adding Matches

1. Click the "Add Match" button
2. Enter Player A and Player B names
3. Set the scheduled start time
4. Optionally assign to a specific court and position
5. Click "Add Match"

### Managing Matches

- **Drag and Drop**: Move match cards between courts and positions
- **Start a Match**: Drag a card to a "Current Match" row to automatically record the start time
- **Complete a Match**: Drag a card from a "Current Match" row to the history view to record the end time

### Viewing History

1. Click the "Match History" button
2. View all completed matches with their details
3. Filter by court number or date
4. Sort by clicking on column headers

## Building from Source

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Build Steps

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Run the application in development mode:
   ```
   npm start
   ```
4. Build the application:
   ```
   npm run build
   ```

## Technology Stack

### Desktop Version
- Electron
- HTML/CSS/JavaScript
- IndexedDB for local data storage

### Web Version
- HTML/CSS/JavaScript
- localStorage for data persistence
- Node.js for the web server
