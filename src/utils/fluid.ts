import type {
	ITokenProvider,
	ITokenResponse,
} from "@fluidframework/azure-client";
import type { AzureClient } from "@fluidframework/azure-client";
import type { AzureUser } from "@fluidframework/azure-client/internal";
import type { IRequest } from "@fluidframework/core-interfaces";
import { ScopeType } from "@fluidframework/driver-definitions/legacy";
import {
	DriverHeader,
	type IDocumentServiceFactory,
	type IResolvedUrl,
	type IUrlResolver,
} from "@fluidframework/driver-definitions/internal";
import { RouterliciousDocumentServiceFactory } from "@fluidframework/routerlicious-driver/internal";
import { generateToken } from "@fluidframework/azure-service-utils/internal";
import type { IFluidChatUser } from "../definitions";
import { localStorageManager, StorageKeys } from "./localStorage";
import { canWrite } from "./users";


export class CustomInsecureTokenProvider implements ITokenProvider {
	private readonly tokenLifetimeMs: number | undefined;
	private cachedToken: string | undefined;

	constructor(
		/**
		 * Private server tenantKey for generating tokens.
		 */
		private readonly tenantKey: string,

		/**
		 * User with whom generated tokens will be associated.
		 */
		private readonly user: AzureUser<IFluidChatUser>,
	) {
		const tokenLifetimeFromLocalStorage = localStorageManager.get(
			StorageKeys.tokenLifetime,
		);
		this.tokenLifetimeMs = tokenLifetimeFromLocalStorage
			? Number.parseInt(tokenLifetimeFromLocalStorage)
			: undefined;
	}

	/**
	 * {@inheritDoc @fluidframework/routerlicious-driver#ITokenProvider.fetchOrdererToken}
	 */
	public async fetchOrdererToken(
		tenantId: string,
		documentId?: string,
		refresh?: boolean,
	): Promise<ITokenResponse> {
		return this.fetchToken(tenantId, documentId, refresh);
	}

	/**
	 * {@inheritDoc @fluidframework/routerlicious-driver#ITokenProvider.fetchStorageToken}
	 */
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
		if (!this.cachedToken || refresh) {
			const token = this.signToken(tenantId, documentId);
			if (documentId) {
				this.cachedToken = token;
			}
			return {
				fromCache: false,
				jwt: token,
			};
		}
		return {
			fromCache: true,
			jwt: this.cachedToken,
		};
	}

	private signToken(tenantId: string, documentId: string | undefined): string {
		const scopes: ScopeType[] =
			canWrite(this.user.additionalDetails) || !documentId
				? [ScopeType.DocRead, ScopeType.DocWrite, ScopeType.SummaryWrite]
				: [ScopeType.DocRead];
		return generateToken(
			tenantId,
			this.tenantKey,
			scopes,
			documentId,
			this.user,
			this.tokenLifetimeMs
				? Math.round(this.tokenLifetimeMs / 1000)
				: undefined,
		);
	}
}

/**
 * URL resolver that returns explicit, separate orderer (alfred), storage (historian),
 * and delta stream (nexus) endpoints. It understands the request format produced by
 * {@link AzureClient} but, unlike the default resolver, never derives the delta stream or
 * storage endpoints from the orderer, so the configured endpoints are used verbatim.
 */
class EnforcedUrlResolver implements IUrlResolver {
	constructor(
		private readonly ordererUrl: string,
		private readonly storageUrl: string,
		private readonly deltaStreamUrl: string,
		private readonly tenantId: string,
	) {}

	public async resolve(request: IRequest): Promise<IResolvedUrl> {
		const tenantId = this.tenantId;
		const isNew = request.headers?.[DriverHeader.createNew] === true;
		const containerId = isNew ? "new" : this.getContainerId(request.url);
		return {
			endpoints: {
				deltaStorageUrl: `${this.ordererUrl}/deltas/${tenantId}/${containerId}`,
				deltaStreamUrl: this.deltaStreamUrl,
				ordererUrl: this.ordererUrl,
				storageUrl: `${this.storageUrl}/repos/${tenantId}`,
			},
			id: isNew ? "" : containerId,
			tokens: {},
			type: "fluid",
			url: `${this.ordererUrl}/${tenantId}/${containerId}`,
		};
	}

	private getContainerId(url: string): string {
		const rawContainerId = new URL(url).searchParams.get("containerId");
		if (rawContainerId === null) {
			throw new Error("Fluid URL did not contain a containerId");
		}
		return decodeURIComponent(rawContainerId);
	}

	public async getAbsoluteUrl(
		resolvedUrl: IResolvedUrl,
		relativeUrl: string,
	): Promise<string> {
		return `${resolvedUrl.url}/${relativeUrl}`;
	}
}

export interface IEnforcedEndpoints {
	/**
	 * Orderer + host endpoint (alfred).
	 */
	ordererUrl: string;
	/**
	 * Storage endpoint (historian).
	 */
	storageUrl: string;
	/**
	 * Delta stream endpoint (nexus).
	 */
	deltaStreamUrl: string;
	tenantId: string;
	tokenProvider: ITokenProvider;
}

/**
 * Forces an {@link AzureClient} to use the provided orderer (alfred), storage (historian),
 * and delta stream (nexus) endpoints verbatim by swapping in a custom URL resolver and a
 * document service factory with service discovery disabled.
 */
export function enforceServiceEndpoints(
	client: AzureClient,
	endpoints: IEnforcedEndpoints,
): void {
	const { ordererUrl, storageUrl, deltaStreamUrl, tenantId, tokenProvider } =
		endpoints;
	// AzureClient keeps these as private fields; override them to bypass the
	// default single-endpoint + discovery behavior.
	const mutableClient = client as unknown as {
		urlResolver: IUrlResolver;
		documentServiceFactory: IDocumentServiceFactory;
	};
	mutableClient.urlResolver = new EnforcedUrlResolver(
		ordererUrl,
		storageUrl,
		deltaStreamUrl,
		tenantId,
	);
	mutableClient.documentServiceFactory =
		new RouterliciousDocumentServiceFactory(tokenProvider, {
			enableDiscovery: false,
			enableWholeSummaryUpload: true,
		});
}
