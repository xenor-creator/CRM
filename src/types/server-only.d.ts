// Next.js resolves "server-only" internally and fails the build if a module importing it
// ends up in a client bundle; this declaration only satisfies TypeScript.
declare module "server-only";
