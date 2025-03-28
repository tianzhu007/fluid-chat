import type { IFluidContainer } from "@fluidframework/fluid-static";
import type { SharedMap } from "@fluidframework/map/lib";
import React from "react";
import {
	type IPointerMessage,
	type IFluidChatUser,
	type Messages,
	SharedMapKeys,
} from "../definitions";
import { getHexCodeColorFromString } from "../utils";
import { Help } from "./Help";
import type { IFluidChatContainerSchema } from "../fluid";

interface IMessageProps {
	content: string;
	sender: string;
	isCurrentUser: boolean;
}
const Message: React.FunctionComponent<IMessageProps> = (
	props: IMessageProps,
) => {
	const body =
		props.content.length > 140
			? `${props.content.substring(0, 140)}...`
			: `${props.content}`;
	const senderColor = getHexCodeColorFromString(props.sender);
	return (
		<div
			className={`message ${props.isCurrentUser ? "current-user" : ""}`.trim()}
		>
			<div className="message-sender">{props.sender}</div>
			<div
				lang="en"
				className="message-content"
				style={{ backgroundColor: `#${senderColor}66` }}
			>
				{body}
			</div>
		</div>
	);
};

interface IPointerMessageProps extends Omit<IMessageProps, "content"> {
	pointer: IPointerMessage["handle"];
}
const PointerMessage: React.FunctionComponent<IPointerMessageProps> = (
	props: IPointerMessageProps,
) => {
	const [content, setContent] = React.useState<string>("Loading...");
	React.useEffect(() => {
		(async () => {
			const map = (await props.pointer.get()) as SharedMap;
			setContent(map.get<string>(SharedMapKeys.content) ?? "");
		})();
	}, [props.pointer]);
	return (
		<Message
			content={content}
			sender={props.sender}
			isCurrentUser={props.isCurrentUser}
		/>
	);
};

const EmptySessionDisplay: React.FunctionComponent = () => {
	return <Help />;
};

interface IMessageDisplayProps {
	container: IFluidContainer<IFluidChatContainerSchema> | undefined;
	user: IFluidChatUser;
}
export const MessagesDisplay: React.FunctionComponent<IMessageDisplayProps> = (
	props,
) => {
	const [messages, setMessages] = React.useState<Messages>([]);

	React.useEffect(() => {
		if (!props.container) {
			return;
		}
		const map: SharedMap = props.container.initialObjects.map as SharedMap;
		const updateMessages = () => {
			setMessages([...(map.get(SharedMapKeys.messages) ?? [])]);
		};
		updateMessages();
		map.on("valueChanged", updateMessages);
		return () => {
			map.off("valueChanged", updateMessages);
		};
	}, [props.container]);

	const messageElements =
		messages === undefined
			? []
			: [...messages].reverse().map((message) => {
					const isCurrentUser = message.sender === props.user.id;
					if (message.type === "plain") {
						return (
							<Message
								key={message.id}
								content={message.content}
								sender={message.sender}
								isCurrentUser={isCurrentUser}
							/>
						);
					}
					if (message.type === "plain-large") {
						return (
							<PointerMessage
								key={message.id}
								pointer={message.handle}
								sender={message.sender}
								isCurrentUser={isCurrentUser}
							/>
						);
					}
					return undefined;
				});
	return (
		<div className="messages">
			{messageElements.length === 0 ? <EmptySessionDisplay /> : messageElements}
		</div>
	);
};
