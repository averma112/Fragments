Lab 01
Overview

This project is a Node.js-based backend microservice using Express. It includes structured logging with Pino, ESLint and Prettier for code quality, and is configured with developer tooling to support debugging and automated restarts during development.

NPM Scripts

The following scripts are available to run the server and maintain code quality:

Runs ESLint on all JavaScript files in the `src/` folder to find and optionally fix code style and quality issues.  
npm run lint

Starting the server

• Starts the server normally without watching for file changes or debug mode.  
npm start

• Starts the server in watch mode with automatic restart on file changes. Reads environment variables from `debug.env`.  
npm run dev

• Starts the server in watch mode with the Node.js inspector enabled on port 9229 for remote debugging sessions, reading environment variables from `debug.env`.  
npm run debug
Environment Configuration

- `debug.env`  
  Contains environment variables used in development workflow. For example:
  LOG_LEVEL=debug
- Environment variables control logging verbosity and server behavior. Printing environment variables and debug-level logging happen only if `LOG_LEVEL` is set to `debug`.

Running and Debugging

- Use `npm start` to run the app in production or normal mode.
- Use `npm run dev` during development for live code reloading.
- Use `npm run debug` to enable VSCode or other debuggers to attach to the running Node process on port 9229.

Debugging with VSCode

- The `.vscode/launch.json` is configured to attach the debugger when running `npm run debug`.
- Place breakpoints in your source code (e.g., in `src/app.js`) and start debugging by launching the "Debug via npm run debug" configuration.
- When the breakpoint is hit, use the debug console and variable inspectors to analyze state.

Logging

- Pino is used as our structured logger, configured in `src/logger.js`.
- When `LOG_LEVEL=debug`, logs are pretty-printed and environment variables are printed on server startup to assist with debugging.

Code Formatting and Linting

- Prettier automatically formats code on save in VSCode.
- ESLint catches common code issues. Run `npm run lint` regularly to check for problems.

Security Considerations

- Avoid running in debug mode in production as sensitive environment variables will be printed.
- Use explicit `git add` commands to avoid accidentally committing sensitive files.

Additional Notes

- Always read all scripts and config files carefully to understand what they do.
- Keep dependencies up to date by periodically running:
  npm audit fix
