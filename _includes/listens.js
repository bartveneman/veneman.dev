const form = document.getElementById('listens-filters')
const items = [...document.querySelectorAll('#listens-grid > li')]
const count_element = document.getElementById('listens-count')

function checkedValues(name) {
	return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value)
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
applyFilters()
