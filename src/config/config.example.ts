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

export const config = (() => {
	const env = process.env.ENV;
	console.log("Using env: ", env);
	switch (env) {
		case "example":
			return exampleConfig;
		case "tokenservice":
			return tokenServiceConfig;
		default:
			return defaultConfig;
	}
})();
