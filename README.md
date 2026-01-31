This extension lets you define a banner image as a page header, including on daily note pages.

## Migration from legacy blocks
Older versions stored banners as a top-level block like `banner: https://...`. This extension now uses page properties (`block/props`) instead.

Migration is lazy and low-load:
- On page open, it reads page props first.
- If no `banner` prop exists, it checks for a top-level legacy `banner:` block once per page (cached).
- If found, it migrates the URL into props and removes the legacy block.

Legacy checks are cached per graph in `localStorage` with LRU + TTL (defaults: 1000 pages, 14 days), so pages are not re-scanned on every visit.

Command palette commands:
- Set Banner from Clipboard
  - if you have an image URL in the clipboard, run this command to set it as the page header
- Set random Banner from Unsplash
  - calls the Unsplash API to get a random image for the page
  - you need an Unsplash Developer Application key from [Unsplash](https://unsplash.com/oauth/applications) (free, limited to 50 calls/hour)
  - add your key in Roam Depot settings
- Set random Banner from Pixabay
  - calls the Pixabay API to get a random image for the page
  - you need a Pixabay API key from [Pixabay](https://pixabay.com/api/docs/) (free, limited to 100 calls/min)
  - after logging in, scroll down on that page to [https://pixabay.com/api/docs/#api_search_images](https://pixabay.com/api/docs/#api_search_images) and the key is highlighted in green under the Parameters subheading
  - add your key in Roam Depot settings
- Remove Banner
  - removes the banner from the page permanently

The extension reads page properties on navigation and renders a banner when a `banner` prop is present.

![banner-headers](https://user-images.githubusercontent.com/6857790/185397164-6e260dc9-25f4-4c60-b579-3dffffa5c196.gif)

Banner height is configurable in Roam Depot settings, but defaults to 150px.

You can apply a gradient to the bottom of the banner to soften the image on the page, by turning the switch on in the Roam Depot settings page.

You can also add a banner from your clipboard. Copy an image URL and run Set Banner from Clipboard via the Command Palette (CTRL‑P). This stores the banner URL in page properties and renders it as the header.

Here is a clip of me copying an image address and then setting it as a banner header:

https://www.loom.com/share/bdf86edb9c5b4cfbb23133bd6e5c9bc6

Great sources for banner images:

https://www.pexels.com/search/banner%20background/?orientation=landscape&size=large

https://unsplash.com/s/photos/banner?orientation=landscape

https://www.pexels.com/search/HD%20wallpaper/?orientation=landscape&size=large

https://pixabay.com/images/search/wallpaper/?min_width=2400&orientation=horizontal

Finally, if you want to remove the banner:
1. run the Remove Banner command via the Command Palette
