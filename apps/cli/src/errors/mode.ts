export class CloudModeRequiredError extends Error {
  constructor(command: string) {
    super(
      `The '${command}' command requires cloud mode.\n` +
        `Either:\n` +
        `  - Run with --cloud flag\n` +
        `  - Set ATHREEI_MODE=cloud\n` +
        `  - Configure apiKey in ~/.athreei/config.json`
    )
    this.name = "CloudModeRequiredError"
  }
}

export class LocalModeRequiredError extends Error {
  constructor(command: string) {
    super(
      `The '${command}' command requires local mode.\n` +
        `Either:\n` +
        `  - Run with --local flag\n` +
        `  - Set ATHREEI_MODE=local\n` +
        `  - Configure servers array in ~/.athreei/config.json`
    )
    this.name = "LocalModeRequiredError"
  }
}
