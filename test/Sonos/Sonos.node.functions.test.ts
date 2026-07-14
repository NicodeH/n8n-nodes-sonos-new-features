import { createMock } from '@golevelup/ts-jest';
import { promisify } from 'util';
import {
	loadHouseholds,
	loadPlayers,
	getFirstGroup,
	loadFavorites,
	getLastGroup,
	getGroups,
	loadGroups,
} from '../../nodes/Sonos/GenericFunctions';
import { readFile } from 'fs';
import { OptionsWithUrl, RequestPromiseOptions } from 'request-promise-native';
import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';
import { ICredentialDataDecryptedObject, INodeParameters } from 'n8n-workflow';
import { INodeExecutionData, INodeType } from 'n8n-workflow/dist';
import { Sonos } from '../../nodes/Sonos/Sonos.node';
import { SonosOAuth2Api } from '../../credentials/SonosOAuth2Api.credentials';

const readFileAsync = promisify(readFile);

describe('Sonos Node', () => {
	let credentials: Map<string, ICredentialDataDecryptedObject>;
	let nodeParameters: INodeParameters;
	let optionsStub: ILoadOptionsFunctions;
	let executeStub: IExecuteFunctions;
	let node: Sonos;
	beforeEach(() => {
		nodeParameters = {};
		credentials = new Map<string, ICredentialDataDecryptedObject>();
		optionsStub = createMock<ILoadOptionsFunctions>({
			getCredentials: (type: string) => Promise.resolve(credentials.get(type) as any),
			getNodeParameter: (parameterName) => nodeParameters[parameterName],
		});
		executeStub = createMock<IExecuteFunctions>({
			getCredentials: (type: string) => Promise.resolve(credentials.get(type) as any),
			getNodeParameter: (parameterName, _itemIndex, defaultValue) =>
				nodeParameters.hasOwnProperty(parameterName)
					? nodeParameters[parameterName]
					: defaultValue,
		});
		executeStub.helpers.returnJsonArray = (jsonData) => {
			return [{ json: jsonData }] as INodeExecutionData[];
		};
		executeStub.helpers.requestOAuth2 = jest.fn().mockResolvedValue('{}');
		credentials.set('sonosOAuth2Api', {});
		node = new Sonos();

		new SonosOAuth2Api();
	});
	describe('Configuration', () => {
		it('Fetches households', async () => {
			optionsStub.helpers.requestOAuth2 = jest
				.fn()
				.mockImplementation(() => readFileAsync('./test/Sonos/households.response.json', 'utf-8'));
			const result = await loadHouseholds.call(optionsStub);

			expect(result.length).toEqual(1);
			expect(result[0].name).toEqual('Sonos_MyHouseholdId');
			expect(result[0].value).toEqual('Sonos_MyHouseholdId');
		});
		it('Fetches players', async () => {
			optionsStub.helpers.requestOAuth2 = jest
				.fn()
				.mockImplementation(() => readFileAsync('./test/Sonos/groups.response.json', 'utf-8'));
			const result = await loadPlayers.call(optionsStub);

			expect(result.length).toEqual(4);
			expect(result[0].name).toEqual('Sonos Roam');
			expect(result[0].value).toEqual('RINCON_123456');
			expect(result[1].name).toEqual('Sonos Move');
			expect(result[1].value).toEqual('RINCON_1234567');
			expect(result[2].name).toEqual('Hometheater Beam');
			expect(result[2].value).toEqual('RINCON_1234568');
			expect(result[3].name).toEqual('Hometheater Arc');
			expect(result[3].value).toEqual('RINCON_1234569');
		});
		it('Fetches players based on action and capabilities', async () => {
			optionsStub.helpers.requestOAuth2 = jest
				.fn()
				.mockImplementation(() => readFileAsync('./test/Sonos/groups.response.json', 'utf-8'));
			nodeParameters.action = 'loadHomeTheaterPlayback';
			const result = await loadPlayers.call(optionsStub);

			expect(result.length).toEqual(2);
			expect(result[0].name).toEqual('Hometheater Beam');
			expect(result[0].value).toEqual('RINCON_1234568');
			expect(result[1].name).toEqual('Hometheater Arc');
			expect(result[1].value).toEqual('RINCON_1234569');
		});
		it('Fetches players based on action and capabilities', async () => {
			optionsStub.helpers.requestOAuth2 = jest
				.fn()
				.mockImplementation(() => readFileAsync('./test/Sonos/groups.response.json', 'utf-8'));
			nodeParameters.action = 'setTVPowerState';
			const result = await loadPlayers.call(optionsStub);

			expect(result.length).toEqual(1);
			expect(result[0].name).toEqual('Hometheater Arc');
			expect(result[0].value).toEqual('RINCON_1234569');
		});

		it('Fetches all players for group actions so player selection can override the group', async () => {
			optionsStub.helpers.requestOAuth2 = jest
				.fn()
				.mockImplementation(() => readFileAsync('./test/Sonos/groups.response.json', 'utf-8'));
			nodeParameters.action = 'playGroup';
			nodeParameters.household = 'HOUSEHOLD_1';
			nodeParameters.groups = ['RINCON_1234567:1234'];

			const result = await loadPlayers.call(optionsStub);

			expect(result.length).toEqual(4);
			expect(result[0].name).toEqual('Sonos Roam');
			expect(result[0].value).toEqual('RINCON_123456');
			expect(result[1].name).toEqual('Sonos Move');
			expect(result[1].value).toEqual('RINCON_1234567');
			expect(result[2].name).toEqual('Hometheater Beam');
			expect(result[2].value).toEqual('RINCON_1234568');
			expect(result[3].name).toEqual('Hometheater Arc');
			expect(result[3].value).toEqual('RINCON_1234569');
		});

		it('Fetches the first group', async () => {
			optionsStub.helpers.requestOAuth2 = jest
				.fn()
				.mockImplementation(() => readFileAsync('./test/Sonos/groups.response.json', 'utf-8'));
			const result = await getFirstGroup.call(optionsStub);

			expect(result).toEqual('RINCON_1234567:1234');
		});
		it('Fetches the last group', async () => {
			optionsStub.helpers.requestOAuth2 = jest
				.fn()
				.mockImplementation(() => readFileAsync('./test/Sonos/groups.response.json', 'utf-8'));
			const result = await getLastGroup.call(optionsStub);

			expect(result).toEqual('RINCON_1234567:1234');
		});
		it('Fetches all groups in a household', async () => {
			optionsStub.helpers.requestOAuth2 = jest
				.fn()
				.mockImplementation(() => readFileAsync('./test/Sonos/groups.response.json', 'utf-8'));
			const result = await getGroups.call(optionsStub);

			expect(result.length).toEqual(1);
			expect(result[0].id).toEqual('RINCON_1234567:1234');
			expect(result[0].name).toEqual('Sonos Roam + 1');
			expect(result[0].coordinatorId).toEqual('RINCON_1234567');
			expect(result[0].playbackState).toEqual('PLAYBACK_STATE_IDLE');
			expect(result[0].playerIds?.length).toEqual(3);
		});

		it('Loads groups selection options including default and last', async () => {
			optionsStub.helpers.requestOAuth2 = jest
				.fn()
				.mockImplementation(() => readFileAsync('./test/Sonos/groups.response.json', 'utf-8'));
			const result = await loadGroups.call(optionsStub);

			expect(result.length).toEqual(3);
			expect(result[0]).toEqual({ name: 'Sonos Roam + 1 (Default)', value: 'FIRST_GROUP' });
			expect(result[1]).toEqual({ name: 'Last Group', value: 'LAST_GROUP' });
			expect(result[2]).toEqual({ name: 'Sonos Roam + 1', value: 'RINCON_1234567:1234' });
		});

		it.each([
			['pauseGroup', 'pause'],
			['togglePlayPauseGroup', 'togglePlayPause'],
			['skipToNextTrackGroup', 'skipToNextTrack'],
			['skipToPreviousTrackGroup', 'skipToPreviousTrack'],
		])('Executes %s on the default first group', async (action, playbackAction) => {
			let calls: any[] = [];
			executeStub.helpers.requestOAuth2 = jest.fn().mockImplementation((...args: any[]) => {
				const requestOptions = args[1];
				calls.push(requestOptions);
				if (requestOptions.uri.endsWith('/groups')) {
					return readFileAsync('./test/Sonos/groups.response.json', 'utf-8');
				}
				return '{}';
			});
			nodeParameters['action'] = action;
			nodeParameters['household'] = 'HOUSEHOLD_1';

			const result = await node.execute.apply(executeStub);
			const executionResponse = result[0][0] as any;
			expect(executionResponse?.json[0].message).toEqual('ok');
			expect(calls.length).toEqual(2);
			expect(calls[1].uri).toEqual(
				'https://api.ws.sonos.com/control/api/v1/groups/RINCON_1234567:1234/playback/' + playbackAction,
			);
		});

		it.each([
			['pausePlayer', 'pause'],
			['togglePlayPausePlayer', 'togglePlayPause'],
			['skipToNextTrackPlayer', 'skipToNextTrack'],
			['skipToPreviousTrackPlayer', 'skipToPreviousTrack'],
		])('Executes %s on selected players', async (action, playbackAction) => {
			let calls: any[] = [];
			executeStub.helpers.requestOAuth2 = jest.fn().mockImplementation((...args: any[]) => {
				const requestOptions = args[1];
				calls.push(requestOptions);
				return '{}';
			});
			nodeParameters['action'] = action;
			nodeParameters['household'] = 'HOUSEHOLD_1';
			nodeParameters['players'] = ['RINCON_1234568', 'RINCON_1234569'];

			const result = await node.execute.apply(executeStub);
			const executionResponse = result[0][0] as any;
			expect(executionResponse?.json[0].message).toEqual('ok');
			expect(calls.length).toEqual(2);
			expect(calls[0].uri).toEqual(
				'https://api.ws.sonos.com/control/api/v1/players/RINCON_1234568/playback/' + playbackAction,
			);
			expect(calls[1].uri).toEqual(
				'https://api.ws.sonos.com/control/api/v1/players/RINCON_1234569/playback/' + playbackAction,
			);
		});

		it('Sets TV power state on selected players', async () => {
			let calls: any[] = [];
			executeStub.helpers.requestOAuth2 = jest.fn().mockImplementation((...args: any[]) => {
				const requestOptions = args[1];
				calls.push(requestOptions);
				return '{}';
			});
			nodeParameters['action'] = 'setTVPowerState';
			nodeParameters['household'] = 'HOUSEHOLD_1';
			nodeParameters['players'] = ['RINCON_1234568', 'RINCON_1234569'];
			nodeParameters['tvPowerState'] = true;

			const result = await node.execute.apply(executeStub);
			const executionResponse = result[0][0] as any;
			expect(executionResponse?.json[0].message).toEqual('ok');
			expect(calls.length).toEqual(2);
			expect(calls[0].uri).toEqual(
				'https://api.ws.sonos.com/control/api/v1/players/RINCON_1234568/homeTheater/tvPowerState',
			);
			expect(calls[1].uri).toEqual(
				'https://api.ws.sonos.com/control/api/v1/players/RINCON_1234569/homeTheater/tvPowerState',
			);
			expect(calls[0].body).toEqual(JSON.stringify({ tvPowerState: 'ON' }));
		});

		it('Starts home theater playback on selected players', async () => {
			let calls: any[] = [];
			executeStub.helpers.requestOAuth2 = jest.fn().mockImplementation((...args: any[]) => {
				const requestOptions = args[1];
				calls.push(requestOptions);
				return '{}';
			});
			nodeParameters['action'] = 'loadHomeTheaterPlayback';
			nodeParameters['household'] = 'HOUSEHOLD_1';
			nodeParameters['players'] = ['RINCON_1234568', 'RINCON_1234569'];

			const result = await node.execute.apply(executeStub);
			const executionResponse = result[0][0] as any;
			expect(executionResponse?.json[0].message).toEqual('ok');
			expect(calls.length).toEqual(2);
			expect(calls[0].uri).toEqual('https://api.ws.sonos.com/control/api/v1/players/RINCON_1234568/homeTheater');
			expect(calls[1].uri).toEqual('https://api.ws.sonos.com/control/api/v1/players/RINCON_1234569/homeTheater');
		});

		it('Sets home theater options on selected players', async () => {
			let calls: any[] = [];
			executeStub.helpers.requestOAuth2 = jest.fn().mockImplementation((...args: any[]) => {
				const requestOptions = args[1];
				calls.push(requestOptions);
				return '{}';
			});
			nodeParameters['action'] = 'setHomeTheaterOptions';
			nodeParameters['household'] = 'HOUSEHOLD_1';
			nodeParameters['players'] = ['RINCON_1234568', 'RINCON_1234569'];
			nodeParameters['nightMode'] = true;
			nodeParameters['enhanceDialog'] = true;

			const result = await node.execute.apply(executeStub);
			const executionResponse = result[0][0] as any;
			expect(executionResponse?.json[0].message).toEqual('ok');
			expect(calls.length).toEqual(2);
			expect(calls[0].uri).toEqual('https://api.ws.sonos.com/control/api/v1/players/RINCON_1234568/homeTheater/options');
			expect(calls[1].uri).toEqual('https://api.ws.sonos.com/control/api/v1/players/RINCON_1234569/homeTheater/options');
			expect(JSON.parse(calls[0].body)).toEqual({ nightMode: true, enhanceDialog: true });
		});

		it('Plays an Audio Clip', async () => {
			nodeParameters['action'] = 'playAudioClip';
			let callOptions: OptionsWithUrl | any = {};
			nodeParameters['players'] = ['PLAYER_1'];
			nodeParameters['url'] = 'https://url';
			nodeParameters['volume'] = 50;
			executeStub.helpers.requestOAuth2 = jest.fn().mockImplementation((...args: any[]) => {
				callOptions = args[1];
				return readFileAsync('./test/Sonos/playAudioClip.response.json', 'utf-8');
			});
			const result = await node.execute.apply(executeStub);
			const executionResponse = result[0][0] as any;
			expect(executionResponse?.json[0].message).toEqual('ok');

			const responseBody = JSON.parse(callOptions.body);
			expect(responseBody.streamUrl).toEqual('https://url');
			expect(responseBody.volume).toEqual(50);
			expect(callOptions.uri).toEqual(
				'https://api.ws.sonos.com/control/api/v1/players/PLAYER_1/audioClip',
			);
		});

		it('Plays an Audio Clip on a Group', async () => {
			nodeParameters['action'] = 'playAudioClipGroup';
			let callOptions: OptionsWithUrl | any = {};
			nodeParameters['groups'] = ['RINCON_1234567:1234'];
			nodeParameters['url'] = 'https://group-url';
			nodeParameters['volume'] = 30;
			executeStub.helpers.requestOAuth2 = jest.fn().mockImplementation((...args: any[]) => {
				callOptions = args[1];
				return readFileAsync('./test/Sonos/playAudioClip.response.json', 'utf-8');
			});
			const result = await node.execute.apply(executeStub);
			const executionResponse = result[0][0] as any;
			expect(executionResponse?.json[0].message).toEqual('ok');

			const responseBody = JSON.parse(callOptions.body);
			expect(responseBody.streamUrl).toEqual('https://group-url');
			expect(responseBody.volume).toEqual(30);
			expect(callOptions.uri).toEqual(
				'https://api.ws.sonos.com/control/api/v1/groups/RINCON_1234567:1234/audioClip',
			);
		});

		it('Plays a Favorite on a Player', async () => {
			nodeParameters['action'] = 'playFavoritePlayer';
			let callOptions: OptionsWithUrl | any = {};
			nodeParameters['players'] = ['RINCON_1234568'];
			nodeParameters['favorite'] = 'favorite-1';
			nodeParameters['shuffle'] = false;
			nodeParameters['repeat'] = false;
			nodeParameters['crossfade'] = false;
			executeStub.helpers.requestOAuth2 = jest.fn().mockImplementation((...args: any[]) => {
				callOptions = args[1];
				return '{}';
			});
			const result = await node.execute.apply(executeStub);
			const executionResponse = result[0][0] as any;
			expect(executionResponse?.json[0].message).toEqual('ok');

			const responseBody = JSON.parse(callOptions.body);
			expect(responseBody.favoriteId).toEqual('favorite-1');
			expect(callOptions.uri).toEqual(
				'https://api.ws.sonos.com/control/api/v1/players/RINCON_1234568/favorites',
			);
		});

		it('Sets Player Volume', async () => {
			nodeParameters['action'] = 'playerVolume';
			let callOptions: OptionsWithUrl | any = {};
			nodeParameters['players'] = ['RINCON_1234568'];
			nodeParameters['volume'] = 42;
			executeStub.helpers.requestOAuth2 = jest.fn().mockImplementation((...args: any[]) => {
				callOptions = args[1];
				return '{}';
			});
			const result = await node.execute.apply(executeStub);
			const executionResponse = result[0][0] as any;
			expect(executionResponse?.json[0].message).toEqual('ok');
			expect(callOptions.body).toEqual(JSON.stringify({ volume: 42 }));
			expect(callOptions.uri).toEqual(
				'https://api.ws.sonos.com/control/api/v1/players/RINCON_1234568/volume',
			);
		});

		it('Groups all Players', async () => {
			nodeParameters['action'] = 'groupAll';
			let callOptions: OptionsWithUrl | any = {};
			nodeParameters['household'] = 'HOUSEHOLD_1';
			executeStub.helpers.requestOAuth2 = jest.fn().mockImplementation((...args: any[]) => {
				callOptions = args[1];
				if (callOptions.uri.endsWith('/groups')) {
					return readFileAsync('./test/Sonos/groups.response.json', 'utf-8');
				} else {
					return '{}';
				}
			});
			const result = await node.execute.apply(executeStub);
			const executionResponse = result[0][0] as any;
			expect(executionResponse?.json[0].message).toEqual('ok');

			const responseBody = JSON.parse(callOptions.body);
			expect(responseBody.playerIds.length).toEqual(4);
			expect(callOptions.uri).toEqual(
				'https://api.ws.sonos.com/control/api/v1/households/HOUSEHOLD_1/groups/createGroup',
			);
		});

		it('Executes Group Action on First Group', async () => {
			nodeParameters['action'] = 'playGroup';
			let callOptions: OptionsWithUrl | any = {};
			nodeParameters['household'] = 'HOUSEHOLD_1';
			executeStub.helpers.requestOAuth2 = jest.fn().mockImplementation((...args: any[]) => {
				callOptions = args[1];
				if (callOptions.uri.endsWith('/groups')) {
					return readFileAsync('./test/Sonos/groups.response.json', 'utf-8');
				} else {
					return '{}';
				}
			});

			const result = await node.execute.apply(executeStub);
			const executionResponse = result[0][0] as any;
			expect(executionResponse?.json[0].message).toEqual('ok');

			expect(callOptions.body).toEqual(undefined);
			expect(callOptions.uri).toEqual(
				'https://api.ws.sonos.com/control/api/v1/groups/RINCON_1234567:1234/playback/play',
			);
		});

		it('Executes Group Action on a specific selected group', async () => {
			nodeParameters['action'] = 'playGroup';
			let callOptions: OptionsWithUrl | any = {};
			nodeParameters['household'] = 'HOUSEHOLD_1';
			nodeParameters['groups'] = ['RINCON_1234567:1234'];
			executeStub.helpers.requestOAuth2 = jest.fn().mockImplementation((...args: any[]) => {
				callOptions = args[1];
				return '{}';
			});

			const result = await node.execute.apply(executeStub);
			const executionResponse = result[0][0] as any;
			expect(executionResponse?.json[0].message).toEqual('ok');

			expect(callOptions.uri).toEqual(
				'https://api.ws.sonos.com/control/api/v1/groups/RINCON_1234567:1234/playback/play',
			);
		});

		it('Executes Player Action on a selected player', async () => {
			nodeParameters['action'] = 'playPlayer';
			let callOptions: OptionsWithUrl | any = {};
			nodeParameters['household'] = 'HOUSEHOLD_1';
			nodeParameters['players'] = ['RINCON_1234568'];
			executeStub.helpers.requestOAuth2 = jest.fn().mockImplementation((...args: any[]) => {
				callOptions = args[1];
				return '{}';
			});

			const result = await node.execute.apply(executeStub);
			const executionResponse = result[0][0] as any;
			expect(executionResponse?.json[0].message).toEqual('ok');

			expect(callOptions.uri).toEqual(
				'https://api.ws.sonos.com/control/api/v1/players/RINCON_1234568/playback/play',
			);
		});

		it('Applies a volume before starting playback on a group', async () => {
			nodeParameters['action'] = 'playGroup';
			nodeParameters['household'] = 'HOUSEHOLD_1';
			nodeParameters['groups'] = ['RINCON_1234567:1234'];
			nodeParameters['volume'] = 35;
			const calls: any[] = [];
			executeStub.helpers.requestOAuth2 = jest.fn().mockImplementation((...args: any[]) => {
				calls.push(args[1]);
				return '{}';
			});

			await node.execute.apply(executeStub);

			expect(calls[0].uri).toEqual(
				'https://api.ws.sonos.com/control/api/v1/groups/RINCON_1234567:1234/groupVolume',
			);
			expect(calls[0].body).toEqual(JSON.stringify({ volume: 35 }));
			expect(calls[1].uri).toEqual(
				'https://api.ws.sonos.com/control/api/v1/groups/RINCON_1234567:1234/playback/play',
			);
		});

		it('Applies a volume before starting playback on a player', async () => {
			nodeParameters['action'] = 'playPlayer';
			nodeParameters['household'] = 'HOUSEHOLD_1';
			nodeParameters['players'] = ['RINCON_1234568'];
			nodeParameters['volume'] = 42;
			const calls: any[] = [];
			executeStub.helpers.requestOAuth2 = jest.fn().mockImplementation((...args: any[]) => {
				calls.push(args[1]);
				return '{}';
			});

			await node.execute.apply(executeStub);

			expect(calls[0].uri).toEqual(
				'https://api.ws.sonos.com/control/api/v1/players/RINCON_1234568/volume',
			);
			expect(calls[0].body).toEqual(JSON.stringify({ volume: 42 }));
			expect(calls[1].uri).toEqual(
				'https://api.ws.sonos.com/control/api/v1/players/RINCON_1234568/playback/play',
			);
		});

		it('Executes Group Action on Last Group selection', async () => {
			nodeParameters['action'] = 'playGroup';
			let callOptions: OptionsWithUrl | any = {};
			nodeParameters['household'] = 'HOUSEHOLD_1';
			nodeParameters['groups'] = ['LAST_GROUP'];
			executeStub.helpers.requestOAuth2 = jest.fn().mockImplementation((...args: any[]) => {
				callOptions = args[1];
				if (callOptions.uri.endsWith('/groups')) {
					return readFileAsync('./test/Sonos/groups.response.json', 'utf-8');
				} else {
					return '{}';
				}
			});

			const result = await node.execute.apply(executeStub);
			const executionResponse = result[0][0] as any;
			expect(executionResponse?.json[0].message).toEqual('ok');

			expect(callOptions.uri).toEqual(
				'https://api.ws.sonos.com/control/api/v1/groups/RINCON_1234567:1234/playback/play',
			);
		});

		it('Sets Group Volume', async () => {
			nodeParameters['action'] = 'groupVolume';
			let callOptions: OptionsWithUrl | any = {};
			nodeParameters['household'] = 'HOUSEHOLD_1';
			nodeParameters['volume'] = 50;
			executeStub.helpers.requestOAuth2 = jest.fn().mockImplementation((...args: any[]) => {
				callOptions = args[1];
				if (callOptions.uri.endsWith('/groups')) {
					return readFileAsync('./test/Sonos/groups.response.json', 'utf-8');
				} else {
					return '{}';
				}
			});

			const result = await node.execute.apply(executeStub);
			const executionResponse = result[0][0] as any;
			expect(executionResponse?.json[0].message).toEqual('ok');

			expect(callOptions.body).toEqual(JSON.stringify({ volume: 50 }));
			expect(callOptions.uri).toEqual(
				'https://api.ws.sonos.com/control/api/v1/groups/RINCON_1234567:1234/groupVolume',
			);
		});

		it('Plays Sonos Favorite on First Group', async () => {
			nodeParameters['action'] = 'playFavorite';
			let callOptions: OptionsWithUrl | any = {};
			nodeParameters['household'] = 'HOUSEHOLD_1';
			nodeParameters['favorite'] = '1';
			nodeParameters['shuffle'] = true;
			nodeParameters['repeat'] = true;
			nodeParameters['crossfade'] = true;
			executeStub.helpers.requestOAuth2 = jest.fn().mockImplementation((...args: any[]) => {
				callOptions = args[1];
				if (callOptions.uri.endsWith('/groups')) {
					return readFileAsync('./test/Sonos/groups.response.json', 'utf-8');
				} else {
					return '{}';
				}
			});

			const result = await node.execute.apply(executeStub);
			const executionResponse = result[0][0] as any;
			expect(executionResponse?.json[0].message).toEqual('ok');

			const responseBody = JSON.parse(callOptions.body);
			expect(responseBody.favoriteId).toEqual('1');
			expect(responseBody.playModes.shuffle).toEqual(true);
			expect(responseBody.playModes.repeat).toEqual(true);
			expect(responseBody.playModes.crossfade).toEqual(true);
			expect(callOptions.uri).toEqual(
				'https://api.ws.sonos.com/control/api/v1/groups/RINCON_1234567:1234/favorites',
			);
		});

		it('Sets Home Theater Options', async () => {
			nodeParameters['action'] = 'setHomeTheaterOptions';
			nodeParameters['household'] = 'HOUSEHOLD_1';
			nodeParameters['players'] = ['RINCON_1234568'];
			nodeParameters['nightMode'] = true;
			nodeParameters['enhanceDialog'] = true;
			executeStub.helpers.requestOAuth2 = jest.fn().mockImplementation((...args: any[]) =>
				Promise.resolve(
					JSON.stringify({
						nightMode: false,
						enhanceDialog: false,
						groupingLatency: 75,
					}),
				),
			);

			const result = await node.execute.apply(executeStub);
			const executionResponse = result[0][0] as any;
			expect(executionResponse?.json[0].message).toEqual('ok');
		});

		it('Loads Home Theater Playback', async () => {
			nodeParameters['action'] = 'loadHomeTheaterPlayback';
			nodeParameters['household'] = 'HOUSEHOLD_1';
			nodeParameters['players'] = ['RINCON_1234568'];

			const result = await node.execute.apply(executeStub);
			const executionResponse = result[0][0] as any;
			expect(executionResponse?.json[0].message).toEqual('ok');
		});

		it('Sets TV Power State', async () => {
			nodeParameters['action'] = 'setTVPowerState';
			nodeParameters['household'] = 'HOUSEHOLD_1';
			nodeParameters['players'] = ['RINCON_1234569'];

			const result = await node.execute.apply(executeStub);
			const executionResponse = result[0][0] as any;
			expect(executionResponse?.json[0].message).toEqual('ok');
		});
	});
});
