import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { getAccounts, getCollections, getOwnCollections, getTemplates } from './loadOptions';
import { accountProperties, executeAccount } from './resources/account';
import { executeGeneratedPost, generatedPostProperties } from './resources/generatedPost';
import { executeGeneration, generationProperties } from './resources/generation';
import { executeMedia, mediaProperties } from './resources/media';
import { executePost, postProperties } from './resources/post';
import { executeTemplate, templateProperties } from './resources/template';
import { executeUser, userProperties } from './resources/user';

export class Ampli implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Ampli',
		name: 'ampli',
		icon: { light: 'file:../../icons/ampli.svg', dark: 'file:../../icons/ampli.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Generate social posts with Ampli and schedule them to TikTok, Instagram, Pinterest, LinkedIn, Threads, Facebook, YouTube and X',
		defaults: {
			name: 'Ampli',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'ampliApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Account',
						value: 'account',
					},
					{
						name: 'Generated Post',
						value: 'generatedPost',
					},
					{
						name: 'Generation',
						value: 'generation',
					},
					{
						name: 'Media',
						value: 'media',
					},
					{
						name: 'Post',
						value: 'post',
					},
					{
						name: 'Template',
						value: 'template',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'post',
			},
			...accountProperties,
			...generatedPostProperties,
			...generationProperties,
			...mediaProperties,
			...postProperties,
			...templateProperties,
			...userProperties,
		],
	};

	methods = {
		loadOptions: {
			getAccounts,
			getCollections,
			getOwnCollections,
			getTemplates,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: IDataObject | IDataObject[];
				switch (resource) {
					case 'account':
						responseData = await executeAccount.call(this, operation);
						break;
					case 'generatedPost':
						responseData = await executeGeneratedPost.call(this, operation, i);
						break;
					case 'generation':
						responseData = await executeGeneration.call(this, operation, i);
						break;
					case 'media':
						responseData = await executeMedia.call(this, operation, i);
						break;
					case 'post':
						responseData = await executePost.call(this, operation, i);
						break;
					case 'template':
						responseData = await executeTemplate.call(this, operation, i);
						break;
					case 'user':
						responseData = await executeUser.call(this, operation);
						break;
					default:
						responseData = {};
				}
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				// Transport errors are already NodeApiErrors (message kept); anything
				// else is wrapped so the UI shows it with the failing item.
				throw new NodeOperationError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
