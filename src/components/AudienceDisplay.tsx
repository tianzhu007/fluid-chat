import React from "react";
import type { AzureMember, IAzureAudience } from "@fluidframework/azure-client";
import { RiUserFill } from "react-icons/ri";
import type { IFluidChatUser } from "../definitions";
import { getHexCodeColorFromString } from "../utils";

export interface IAudienceDisplayProps {
	audience: IAzureAudience | undefined;
	currentUser: IFluidChatUser;
}

export const AudienceDisplay: React.FunctionComponent<IAudienceDisplayProps> = (
	props: IAudienceDisplayProps,
) => {
	const [members, setMembers] = React.useState<Set<string>>(new Set());
	React.useEffect(() => {
		if (!props.audience) return;
		const audience = props.audience;
		const updateMembers = () => {
			const allMembers = audience.getMembers();
			setMembers(
				new Set(Array.from(allMembers.entries()).map(([, m]) => m.id)),
			);
		};
		const memberAddListener = (clientId: string, member: AzureMember) => {
			console.log("Audience Member Added: ", clientId, member.id);
			updateMembers();
		};
		audience.on("memberAdded", memberAddListener);
		const memberRemoveListener = (clientId: string, member: AzureMember) => {
			console.log("Audience Member Removed: ", clientId, member.id);
			updateMembers();
		};
		audience.on("memberRemoved", memberRemoveListener);
		return () => {
			audience.off("memberAdded", memberAddListener);
			audience.off("memberRemoved", memberRemoveListener);
		};
	}, [props.audience]);

	React.useEffect(() => {
		console.log("Audience Loaded: ", Array.from(members).toString());
	}, [members]);

	return (
		<div className="audience">
			{Array.from(members).map((userId) => {
				const userColor = getHexCodeColorFromString(userId);
				const style: React.CSSProperties = {
					backgroundColor: `#${userColor}66`,
				};
				if (userId === props.currentUser.id) {
					style.border = `3px solid #${userColor}`;
				}
				return (
					<div
						className="audience-member"
						key={userId}
						style={style}
						title={userId}
					>
						<RiUserFill />{" "}
						<span style={{ marginLeft: "0.4em" }}>
							{userId
								.split("-")
								.map((part) => part[0].toUpperCase())
								.join("")}
						</span>
					</div>
				);
			})}
		</div>
	);
};
