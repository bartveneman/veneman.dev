import syntaxHighlight from '@11ty/eleventy-plugin-syntaxhighlight'
import embedYoutube from 'eleventy-plugin-youtube-embed'
import pluginRss from '@11ty/eleventy-plugin-rss'
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";

export default (eleventyConfig) => {
	eleventyConfig.setTemplateFormats(['md', 'html', 'njk', 'liquid'])

	// PLUGINS
	eleventyConfig.addPlugin(syntaxHighlight)
	eleventyConfig.addPlugin(embedYoutube, {
		lite: true,
	})
	eleventyConfig.addPlugin(pluginRss)
	eleventyConfig.addPlugin(eleventyImageTransformPlugin)

	// COPY THESE FILES DURING BUILD
	eleventyConfig.addPassthroughCopy('img')
	eleventyConfig.addPassthroughCopy('fonts')
	eleventyConfig.addPassthroughCopy('*.png')
	eleventyConfig.addPassthroughCopy('favicon.ico')
	eleventyConfig.addPassthroughCopy('robots.txt')
	eleventyConfig.addPassthroughCopy('.well-known')
	eleventyConfig.addPassthroughCopy('_includes/*.css')

	// LAYOUTS
	eleventyConfig.addLayoutAlias('default', 'layouts/default.html')
	eleventyConfig.addLayoutAlias('post', 'layouts/post.html')
	eleventyConfig.addLayoutAlias('bookmark', 'layouts/bookmark.html')

	// COLLECTIONS
	eleventyConfig.addCollection('posts', function (collection) {
		return collection.getFilteredByGlob('blog/*.md').reverse()
	})

	eleventyConfig.addCollection('bookmarks', function (collection) {
		return collection.getFilteredByGlob('bookmarks/*.md')
	})

	eleventyConfig.addCollection('tags', function (collection) {
		const tags = new Set()

		collection.getAll().forEach((item) => {
			if (!item.data.tags) return

			for (const tag of item.data.tags) {
				tags.add(tag)
			}
		})

		return [...tags]
	})
}
