# rsbuild-plugin-rsc

This package provides [React Server Components](https://react.dev/reference/rsc/server-components) (RSC) support for Rsbuild.

## Examples

The `examples` directory includes complete example apps built with RSC implementation with Rsbuild.

## Getting Started

### 1. Create an Rsbuild React Project

First, ensure you have a functional Rsbuild React project. If you are starting from scratch, follow the Rsbuild - React Quick Start guide.

### 2. Install Dependencies

Install the plugin along with the necessary RSC runtime dependencies for Rspack:

```bash
npm install rsbuild-plugin-rsc react-server-dom-rspack
```

> Note: Server Components require `react` and `react-dom` v19.1.0 or later.
