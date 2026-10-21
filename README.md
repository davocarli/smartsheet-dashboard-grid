# Smartsheet Dashboard Overlay
This Chrome extension overlays shapes and guide-lines on Smartsheet's dashboard editing grid to help you place widgets consistently.

![Example Screenshot](/screenshots/Screen1.jpg "Example Screenshot")

## Usage Instructions
1. Open a dashboard in Smartsheet and enter the editing view (the pencil icon in the top right).
2. Click the extension icon in the browser toolbar. A popup opens with an **Enable Grid Helper** switch and a switch for each built-in and custom layout.
3. Turn on the layouts you want. They are drawn immediately and the selection is remembered, so the grid comes back the next time you edit a dashboard.

Custom layouts are created on the options page: click the **⋮** button in the popup, or right-click the extension icon and choose **Options**.

## Installing from source
1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and choose the `extension` folder of this repository.

## Changelog
### 2.0.0
- Smartsheet removed the dashboard side panel the extension used to inject its controls into, so the controls now live in a popup opened by clicking the extension icon.
- The overlay follows the dashboard: it is redrawn when you enter the editor, navigate between dashboards or resize the window.
- Options page refreshed with validation for custom layouts and a dark theme.
