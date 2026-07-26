const form = document.getElementById('listens-filters')
const grid = document.getElementById('listens-grid')
const items = [...document.querySelectorAll('#listens-grid > li')]
const count_element = document.getElementById('listens-count')
const sort_select = document.getElementById('listens-sort')

const SORT_KEYS = {
	year: (item) => {
		const year = Number(item.dataset.year)
		return Number.isNaN(year) ? null : year
	},
	artist: (item) => item.dataset.artist,
	plays: (item) => Number(item.dataset.plays),
}

// When sorting by artist or year, ties must not fall back to the default
// build-time order — that order is itself driven by play count and media
// type (DVDs last), which would leak an unwanted bias back in.
const TIEBREAK_KEYS = {
	year: (item) => item.dataset.artist,
	artist: (item) => item.dataset.title,
}

function checkedValues(name) {
	return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value)
}

function applySort() {
	if (!sort_select.value) {
		for (const item of items) {
			grid.appendChild(item)
		}
		return
	}

	const [field, direction] = sort_select.value.split('-')
	const factor = direction === 'asc' ? 1 : -1
	const key = SORT_KEYS[field]
	const tiebreak_key = TIEBREAK_KEYS[field]

	const sorted = [...items].sort((a, b) => {
		const value_a = key(a)
		const value_b = key(b)

		// Unknown values (e.g. missing year) always sink to the end,
		// regardless of sort direction.
		if (value_a === null && value_b === null) return 0
		if (value_a === null) return 1
		if (value_b === null) return -1

		if (value_a < value_b) return -1 * factor
		if (value_a > value_b) return 1 * factor

		if (tiebreak_key) {
			const tiebreak_a = tiebreak_key(a)
			const tiebreak_b = tiebreak_key(b)
			if (tiebreak_a < tiebreak_b) return -1
			if (tiebreak_a > tiebreak_b) return 1
		}
		return 0
	})

	for (const item of sorted) {
		grid.appendChild(item)
	}
}

function applyFilters() {
	const formats = checkedValues('format')
	const types = checkedValues('type')
	const genres = checkedValues('genre')
	let visible_count = 0

	for (const item of items) {
		const matches_format = formats.length === 0 || formats.includes(item.dataset.format)
		const matches_type = types.length === 0 || types.includes(item.dataset.type)
		const item_genres = item.dataset.genres.split('|')
		const matches_genre = genres.length === 0 || genres.some((genre) => item_genres.includes(genre))
		const show = matches_format && matches_type && matches_genre

		item.hidden = show === false
		if (show) {
			visible_count += 1
		}
	}

	count_element.textContent = visible_count
}

form.addEventListener('change', applyFilters)
sort_select.addEventListener('change', applySort)
applyFilters()
