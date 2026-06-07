import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodePropertyTypes,
} from 'n8n-workflow';
import {
	executeGroupAction,
	getGroups,
	groupAll,
	loadGroups,
	loadAllGroups,
	loadFavorites,
	loadHomeTheaterPlayback,
	loadHouseholds,
	loadPlayers,
	playAudioClip,
	playFavorite,
	setGroupVolume,
	setHomeTheaterOptions,
	setTVPowerState,
} from './GenericFunctions';

export class Sonos implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sonos',
		name: 'sonos',
		icon: 'file:Sonos.svg',
		group: ['output'],
		version: 1,
		description: 'Control your Sonos system.',
		defaults: {
			name: 'Sonos',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'sonosOAuth2Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Household',
				name: 'household',
				type: 'options' as NodePropertyTypes,
				options: [],
				default: '',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'loadHouseholds',
				},
			},
			{
				displayName: 'Action',
				name: 'action',
				type: 'options' as NodePropertyTypes,
				options: [
					{
						name: 'Play Audio Clip',
						value: 'playAudioClip',
						description: 'Plays an audio file from a URL on one of your players',
					},
					{
						name: 'Play in Group',
						value: 'play',
						description: 'Starts playback on all members of the selected group, or first group by default. Selecting a player will target that player instead.',
					},
					{
						name: 'Play Favorite in Group',
						value: 'playFavorite',
						description: 'Loads a Sonos favorite and plays it on the first group found in your Sonos system',
					},
					{
						name: 'Pause in Group',
						value: 'pause',
						description: 'Pauses playback on all members of the selected group, or first group by default. Selecting a player will target that player instead.',
					},
					{
						name: 'Toggle Play/Pause in Group',
						value: 'togglePlayPause',
						description: 'Toggles playback on all members of the selected group, or first group by default. Selecting a player will target that player instead.',
					},
					{
						name: 'Skip Song in Group',
						value: 'skipToNextTrack',
						description: 'Skips to the next track on all members of the selected group, or first group by default. Selecting a player will target that player instead.',
					},
					{
						name: 'Previous Song in Group',
						value: 'skipToPreviousTrack',
						description: 'Jumps to the previous song on all members of the selected group, or first group by default. Selecting a player will target that player instead.',
					},
					{
						name: 'Group All Players',
						value: 'groupAll',
						description: 'Groups all players in your system',
					},
					{
						name: 'Set Group Volume',
						value: 'groupVolume',
						description: 'Sets the volume of the selected group, or first group by default',
					},
					{
						name: 'Set Home Theater Options',
						value: 'setHomeTheaterOptions',
						description: 'Sets the options of your home theater like night mode or enhance dialog',
					},
					{
						name: 'Start Home Theater Playback',
						value: 'loadHomeTheaterPlayback',
						description: 'Starts the home theater playback',
					},
					{
						name: 'Set TV Power State',
						value: 'setTVPowerState',
						description: 'Sets the TV power state',
					},
					{
						name: 'Get All Groups',
						value: 'getAllGroups',
						description: 'Gather all the groups in the household',
					},
				],
				default: '',
				required: true,
			},
			{
				displayName: 'Group / Member Selection',
				name: 'group',
				type: 'options' as NodePropertyTypes,
				options: [
					{
						name: 'Default (First Group)',
						value: '',
					},
				],
				default: '',
				description:
					'Select a group to target all its members, or leave empty to use the first group by default',
				displayOptions: {
					show: {
						action: ['play', 'pause', 'togglePlayPause', 'skipToNextTrack', 'skipToPreviousTrack', 'groupVolume'],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'loadGroups',
					loadOptionsDependsOn: ['household'],
				},
			},
			{
				displayName: 'Player',
				name: 'player',
				type: 'options' as NodePropertyTypes,
				options: [],
				default: '',
				description: 'For player-level actions, choose the target player. For playback actions, a player selection overrides the group.',
				displayOptions: {
					show: {
						action: [
							'playAudioClip',
							'setHomeTheaterOptions',
							'loadHomeTheaterPlayback',
							'setTVPowerState',
							'play',
							'pause',
							'togglePlayPause',
							'skipToNextTrack',
							'skipToPreviousTrack',
						],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'loadPlayers',
					loadOptionsDependsOn: ['household', 'action'],
				},
			},
			{
				displayName: 'Favorite',
				name: 'favorite',
				type: 'options' as NodePropertyTypes,
				options: [],
				default: '',
				required: true,
				displayOptions: {
					show: {
						action: ['playFavorite'],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'loadFavorites',
					loadOptionsDependsOn: ['household'],
				},
			},
			{
				displayName: 'Shuffle',
				name: 'shuffle',
				type: 'boolean' as NodePropertyTypes,
				default: true,
				required: true,
				displayOptions: {
					show: {
						action: ['playFavorite'],
					},
				},
			},
			{
				displayName: 'Repeat',
				name: 'repeat',
				type: 'boolean' as NodePropertyTypes,
				default: true,
				required: true,
				displayOptions: {
					show: {
						action: ['playFavorite'],
					},
				},
			},
			{
				displayName: 'Volume',
				name: 'volume',
				type: 'number' as NodePropertyTypes,
				default: 50,
				required: true,
				typeOptions: {
					maxValue: 100,
					minValue: 1,
					numberStepSize: 1,
				},
				displayOptions: {
					show: {
						action: ['playAudioClip', 'groupVolume'],
					},
				},
			},
			{
				displayName: 'Soundfile',
				name: 'url',
				type: 'string' as NodePropertyTypes,
				default: 'http://www.moviesoundclips.net/effects/animals/wolf-howls.mp3',
				required: true,
				displayOptions: {
					show: {
						action: ['playAudioClip'],
					},
				},
			},
			{
				displayName: 'Crossfade',
				name: 'crossfade',
				type: 'boolean' as NodePropertyTypes,
				default: true,
				required: true,
				displayOptions: {
					show: {
						action: ['playFavorite'],
					},
				},
			},
			{
				displayName: 'Night Mode',
				name: 'nightMode',
				type: 'boolean' as NodePropertyTypes,
				default: false,
				displayOptions: {
					show: {
						action: ['setHomeTheaterOptions'],
					},
				},
			},
			{
				displayName: 'Enhance Dialog',
				name: 'enhanceDialog',
				type: 'boolean' as NodePropertyTypes,
				default: false,
				displayOptions: {
					show: {
						action: ['setHomeTheaterOptions'],
					},
				},
			},
			{
				displayName: 'Power State',
				name: 'tvPowerState',
				type: 'boolean' as NodePropertyTypes,
				default: false,
				displayOptions: {
					show: {
						action: ['setTVPowerState'],
					},
				},
			},
		],
	};

	methods = {
		loadOptions: {
			loadHouseholds,
			loadFavorites,
			loadPlayers,
			loadAllGroups,

		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = this.getCredentials('sonosOAuth2Api');
		const returnData: IDataObject[] = [];
		try {
			if (credentials === undefined) {
				throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
			}
			const action = this.getNodeParameter('action', 0);
			switch (action) {
				case 'playAudioClip':
					await playAudioClip.call(this);
					break;
				case 'groupAll':
					await groupAll.call(this);
					break;
				case 'play':
				case 'pause':
				case 'togglePlayPause':
				case 'skipToNextTrack':
				case 'skipToPreviousTrack':
					await executeGroupAction.call(this, action);
					break;
				case 'playFavorite':
					await playFavorite.call(this);
					break;
				case 'groupVolume':
					await setGroupVolume.call(this);
					break;
				case 'setTVPowerState':
					await setTVPowerState.call(this);
					break;
				case 'loadHomeTheaterPlayback':
					await loadHomeTheaterPlayback.call(this);
					break;
				case 'setHomeTheaterOptions':
					await setHomeTheaterOptions.call(this);
					break;
				case 'getAllGroups': {
					const groups = await getGroups.call(this);
					for (const group of groups) {
						returnData.push(group as unknown as IDataObject);
					}
					return [this.helpers.returnJsonArray(returnData)];
				}
				default:
					throw new NodeOperationError(this.getNode(), 'Unknown method or not implemented');
			}
			returnData.push({ message: 'ok' });
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({ error: error.message });
			} else {
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
