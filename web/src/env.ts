import { defineEnvVars } from '@sveltejs/kit/env';

// Environment variables, validated when the app builds and when it starts.
// Copy .env.example to .env for local development.
export const variables = defineEnvVars({
	DATABASE_URL: {
		description:
			'PostgreSQL 18 connection string for learner state. Optional until a feature stores data.',
		// Unset is allowed: the app builds and serves without a database. When it
		// is set it must look like a PostgreSQL URL, and an empty value is a
		// mistake in the environment file.
		schema: (value: string | undefined) => {
			if (value === undefined) return value;
			if (!/^postgres(ql)?:\/\//.test(value)) {
				throw new Error('expected a postgres:// connection string, or leave it unset');
			}
			return value;
		}
	}
});
