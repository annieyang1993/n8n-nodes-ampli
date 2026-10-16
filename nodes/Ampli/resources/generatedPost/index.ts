import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { ampliApiRequest } from '../../shared/transport';
import { compact } from '../../shared/utils';

const showOnlyForGeneratedPosts = {
	resource: ['generatedPost'],
};

export const generatedPostProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForGeneratedPosts,
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a generated post',
				description: 'Get the full record of one generated post',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many generated posts',
				description: 'List the generated-post library, newest first',
			},
			{
				name: 'Get Media',
				value: 'getMedia',
				action: 'Get the media of a generated post',
				description: 'Render (or fetch the cached render of) a generated post as hosted images or a video',
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Generated Post ID',
		name: 'generatedPostId',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 8c4e1f0a-1b2c-4d3e-9f8a-7b6c5d4e3f2a',
		description: 'The ID of the generated post (from Get Many or a completed generation)',
		displayOptions: {
			show: {
				...showOnlyForGeneratedPosts,
				operation: ['get', 'getMedia'],
			},
		},
	},
	{
		displayName: 'Format',
		name: 'format',
		type: 'options',
		options: [
			{
				name: 'All',
				value: '',
			},
			{
				name: 'Pin',
				value: 'pin',
			},
			{
				name: 'Reel',
				value: 'reel',
			},
			{
				name: 'Slideshow',
				value: 'slideshow',
			},
		],
		default: '',
		description: 'Only posts of this format',
		displayOptions: {
			show: {
				...showOnlyForGeneratedPosts,
				operation: ['getAll'],
			},
		},
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
				...showOnlyForGeneratedPosts,
				operation: ['getAll'],
			},
		},
	},
];

export async function executeGeneratedPost(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'getAll') {
		const format = this.getNodeParameter('format', itemIndex) as string;
		const limit = this.getNodeParameter('limit', itemIndex) as number;
		const response = await ampliApiRequest.call(
			this,
			'GET',
			'/generated-posts',
			undefined,
			compact({ format, limit: Math.min(limit, 50) }),
		);
		return (response.posts as IDataObject[] | undefined) ?? [];
	}

	const id = encodeURIComponent(this.getNodeParameter('generatedPostId', itemIndex) as string);
	if (operation === 'get') {
		const response = await ampliApiRequest.call(this, 'GET', `/generated-posts/${id}`);
		return (response.post as IDataObject | undefined) ?? response;
	}
	if (operation === 'getMedia') {
		return await ampliApiRequest.call(this, 'GET', `/generated-posts/${id}/media`);
	}
	return {};
}
