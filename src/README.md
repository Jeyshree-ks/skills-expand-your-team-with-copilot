# Mergington High School Activities

A super simple website application that allows students to view and sign up for extracurricular activities.

## Features

- View all available extracurricular activities
- Sign up for activities
- Share individual activities through WhatsApp, Facebook, or Copy link without logging in
- Use your device's Share menu when supported; shared links focus the selected activity

Sharing only includes the activity's name, description, schedule, and link, never
student details. If copying is unavailable, the link is shown for manual copying.
Friends need access to the website to open shared links.

## Development Guide

For detailed setup and development instructions, please refer to our [Development Guide](../docs/how-to-develop.md).

### Sharing checks

With Node.js installed, run `node --test tests/sharing.test.js` from the repository
root to check sharing links, copying, device sharing, and activity links.
