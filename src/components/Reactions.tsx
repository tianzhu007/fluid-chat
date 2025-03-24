import type { IFluidContainer } from "@fluidframework/fluid-static";
import React from "react";
import {
	RiThumbUpFill,
	RiThumbDownFill,
	RiEmotionHappyFill,
	RiEmotionNormalFill,
	RiEmotionLaughFill,
	RiEmotionSadFill,
} from "react-icons/ri";
import { v4 as uuid } from "uuid";
import type { IFluidChatUser } from "../definitions";
import type { INotification } from "./NotificationDisplay";
import type { IFluidChatContainerSchema } from "../fluid";

export enum Reaction {
	Like = "like",
	Dislike = "dislike",
	Happy = "happy",
	Meh = "meh",
	Laugh = "laugh",
	Sad = "sad",
}

export const ReactionToEmojiMap: { [key in Reaction]: JSX.Element } = {
	[Reaction.Like]: <RiThumbUpFill />,
	[Reaction.Dislike]: <RiThumbDownFill />,
	[Reaction.Happy]: <RiEmotionHappyFill />,
	[Reaction.Meh]: <RiEmotionNormalFill />,
	[Reaction.Laugh]: <RiEmotionLaughFill />,
	[Reaction.Sad]: <RiEmotionSadFill />,
};

export interface IReactionMenuProps {
	container: IFluidContainer<IFluidChatContainerSchema> | undefined;
	user: IFluidChatUser;
}

export const ReactionMenu: React.FunctionComponent<IReactionMenuProps> = ({
	container,
	user,
}) => {
	const handleReaction = React.useCallback(
		(reaction: Reaction) => {
			const signaler = container?.initialObjects.signaler;
			const reactionNotification: INotification = {
				id: uuid(),
				type: "reaction",
				sender: user,
				content: reaction,
			};
			signaler?.submitSignal("notification", reactionNotification);
		},
		[container, user],
	);

	return (
		<div className="reaction-menu">
			{Object.values(Reaction).map((reaction) => (
				<button
					key={reaction}
					type="button"
					className="reaction-button"
					onClick={() => handleReaction(reaction)}
					disabled={!container}
				>
					{ReactionToEmojiMap[reaction]}
				</button>
			))}
			<span className="reaction-menu-title">React</span>
		</div>
	);
};
