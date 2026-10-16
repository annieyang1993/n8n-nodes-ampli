import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { ampliApiRequest } from '../../shared/transport';
import { compact } from '../../shared/utils';

const showOnlyForTemplates = {
	resource: ['template'],
};

export const templateProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForTemplates,
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many templates',
				description: 'Browse the post templates (pass a template name to Generation → Create)',
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				...showOnlyForTemplates,
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				...showOnlyForTemplates,
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				options: [
					{
						name: 'Pin',
						value: 'pin',
					},
					{
						name: 'Slideshow',
						value: 'slideshow',
					},
				],
				default: 'slideshow',
				description: 'Only templates for this post format',
			},
			{
				displayName: 'Platform',
				name: 'platform',
				type: 'options',
				options: [
					{
						name: 'Instagram',
						value: 'instagram',
					},
					{
						name: 'TikTok',
						value: 'tiktok',
					},
				],
				default: 'tiktok',
				description: 'Only templates made for this platform',
			},
			{
				displayName: 'Search',
				name: 'query',
				type: 'string',
				default: '',
				placeholder: 'e.g. dark moody',
				description: 'Rank templates by relevance to these words, e.g. "notes app" or "tweet thread"',
			},
		],
	},
];

export async function executeTemplate(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'getAll') {
		const limit = this.getNodeParameter('limit', itemIndex) as number;
		const filters = this.getNodeParameter('filters', itemIndex, {}) as IDataObject;
		const response = await ampliApiRequest.call(
			this,
			'GET',
			'/templates',
			undefined,
			compact({ ...filters, limit: Math.min(limit, 50) }),
		);
		return (response.templates as IDataObject[] | undefined) ?? [];
	}
	return {};
}
