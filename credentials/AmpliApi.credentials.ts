import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AmpliApi implements ICredentialType {
	name = 'ampliApi';

	displayName = 'Ampli API';

	icon: Icon = { light: 'file:../icons/ampli.svg', dark: 'file:../icons/ampli.dark.svg' };

	documentationUrl = 'https://github.com/annieyang1993/n8n-nodes-ampli#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Personal API key from Settings → API Keys in Ampli (it starts with vf_)',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://www.useampli.com/api/v1',
			description: 'Only change this if you use Ampli on another domain',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/me',
			method: 'GET',
		},
	};
}
