export function normalize_title(value) {
	return value
		.toLowerCase()
		.replace(/\s+\(\d+\)$/, '') // Discogs artist disambiguation suffix, e.g. "Genesis (2)"
		.replace(/[([][^)\]]*[)\]]/g, '') // parenthetical/bracketed noise, e.g. "(Deluxe Edition)"
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
}
