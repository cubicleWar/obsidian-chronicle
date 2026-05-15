export type ValidationResult =
{
	valid: boolean;
	errors: string[];
};

export type SettingsValidator<T, TMode = string | undefined> = (settings: T, mode?: TMode) => ValidationResult
