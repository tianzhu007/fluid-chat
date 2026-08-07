import type { IServiceConfig } from "../definitions";

// Signs its own tokens in the browser using the tenant key. Development only -- the page can
// mint a token for any user and any document.
const exampleConfig: IServiceConfig = {
	serviceEndpoint: "xxxx",
	tenantId: "fluid",
	tenantKey: "xxxxx",
	deltaStreamEndpoint: "xxxx",
	storageEndpoint: "xxxx",
};

// Gets tokens from the deployed token service instead. No tenant key in the client: the user
// signs in with Entra ID and the service authorises the request and signs server-side.
//
// The token service's App Registration needs this app's origin registered as an SPA redirect
// URI, and the Function App needs it in CORS. Both are handled by setting spaRedirectUris and
// allowedOrigins in the selfhost deploy parameters (http://localhost:1234 for `yarn start`).
const tokenServiceConfig: IServiceConfig = {
	serviceEndpoint: "xxxx",
	tenantId: "fluid",
	deltaStreamEndpoint: "xxxx",
	storageEndpoint: "xxxx",
	tokenService: {
		url: "https://xxxx.azurewebsites.net/api/token",
		clientId: "00000000-0000-0000-0000-000000000000",
		entraTenantId: "00000000-0000-0000-0000-000000000000",
	},
};

const defaultConfig = exampleConfig;

// Keyed by the value of ENV. `ENV=tokenservice yarn start:remote` selects the entry below --
// the key, not the variable name.
const configsByEnv: Record<string, IServiceConfig> = {
	example: exampleConfig,
	tokenservice: tokenServiceConfig,
};

export const config = (() => {
	const env = process.env.ENV;
	if (env === undefined || env === "") {
		console.log("No ENV set, using default config");
		return defaultConfig;
	}
	const selected = configsByEnv[env];
	if (selected === undefined) {
		// Falling back to the default on a typo sends the app at whichever service that entry
		// names, with whichever credentials it carries. The failure then surfaces as an unrelated
		// 403 from riddler, a long way from the mistake, so an unknown ENV is refused instead.
		throw new Error(
			`Unknown ENV "${env}". Known values: ${Object.keys(configsByEnv).join(
				", ",
			)}`,
		);
	}
	console.log("Using env: ", env);
	return selected;
})();
