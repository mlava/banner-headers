This extension allows you to define a banner image to use as a header on an individual page level, including on daily note pages.

**New:**
- fixed random Unsplash image import
- migrate to use Roam block/props instead of requiring a childblock with *banner: url* format
  - migration script to recognise legacy pages and convert to new format
- added option to use Pixabay as import source in addition to Unsplash

*Previously:*
- Embed a random image from Unsplash as the banner header. Set the theme in Roam Depot settings and trigger using Command Palette 'Set random Banner from Unsplash' (or Hotkey). A random image from Unsplash will be set as the heading.
- updated to use Roam Research Hotkeys

Command palette commands:
- Set Banner from Clipboard
  - if you have an image url in clipboard, run this command to set the image as the page header
- Set random Banner from Unsplash
  - calls Unsplash api to get a random image for the page
  - you need to obtain an Unsplash Developer Application key from [Unsplash](https://unsplash.com/oauth/applications) which is free (limited to 50 calls per hour)
  - make sure to add your Application key in the required field in Roam Depot settings for this extension
- Set random Banner from Pixabay
  - calls Pixabay api to get a random image for the page
  - you need to obtain an Pixabay API key from [Pixabay](https://pixabay.com/api/docs/) which is free (limited to 100 calls per minute)
  - after logging in, scroll down on that page to [https://pixabay.com/api/docs/#api_search_images](https://pixabay.com/api/docs/#api_search_images) and the key is highlighted in green under the Parameters subheading
  - make sure to add your API key in the required field in Roam Depot settings for this extension
- Remove Banner
  - removes the banner from the page permanently

The extension will scan each page as you navigate to it, and create the banner when that page has a banner definition in it's properties.

![banner-headers](https://user-images.githubusercontent.com/6857790/185397164-6e260dc9-25f4-4c60-b579-3dffffa5c196.gif)

Banner height is configurable in Roam Depot settings, but defaults to 150px.

You can apply a gradient to the bottom of the banner to soften the image on the page, by turning the switch on in the Roam Depot settings page.

You can also add a banner to a page from your clipboard. Simply find the url of an image you wish to use, copy it, and then on the Roam Research page trigger Set Banner from Clipboard via Command Palette (CTRL-p). This will create a banner: url entry at the bottom of the page, and trigger the page to load the banner to the header.

Here is a clip of me copying an image address and then setting it as a banner header:

https://www.loom.com/share/bdf86edb9c5b4cfbb23133bd6e5c9bc6

Great sources for banner images:

https://www.pexels.com/search/banner%20background/?orientation=landscape&size=large

https://unsplash.com/s/photos/banner?orientation=landscape

https://www.pexels.com/search/HD%20wallpaper/?orientation=landscape&size=large

https://pixabay.com/images/search/wallpaper/?min_width=2400&orientation=horizontal

Finally, if you want to remove the banner:
1. run the Remove Banner command via the Command Palette
