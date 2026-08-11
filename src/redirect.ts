import { broadcastResponseToMainFrame } from "@azure/msal-browser/redirect-bridge";

/**
 * MSAL redirect bridge.
 *
 * From MSAL Browser v5 the sign-in popup no longer completes on its own. The popup lands on
 * this page and has to hand the authentication response back to the window that opened it;
 * without that the popup simply stays open and the caller waits forever.
 *
 * Nothing else belongs on this page. Booting the application here is what makes the popup show
 * a second copy of the app instead of closing.
 */
broadcastResponseToMainFrame().catch((error: unknown) => {
	console.error(
		"Failed to return the sign-in response to the application",
		error,
	);
	document.body.textContent =
		"Sign-in could not be completed. You can close this window and try again.";
});
