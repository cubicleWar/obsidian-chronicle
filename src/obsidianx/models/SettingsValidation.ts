export type ValidationResult =
{
	valid: boolean;
	errors: string[];
};

export type SettingsValidator<T> = (settings: T, mode: any) => ValidationResult
