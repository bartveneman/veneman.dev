const form = document.getElementById('listens-filters')
const items = [...document.querySelectorAll('#listens-grid > li')]
const countEl = document.getElementById('listens-count')

function checkedValues(name) {
	return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value)
}

function applyFilters() {
	const formats = checkedValues('format')
	const types = checkedValues('type')
	const genres = checkedValues('genre')
	let visible = 0

	for (const item of items) {
		const matchesFormat = formats.length === 0 || formats.includes(item.dataset.format)
		const matchesType = types.length === 0 || types.includes(item.dataset.type)
		const itemGenres = item.dataset.genres.split(',')
		const matchesGenre = genres.length === 0 || genres.some((g) => itemGenres.includes(g))
		const show = matchesFormat && matchesType && matchesGenre

		item.hidden = !show
		if (show) visible += 1
	}

	countEl.textContent = `Showing ${visible} of ${items.length} records`
}

form.addEventListener('change', applyFilters)
applyFilters()
