import type { IServiceConfig } from "../definitions";

// dev only — keep tenantKey server-side in prod
const tenantId = "";
const tenantKey = "";
// Self-hosted Routerlicious endpoints, enforced verbatim (no service discovery).
const alfred = "https://alfred-tianzhu-tfh2-afd-010-f8hva2cqcwhzbzcw.b02.azurefd.net"; // orderer + host
const nexus = "wss://nexus-tianzhu-tfh2-afd-010-dmbcezg2ccbbdkef.b02.azurefd.net"; // delta stream
const historian = "https://historian-tianzhu-tfh2-afd-010-fsfwgmd7fcdnexd7.b02.azurefd.net"; // storage

const exampleConfig: IServiceConfig = {
	serviceEndpoint: alfred,
	tenantId,
	tenantKey,
	deltaStreamEndpoint: nexus,
	storageEndpoint: historian,
};

const defaultConfig = exampleConfig;

export const config = (() => {
	const env = process.env.ENV;
	console.log("Using env: ", env);
	switch (env) {
		case "example":
			return exampleConfig;
		default:
			return defaultConfig;
	}
})();
