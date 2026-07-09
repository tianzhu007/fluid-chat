import type { IServiceConfig } from "../definitions";

const exampleConfig: IServiceConfig = {
	serviceEndpoint: "xxxx",
	tenantId: "fluid",
	tenantKey: "xxxxx",
	deltaStreamEndpoint: "xxxx",
	storageEndpoint: "xxxx",
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
