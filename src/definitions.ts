import type { AzureContainerServices } from "@fluidframework/azure-client";
import type { IFluidContainer } from "@fluidframework/fluid-static";
import type { SharedMap } from "@fluidframework/map";
import type { IFluidChatContainerSchema } from "./fluid";

export const QueryStringKeys = Object.freeze({
	initialPayload: "initialpayload",
	readOnly: "readonly",
});
export const SharedMapKeys = Object.freeze({
	messages: "messages",
	content: "content",
});

export type Theme = "dark" | "light";

export interface IFluidDocument {
	container: IFluidContainer<IFluidChatContainerSchema>;
	services: AzureContainerServices;
	id: string;
}

export interface IMessage {
	id: string;
	type: "plain" | "plain-large";
	sender: string;
}
/**
 * Message contents stored directly in object within messages array.
 */
export interface IPlainMessage extends IMessage {
	type: "plain";
	content: string;
}
/**
 * Pointer to message contents stored in map key-value or other DDS.
 */
export interface IPointerMessage extends IMessage {
	type: "plain-large";
	handle: SharedMap["handle"];
}
export type Messages = (IPlainMessage | IPointerMessage)[];
export interface IFluidChatUser {
	id: string;
	temp: boolean;
	permissions: ("read" | "write")[];
}

export interface IServiceConfig {
	/**
	 * Orderer + host endpoint (alfred).
	 */
	serviceEndpoint: string;
	tenantId: string;
	tenantKey: string;
	/**
	 * Delta stream endpoint (nexus). When set together with {@link IServiceConfig.storageEndpoint},
	 * these endpoints are enforced verbatim instead of relying on service discovery from the orderer.
	 */
	deltaStreamEndpoint?: string;
	/**
	 * Storage endpoint (historian). When set together with {@link IServiceConfig.deltaStreamEndpoint},
	 * these endpoints are enforced verbatim instead of relying on service discovery from the orderer.
	 */
	storageEndpoint?: string;
}
