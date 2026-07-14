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
	executePlaybackAction,
	getGroups,
	groupAll,
	loadAllGroups,
	loadFavorites,
	loadGroups,
	loadHomeTheaterPlayback,
	loadHouseholds,
	loadPlayers,
	playAudioClip,
	playFavorite,
	setGroupVolume,
	setHomeTheaterOptions,
	setPlayerVolume,
	setTVPowerState,
} from './GenericFunctions';

export class Sonos implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sonos',
		name: 'sonos',
		icon: 'file:Sonos.svg',
		group: ['output'],
		version: 1,
		description: 'Control your Sonos system',
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
							name: 'Play Audio Clip on Player(s)',
							value: 'playAudioClipPlayer',
							description: 'Plays an audio clip from a URL on one or more selected players',
						},
						{
							name: 'Play Audio Clip on Group(s)',
							value: 'playAudioClipGroup',
							description: 'Plays an audio clip from a URL on one or more selected groups',
						},
						{
							name: 'Play in Group(s)',
							value: 'playGroup',
							description: 'Starts playback on one or more selected groups, or the first group by default',
						},
						{
							name: 'Play on Player(s)',
							value: 'playPlayer',
							description: 'Starts playback on one or more selected players',
						},
						{
							name: 'Play Favorite on Group(s)',
							value: 'playFavoriteGroup',
							description: 'Loads a Sonos favorite and plays it on one or more selected groups',
						},
						{
							name: 'Play Favorite on Player(s)',
							value: 'playFavoritePlayer',
							description: 'Loads a Sonos favorite and plays it on one or more selected players',
						},
						{
							name: 'Pause Group(s)',
							value: 'pauseGroup',
							description: 'Pauses playback on one or more selected groups, or the first group by default',
						},
						{
							name: 'Pause Player(s)',
							value: 'pausePlayer',
							description: 'Pauses playback on one or more selected players',
						},
						{
							name: 'Toggle Play/Pause Group(s)',
							value: 'togglePlayPauseGroup',
							description: 'Toggles playback on one or more selected groups, or the first group by default',
						},
						{
							name: 'Toggle Play/Pause Player(s)',
							value: 'togglePlayPausePlayer',
							description: 'Toggles playback on one or more selected players',
						},
						{
							name: 'Skip Song in Group(s)',
							value: 'skipToNextTrackGroup',
							description: 'Skips to the next track on one or more selected groups, or the first group by default',
						},
						{
							name: 'Skip Song on Player(s)',
							value: 'skipToNextTrackPlayer',
							description: 'Skips to the next track on one or more selected players',
						},
						{
							name: 'Previous Song in Group(s)',
							value: 'skipToPreviousTrackGroup',
							description: 'Jumps to the previous song on one or more selected groups, or the first group by default',
						},
						{
							name: 'Previous Song on Player(s)',
							value: 'skipToPreviousTrackPlayer',
							description: 'Jumps to the previous song on one or more selected players',
						},
						{
							name: 'Group All Players',
							value: 'groupAll',
							description: 'Creates a group using all players available in the selected household',
						},
						{
							name: 'Set Group Volume',
							value: 'setGroupVolume',
							description: 'Sets the volume of one or more selected groups, or uses the first group by default',
						},
						{
							name: 'Set Player Volume',
							value: 'setPlayerVolume',
							description: 'Sets the volume of one or more selected players',
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
							name: 'List All Groups',
							value: 'getAllGroups',
							description: 'Returns all Sonos groups available in the selected household',
						},
					],
				default: '',
				required: true,
			},
			{
				displayName: 'Group(s)',
				name: 'groups',
				type: 'multiOptions' as NodePropertyTypes,
				options: [],
				default: [],
				description:
					'Select one or more groups to target. Leave empty to use the first group by default.',
				displayOptions: {
					show: {
						action: [
							'playGroup',
							'pauseGroup',
							'togglePlayPauseGroup',
							'skipToNextTrackGroup',
							'skipToPreviousTrackGroup',
							'setGroupVolume',
							'playFavoriteGroup',
							'playAudioClipGroup',
						],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'loadGroups',
					loadOptionsDependsOn: ['household'],
				},
			},
			{
				displayName: 'Player(s)',
				name: 'players',
				type: 'multiOptions' as NodePropertyTypes,
				options: [],
				default: [],
				description:
					'For player-level actions, choose one or more target players. For group-level actions, this field is hidden.',
				displayOptions: {
					show: {
						action: [
							'playAudioClipPlayer',
							'setHomeTheaterOptions',
							'loadHomeTheaterPlayback',
							'setTVPowerState',
							'playPlayer',
							'pausePlayer',
							'togglePlayPausePlayer',
							'skipToNextTrackPlayer',
							'skipToPreviousTrackPlayer',
							'playFavoritePlayer',
							'setPlayerVolume',
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
						action: ['playFavoriteGroup', 'playFavoritePlayer', 'playFavorite'],
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
						action: ['playFavoriteGroup', 'playFavoritePlayer', 'playFavorite'],
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
						action: ['playFavoriteGroup', 'playFavoritePlayer', 'playFavorite'],
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
						action: [
							'playAudioClipPlayer',
							'playAudioClipGroup',
							'playAudioClip',
							'playGroup',
							'playPlayer',
							'playFavoriteGroup',
							'playFavoritePlayer',
							'setGroupVolume',
							'groupVolume',
							'setPlayerVolume',
							'playerVolume',
						],
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
						action: ['playAudioClipPlayer', 'playAudioClipGroup', 'playAudioClip'],
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
						action: ['playFavoriteGroup', 'playFavoritePlayer', 'playFavorite'],
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
			loadGroups,
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
				case 'playAudioClipPlayer':
					await playAudioClip.call(this, 'player');
					break;
				case 'playAudioClipGroup':
					await playAudioClip.call(this, 'group');
					break;
				case 'groupAll':
					await groupAll.call(this);
					break;
				case 'playGroup':
					await executePlaybackAction.call(this, 'play', 'group');
					break;
				case 'pauseGroup':
					await executePlaybackAction.call(this, 'pause', 'group');
					break;
				case 'togglePlayPauseGroup':
					await executePlaybackAction.call(this, 'togglePlayPause', 'group');
					break;
				case 'skipToNextTrackGroup':
					await executePlaybackAction.call(this, 'skipToNextTrack', 'group');
					break;
				case 'skipToPreviousTrackGroup':
					await executePlaybackAction.call(this, 'skipToPreviousTrack', 'group');
					break;
				case 'playPlayer':
					await executePlaybackAction.call(this, 'play', 'player');
					break;
				case 'pausePlayer':
					await executePlaybackAction.call(this, 'pause', 'player');
					break;
				case 'togglePlayPausePlayer':
					await executePlaybackAction.call(this, 'togglePlayPause', 'player');
					break;
				case 'skipToNextTrackPlayer':
					await executePlaybackAction.call(this, 'skipToNextTrack', 'player');
					break;
				case 'skipToPreviousTrackPlayer':
					await executePlaybackAction.call(this, 'skipToPreviousTrack', 'player');
					break;
				case 'playFavorite':
				case 'playFavoriteGroup':
					await playFavorite.call(this, 'group');
					break;
				case 'playFavoritePlayer':
					await playFavorite.call(this, 'player');
					break;
				case 'groupVolume':
				case 'setGroupVolume':
					await setGroupVolume.call(this);
					break;
				case 'playerVolume':
				case 'setPlayerVolume':
					await setPlayerVolume.call(this);
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
