---
title: Anonimized user pages with Fathom Analytics
tags: ['privacy']
---

My [Fathom Analytics](https://usefathom.com/) dashboard for [Project Wallace](https://www.projectwallace.com) was showing me all url's of the app, including the ones where a profile and project name were part of the url, like so: `www.projectwallace.com/~bartveneman/my-project`. I don't want this, because:

- Personal data, like your username, does not belong in my analytics.
- There is no way for me to count the number of pageviews for all profile pages with every profile page being reported as a unique one

## The solution

To get around this problem, I need to convert every url that contains user-data to a generic URL.

| original url                       | analytics url              |
| ---------------------------------- | -------------------------- |
| `/~bartveneman`                    | `/~:user`                  |
| `/~bartveneman/my-project`         | `/~:user/:project`         |
| `/~bartveneman/my-project/imports` | `/~:user/:project/imports` |

Luckily I have a `routes.js` file in the Project Wallace [Express](http://expressjs.com) app, which lists routes like this:

```js
const routes = {
  userProfile: "/~:user",
  userProject: "/~:user/:project",
  userProjectImports: "/~:user/:project/imports",
  // etc.
};
```

Every route with user data starts with `/~`, so I use that to determine whether Fathom should do it's regular reporting or whether I should inject my own. [Fathom has an option to disable automatic tracking](https://usefathom.com/support/tracking-advanced) on a page and to manually call `trackPageview()`. This is what it looks like in Project Wallace:

- Disable Fathom auto-tracking
- Wait for the Fathom script to load and once that's done&hellip;
- If the url contains profile information, track an anonimized pageview [using the route name (`req.route.path`)](http://expressjs.com/en/5x/api.html#req.route)
- Otherwise, track a regular pageview

```pug
//- NOTE: auto='false' to disable Fathom's auto-tracking. I'm implementing my own.
script(src='https://cdn.usefathom.com/script.js' site=SITE_ID auto='false' defer id='fathom')

if currentUrl.startsWith('/~')
	script.
		document.querySelector('#fathom')
			.addEventListener('load', function () {
				fathom.trackPageview({
					url: '#{req.route.path}' // req.route.path => /~:user/:project
				})
		})
else
	script.
		document.querySelector('#fathom')
			.addEventListener('load', function () {
				fathom.trackPageview()
			})
```

## The result

![Fathom dashboard with anonimized user urls](/img/2020-06-14-anonimized-user-pages-with-fathom-analytics-result.png)

More privacy. More better.

<aside>
<i>If you liked this post and you're interested in using Fathom Analytics, please consider using <a href="https://usefathom.com/ref/I6TUXR" rel="external">my affiliate link</a> to setup your account and you'll get $10 off your first invoice!</i>
</aside>
