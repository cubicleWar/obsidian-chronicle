

export function assertNonNull<T>(value: T,	message = "Value must not be null or undefined"): asserts value is NonNullable<T>
{
	if (value == null)
	{
		throw new Error(message);
	}
}