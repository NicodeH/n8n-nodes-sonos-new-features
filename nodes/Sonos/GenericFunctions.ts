import { IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions } from 'n8n-core';
import { OptionsWithUri } from 'request';
import { INodePropertyOptions } from 'n8n-workflow';

interface SonosItem {
	id: string;
	name?: string;
	description?: string;
	capabilities: string[];
	deviceIds?: string[];
}

interface SonosResponse {
	players?: SonosItem[];
	groups?: SonosGroup[];
	households?: SonosItem[];
	items?: SonosItem[];
}

interface SonosGroup {
	id: string;
	name?: string;
	coordinatorId: string;
	playbackState: string;
	playerIds?: string[];
}

const FIRST_GROUP = 'FIRST_GROUP';
const LAST_GROUP = 'LAST_GROUP';

export async function playAudioClip(this: IExecuteFunctions): Promise<void> {
	const playerIds = (this.getNodeParameter('players', 0) as string[]) ?? [];
	if (!playerIds.length) {
		throw new Error('Please select at least one player for the audio clip.');
	}
	const body = JSON.stringify({
		name: 'n8n',
		appId: 'com.n8n.sonos',
		streamUrl: this.getNodeParameter('url', 0),
		clipType: 'CUSTOM',
		volume: this.getNodeParameter('volume', 0),
	});
	for (const playerId of playerIds) {
		const options: OptionsWithUri = {
			headers: {
				'Content-Type': 'application/json',
			},
			method: 'POST',
			body,
			uri: 'https://api.ws.sonos.com/control/api/v1/players/' + playerId + '/audioClip',
		};
		await this.helpers.requestOAuth2.call(this, 'sonosOAuth2Api', options);
	}
}

export async function groupAll(this: IExecuteFunctions): Promise<void> {
	const household = this.getNodeParameter('household', 0);
	const players = await loadPlayers.call(this);
	const playerIds = players.map((player) => player.value);
	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method: 'POST',
		body: JSON.stringify({
			playerIds,
		}),
		uri: 'https://api.ws.sonos.com/control/api/v1/households/' + household + '/groups/createGroup',
	};
	await this.helpers.requestOAuth2.call(this, 'sonosOAuth2Api', options);
}

export async function executePlaybackAction(
	this: IExecuteFunctions,
	action: string,
	target: 'group' | 'player',
): Promise<void> {
	if (target === 'player') {
		const selectedPlayerIds = (this.getNodeParameter('players', 0) as string[]) ?? [];
		if (!selectedPlayerIds.length) {
			throw new Error('Please select at least one player.');
		}
		for (const playerId of selectedPlayerIds) {
			const options: OptionsWithUri = {
				headers: {
					'Content-Type': 'application/json',
				},
				method: 'POST',
				uri: 'https://api.ws.sonos.com/control/api/v1/players/' + playerId + '/playback/' + action,
			};
			await this.helpers.requestOAuth2.call(this, 'sonosOAuth2Api', options);
		}
		return;
	}

	let selectedGroupIds = (this.getNodeParameter('groups', 0) as string[]) ?? [];
	if (!selectedGroupIds.length) {
		selectedGroupIds = [FIRST_GROUP];
	}

	const groups: string[] = [];
	for (const selectedGroupId of selectedGroupIds) {
		if (selectedGroupId === FIRST_GROUP) {
			const firstGroupId = await getFirstGroup.call(this);
			if (firstGroupId) {
				groups.push(firstGroupId);
			}
		} else if (selectedGroupId === LAST_GROUP) {
			const lastGroupId = await getLastGroup.call(this);
			if (lastGroupId) {
				groups.push(lastGroupId);
			}
		} else {
			groups.push(selectedGroupId);
		}
	}

	if (!groups.length) {
		throw new Error('No group available for the selected household.');
	}

	for (const groupId of Array.from(new Set(groups))) {
		const options: OptionsWithUri = {
			headers: {
				'Content-Type': 'application/json',
			},
			method: 'POST',
			uri: 'https://api.ws.sonos.com/control/api/v1/groups/' + groupId + '/playback/' + action,
		};
		await this.helpers.requestOAuth2.call(this, 'sonosOAuth2Api', options);
	}
}

export async function playFavorite(this: IExecuteFunctions): Promise<void> {
	const selectedGroupIds = this.getNodeParameter('groups', 0, []) as string[];
	const groupIds = selectedGroupIds.length ? selectedGroupIds : [FIRST_GROUP];
	const body = JSON.stringify({
		action: 'replace',
		playOnCompletion: true,
		favoriteId: this.getNodeParameter('favorite', 0),
		playModes: {
			shuffle: this.getNodeParameter('shuffle', 0),
			repeat: this.getNodeParameter('repeat', 0),
			crossfade: this.getNodeParameter('crossfade', 0),
		},
	});
	for (const selectedGroupId of groupIds) {
		let groupId = selectedGroupId;
		if (groupId === FIRST_GROUP) {
			groupId = await getFirstGroup.call(this);
		} else if (groupId === LAST_GROUP) {
			groupId = await getLastGroup.call(this);
		}
		if (!groupId) {
			throw new Error('No group available for the selected household.');
		}
		const options: OptionsWithUri = {
			headers: {
				'Content-Type': 'application/json',
			},
			body,
			method: 'POST',
			uri: 'https://api.ws.sonos.com/control/api/v1/groups/' + groupId + '/favorites',
		};
		await this.helpers.requestOAuth2.call(this, 'sonosOAuth2Api', options);
	}
}

export async function setGroupVolume(this: IExecuteFunctions): Promise<void> {
	const selectedGroupIds = this.getNodeParameter('groups', 0, []) as string[];
	const groupIds = selectedGroupIds.length ? selectedGroupIds : [FIRST_GROUP];
	const body = JSON.stringify({
		volume: this.getNodeParameter('volume', 0),
	});
	for (const selectedGroupId of groupIds) {
		let groupId = selectedGroupId;
		if (groupId === FIRST_GROUP) {
			groupId = await getFirstGroup.call(this);
		} else if (groupId === LAST_GROUP) {
			groupId = await getLastGroup.call(this);
		}
		if (!groupId) {
			throw new Error('No group available for the selected household.');
		}
		const options: OptionsWithUri = {
			headers: {
				'Content-Type': 'application/json',
			},
			body,
			method: 'POST',
			uri: 'https://api.ws.sonos.com/control/api/v1/groups/' + groupId + '/groupVolume',
		};
		await this.helpers.requestOAuth2.call(this, 'sonosOAuth2Api', options);
	}
}

export async function callSonosApi(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	path: string,
): Promise<SonosResponse> {
	if (!this || !this.helpers || !this.helpers.requestOAuth2) {
		throw Error();
	}
	const credentials = this.getCredentials('sonosOAuth2Api');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		uri: 'https://api.ws.sonos.com/control/api/v1/' + path,
	};

	//@ts-ignore
	return JSON.parse(
		await this.helpers.requestOAuth2.call(this, 'sonosOAuth2Api', options),
	) as SonosResponse;
}

export async function loadPlayers(
	this: ILoadOptionsFunctions | IExecuteFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const action = this.getNodeParameter('action', 0) as string;

	let data;
	try {
		const household = this.getNodeParameter('household', 0) as string;
		if (!household) {
			return returnData;
		}
		data = await callSonosApi.call(this, 'GET', `/households/${household}/groups`);
	} catch (err) {
		if (err.message === 'No credentials got returned!') {
			return returnData;
		}
		throw new Error(`SONOS Error: ${err}`);
	}

	for (const player of data.players!) {

		if (action === 'setHomeTheaterOptions' || action === 'loadHomeTheaterPlayback') {
			if (player.capabilities.includes('HT_PLAYBACK')) {
				returnData.push({
					name: player.name as string,
					value: player.id as string,
				});
			}
		} else if (action === 'setTVPowerState') {
			if (player.capabilities.includes('HT_POWER_STATE')) {
				returnData.push({
					name: player.name as string,
					value: player.id as string,
				});
			}
		} else {
			returnData.push({
				name: player.name as string,
				value: player.id as string,
			});
		}
	}
	return returnData;
}



// Function to get all groups in a household
export async function getGroups(
	this: ILoadOptionsFunctions | IExecuteFunctions,
): Promise<SonosGroup[]> {
	let data;

	try {
		const household = this.getNodeParameter('household', 0) as string;
		if (!household) {
			return [];
		}
		data = await callSonosApi.call(this, 'GET', `/households/${household}/groups`);
	} catch (err) {
		if (err.message === 'No credentials got returned!') {
			return [];
		}
		throw new Error(`SONOS Error: ${err}`);
	}

	if (!data || !data.groups) {
		return [];
	}

	return data.groups;
}

// Function the first group id in the list
export async function getFirstGroup(
	this: ILoadOptionsFunctions | IExecuteFunctions,
): Promise<string> {
	const groups = await getGroups.call(this);
	return groups[0]?.id || '';
}

// Function the last group id in the list
export async function getLastGroup(
	this: ILoadOptionsFunctions | IExecuteFunctions,
): Promise<string> {
	const groups = await getGroups.call(this);
	return groups[groups.length - 1]?.id || '';
}

// Alias for getGroups - loads all groups in the household
export async function loadAllGroups(
	this: ILoadOptionsFunctions | IExecuteFunctions,
): Promise<INodePropertyOptions[]> {
	const groups = await getGroups.call(this);
	const returnData: INodePropertyOptions[] = [];
	if (groups.length) {
		returnData.push({
			name: `${groups[0].name ?? groups[0].id} (Default)`,
			value: FIRST_GROUP,
		});
		returnData.push({
			name: 'Last Group',
			value: LAST_GROUP,
		});
	}

	returnData.push(
		...groups.map((group) => ({
			name: group.name ?? group.id,
			value: group.id,
		})),
	);

	return returnData;
}

export async function loadGroups(
	this: ILoadOptionsFunctions | IExecuteFunctions,
): Promise<INodePropertyOptions[]> {
	return loadAllGroups.call(this);
}

export async function loadHouseholds(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];

	let data;
	try {
		data = await callSonosApi.call(this, 'GET', '/households');
	} catch (err) {
		if (err.message === 'No credentials got returned!') {
			return returnData;
		}
		throw new Error(`SONOS Error: ${err}`);
	}

	for (const household of data.households!) {
		returnData.push({
			name: household.id as string,
			value: household.id as string,
		});
	}
	return returnData;
}

export async function loadFavorites(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const household = this.getNodeParameter('household', 0) as string;
	if (!household) {
		return returnData;
	}

	let data;
	try {
		data = await callSonosApi.call(this, 'GET', '/households/' + household + '/favorites');
	} catch (err) {
		if (err.message === 'No credentials got returned!') {
			return returnData;
		}
		throw new Error(`SONOS Error: ${err}`);
	}

	for (const favorite of data.items!) {
		returnData.push({
			name: favorite.name as string,
			description: favorite.description as string,
			value: favorite.id as string,
		});
	}
	return returnData;
}

export async function setTVPowerState(this: IExecuteFunctions): Promise<void> {
	const playerIds = (this.getNodeParameter('players', 0) as string[]) ?? [];
	if (!playerIds.length) {
		throw new Error('Please select at least one player.');
	}
	const tvPowerState = this.getNodeParameter('tvPowerState', 0);
	for (const playerId of playerIds) {
		const options: OptionsWithUri = {
			headers: {
				'Content-Type': 'application/json',
			},
			method: 'POST',
			body: JSON.stringify({
				tvPowerState: tvPowerState ? 'ON' : 'STANDBY',
			}),
			uri: 'https://api.ws.sonos.com/control/api/v1/players/' + playerId + '/homeTheater/tvPowerState',
		};
		await this.helpers.requestOAuth2.call(this, 'sonosOAuth2Api', options);
	}
}

export async function loadHomeTheaterPlayback(this: IExecuteFunctions): Promise<void> {
	const playerIds = (this.getNodeParameter('players', 0) as string[]) ?? [];
	if (!playerIds.length) {
		throw new Error('Please select at least one player.');
	}
	for (const playerId of playerIds) {
		const options: OptionsWithUri = {
			headers: {
				'Content-Type': 'application/json',
			},
			method: 'POST',
			uri: 'https://api.ws.sonos.com/control/api/v1/players/' + playerId + '/homeTheater',
		};
		await this.helpers.requestOAuth2.call(this, 'sonosOAuth2Api', options);
	}
}

export async function setHomeTheaterOptions(this: IExecuteFunctions): Promise<void> {
	const playerIds = (this.getNodeParameter('players', 0) as string[]) ?? [];
	if (!playerIds.length) {
		throw new Error('Please select at least one player.');
	}
	const nightMode = this.getNodeParameter('nightMode', 0);
	const enhanceDialog = this.getNodeParameter('enhanceDialog', 0);
	for (const playerId of playerIds) {
		const options: OptionsWithUri = {
			headers: {
				'Content-Type': 'application/json',
			},
			method: 'POST',
			body: JSON.stringify({
				enhanceDialog,
				nightMode,
			}),
			uri: 'https://api.ws.sonos.com/control/api/v1/players/' + playerId + '/homeTheater/options',
		};
		await this.helpers.requestOAuth2.call(this, 'sonosOAuth2Api', options);
	}
}
