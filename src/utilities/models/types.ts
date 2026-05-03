export type RecordLike = Record<string, any>;

export type PrimitiveValue = string | number | boolean | bigint | symbol | null | undefined;

export type JsonPrimitive = string | number | boolean | null;

export interface Dictionary<T>
{
	[key: string]: T;
}

// Types to the keys of an object where the value associated with that key is a string.
// For example:
//
//	interface MySettings {
//		template_path: string;
//		api_key: string;
//		enable_feature: boolean;
//	}
//
//	StringKeys<MySettings> = 'template_path' | 'api_key'
//

export type StringKeys<T> = {
	[K in keyof T]: T[K] extends string ? K : never
}[keyof T];