// The ID combines the media type and template revision in one scalar property.
export function templateMetadata(id: string): string
{
	return `chronicle_template_id: ${JSON.stringify(id)}`;
}
