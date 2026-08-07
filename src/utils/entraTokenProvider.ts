import type {
	ITokenProvider,
	ITokenResponse,
} from "@fluidframework/azure-client";
import {
	PublicClientApplication,
	type AccountInfo,
	type IPublicClientApplication,
} from "@azure/msal-browser";

/**
 * Token provider that gets Fluid tokens from the self-hosted token service instead of signing
 * them in the browser.
 *
 * {@link CustomInsecureTokenProvider} signs tokens here in the client, which means the page has
 * the tenant key and could mint a token for any user and any document. That is fine for local
 * development and unusable against a shared deployment. This provider holds no key: it signs
 * the user in with Microsoft Entra ID and asks the token service, which authorises the request
 * and signs server-side.
 *
 * `AzureFunctionTokenProvider` cannot be used for this. It is deprecated, and it issues a bare
 * GET with no Authorization header, so App Service Easy Auth rejects every request it makes.
 */
export class EntraTokenProvider implements ITokenProvider {
	private readonly cache = new Map<
		string,
		{ jwt: string; expiresAt: number }
	>();
	private msal: IPublicClientApplication | undefined;

	/**
	 * Renew this many seconds before expiry, so a long session refreshes during normal use
	 * rather than after a request has already been rejected.
	 */
	private static readonly refreshSkewSec = 300;

	constructor(
		/**
		 * URL of the deployed token endpoint, e.g.
		 * `https://<function-app>.azurewebsites.net/api/token`.
		 */
		private readonly tokenServiceUrl: string,
		/**
		 * Application (client) ID of the token service's Entra App Registration.
		 */
		private readonly clientId: string,
		/**
		 * Entra directory (tenant) ID users sign in against.
		 */
		private readonly entraTenantId: string,
		/**
		 * Scope the token service exposes. Defaults to the one its deploy script creates.
		 */
		private readonly scope = "Fluid.Token.Issue",
	) {}

	public async fetchOrdererToken(
		tenantId: string,
		documentId?: string,
		refresh?: boolean,
	): Promise<ITokenResponse> {
		return this.fetchToken(tenantId, documentId, refresh);
	}

	public async fetchStorageToken(
		tenantId: string,
		documentId: string,
		refresh?: boolean,
	): Promise<ITokenResponse> {
		return this.fetchToken(tenantId, documentId, refresh);
	}

	private async fetchToken(
		tenantId: string,
		documentId?: string,
		refresh?: boolean,
	): Promise<ITokenResponse> {
		const cacheKey = `${tenantId}/${documentId ?? ""}`;
		const now = Math.round(Date.now() / 1000);

		// `refresh` is set by the driver after a request failed authorization, so a cached token
		// must not be reused then even if it still looks current.
		if (!refresh) {
			const cached = this.cache.get(cacheKey);
			if (
				cached &&
				cached.expiresAt - EntraTokenProvider.refreshSkewSec > now
			) {
				return { fromCache: true, jwt: cached.jwt };
			}
		}

		const accessToken = await this.getEntraAccessToken();

		const url = new URL(this.tokenServiceUrl);
		url.searchParams.set("tenantId", tenantId);
		if (documentId) {
			url.searchParams.set("documentId", documentId);
		}

		const response = await fetch(url.toString(), {
			method: "GET",
			headers: { Authorization: `Bearer ${accessToken}` },
		});

		if (!response.ok) {
			const detail = await response.text().catch(() => "");
			throw new Error(
				`Token service returned ${response.status} ${response.statusText}. ${detail}`.trim(),
			);
		}

		const { token, expiresAt } = (await response.json()) as {
			token: string;
			expiresAt: number;
		};
		this.cache.set(cacheKey, { jwt: token, expiresAt });

		return { fromCache: false, jwt: token };
	}

	/**
	 * Sign the user in if needed and return an Entra access token for the token service's API.
	 */
	private async getEntraAccessToken(): Promise<string> {
		const msal = await this.getMsal();
		const scopes = [`api://${this.clientId}/${this.scope}`];

		let account: AccountInfo | undefined = msal.getAllAccounts()[0];
		if (account === undefined) {
			const login = await msal.loginPopup({ scopes });
			account = login.account ?? undefined;
			if (account === undefined) {
				throw new Error("Entra sign-in did not return an account.");
			}
		}

		try {
			const result = await msal.acquireTokenSilent({ account, scopes });
			return result.accessToken;
		} catch {
			// Silent acquisition fails whenever interaction is required -- consent not yet given,
			// an expired session, or a conditional access prompt. Falling back to a popup covers
			// all of them without having to tell them apart.
			const result = await msal.acquireTokenPopup({ account, scopes });
			return result.accessToken;
		}
	}

	private async getMsal(): Promise<IPublicClientApplication> {
		if (this.msal === undefined) {
			const msal = new PublicClientApplication({
				auth: {
					clientId: this.clientId,
					authority: `https://login.microsoftonline.com/${this.entraTenantId}`,
					// Sign-in returns to the current page; this must also be registered as an SPA
					// redirect URI on the App Registration or Entra rejects the request.
					redirectUri: window.location.origin,
				},
				cache: { cacheLocation: "sessionStorage" },
			});
			await msal.initialize();
			this.msal = msal;
		}
		return this.msal;
	}
}
