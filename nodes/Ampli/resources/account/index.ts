import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { ampliApiRequest } from '../../shared/transport';

export const accountProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['account'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many connected accounts',
				description: 'List the connected social accounts (their IDs are what Post → Create takes)',
			},
		],
		default: 'getAll',
	},
];

export async function executeAccount(
	this: IExecuteFunctions,
	operation: string,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'getAll') {
		const response = await ampliApiRequest.call(this, 'GET', '/accounts');
		return (response.accounts as IDataObject[] | undefined) ?? [];
	}
	return {};
}
