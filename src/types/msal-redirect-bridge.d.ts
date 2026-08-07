/**
 * MSAL exposes the redirect bridge as a package subpath export. This project's tsconfig uses
 * the classic Node module resolution, which does not read `exports` maps, so TypeScript cannot
 * see it. Parcel resolves it correctly at build time.
 *
 * Declaring it here keeps the fix local. Switching the whole project to `moduleResolution:
 * "bundler"` also works but surfaces an unrelated pre-existing error in MessageDisplay.tsx.
 */
declare module "@azure/msal-browser/redirect-bridge" {
	/**
	 * Reads the authentication response out of the current URL and hands it to the window that
	 * opened this one, then cleans up. Required from MSAL Browser v5: without it a sign-in popup
	 * never closes.
	 */
	export function broadcastResponseToMainFrame(): Promise<void>;
}
