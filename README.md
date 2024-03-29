This extension allows you to define a banner image to use as a header on an individual page level, including on daily note pages.

**New:**
- Embed a random image from Unsplash as the banner header. Set the theme in Roam Depot settings and trigger using Command Palette 'Set random Banner from Unsplash' (or Hotkey). A random image from Unsplash will be set as the heading.
- updated to use Roam Research Hotkeys

Simply create a block anywhere on the page in the form:

banner: url

where url is a link to a web image.

The extension will scan each page as you navigate to it, and if it finds a banner: url definition somewhere on the page it will create the banner.

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

Finally, if you want to remove the banner there are two options:
1. simply delete the block with the banner: url definition
2. run the Remove Banner command via the Command Palette
