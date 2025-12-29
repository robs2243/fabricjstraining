# Project Overview

This is a frontend web development practice project, primarily focused on **Bootstrap 5** for layout and responsive design, with basic **Vanilla JavaScript** for DOM manipulation.

The directory name `fabricjstraining` suggests an intention to use **Fabric.js**, but the current implementation is focused on Bootstrap grid systems and simple event handling.

## Technology Stack

*   **HTML5**
*   **CSS Framework:** Bootstrap 5.3.0 (via CDN)
*   **JavaScript:** Vanilla JS
*   **Assets:** Local images stored in `pics/`

## Architecture & Logic

### Files
*   `bootstrapPractice.html`: The main entry point. It sets up a responsive grid layout using Bootstrap classes (`container-fluid`, `row`, `col-*`). It defines two main interactive sections containing images.
*   `bootstrapPractice.js`: Contains the logic for the "Previous" (`Zurück`) and "Next" (`Vor`) buttons. It attaches event listeners to toggle image sources between two states (e.g., `hund.jpg` <-> `hund2.jpg`).

### Key Features
*   **Responsive Grid:** Uses Bootstrap's grid system to align buttons, text, and images.
*   **Image Toggling:** Simple JS logic switches the `src` attribute of `<img>` tags based on button clicks.

## Setup & Usage

Since this is a static site, no build process is required.

1.  **Run:** Open `bootstrapPractice.html` directly in any modern web browser.
2.  **Interact:** Use the "Vor" and "Zurück" buttons to cycle through the images.

## Development Notes

*   **Fabric.js Import:** The HTML file currently includes a reference to Fabric.js: `<link href=".../fabric.js/.../index.min.js" rel="stylesheet">`.
    *   *Correction Needed:* This is defined as a stylesheet (`<link>`) but should be a script (`<script src="...">`). Additionally, Fabric.js logic is not yet implemented in the JavaScript file.
*   **Images:** The code assumes the existence of specific files in `pics/`: `hund.jpg`, `hund2.jpg`, `katze.jpg`, `katze2.jpg`.
