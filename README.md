# Smartsheet Dashboard Overlay
This Chrome extension overlays shapes and guide-lines on Smartsheet's dashboard editing grid to help you place widgets consistently.

![Example Screenshot](/screenshots/Screen1.jpg "Example Screenshot")

## Usage Instructions
1. Open a dashboard in Smartsheet and enter the editing view (the pencil icon in the top right).
2. Click **Grid Helper** in the editor toolbar, next to **Widget Settings**. A panel opens with an **Enable Grid Helper** switch and a switch for each built-in and custom layout.
3. Turn on the layouts you want. They are drawn immediately and the selection is remembered, so the grid comes back the next time you edit a dashboard.

The same controls are available by clicking the extension icon in the browser toolbar. Use that if Smartsheet changes its editor toolbar and the in-page button stops appearing.

The built-in layouts (Center Line and 3, 4, 6 or 12 equal columns with one-cell gutters) adapt to the width of the dashboard canvas, so they stay centred whatever size Smartsheet gives it. Custom layouts use absolute grid coordinates.

Custom layouts are created on the options page: click the **⋮** button in the panel or popup, or right-click the extension icon and choose **Options**.

## Installing from source
1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and choose the `extension` folder of this repository.

## Changelog
### 2.0.0
- Smartsheet removed the dashboard side panel the extension used to inject its controls into. The controls now open from a **Grid Helper** button added next to **Widget Settings** in the editor toolbar, and also from a popup on the extension icon as a fallback.
- Built-in column layouts are now 3, 4, 6 and 12 equal columns with one-cell gutters, matching how Smartsheet widgets are usually laid out; the old 11-column layout is gone.
- Works with the redesigned editor, which draws its grid as an SVG rather than a background image.
- Built-in layouts scale to the dashboard's column count instead of assuming a fixed width.
- The overlay follows the dashboard: it is redrawn when you enter the editor, navigate between dashboards or resize the window.
- Options page refreshed with validation for custom layouts and a dark theme.
