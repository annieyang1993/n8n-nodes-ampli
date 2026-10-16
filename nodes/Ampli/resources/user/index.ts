import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { ampliApiRequest } from '../../shared/transport';

export const userProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get the current user',
				description: 'Get the account behind the API key, with its credit balance and products',
			},
		],
		default: 'get',
	},
];

export async function executeUser(
	this: IExecuteFunctions,
	operation: string,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'get') {
		const response = await ampliApiRequest.call(this, 'GET', '/me');
		return (response.user as IDataObject | undefined) ?? response;
	}
	return {};
}
